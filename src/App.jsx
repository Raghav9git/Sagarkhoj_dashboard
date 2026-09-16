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
  const [activeTab,      setActiveTab]      = useState(null)

  const toggleTheme = useCallback(() => setTheme(t => t === 'night' ? 'day' : 'night'), [])

  const handleSpillDetected = useCallback((data) => {
    if (data?.benchmark_match) {
      const matched = HISTORICAL_INCIDENTS.find(i => i.id === data.benchmark_match)
      if (matched) {
        setSelectedIncident(matched)
        setShowHistorical(true)
        if (data?.polygon && data.polygon.length > 0) {
          setSpillResult({
            detected: true,
            is_spill: data.is_spill,
            centroid: data.centroid || SPILL_CENTER,
            polygon:  data.polygon || SPILL_POLYGON,
            heatmap:  data.heatmap_image,
            panel:    data.panel_image,
            area:     data.area_sq_km,
            perimeter:data.perimeter_km,
            suspects: data.suspect_vessels || [],
            driftPath: data.drift_path || [],
            driftPolygons: data.drift_polygons || [],
            detectedAt: data.detected_at || Date.now(),
          })
        }
        setActiveTab('report')
        return
      }
    }

    if (data?.polygon && data.polygon.length > 0) {
      setSpillResult({
        detected: true,
        is_spill: data.is_spill,
        centroid: data.centroid || SPILL_CENTER,
        polygon:  data.polygon || SPILL_POLYGON,
        heatmap:  data.heatmap_image,
        panel:    data.panel_image,
        area:     data.area_sq_km,
        perimeter:data.perimeter_km,
        suspects: data.suspect_vessels || [],
        driftPath: data.drift_path || [],
        driftPolygons: data.drift_polygons || [],
        detectedAt: data.detected_at || Date.now(),
      })
    } else {
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
    // Automatically open the report dashboard
    setActiveTab('report')
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
              setSelectedIncident={setSelectedIncident}
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
