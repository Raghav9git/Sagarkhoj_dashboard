import React, { useState, useCallback } from 'react'
import TopBar    from './components/TopBar'
import Sidebar   from './components/Sidebar'
import MapCanvas from './components/MapCanvas'
import SarPanel  from './components/SarPanel'
import AisPanel  from './components/AisPanel'
import MapSettingsPanel from './components/MapSettingsPanel'
import ReportDashboard from './components/ReportDashboard'
import { SPILL_CENTER, SPILL_POLYGON, HISTORICAL_INCIDENTS } from './constants'

export default function App() {
  const [theme,          setTheme]         = useState('night')
  const [spillResult,    setSpillResult]   = useState(null)
  const [isProcessing,   setIsProcessing]  = useState(false)
  const [activeVessels,  setActiveVessels] = useState([])
  const [aisConnected,   setAisConnected]  = useState(false)
  const [selectedVessel, setSelectedVessel]= useState(null)
  const [vesselFilter,   setVesselFilter]  = useState('All')
  const [sarThumbnail,   setSarThumbnail]  = useState(null)
  const [vesselScores,   setVesselScores]  = useState({})
  const [selectedIncident, setSelectedIncident] = useState(HISTORICAL_INCIDENTS[0])
  const [showHistorical, setShowHistorical] = useState(false)
  
  // Sidebar tabs state
  const [activeTab, setActiveTab] = useState(null)

  const toggleTheme = useCallback(() => setTheme(t => t === 'night' ? 'day' : 'night'), [])

  const handleSpillDetected = useCallback((data) => {
    // Always close the SAR panel and show results on map
    setActiveTab(null)
    
    if (data?.benchmark_match) {
      // Find the matching historical incident to get full data (polygon, ships, etc.)
      const matched = HISTORICAL_INCIDENTS.find(i => i.id === data.benchmark_match)
      if (matched) {
        setSelectedIncident(matched)
        setShowHistorical(true)
        
        // Use the backend polygon if available, otherwise fall back to constants polygon
        const polygon = (data.polygon && data.polygon.length > 0) ? data.polygon : matched.polygon
        const driftPolygons = (data.drift_polygons && data.drift_polygons.length > 0)
          ? data.drift_polygons
          : null
        const driftPath = (data.drift_path && data.drift_path.length > 0)
          ? data.drift_path
          : null

        setSpillResult({
          detected: true,
          is_spill: true,
          benchmark_match: data.benchmark_match,
          centroid: data.centroid || matched.center,
          polygon: polygon,
          heatmap:  data.heatmap_image,
          panel:    data.panel_image,
          area:     data.area_sq_km || matched.metrics?.area,
          perimeter: data.perimeter_km || matched.metrics?.perimeter,
          suspects: matched.ships || data.suspect_vessels || [],
          driftPath: driftPath || [matched.center],
          driftPolygons: driftPolygons || [polygon],
          detectedAt: data.detected_at || matched.date,
          briefingText: matched.briefingText,
        })
        return
      }
    }

    // Live unknown image
    if (data?.is_spill && data?.polygon && data.polygon.length > 0) {
      setShowHistorical(false)
      setSpillResult({
        detected: true,
        is_spill: true,
        centroid: data.centroid || SPILL_CENTER,
        polygon:  data.polygon,
        heatmap:  data.heatmap_image,
        panel:    data.panel_image,
        area:     data.area_sq_km,
        perimeter: data.perimeter_km,
        suspects: data.suspect_vessels || [],
        driftPath: data.drift_path || [],
        driftPolygons: data.drift_polygons || [],
        detectedAt: data.detected_at || Date.now(),
      })
    } else {
      // No spill or backend failure
      setShowHistorical(false)
      setSpillResult({
        detected: true,
        is_spill: false,
        centroid: data?.centroid || SPILL_CENTER,
        polygon:  [],
        heatmap:  data?.heatmap_image,
        panel:    data?.panel_image,
        detectedAt: data?.detected_at || Date.now(),
        suspects: [],
        driftPath: [],
        driftPolygons: []
      })
    }
  }, [])

  // When user selects a historical incident from dropdown, load it properly
  const handleHistoricalSelect = useCallback((incident) => {
    setSelectedIncident(incident)
    setShowHistorical(true)
    // Also load the incident data into spillResult so the map updates
    setSpillResult({
      detected: true,
      is_spill: true,
      benchmark_match: incident.id,
      centroid: incident.center,
      polygon: incident.polygon,
      heatmap: null,
      panel: incident.panelImage || null,
      area: incident.metrics?.area,
      perimeter: incident.metrics?.perimeter,
      suspects: incident.ships || [],
      driftPath: [incident.center],
      driftPolygons: [incident.polygon],
      detectedAt: incident.date,
      briefingText: incident.briefingText,
    })
  }, [])

  const handleVesselsUpdate  = useCallback((vessels) => { setActiveVessels(vessels); setAisConnected(true) }, [])
  const handleVesselSelect   = useCallback((vessel)  => setSelectedVessel(vessel), [])
  const handleScoresUpdate   = useCallback((scores)  => setVesselScores(scores), [])
  const handlePreviewReady   = useCallback((url)     => setSarThumbnail(url), [])

  const isDark = theme === 'night'

  return (
    <div data-theme={theme} style={{
      width:'100vw', height:'100vh', overflow:'hidden',
      display:'flex', flexDirection:'column',
      background: isDark ? '#0c0c0f' : '#dde3ea',
    }}>
      <TopBar vesselCount={activeVessels.length} aisConnected={aisConnected} theme={theme} toggleTheme={toggleTheme} />

      <div style={{ flex:1, position:'relative', overflow:'hidden', display: 'flex' }}>
        
        {/* Sleek Left Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />

        {/* Dynamic Panels */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
        }}>
          {activeTab === 'sar' && (
            <SarPanel
              onClose={() => setActiveTab(null)}
              onSpillDetected={handleSpillDetected}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
              spillResult={spillResult}
              theme={theme}
              onPreviewReady={handlePreviewReady}
              selectedIncident={selectedIncident}
              setSelectedIncident={(inc) => { setSelectedIncident(inc); handleHistoricalSelect(inc) }}
              showHistorical={showHistorical}
              setShowHistorical={setShowHistorical}
              historicalIncidents={HISTORICAL_INCIDENTS}
            />
          )}

          {activeTab === 'ais' && (
            <AisPanel 
              onClose={() => setActiveTab(null)}
              vessels={showHistorical ? (selectedIncident?.ships || []) : activeVessels}
              vesselScores={vesselScores}
              theme={theme}
            />
          )}

          {activeTab === 'map' && (
            <MapSettingsPanel
              onClose={() => setActiveTab(null)}
              theme={theme}
              vesselFilter={vesselFilter}
              setVesselFilter={setVesselFilter}
            />
          )}
        </div>

        {/* Full-screen map */}
        <div style={{ position:'absolute', inset:0, zIndex:1 }}>
          <MapCanvas
            spillResult={spillResult}
            onVesselsUpdate={handleVesselsUpdate}
            onVesselSelect={handleVesselSelect}
            onScoresUpdate={handleScoresUpdate}
            theme={theme}
            vesselFilter={vesselFilter}
            onFilterChange={setVesselFilter}
            selectedIncident={selectedIncident}
            showHistorical={showHistorical}
          />
        </div>

        {/* Report Dashboard Overlay */}
        <ReportDashboard 
          isVisible={activeTab === 'report'} 
          onClose={() => setActiveTab(null)} 
          theme={theme}
          spillResult={spillResult}
          selectedIncident={showHistorical ? selectedIncident : null}
          vesselScores={vesselScores}
        />

      </div>
    </div>
  )
}
