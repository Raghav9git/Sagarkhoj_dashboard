import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Polygon, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'
import {
  AISSTREAM_WS_URL, AIS_SUBSCRIBE_PAYLOAD,
  DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM,
  TILE_URLS, TILE_ATTR, SEED_VESSELS,
  getVesselColor, getVesselCategory, VESSEL_TYPE_CONFIG,
  getVesselTypeName, getFlagFromMMSI
} from '../constants'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

/* Haversine distance (km) */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

/* Great-circle destination from origin */
function destination(lat, lon, distKm, bearingDeg) {
  const R=6371, d=distKm, phi1=lat*Math.PI/180, lam1=lon*Math.PI/180, th=bearingDeg*Math.PI/180
  const phi2 = Math.asin(Math.sin(phi1)*Math.cos(d/R) + Math.cos(phi1)*Math.sin(d/R)*Math.cos(th))
  const lam2 = lam1 + Math.atan2(Math.sin(th)*Math.sin(d/R)*Math.cos(phi1), Math.cos(d/R)-Math.sin(phi1)*Math.sin(phi2))
  return { lat:phi2*180/Math.PI, lon:lam2*180/Math.PI }
}

/* Rough landmass check */
const LAND_BOXES=[
  [35,25,70,60],[40,60,75,140],[20,60,40,80],[10,68,32,78],[20,95,42,135],
  [-35,12,37,52],[25,-130,70,-60],[-55,-80,13,-34],[-40,113,-10,154],[-90,-180,-65,180],
  // Europe mainland
  [42,1,56,25],[36,-10,48,5],
  // Caribbean islands (rough)
  [10,-65,13,-60],[10,-62,12,-60],
]
const isOnLand=(lat,lon)=>LAND_BOXES.some(([s,w,n,e])=>lat>=s&&lat<=n&&lon>=w&&lon<=e)

/* Minimum approach of vessel dead-reckoning path to centroid (72 h samples) */
function minApproachKm(vessel, centroid) {
  if(!vessel.sog||!vessel.cog||vessel.sog<0.3) return Infinity
  let minD=Infinity
  for(let h=1;h<=72;h++){
    const dist=Math.min((vessel.sog*1.852)*h, 500)
    const pos=destination(vessel.lat,vessel.lon,dist,(vessel.cog+180)%360)
    minD=Math.min(minD, haversine(pos.lat,pos.lon,centroid[0],centroid[1]))
  }
  return minD
}

/* Real 3-factor scoring */
function calcScores(vessel, centroid) {
  if(!centroid||vessel.lat==null||vessel.lon==null) return null
  const dist=haversine(vessel.lat,vessel.lon,centroid[0],centroid[1])
  if(dist>280) return null
  const proximity  = Math.round(Math.max(0,(280-dist)/280)*100)
  const minD       = minApproachKm(vessel, centroid)
  const trajectory = Math.round(Math.max(0, minD<150?(150-minD)/150:0)*100)
  const t          = Number(vessel.shipType)
  const typeScore  = (t>=80&&t<=89)?85:(t>=70&&t<=79)?65:(t>=30&&t<=39)?40:30
  const speedScore = vessel.sog!=null?Math.min(100,Math.round((vessel.sog/15)*60)):30
  const anomaly    = Math.round(typeScore*0.6+speedScore*0.4)
  const total      = Math.max(5,Math.min(97,Math.round(proximity*0.5+trajectory*0.3+anomaly*0.2)))
  return { proximity, trajectory, anomaly, total }
}

/*
 * Oil drift: multi-point forward path from spill centroid
 * Uses Open-Meteo wind → Stokes drift 3.5% + 15 deg Ekman deflection
 */
async function fetchOilDriftPath(lat, lon) {
  try {
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m&forecast_days=4&timezone=UTC`
    const json=await fetch(url).then(r=>r.json())
    const wspdArr=json.hourly?.wind_speed_10m||[]
    const wdirArr=json.hourly?.wind_direction_10m||[]
    const points=[[lat,lon]]
    let curLat=lat, curLon=lon
    for(let step=0;step<6;step++){
      const idx=step*12
      const wspd=wspdArr[idx]??8
      const wdir=wdirArr[idx]??220
      const driftSpeedKmh=(wspd*0.035)*3.6
      const driftDir=(wdir+15)%360
      const distKm=driftSpeedKmh*12
      const pos=destination(curLat, curLon, distKm, driftDir)
      // Stop if path hits land
      if(isOnLand(pos.lat, pos.lon)) break
      curLat=pos.lat; curLon=pos.lon
      points.push([curLat,curLon])
    }
    return { points, windSpeed:wspdArr[0]??8, windDir:wdirArr[0]??220 }
  } catch { return null }
}

/* Vessel marker icon */
function createVesselIcon(color, cog=0, isSelected=false, scoreTotal=null, isDarkVessel=false) {
  const sz=isSelected?22:18
  const shadow=isSelected
    ?`drop-shadow(0 0 5px ${color}) drop-shadow(0 1px 4px rgba(0,0,0,0.9))`
    :'drop-shadow(0 1px 3px rgba(0,0,0,0.8))'
  const hasBadge=scoreTotal!==null||isDarkVessel
  const badgeColor=isDarkVessel?'#f87171':scoreTotal>=65?'#f87171':scoreTotal>=35?'#fbbf24':'#94a3b8'
  const badgeText=isDarkVessel?'NO AIS':`${scoreTotal}%`
  const totalH=sz+(hasBadge?14:0)
  return L.divIcon({
    html:`<div style="position:relative;width:${sz}px;height:${totalH}px;text-align:center;"><div style="filter:${shadow};"><svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 20 20"><g transform="rotate(${cog%360},10,10)"><polygon points="10,1 15,18 10,13.5 5,18" fill="${color}" fill-opacity="0.95" stroke="rgba(0,0,0,0.55)" stroke-width="${isSelected?1.2:0.7}"/></g></svg></div>${hasBadge?`<div style="position:absolute;top:${sz+1}px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);border:1px solid ${badgeColor}66;color:${badgeColor};font-size:${isDarkVessel?6:7}px;font-weight:700;font-family:monospace;padding:1px 4px;border-radius:3px;white-space:nowrap;line-height:1.4;">${badgeText}</div>`:''}</div>`,
    className:'', iconSize:[sz,totalH], iconAnchor:[sz/2,sz/2], popupAnchor:[0,-sz/2],
  })
}

function createPulseIcon() {
  return L.divIcon({
    html:`<div style="position:relative;width:16px;height:16px;"><div style="position:absolute;inset:0;border-radius:50%;border:2px solid #ef4444;background:rgba(239,68,68,0.2);"></div><div style="position:absolute;inset:5px;border-radius:50%;background:#ef4444;"></div></div>`,
    className:'', iconSize:[16,16], iconAnchor:[8,8], popupAnchor:[0,-10],
  })
}

/* Map zoom & pan effect when spill occurs or historical incident selected */
function FlyToSpill({ activeSpill }) {
  const map = useMap()
  useEffect(() => {
    if (activeSpill?.centroid) {
      map.flyTo(activeSpill.centroid, 11, { duration: 2.5, easeLinearity: 0.25 })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpill?.centroid?.[0], activeSpill?.centroid?.[1], map])
  return null
}

function ThemeTileLayer({ theme }) {
  return <TileLayer key={theme} url={TILE_URLS[theme]} attribution={TILE_ATTR} maxZoom={18} />
}

/* ─── Vessel filter dock ──────────────────────────────────────────────────── */
function VesselFilterDock({ vesselFilter, onFilterChange, theme, counts }) {
  const [open,setOpen]=useState(false)
  const isDark=theme==='night'
  const bg=isDark?'rgba(12,13,16,0.88)':'rgba(255,255,255,0.92)'
  const border=isDark?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.10)'
  const txt=isDark?'#f1f5f9':'#0f172a'
  const muted=isDark?'#64748b':'#94a3b8'
  const ALL_TOTAL=Object.values(counts).reduce((a,b)=>a+b,0)
  const filters=[
    {key:'All',color:isDark?'#e2e8f0':'#475569',count:ALL_TOTAL},
    ...Object.entries(VESSEL_TYPE_CONFIG).map(([key,cfg])=>({key,color:cfg.color,count:counts[key]??0})),
  ]
  return (
    <div style={{position:'absolute',top:8,left:222,zIndex:450,pointerEvents:'all'}}>
      <button onClick={()=>setOpen(o=>!o)} className="clay-btn" style={{
        display:'flex',alignItems:'center',gap:6,padding:'5px 11px',borderRadius:14,
        background:bg,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',
        border:`1px solid ${border}`,cursor:'pointer',fontSize:10,fontWeight:600,
        color:txt,boxShadow:'0 2px 8px rgba(0,0,0,0.3)',
      }}>
        <SlidersHorizontal size={11} color={muted}/>
        <span>Vessels</span>
        <ChevronDown size={10} color={muted} style={{transform:open?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
      </button>
      {open&&(
        <div className="anim-slide" style={{
          position:'absolute',top:'calc(100% + 6px)',left:0,background:bg,
          backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',
          border:`1px solid ${border}`,borderRadius:12,padding:'6px 4px',
          boxShadow:'0 8px 30px rgba(0,0,0,0.4)',minWidth:160,
        }}>
          {filters.map(({key,color,count})=>(
            <button key={key} onClick={()=>{onFilterChange(key);setOpen(false)}} style={{
              display:'flex',alignItems:'center',justifyContent:'space-between',
              width:'100%',padding:'6px 10px',borderRadius:8,
              background:vesselFilter===key?(isDark?`${color}18`:`${color}10`):'transparent',
              border:'none',cursor:'pointer',fontSize:11,fontWeight:vesselFilter===key?700:500,color:txt,
            }}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:7,height:7,borderRadius:'50%',background:color,flexShrink:0}}/>{key}
              </div>
              <span style={{fontSize:9,color:muted,fontWeight:400}}>{count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Vessel Traceback Slider (bottom-right) ────────────────────────────── */
function VesselTracebackSlider({ traceback, setTraceback, theme }) {
  const isDark = theme === 'night'
  const bgCol   = isDark ? '#16181d' : '#e8eaf0'
  const txtMuted= isDark ? '#6b7280' : '#9ca3af'
  const txtMain = isDark ? '#f1f5f9' : '#1e293b'
  const neuShadow = isDark
    ? '6px 6px 14px rgba(0,0,0,0.7), -4px -4px 10px rgba(255,255,255,0.04)'
    : '6px 6px 14px rgba(163,177,198,0.6), -4px -4px 10px rgba(255,255,255,0.9)'
  const insetShadow = isDark
    ? 'inset 3px 3px 7px rgba(0,0,0,0.6), inset -2px -2px 6px rgba(255,255,255,0.04)'
    : 'inset 3px 3px 7px rgba(163,177,198,0.5), inset -2px -2px 6px rgba(255,255,255,0.85)'

  const label = traceback === 0 ? 'LIVE' : `-${Math.abs(traceback)}h`

  return (
    <div style={{
      position:'absolute', bottom:56, right:16,
      zIndex:500, pointerEvents:'all',
      background:bgCol, borderRadius:16,
      padding:'14px 20px 12px',
      boxShadow:neuShadow,
      width:300, display:'flex', flexDirection:'column', gap:10,
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          <span style={{fontSize:7,fontWeight:700,color:txtMuted,letterSpacing:'0.14em',textTransform:'uppercase'}}>
            🚢 Vessel Traceback
          </span>
          <span style={{fontSize:7,color:txtMuted,letterSpacing:'0.06em'}}>
            AIS dead-reckoning up to 72h
          </span>
        </div>
        <div style={{
          background:bgCol, borderRadius:8,
          boxShadow:insetShadow,
          padding:'4px 12px',
          fontSize:11, fontWeight:800, color:txtMain,
          fontFamily:'JetBrains Mono, monospace',
          letterSpacing:'0.04em',
          minWidth:48, textAlign:'center',
        }}>{label}</div>
      </div>
      <input
        type="range" min="-72" max="0" step="1" value={traceback}
        onChange={e=>setTraceback(Number(e.target.value))}
        style={{
          width:'100%', cursor:'pointer', margin:0, height:4,
          accentColor:isDark?'#94a3b8':'#475569',
          borderRadius:4,
        }}
      />
      <div style={{display:'flex',justifyContent:'space-between',fontSize:7,color:txtMuted,marginTop:-6}}>
        <span>-72h</span><span>-48h</span><span>-24h</span><span>Now</span>
      </div>
      {traceback < 0 && (
        <div style={{
          borderRadius:10, background:bgCol, boxShadow:insetShadow,
          padding:'6px 12px', display:'flex', alignItems:'center', gap:10,
        }}>
          <svg width="30" height="6"><line x1="0" y1="3" x2="30" y2="3" stroke={isDark?'#94a3b8':'#475569'} strokeWidth="1.5" strokeDasharray="5 4"/></svg>
          <span style={{fontSize:7,color:txtMuted}}>Vessel past track (SOG × COG)</span>
        </div>
      )}
    </div>
  )
}

/* ─── Oil Spill Drift Slider (bottom-left) ───────────────────────────────── */
function SpillDriftSlider({ spillTraceback, setSpillTraceback, theme, isActive }) {
  const isDark = theme === 'night'
  const bgCol   = isDark ? '#16181d' : '#e8eaf0'
  const txtMuted= isDark ? '#6b7280' : '#9ca3af'
  const txtMain = isDark ? '#f1f5f9' : '#1e293b'
  const neuShadow = isDark
    ? '6px 6px 14px rgba(0,0,0,0.7), -4px -4px 10px rgba(255,255,255,0.04)'
    : '6px 6px 14px rgba(163,177,198,0.6), -4px -4px 10px rgba(255,255,255,0.9)'
  const insetShadow = isDark
    ? 'inset 3px 3px 7px rgba(0,0,0,0.6), inset -2px -2px 6px rgba(255,255,255,0.04)'
    : 'inset 3px 3px 7px rgba(163,177,198,0.5), inset -2px -2px 6px rgba(255,255,255,0.85)'

  if (!isActive) return null

  const label = spillTraceback === 0 ? 'Origin' : `+${Math.abs(spillTraceback)}h`

  return (
    <div style={{
      position:'absolute', bottom:56, left:16,
      zIndex:500, pointerEvents:'all',
      background:bgCol, borderRadius:16,
      padding:'14px 20px 12px',
      boxShadow:neuShadow,
      width:300, display:'flex', flexDirection:'column', gap:10,
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          <span style={{fontSize:7,fontWeight:700,color:'#f97316',letterSpacing:'0.14em',textTransform:'uppercase'}}>
            🛢️ Oil Spill Drift
          </span>
          <span style={{fontSize:7,color:txtMuted,letterSpacing:'0.06em'}}>
            Track spill dispersion over time
          </span>
        </div>
        <div style={{
          background:bgCol, borderRadius:8,
          boxShadow:insetShadow,
          padding:'4px 12px',
          fontSize:11, fontWeight:800, color:'#f97316',
          fontFamily:'JetBrains Mono, monospace',
          letterSpacing:'0.04em',
          minWidth:48, textAlign:'center',
        }}>{label}</div>
      </div>
      <input
        type="range" min="0" max="72" step="6" value={spillTraceback}
        onChange={e=>setSpillTraceback(Number(e.target.value))}
        style={{
          width:'100%', cursor:'pointer', margin:0, height:4,
          accentColor:'#f97316',
          borderRadius:4,
        }}
      />
      <div style={{display:'flex',justifyContent:'space-between',fontSize:7,color:txtMuted,marginTop:-6}}>
        <span>Origin</span><span>+24h</span><span>+48h</span><span>+72h</span>
      </div>
      {spillTraceback > 0 && (
        <div style={{
          borderRadius:10, background:bgCol, boxShadow:insetShadow,
          padding:'6px 12px', display:'flex', alignItems:'center', gap:10,
        }}>
          <svg width="30" height="6"><line x1="0" y1="3" x2="30" y2="3" stroke="#f97316" strokeWidth="1.5" strokeDasharray="5 4"/></svg>
          <span style={{fontSize:7,color:txtMuted}}>Oil drift path (Stokes 3.5% + Ekman 15°)</span>
        </div>
      )}
    </div>
  )
}

/* ─── Main MapCanvas ──────────────────────────────────────────────────────── */
export default function MapCanvas({
  spillResult, onVesselsUpdate, onVesselSelect, onScoresUpdate,
  theme, vesselFilter, onFilterChange, showHistorical, selectedIncident
}) {
  const [vessels,      setVessels]      = useState(()=>{ const o={}; SEED_VESSELS.forEach(v=>{o[v.mmsi]={...v,isSeed:true}}); return o })
  const [selectedMmsi, setSelectedMmsi] = useState(null)
  const [traceback,    setTraceback]    = useState(0)     // Vessel traceback: -72..0
  const [spillTraceback, setSpillTraceback] = useState(0) // Oil spill drift: 0..72
  const [driftPath,    setDriftPath]    = useState(null)
  const wsRef          = useRef(null)
  const reconnectTimer = useRef(null)
  const staticCache    = useRef({})

  /* AIS WebSocket (Always Connected) */
  const connectAIS = useCallback(()=>{
    if(wsRef.current?.readyState<=1) return
    try {
      const ws=new WebSocket(AISSTREAM_WS_URL)
      wsRef.current=ws
      ws.onopen=()=>{ console.log('[AIS] Connected'); ws.send(JSON.stringify(AIS_SUBSCRIBE_PAYLOAD)) }
      ws.onmessage=(ev)=>{
        try {
          const msg=JSON.parse(ev.data), meta=msg.MetaData||{}
          if(msg.MessageType==='PositionReport'){
            const pos=msg.Message?.PositionReport||{}, mmsi=String(meta.MMSI||pos.UserID||'')
            if(!mmsi) return
            const sc=staticCache.current[mmsi]||{}
            setVessels(prev=>{
              const updated={...prev,[mmsi]:{
                mmsi, isSeed:false, ts:Date.now(),
                name:(sc.shipName||meta.ShipName||'').trim()||`Vessel ${mmsi}`,
                lat:pos.Latitude??meta.latitude, lon:pos.Longitude??meta.longitude,
                cog:pos.Cog, sog:pos.Sog, trueHeading:pos.TrueHeading, rot:pos.RateOfTurn,
                navStatus:pos.NavigationalStatus, shipType:sc.shipType??meta.ShipType,
                callSign:sc.callSign||meta.CallSign, destination:sc.destination||meta.Destination,
                imo:sc.imo, draught:sc.draught, eta:sc.eta,
              }}
              onVesselsUpdate?.(Object.values(updated))
              return updated
            })
          }
          if(msg.MessageType==='ShipStaticData'){
            const sd=msg.Message?.ShipStaticData||{}, mmsi=String(meta.MMSI||sd.UserID||'')
            if(!mmsi) return
            staticCache.current[mmsi]={
              shipName:sd.Name?.trim()||meta.ShipName?.trim(),
              callSign:sd.CallSign?.trim(), shipType:sd.Type??meta.ShipType,
              imo:sd.ImoNumber, destination:sd.Destination?.trim(),
              draught:sd.MaximumStaticDraught,
              eta:sd.Eta?`${sd.Eta.Month}/${sd.Eta.Day} ${String(sd.Eta.Hour).padStart(2,'0')}:${String(sd.Eta.Minute).padStart(2,'0')} UTC`:null,
            }
          }
        } catch{}
      }
      ws.onerror=()=>console.warn('[AIS] error')
      ws.onclose=()=>{ reconnectTimer.current=setTimeout(connectAIS,5000) }
    } catch{ reconnectTimer.current=setTimeout(connectAIS,5000) }
  },[onVesselsUpdate])

  useEffect(()=>{
    onVesselsUpdate?.(SEED_VESSELS)
    connectAIS()
    return ()=>{
      clearTimeout(reconnectTimer.current)
      if(wsRef.current){ wsRef.current.close(); wsRef.current=null }
    }
  },[connectAIS, onVesselsUpdate])

  /* Fetch live oil drift path for forward prediction line */
  useEffect(()=>{
    if(!spillResult?.centroid){ setDriftPath(null); return }
    fetchOilDriftPath(spillResult.centroid[0], spillResult.centroid[1]).then(d=>{
      if(d) setDriftPath(d.points)
    })
  },[spillResult?.centroid?.[0], spillResult?.centroid?.[1]])

  /* Reset spill slider when new spill loaded */
  useEffect(()=>{
    if(spillResult) setSpillTraceback(0)
  },[spillResult?.centroid?.[0], spillResult?.centroid?.[1]])

  /* Scores: recompute per centroid */
  const vesselScores = useMemo(()=>{
    if(!spillResult?.centroid) return {}
    const res={}
    Object.values(vessels).forEach(v=>{
      const s=calcScores(v,spillResult.centroid)
      if(s) res[v.mmsi]={ ...s, _name:v.name, _shipType:v.shipType, _sog:v.sog, _cog:v.cog, _isSeed:v.isSeed }
    })
    return res
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[spillResult?.centroid?.[0],spillResult?.centroid?.[1]])

  useEffect(()=>{ onScoresUpdate?.(vesselScores) },[vesselScores,onScoresUpdate])

  const vesselList=Object.values(vessels)
  const counts={}
  vesselList.forEach(v=>{ const cat=getVesselCategory(v.shipType); counts[cat]=(counts[cat]??0)+1 })
  const filtered=vesselFilter==='All'?vesselList:vesselList.filter(v=>getVesselCategory(v.shipType)===vesselFilter)
  const handleClick=useCallback((vessel)=>{ setSelectedMmsi(vessel.mmsi); onVesselSelect?.(vessel) },[onVesselSelect])

  const isDark   =theme==='night'
  const badgeBg  =isDark?'rgba(12,13,16,0.85)':'rgba(255,255,255,0.90)'
  const badgeBdr =isDark?'rgba(255,255,255,0.09)':'rgba(0,0,0,0.09)'
  const badgeTxt =isDark?'#94a3b8':'#475569'
  const liveCount=vesselList.filter(v=>!v.isSeed).length
  
  // ── Determine what to render on map ──────────────────────────────────────
  // Active spill: use spillResult directly (which is set by both live detection and historical selection)
  const activeSpill = spillResult?.detected ? spillResult : null
  
  // Vessels to show: merge live vessels with historical ships when relevant
  const vesselsToRender = useMemo(() => {
    const base = [...filtered]
    
    if (showHistorical && selectedIncident?.ships?.length > 0) {
      // Add historical ships on top of live vessels
      selectedIncident.ships.forEach(s => {
        const lastPos = s.track && s.track.length > 0
          ? s.track[s.track.length - 1]
          : selectedIncident.center
        base.push({
          ...s,
          isHistorical: true,
          lat: lastPos[0],
          lon: lastPos[1],
          shipType: s.shipType || (s.type?.includes('Tank') ? 80 : 70),
        })
      })
    } else if (!showHistorical && spillResult?.suspects?.length > 0) {
      // Add suspects from live detection near spill location
      spillResult.suspects.forEach((s, i) => {
        const lat = spillResult.centroid[0] + (s.isCulprit ? 0.002 : (0.012 * (i + 1)))
        const lon = spillResult.centroid[1] + (s.isCulprit ? 0.002 : (-0.012 * (i + 1)))
        if (!base.find(v => v.mmsi === s.mmsi)) {
          base.push({
            mmsi: s.mmsi,
            name: s.name,
            type: s.type || 'Tanker',
            flag: s.flag || '🏳️',
            lat, lon,
            sog: s.sog || 5.0,
            cog: s.cog || 180,
            isCulprit: s.isCulprit,
            confidence: s.confidence,
            shipType: 80,
          })
        }
      })
    }
    return base
  }, [showHistorical, selectedIncident, filtered, spillResult])

  // ── Oil spill drift: map slider (0..72h) to polygon index ────────────────
  // driftPolygons has 13 steps (0 to 72h, every 6h)
  const spillStepIndex = Math.min(12, Math.max(0, Math.floor(spillTraceback / 6)))
  
  let renderedPolygon = activeSpill?.polygon
  let renderedCentroid = activeSpill?.centroid
  
  if (activeSpill?.driftPolygons?.length > 0) {
    renderedPolygon = activeSpill.driftPolygons[spillStepIndex] || activeSpill.polygon
    if (activeSpill?.driftPath?.length > spillStepIndex) {
      renderedCentroid = activeSpill.driftPath[spillStepIndex + 1] || activeSpill.centroid
    }
  }

  // ── Spill movement trail line (from origin to current drift position) ────
  let spillMovementLine = null
  if (activeSpill?.driftPath?.length > 0 && spillTraceback > 0) {
    const endIdx = Math.min(spillStepIndex + 1, activeSpill.driftPath.length - 1)
    spillMovementLine = activeSpill.driftPath.slice(0, endIdx + 1)
  }

  // ── Vessel traceback: map slider (-72..0) to historical step ─────────────
  const historicalStepIndex = Math.min(4, Math.max(0, Math.floor((traceback + 72) / 18)))

  return (
    <div style={{width:'100%',height:'100%',position:'relative'}}>
      <VesselFilterDock vesselFilter={vesselFilter} onFilterChange={onFilterChange} theme={theme} counts={counts}/>
      
      {/* Oil Spill Drift Slider - bottom LEFT */}
      <SpillDriftSlider
        spillTraceback={spillTraceback}
        setSpillTraceback={setSpillTraceback}
        theme={theme}
        isActive={!!activeSpill?.polygon?.length}
      />
      
      {/* Vessel Traceback Slider - bottom RIGHT */}
      <VesselTracebackSlider
        traceback={traceback}
        setTraceback={setTraceback}
        theme={theme}
      />

      <MapContainer center={DEFAULT_MAP_CENTER} zoom={DEFAULT_MAP_ZOOM}
        style={{width:'100%',height:'100%'}} zoomControl={false} attributionControl>
        <ThemeTileLayer theme={theme}/>
        {activeSpill&&<FlyToSpill activeSpill={activeSpill}/>}

        {/* ── Oil spill polygon (AI-detected shape, morphing with drift) ── */}
        {renderedPolygon && renderedPolygon.length > 0 && (
          <Polygon positions={renderedPolygon} pathOptions={{
            color: isDark ? '#ef4444' : '#1f2937',
            weight: 2,
            opacity: 0.92,
            fillColor: isDark ? '#7f1d1d' : '#374151',
            fillOpacity: 0.42,
            dashArray: '5,4',
          }}>
            <Popup className="custom-popup">
              <div style={{padding:'8px 10px',fontFamily:'monospace',fontSize:11,minWidth:220}}>
                <div style={{fontWeight:800,marginBottom:6,borderBottom:'1px solid rgba(255,255,255,0.1)',paddingBottom:4,color:'#ef4444'}}>
                  🛢️ SAR Slick Forensics
                </div>
                <div><b>Surface Area:</b> {activeSpill?.area} sq km</div>
                <div><b>Perimeter:</b> {activeSpill?.perimeter} km</div>
                <div><b>Drift Time:</b> +{spillTraceback}h from origin</div>
                <div><b>Polygon Vertices:</b> {renderedPolygon.length}</div>
                {activeSpill?.suspects?.[0] && (
                  <div style={{marginTop:6,padding:'4px',background:'rgba(239,68,68,0.1)',borderRadius:4,fontSize:10}}>
                    <b>Primary Suspect:</b> {activeSpill.suspects[0].name}
                    {activeSpill.suspects[0].isCulprit && <span style={{color:'#ef4444'}}> [CULPRIT]</span>}
                  </div>
                )}
              </div>
            </Popup>
          </Polygon>
        )}

        {/* ── Spill origin marker ── */}
        {activeSpill?.centroid && (
          <Marker position={activeSpill.centroid} icon={createPulseIcon()}>
            <Popup closeButton={false} className="custom-popup">
              <div style={{padding:'8px 10px',fontFamily:'monospace',fontSize:11,minWidth:220}}>
                <div style={{fontWeight:700,marginBottom:4}}>📍 Spill Origin Point</div>
                <div>Detected: <b>{activeSpill?.detectedAt ? new Date(activeSpill.detectedAt).toUTCString?.()?.slice(0,25) + 'Z' : activeSpill.detectedAt || 'Unknown'}</b></div>
                <div style={{marginTop:3}}>Est. origin: ~12h before detection</div>
                <div style={{marginTop:4,color:'#94a3b8',fontSize:9}}>
                  {activeSpill.centroid[0]?.toFixed(5)}°N, {activeSpill.centroid[1]?.toFixed(5)}°E
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* ── Animated centroid marker (current drift position) ── */}
        {renderedCentroid && spillTraceback > 0 &&
          JSON.stringify(renderedCentroid) !== JSON.stringify(activeSpill?.centroid) && (
          <Marker position={renderedCentroid} icon={createPulseIcon()}>
            <Popup closeButton={false} className="custom-popup">
              <div style={{padding:'6px 8px',fontFamily:'monospace',fontSize:11}}>
                <div style={{fontWeight:700}}>🛢️ Slick Position at +{spillTraceback}h</div>
                <div style={{color:'#94a3b8',fontSize:9,marginTop:4}}>
                  {renderedCentroid[0]?.toFixed(5)}°N, {renderedCentroid[1]?.toFixed(5)}°E
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* ── Spill movement trail (origin → current position) ── */}
        {spillMovementLine && spillMovementLine.length > 1 && (
          <Polyline
            positions={spillMovementLine}
            pathOptions={{color:'#f97316',weight:2.5,opacity:0.9,dashArray:'6,5'}}
          />
        )}

        {/* ── Live wind drift forecast line ── */}
        {driftPath && driftPath.length > 1 && spillTraceback === 0 && (
          <Polyline
            positions={driftPath}
            pathOptions={{color:'#f97316',weight:1.8,opacity:0.55,dashArray:'4,6'}}
          />
        )}

        {/* ── Vessel markers + traceback trails ── */}
        {vesselsToRender.map(v=>{
          if (v.lat == null || v.lon == null) return null
          
          let displayLat = v.lat
          let displayLon = v.lon
          let trailPoints = null

          if (traceback < 0) {
            if (v.track && v.track.length > 0) {
              const tRatio = Math.max(0, Math.min(1, (72 - Math.abs(traceback)) / 72))
              const floatIdx = tRatio * (v.track.length - 1)
              const trackIdx = Math.min(v.track.length - 1, Math.floor(floatIdx))
              displayLat = v.track[trackIdx][0]
              displayLon = v.track[trackIdx][1]
              trailPoints = v.track.slice(0, trackIdx + 1)
            } else if (v.sog != null && v.cog != null && v.sog > 0.5) {
              const totalHours = Math.abs(traceback)
              const steps = 8
              const hoursPerStep = totalHours / steps
              const reverseBearing = (v.cog + 180) % 360
              const waypoints = []
              for (let i = steps; i >= 0; i--) {
                const h = hoursPerStep * i
                const dist = Math.min((v.sog * 1.852) * h, 500)
                const pos = destination(v.lat, v.lon, dist, reverseBearing)
                waypoints.push([pos.lat, pos.lon])
              }
              const origin = waypoints[0]
              if (!isOnLand(origin[0], origin[1])) {
                displayLat = origin[0]
                displayLon = origin[1]
                trailPoints = waypoints
              }
            }
          }

          const color      = v.isHistorical
            ? (v.isCulprit ? '#ef4444' : '#f59e0b')
            : (v.isCulprit ? '#ef4444' : getVesselColor(v.shipType))

          // Get score total as a plain number (not an object)
          let scoreTotal = null
          if (v.isHistorical || v.confidence != null) {
            scoreTotal = v.confidence ?? null
          } else {
            const sc = vesselScores[v.mmsi]
            scoreTotal = sc?.total ?? null
          }
          
          const isDarkVessel= !v.isHistorical && v.isSeed && scoreTotal !== null
          const isSelected = v.mmsi === selectedMmsi

          return (
            <React.Fragment key={v.isHistorical ? `hist-${v.mmsi}-${v.name}` : v.mmsi}>
              {/* Dashed past-track line */}
              {trailPoints && (
                <Polyline positions={trailPoints} pathOptions={{ color, weight: 2, dashArray: '4,4', opacity: 0.6 }} />
              )}
              <Marker
                position={[displayLat, displayLon]}
                icon={createVesselIcon(color, v.cog ?? v.trueHeading ?? 0, isSelected, scoreTotal, isDarkVessel)}
                eventHandlers={{ click: () => { setSelectedMmsi(v.mmsi); if (onVesselSelect) onVesselSelect(v) } }}
                zIndexOffset={v.isCulprit ? 1000 : (isSelected ? 500 : (scoreTotal !== null ? 10 : 0))}
              >
                <Tooltip
                  direction="right" offset={[10, 0]} opacity={0.9}
                  permanent={v.isCulprit || (scoreTotal !== null && scoreTotal > 90)}
                >
                  <div style={{ fontSize: 9, fontWeight: 700 }}>
                    {v.name} {scoreTotal !== null ? `(${scoreTotal}%)` : ''}
                  </div>
                </Tooltip>
                
                <Popup closeButton={false} offset={[0,-10]} className="custom-popup">
                  <div style={{width:240,fontFamily:'system-ui,sans-serif',padding:'8px 12px',fontSize:12}}>
                    <div style={{fontWeight:800, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4, marginBottom: 4}}>
                      {v.name||`MMSI: ${v.mmsi}`}
                      {v.isCulprit && <span style={{color: '#ef4444'}}> [CULPRIT]</span>}
                    </div>
                    <div style={{color:'#94a3b8',fontSize:10,marginTop:2}}>
                      {v.isHistorical ? v.type : (v.type || getVesselTypeName(v.shipType))} {getFlagFromMMSI(v.mmsi)}
                    </div>
                    {v.cargo && (
                      <div style={{fontSize:10,marginTop:2,color:'#fbbf24'}}>Cargo: {v.cargo}</div>
                    )}
                    <div style={{marginTop:6,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 12px',fontSize:10}}>
                      <span>SOG: <b>{v.sog?.toFixed(1)??'?'} kn</b></span>
                      <span>COG: <b>{v.cog?.toFixed(0)??'?'}°</b></span>
                      <span>Lat: <b>{displayLat?.toFixed(4)}°N</b></span>
                      <span>Lon: <b>{displayLon?.toFixed(4)}°E</b></span>
                    </div>
                    {scoreTotal !== null && (
                      <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <b>Match Score:</b> <span style={{ color: color, fontWeight: 800 }}>{scoreTotal}%</span>
                      </div>
                    )}
                    {isDarkVessel&&(
                      <div style={{marginTop:8,padding:'4px 8px',background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:4,fontSize:9,color:'#f87171',fontWeight:700}}>
                        NO AIS SIGNAL - Flagged via SAR proximity only
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          )
        })}
      </MapContainer>

      {/* Bottom status badge */}
      <div style={{
        position:'absolute',bottom:28,left:'50%',transform:'translateX(-50%)',
        zIndex:500,pointerEvents:'none',display:'flex',alignItems:'center',gap:7,
        background:badgeBg,backdropFilter:'blur(10px)',border:`1px solid ${badgeBdr}`,
        borderRadius:20,padding:'4px 12px',fontSize:10,color:badgeTxt,fontWeight:500,whiteSpace:'nowrap',
      }}>
        <span style={{width:6,height:6,borderRadius:'50%',background:liveCount>0?'#4ade80':'#fbbf24',animation:'blink 1.8s ease-in-out infinite',display:'inline-block'}}/>
        {liveCount>0?`${vesselList.length} vessels - ${liveCount} live AIS`:`${vesselList.length} vessels - connecting to AIS...`}
        &nbsp;-&nbsp; Click any ship for details
      </div>
    </div>
  )
}
