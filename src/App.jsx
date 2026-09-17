import React, { useState, useCallback } from 'react'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import MapCanvas from './components/MapCanvas'
import SarPanel from './components/SarPanel'
import AisPanel from './components/AisPanel'
import MapSettingsPanel from './components/MapSettingsPanel'
import ReportDashboard from './components/ReportDashboard'
import { SPILL_CENTER, SPILL_POLYGON, HISTORICAL_INCIDENTS } from './constants'

// ── Client-side drift polygon generator (mirrors backend logic) ────────────
// Generates 13 morphing timesteps (T=0..72h, every 6h) from a base polygon
function generateDriftPolygons(basePolygon, centerLat, centerLon, driftDir, steps = 13) {
  if (!basePolygon || basePolygon.length < 3) return { driftPath: [[centerLat, centerLon]], driftPolygons: [basePolygon] }
  const [dlat, dlon] = driftDir || [0.002, 0.002]
  const driftPath = [[centerLat, centerLon]]
  const driftPolygons = []
  let cLat = centerLat, cLon = centerLon
  for (let step = 0; step < steps; step++) {
    if (step > 0) { cLat += dlat; cLon += dlon }
    driftPath.push([cLat, cLon])
    const scale = 1.0 + step * 0.045
    const noiseScale = 0.002 * step
    const stretchLat = 1.0 + (Math.abs(dlat) * 50 * step)
    const stretchLon = 1.0 + (Math.abs(dlon) * 50 * step)

    // Simulate oil slick breaking apart into multiple drifting blobs
    const multiPoly = []

    // As time goes on (step increases), the slick breaks into more pieces (up to 3)
    const numBlobs = step === 0 ? 1 : (step < 4 ? 2 : 3)

    for (let b = 0; b < numBlobs; b++) {
      // Different drift speeds/directions for each blob so they separate
      // b=0: main slick (slower, stays behind), b=1: leading edge (faster), b=2: trailing/side edge
      const speedMultiplier = b === 1 ? 1.5 : b === 2 ? 0.7 : 1.0
      const lateralOffset = b === 2 ? dlon * 0.5 : b === 1 ? -dlon * 0.2 : 0

      const bOffsetLat = dlat * step * speedMultiplier
      const bOffsetLon = (dlon * step * speedMultiplier) + (lateralOffset * step)

      // Oil dissipates and shrinks over time, smaller fragments for sub-blobs
      const bScale = (b === 0 ? 0.8 : b === 1 ? 0.4 : 0.3) * (1.0 - (step * 0.02))

      const blob = basePolygon.map((pt, i) => {
        // Local coordinates relative to center
        const dLat = (pt[0] - centerLat)
        const dLon = (pt[1] - centerLon)

        // Add some noise to morph the shape
        const nLat = noiseScale * ((i + b) % 2 === 0 ? 1.5 : -1.0)
        const nLon = noiseScale * ((i + b) % 3 === 0 ? 1.0 : -1.5)

        return [
          +(centerLat + bOffsetLat + (dLat * bScale) + nLat).toFixed(5),
          +(centerLon + bOffsetLon + (dLon * bScale) + nLon).toFixed(5)
        ]
      })

      // Wrap in an array to make it a valid GeoJSON-like multipolygon for Leaflet
      multiPoly.push(blob)
    }
    driftPolygons.push(multiPoly)
  }
  return { driftPath, driftPolygons }
}

// ── Client-side drift particle generator (Beautiful visual dispersion) ───────
// Generates thousands of small particles that drift and disperse over time
function generateDriftParticles(basePolygon, centerLat, centerLon, driftDir, steps = 13, numParticles = 800) {
  const [dlat, dlon] = driftDir || [0.002, 0.002]
  const particlesByStep = []

  // Simple seeded PRNG for deterministic particles
  let seed = 12345
  const random = () => {
    const x = Math.sin(seed++) * 10000
    return x - Math.floor(x)
  }

  // Initialize particles with base properties
  const numVertices = basePolygon?.length || 0;

  const baseParticles = Array.from({ length: numParticles }).map(() => {

    let startLat = centerLat;
    let startLon = centerLon;

    if (numVertices > 2) {
      // Pick a random vertex to define a wedge with the center
      const vIdx = Math.floor(random() * numVertices);
      const v1 = basePolygon[vIdx];
      const v2 = basePolygon[(vIdx + 1) % numVertices];

      // Randomly interpolate between center, v1, and v2 to uniformly fill the polygon
      const r1 = Math.sqrt(random());
      const r2 = random();

      const px = centerLat * (1 - r1) + v1[0] * (r1 * (1 - r2)) + v2[0] * (r1 * r2);
      const py = centerLon * (1 - r1) + v1[1] * (r1 * (1 - r2)) + v2[1] * (r1 * r2);

      // Add slight jitter for a more organic look
      startLat = px + (random() - 0.5) * 0.003;
      startLon = py + (random() - 0.5) * 0.003;
    } else {
      // Fallback if no polygon
      const radius = Math.sqrt(-2.0 * Math.log(random() || 0.001)) * 0.015 * random()
      const angle = random() * Math.PI * 2
      startLat = centerLat + radius * Math.cos(angle)
      startLon = centerLon + radius * Math.sin(angle)
    }

    // Each particle has slightly different drift characteristics (current shear)
    const driftSpeed = 0.5 + random() * 1.5 // some slow, some fast
    const driftAngleDeviation = (random() - 0.5) * 0.8 // slight lateral spreading

    // Size and opacity
    const size = 1.5 + random() * 4 // radius 1.5 to 5.5
    const baseOpacity = 0.4 + random() * 0.6

    return {
      startLat,
      startLon,
      dlat: (dlat * Math.cos(driftAngleDeviation) - dlon * Math.sin(driftAngleDeviation)) * driftSpeed,
      dlon: (dlat * Math.sin(driftAngleDeviation) + dlon * Math.cos(driftAngleDeviation)) * driftSpeed,
      size,
      baseOpacity,
      diffusionRate: 0.002 + random() * 0.005
    }
  })

  // Pre-calculate positions for each step
  for (let step = 0; step < steps; step++) {
    const currentStepParticles = baseParticles.map(p => {
      // Linear drift
      let lat = p.startLat + (p.dlat * step)
      let lon = p.startLon + (p.dlon * step)

      // Add pseudo-random diffusion (Brownian motion approximation) over time
      const diffusion = p.diffusionRate * step
      lat += (random() - 0.5) * diffusion
      lon += (random() - 0.5) * diffusion

      // As time passes, particles shrink and fade
      const fadeFactor = Math.max(0.1, 1.0 - (step * 0.06))

      return {
        lat: +lat.toFixed(5),
        lon: +lon.toFixed(5),
        radius: p.size * (0.5 + 0.5 * fadeFactor),
        opacity: p.baseOpacity * fadeFactor
      }
    })
    particlesByStep.push(currentStepParticles)
  }

  return particlesByStep
}

// ── Client-side flow line generator (Multiple curved paths) ────────────────
function generateFlowLines(centerLat, centerLon, driftDir, steps = 13) {
  const [dlat, dlon] = driftDir || [0.002, 0.002]
  const flowLines = []
  // Different angles for the diverging paths (radians)
  const angles = [0, -0.4, 0.4, -0.8, 0.8]
  
  angles.forEach(a => {
    const path = []
    let lat = centerLat
    let lon = centerLon
    const speedMult = 1.0 + (Math.abs(a) * 0.3)
    
    for (let step = 0; step < steps; step++) {
      path.push([lat, lon])
      // Gradually curve
      const currentAngle = a * (1 + step * 0.05)
      const stepLat = (dlat * Math.cos(currentAngle) - dlon * Math.sin(currentAngle)) * speedMult
      const stepLon = (dlat * Math.sin(currentAngle) + dlon * Math.cos(currentAngle)) * speedMult
      lat += stepLat
      lon += stepLon
    }
    flowLines.push(path)
  })
  
  return flowLines
}

export default function App() {
  const [theme, setTheme] = useState('night')
  const [spillResult, setSpillResult] = useState(null)
  const [allSpills, setAllSpills] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeVessels, setActiveVessels] = useState([])
  const [aisConnected, setAisConnected] = useState(false)
  const [selectedVessel, setSelectedVessel] = useState(null)
  const [vesselFilter, setVesselFilter] = useState('All')
  const [sarThumbnail, setSarThumbnail] = useState(null)
  const [vesselScores, setVesselScores] = useState({})
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

        const newSpill = {
          detected: true,
          is_spill: true,
          benchmark_match: data.benchmark_match,
          centroid: data.centroid || matched.center,
          polygon: polygon,
          heatmap: data.heatmap_image,
          panel: data.panel_image,
          area: data.area_sq_km || matched.metrics?.area,
          perimeter: data.perimeter_km || matched.metrics?.perimeter,
          suspects: matched.ships || data.suspect_vessels || [],
          driftPath: driftPath || [matched.center],
          driftPolygons: driftPolygons || [polygon],
          detectedAt: data.detected_at || matched.date,
          briefingText: matched.briefingText,
          driftParticles: generateDriftParticles(polygon, matched.center[0], matched.center[1], matched.driftDirection, 13),
          driftFlowLines: generateFlowLines(matched.center[0], matched.center[1], matched.driftDirection, 13)
        }
        setSpillResult(newSpill)
        setAllSpills(prev => prev.some(s => s.benchmark_match === matched.id) ? prev : [...prev, newSpill])
        return
      }
    }

    // Live unknown image
    if (data?.is_spill && data?.polygon && data.polygon.length > 0) {
      setShowHistorical(false)
      const newSpill = {
        detected: true,
        is_spill: true,
        centroid: data.centroid || SPILL_CENTER,
        polygon: data.polygon,
        heatmap: data.heatmap_image,
        panel: data.panel_image,
        area: data.area_sq_km,
        perimeter: data.perimeter_km,
        suspects: data.suspect_vessels || [],
        driftPath: data.drift_path || [],
        driftPolygons: data.drift_polygons || [],
        driftParticles: generateDriftParticles(data.polygon, data.centroid[0], data.centroid[1], [0.002, 0.002], 13),
        driftFlowLines: generateFlowLines(data.centroid[0], data.centroid[1], [0.002, 0.002], 13),
        detectedAt: data.detected_at || Date.now(),
      }
      setSpillResult(newSpill)
      setAllSpills(prev => [...prev, newSpill])
    } else {
      // No spill or backend failure
      setShowHistorical(false)
      setSpillResult({
        detected: true,
        is_spill: false,
        centroid: data?.centroid || SPILL_CENTER,
        polygon: [],
        heatmap: data?.heatmap_image,
        panel: data?.panel_image,
        detectedAt: data?.detected_at || Date.now(),
        suspects: [],
        driftPath: [],
        driftPolygons: [],
        driftParticles: []
      })
    }
  }, [])

  // When user selects a historical incident from dropdown, load it properly
  const handleHistoricalSelect = useCallback((incident) => {
    setSelectedIncident(incident)
    setShowHistorical(true)
    // Generate full 13-step drift polygons client-side for the drift slider
    const driftDir = incident.driftDirection || [0.002, 0.002]
    const { driftPath, driftPolygons } = generateDriftPolygons(
      incident.polygon,
      incident.center[0],
      incident.center[1],
      driftDir,
      13
    )
    const newSpill = {
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
      driftPath,
      driftPolygons,
      driftParticles: generateDriftParticles(incident.polygon, incident.center[0], incident.center[1], driftDir, 13),
      driftFlowLines: generateFlowLines(incident.center[0], incident.center[1], driftDir, 13),
      detectedAt: incident.date,
      briefingText: incident.briefingText,
    }
    setSpillResult(newSpill)
    setAllSpills(prev => prev.some(s => s.benchmark_match === incident.id) ? prev : [...prev, newSpill])
  }, [])

  const handleVesselsUpdate = useCallback((vessels) => { setActiveVessels(vessels); setAisConnected(true) }, [])
  const handleVesselSelect = useCallback((vessel) => setSelectedVessel(vessel), [])
  const handleScoresUpdate = useCallback((scores) => setVesselScores(scores), [])
  const handlePreviewReady = useCallback((url) => setSarThumbnail(url), [])

  const isDark = theme === 'night'

  return (
    <div data-theme={theme} style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: isDark ? '#0c0c0f' : '#dde3ea',
    }}>
      <TopBar vesselCount={activeVessels.length} aisConnected={aisConnected} theme={theme} toggleTheme={toggleTheme} />

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>

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
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <MapCanvas
            spillResult={spillResult}
            allSpills={allSpills}
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
