export const AISSTREAM_API_KEY = import.meta.env.VITE_AIS_API_KEY || ''
export const AISSTREAM_WS_URL  = 'wss://stream.aisstream.io/v0/stream'

export const DEFAULT_MAP_CENTER = [17.0, 66.0]
export const DEFAULT_MAP_ZOOM   = 6

export const AIS_SUBSCRIBE_PAYLOAD = {
  APIKey: AISSTREAM_API_KEY,
  BoundingBoxes: [[[5.0, 52.0], [28.0, 80.0]]],
  FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
}

// Free ESRI tiles — no API key needed
export const TILE_URLS = {
  night: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  day:   'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
}
export const TILE_ATTR = '&copy; <a href="https://www.esri.com/">Esri</a>'

// ─── Seed vessels — spread globally across major ocean shipping lanes ─────
// All positions are in open deep water, well away from coastlines.
// Ships are slow enough (or far enough from land) that 24h traceback stays at sea.
export const SEED_VESSELS = [
  { mmsi:'419123456', name:'MV Mumbai Star',       lat:18.50, lon:66.00, cog:215, sog:8.2,  shipType:80, navStatus:0, trueHeading:215 },
  { mmsi:'232005480', name:'MSC Neptune (UK)',      lat:5.00,  lon:72.00, cog:60,  sog:18.5, shipType:70, navStatus:0, trueHeading:60  },
  { mmsi:'538008123', name:'MT Pacific Ocean',      lat:3.00,  lon:60.00, cog:285, sog:12.3, shipType:85, navStatus:0, trueHeading:285 },
  { mmsi:'229123456', name:'Valetta Glory (Malta)', lat:12.00, lon:55.00, cog:345, sog:10.1, shipType:71, navStatus:0, trueHeading:345 },
  { mmsi:'566000123', name:'Lion City Carrier',     lat:20.00, lon:60.00, cog:190, sog:14.2, shipType:74, navStatus:0, trueHeading:190 },
  { mmsi:'477987654', name:'Oriental Pearl (HK)',   lat:8.50,  lon:77.00, cog:110, sog:19.4, shipType:70, navStatus:0, trueHeading:110 },
  { mmsi:'636012390', name:'Liberian Star',         lat:22.00, lon:64.00, cog:230, sog:11.8, shipType:82, navStatus:0, trueHeading:230 },
  { mmsi:'370001001', name:'Panama Express',        lat:14.00, lon:70.00, cog:90,  sog:21.0, shipType:79, navStatus:0, trueHeading:90  },
  { mmsi:'311029384', name:'Bahamas Breezer',       lat:10.50, lon:68.00, cog:30,  sog:13.5, shipType:72, navStatus:0, trueHeading:30  },
  { mmsi:'338000999', name:'American Eagle',        lat:17.00, lon:58.00, cog:270, sog:9.8,  shipType:80, navStatus:0, trueHeading:270 },
  { mmsi:'503111222', name:'Sydney Explorer',       lat:15.00, lon:43.00, cog:320, sog:11.5, shipType:82, navStatus:0, trueHeading:320 },
  { mmsi:'440003333', name:'Seoul Trader',          lat:-32.0, lon:100.0, cog:115, sog:16.0, shipType:75, navStatus:0, trueHeading:115 },
]


// ─── Spill in open Arabian Sea west of Mumbai ─────────────────────────────
// 19.0°N, 70.5°E — open ocean, ~250km west of Mumbai coast
export const SPILL_CENTER = [19.0, 70.5]
export const SPILL_POLYGON = [
  [19.045, 70.440],[19.060, 70.490],[19.052, 70.540],
  [19.035, 70.560],[19.010, 70.555],[18.988, 70.535],
  [18.972, 70.505],[18.975, 70.468],[18.995, 70.440],
  [19.020, 70.428],[19.038, 70.435],
]

export const HISTORICAL_INCIDENTS = [
  {
    id: "wakashio-2020",
    briefingText: `  • Selected Incident Benchmark : Tobago Gulfstream Oil Spill
  • Incident Region / Location  : Cove, Tobago
  • Primary Sensor Platform     : Sentinel-1 C-Band SAR (IW Mode)
  • Detection Timestamp (T_det) : 2024-02-07 10:00:00 UTC
  • Calculated Slick Centroid  : Lat 11.1400°, Lon -60.7900°
  • Estimated Slick Area        : 160.0 km²
  • Estimated Slick Perimeter   : 53.13 km
  • Target Anomaly Profile      : Transponder Blackout (Dark Fleet)

[SECTION 2: METOCEAN PHYSICAL FORCING DATA & OCEAN CONDITIONS]
-------------------------------------------------------------------------------------
  • Active MetOcean Source Profile : TIER 1: Google Drive Persistent Cache (.json)
  • Atmospheric Wind Velocity (10m): u = -6.2939 m/s | v = 2.9349 m/s
  • Surface Ocean Current Velocity : u = 0.6375 m/s | v = -0.1949 m/s
  • Calculated Drift Resultant Speed: 0.6667 m/s
  • Hydrodynamic Physics Engine  : OpenDrift 4D Particle Lagrangian (RK4 Integration)

[SECTION 3: 4D LAGRANGIAN HINDCASTING & VIRTUAL RELEASE SPILL LOCATION]
-------------------------------------------------------------------------------------
  • Hindcast Window Start Time   : 2024-02-05 10:00:00 UTC (T - 48 Hours)
  • Isolated Origin Bounding Box : Latitude  [11.3105°, 11.4005°]
                                   Longitude [-61.6417°, -61.5654°]
  • Estimated Point of Release   : Lat 11.3432°, Lon -61.6064°
  • Particle Dispersion Spread   : 1,500 particles seeded over 1.5 km radius

[SECTION 4: REGIONAL AIS TRAFFIC INTERSECTION & SPATIO-TEMPORAL AUDIT]
-------------------------------------------------------------------------------------
  • Spatial Indexing Grid System : Uber H3 Hexagonal Grid (Resolution 8)
  • Total Regional Waypoints     : 196 hourly trajectory pings evaluated
  • Total Unique Vessels Tracked : 4 candidate ships in spatio-temporal window
  • Footprint Intersection Hits  : 57 waypoint hits registered inside origin cloud

[SECTION 5: FORWARD LOOP-CLOSURE VALIDATION & CLEANUP FORECAST]
-------------------------------------------------------------------------------------
  • Top Suspect Loop-Closure     : Simulated forward from T - 48h to T_det
  • Simulated Forward Centroid   : Lat 11.3432°, Lon -61.6064°
  • Measured SAR Drift Error     : 93.39 km spatial variance
  • Forward Alignment Match (IoU): 0.0% Match Score
  • Future Forecast Target Window: T + 48 Hours @ 2024-02-09 10:00:00 UTC
  • Future Intercept Centroid    : Lat 11.1400°, Lon -60.7900°`,
    name: "MV Wakashio Grounding (Mauritius)",
    date: "2020-08-10",
    center: [-20.4400, 57.7400],
    image: "/benchmark_data/data/Wakashio_2020/sample_sar.png",
    segmentationImage: "/benchmark_data/outputs/Wakashio_2020_production_segmentation.png",
    panelImage: "/benchmark_data/outputs/Wakashio_2020_3panel_segmentation.png",
    hindcastPlot: "/benchmark_data/outputs/MV_Wakashio_Grounding_hindcast_plot.png",
    briefingText: `  • Selected Incident Benchmark : MV Wakashio Grounding (Mauritius)
  • Incident Region / Location  : Pointe d'Esny, Mauritius
  • Primary Sensor Platform     : Sentinel-1 C-Band SAR (IW Mode)
  • Detection Timestamp (T_det) : 2020-08-10 00:00:00 UTC
  • Calculated Slick Centroid  : Lat -20.4400°, Lon 57.7400°
  • Estimated Slick Area        : 27.5 km²
  • Estimated Slick Perimeter   : 14.2 km
  • Target Anomaly Profile      : Grounding / Structural Failure

[SECTION 2: METOCEAN PHYSICAL FORCING DATA & OCEAN CONDITIONS]
-------------------------------------------------------------------------------------
  • Active MetOcean Source Profile : TIER 1: Google Drive Persistent Cache (.json)
  • Atmospheric Wind Velocity (10m): u = 8.5 m/s | v = -3.2 m/s
  • Surface Ocean Current Velocity : u = 1.2 m/s | v = 0.4 m/s
  • Calculated Drift Resultant Speed: 1.25 m/s
  • Hydrodynamic Physics Engine  : OpenDrift 4D Particle Lagrangian (RK4 Integration)

[SECTION 3: 4D LAGRANGIAN HINDCASTING & VIRTUAL RELEASE SPILL LOCATION]
-------------------------------------------------------------------------------------
  • Hindcast Window Start Time   : 2020-07-25 10:00:00 UTC
  • Isolated Origin Bounding Box : Latitude  [-20.6485°, -20.6000°]
                                   Longitude [58.1582°, 58.2000°]
  • Estimated Point of Release   : Lat -20.6485°, Lon 58.1582°
  • Particle Dispersion Spread   : 1,500 particles seeded over 1.5 km radius

[SECTION 4: REGIONAL AIS TRAFFIC INTERSECTION & SPATIO-TEMPORAL AUDIT]
-------------------------------------------------------------------------------------
  • Spatial Indexing Grid System : Uber H3 Hexagonal Grid (Resolution 8)
  • Total Regional Waypoints     : 196 hourly trajectory pings evaluated
  • Total Unique Vessels Tracked : 2 candidate ships in spatio-temporal window
  • Footprint Intersection Hits  : 82 waypoint hits registered inside origin cloud

[SECTION 5: FORWARD LOOP-CLOSURE VALIDATION & CLEANUP FORECAST]
-------------------------------------------------------------------------------------
  • Top Suspect Loop-Closure     : Simulated forward from T - 48h to T_det
  • Simulated Forward Centroid   : Lat -20.4400°, Lon 57.7400°
  • Measured SAR Drift Error     : 2.14 km spatial variance
  • Forward Alignment Match (IoU): 89.4% Match Score
  • Future Forecast Target Window: T + 48 Hours
  • Future Intercept Centroid    : Lat -20.3000°, Lon 57.5000°`,
    metrics: {
      area: "27.5 sq km",
      perimeter: "36.8 km",
      volume: "1,000 Metric Tons",
      oilType: "Heavy Fuel Oil (Very Low Sulphur)",
      anomaly: "Speed Drop to 0.0 knots (Grounding)"
    },
    polygon: [
      [-20.425, 57.725],
      [-20.430, 57.755],
      [-20.455, 57.758],
      [-20.460, 57.730],
      [-20.440, 57.718]
    ],
    ships: [
      {
        name: "MV WAKASHIO",
        mmsi: "352746000",
        type: "Capesize Bulk Carrier",
        flag: "Panama",
        cargo: "Heavy Fuel Oil",
        confidence: 98,
        isCulprit: true,
        sog: 0.0,
        cog: 215,
        track: [
          [-20.410, 57.710],
          [-20.425, 57.725],
          [-20.440, 57.740],
          [-20.440, 57.740],
          [-20.440, 57.740]
        ]
      },
      {
        name: "VV STAR",
        mmsi: "371584000",
        type: "General Cargo",
        flag: "Panama",
        cargo: "Dry Bulk",
        confidence: 25,
        isCulprit: false,
        sog: 12.4,
        cog: 180,
        track: [
          [-20.470, 57.760],
          [-20.460, 57.755],
          [-20.450, 57.750]
        ]
      },
      {
        name: "TUG BARRACUDA",
        mmsi: "645432000",
        type: "Tugboat",
        flag: "Mauritius",
        cargo: "Salvage Equipment",
        confidence: 18,
        isCulprit: false,
        sog: 6.2,
        cog: 90,
        track: [
          [-20.430, 57.730],
          [-20.435, 57.735]
        ]
      }
    ]
  },
  {
    id: "orange-county-2021",
    briefingText: `  • Selected Incident Benchmark : Huntington Beach Pipeline Drag
  • Incident Region / Location  : California, USA
  • Primary Sensor Platform     : Sentinel-1 C-Band SAR (IW Mode)
  • Detection Timestamp (T_det) : 2021-10-02 15:00:00 UTC
  • Calculated Slick Centroid  : Lat 33.6300°, Lon -118.0400°
  • Estimated Slick Area        : 34.0 km²
  • Estimated Slick Perimeter   : 24.49 km
  • Target Anomaly Profile      : Anchor Dragging Loiter Pattern

[SECTION 2: METOCEAN PHYSICAL FORCING DATA & OCEAN CONDITIONS]
-------------------------------------------------------------------------------------
  • Active MetOcean Source Profile : TIER 1: Google Drive Persistent Cache (.json)
  • Atmospheric Wind Velocity (10m): u = 3.1089 m/s | v = 2.0970 m/s
  • Surface Ocean Current Velocity : u = -0.1500 m/s | v = 0.1000 m/s
  • Calculated Drift Resultant Speed: 0.1803 m/s
  • Hydrodynamic Physics Engine  : OpenDrift 4D Particle Lagrangian (RK4 Integration)

[SECTION 3: 4D LAGRANGIAN HINDCASTING & VIRTUAL RELEASE SPILL LOCATION]
-------------------------------------------------------------------------------------
  • Hindcast Window Start Time   : 2021-09-30 15:00:00 UTC (T - 48 Hours)
  • Isolated Origin Bounding Box : Latitude  [33.3667°, 33.4467°]
                                   Longitude [-117.9259°, -117.8254°]
  • Estimated Point of Release   : Lat 33.4084°, Lon -117.8770°
  • Particle Dispersion Spread   : 1,500 particles seeded over 1.5 km radius

[SECTION 4: REGIONAL AIS TRAFFIC INTERSECTION & SPATIO-TEMPORAL AUDIT]
-------------------------------------------------------------------------------------
  • Spatial Indexing Grid System : Uber H3 Hexagonal Grid (Resolution 8)
  • Total Regional Waypoints     : 196 hourly trajectory pings evaluated
  • Total Unique Vessels Tracked : 4 candidate ships in spatio-temporal window
  • Footprint Intersection Hits  : 82 waypoint hits registered inside origin cloud

[SECTION 5: FORWARD LOOP-CLOSURE VALIDATION & CLEANUP FORECAST]
-------------------------------------------------------------------------------------
  • Top Suspect Loop-Closure     : Simulated forward from T - 48h to T_det
  • Simulated Forward Centroid   : Lat 33.4084°, Lon -117.8770°
  • Measured SAR Drift Error     : 30.54 km spatial variance
  • Forward Alignment Match (IoU): 0.0% Match Score
  • Future Forecast Target Window: T + 48 Hours @ 2021-10-04 15:00:00 UTC
  • Future Intercept Centroid    : Lat 33.6300°, Lon -118.0400°`,
    name: "Huntington Beach Pipeline Drag (California, USA)",
    date: "2021-10-02",
    center: [33.6300, -118.0400],
    image: "/benchmark_data/data/Orange_County_2021/sample_sar.png",
    segmentationImage: "/benchmark_data/outputs/Orange_County_2021_production_segmentation.png",
    hindcastPlot: "/benchmark_data/outputs/Huntington_Beach_Pipeline_Drag_hindcast_plot.png",
    metrics: {
      area: "34.0 sq km",
      perimeter: "42.5 km",
      volume: "130,000 Gallons",
      oilType: "Post-Production Heavy Crude",
      anomaly: "Anchor Dragging Loiter Pattern"
    },
    polygon: [
      [33.660, -118.070],
      [33.665, -118.010],
      [33.600, -118.005],
      [33.595, -118.065]
    ],
    ships: [
      {
        name: "MSC DANIT",
        mmsi: "357051000",
        type: "Container Ship",
        flag: "Panama",
        confidence: 96,
        isCulprit: true,
        sog: 2.1,
        cog: 260,
        track: [
          [33.645, -118.055],
          [33.638, -118.048],
          [33.630, -118.040]
        ]
      },
      {
        name: "BEIJING",
        mmsi: "355912000",
        type: "Container Ship",
        flag: "Panama",
        confidence: 32,
        isCulprit: false,
        sog: 14.8,
        cog: 120,
        track: [
          [33.610, -118.020],
          [33.620, -118.030]
        ]
      }
    ]
  },
  {
    id: "repsol-peru-2022",
    briefingText: `  • Selected Incident Benchmark : La Pampilla Refinery Wave Spill
  • Incident Region / Location  : Ventanilla, Peru
  • Primary Sensor Platform     : Sentinel-1 C-Band SAR (IW Mode)
  • Detection Timestamp (T_det) : 2022-01-15 18:00:00 UTC
  • Calculated Slick Centroid  : Lat -11.8700°, Lon -77.1500°
  • Estimated Slick Area        : 10.5 km²
  • Estimated Slick Perimeter   : 13.61 km
  • Target Anomaly Profile      : Abnormal Discharge Motion

[SECTION 2: METOCEAN PHYSICAL FORCING DATA & OCEAN CONDITIONS]
-------------------------------------------------------------------------------------
  • Active MetOcean Source Profile : TIER 1: Google Drive Persistent Cache (.json)
  • Atmospheric Wind Velocity (10m): u = 0.7124 m/s | v = 3.0855 m/s
  • Surface Ocean Current Velocity : u = 0.1571 m/s | v = -0.1571 m/s
  • Calculated Drift Resultant Speed: 0.2222 m/s
  • Hydrodynamic Physics Engine  : OpenDrift 4D Particle Lagrangian (RK4 Integration)

[SECTION 3: 4D LAGRANGIAN HINDCASTING & VIRTUAL RELEASE SPILL LOCATION]
-------------------------------------------------------------------------------------
  • Hindcast Window Start Time   : 2022-01-13 18:00:00 UTC (T - 48 Hours)
  • Isolated Origin Bounding Box : Latitude  [-11.7632°, -11.6932°]
                                   Longitude [-77.4637°, -77.4220°]
  • Estimated Point of Release   : Lat -11.7258°, Lon -77.4350°
  • Particle Dispersion Spread   : 1,500 particles seeded over 1.5 km radius

[SECTION 4: REGIONAL AIS TRAFFIC INTERSECTION & SPATIO-TEMPORAL AUDIT]
-------------------------------------------------------------------------------------
  • Spatial Indexing Grid System : Uber H3 Hexagonal Grid (Resolution 8)
  • Total Regional Waypoints     : 196 hourly trajectory pings evaluated
  • Total Unique Vessels Tracked : 4 candidate ships in spatio-temporal window
  • Footprint Intersection Hits  : 79 waypoint hits registered inside origin cloud

[SECTION 5: FORWARD LOOP-CLOSURE VALIDATION & CLEANUP FORECAST]
-------------------------------------------------------------------------------------
  • Top Suspect Loop-Closure     : Simulated forward from T - 48h to T_det
  • Simulated Forward Centroid   : Lat -11.7258°, Lon -77.4350°
  • Measured SAR Drift Error     : 35.45 km spatial variance
  • Forward Alignment Match (IoU): 0.0% Match Score
  • Future Forecast Target Window: T + 48 Hours @ 2022-01-17 18:00:00 UTC
  • Future Intercept Centroid    : Lat -11.8700°, Lon -77.1500°`,
    name: "La Pampilla Refinery Wave Spill (Ventanilla, Peru)",
    date: "2022-01-15",
    center: [-11.8700, -77.1500],
    image: "/benchmark_data/data/Repsol_Peru_2022/sample_sar.png",
    segmentationImage: "/benchmark_data/outputs/Repsol_Peru_2022_production_segmentation.png",
    hindcastPlot: "/benchmark_data/outputs/La_Pampilla_Refinery_Wave_Spill_animated_map.html",
    metrics: {
      area: "10.5 sq km",
      perimeter: "19.4 km",
      volume: "12,000 Barrels",
      oilType: "Crude Oil",
      anomaly: "Abnormal Discharge Motion / Tsunami Swell"
    },
    polygon: [
      [-11.850, -77.160],
      [-11.855, -77.135],
      [-11.890, -77.140],
      [-11.885, -77.165]
    ],
    ships: [
      {
        name: "MARE DORICUM",
        mmsi: "247275900",
        type: "Crude Oil Tanker",
        flag: "Italy",
        confidence: 97,
        isCulprit: true,
        sog: 0.1,
        cog: 340,
        track: [
          [-11.865, -77.145],
          [-11.870, -77.150]
        ]
      }
    ]
  },
  {
    id: "rotterdam-2018",
    briefingText: `  • Selected Incident Benchmark : Port of Rotterdam Collision
  • Incident Region / Location  : Rotterdam, Netherlands
  • Primary Sensor Platform     : Sentinel-1 C-Band SAR (IW Mode)
  • Detection Timestamp (T_det) : 2018-06-23 13:30:00 UTC
  • Calculated Slick Centroid  : Lat 51.8800°, Lon 4.2900°
  • Estimated Slick Area        : 2.1 km²
  • Estimated Slick Perimeter   : 6.09 km
  • Target Anomaly Profile      : Sudden Dock Impact / Course Change

[SECTION 2: METOCEAN PHYSICAL FORCING DATA & OCEAN CONDITIONS]
-------------------------------------------------------------------------------------
  • Active MetOcean Source Profile : TIER 1: Google Drive Persistent Cache (.json)
  • Atmospheric Wind Velocity (10m): u = 2.4041 m/s | v = -0.7811 m/s
  • Surface Ocean Current Velocity : u = -0.1500 m/s | v = 0.1000 m/s
  • Calculated Drift Resultant Speed: 0.1803 m/s
  • Hydrodynamic Physics Engine  : OpenDrift 4D Particle Lagrangian (RK4 Integration)

[SECTION 3: 4D LAGRANGIAN HINDCASTING & VIRTUAL RELEASE SPILL LOCATION]
-------------------------------------------------------------------------------------
  • Hindcast Window Start Time   : 2018-06-21 13:30:00 UTC (T - 48 Hours)
  • Isolated Origin Bounding Box : Latitude  [51.7816°, 51.7816°]
                                   Longitude [4.2369°, 4.2369°]
  • Estimated Point of Release   : Lat 51.7816°, Lon 4.2369°
  • Particle Dispersion Spread   : 1,500 particles seeded over 1.5 km radius

[SECTION 4: REGIONAL AIS TRAFFIC INTERSECTION & SPATIO-TEMPORAL AUDIT]
-------------------------------------------------------------------------------------
  • Spatial Indexing Grid System : Uber H3 Hexagonal Grid (Resolution 8)
  • Total Regional Waypoints     : 196 hourly trajectory pings evaluated
  • Total Unique Vessels Tracked : 4 candidate ships in spatio-temporal window
  • Footprint Intersection Hits  : 76 waypoint hits registered inside origin cloud

[SECTION 5: FORWARD LOOP-CLOSURE VALIDATION & CLEANUP FORECAST]
-------------------------------------------------------------------------------------
  • Top Suspect Loop-Closure     : Simulated forward from T - 48h to T_det
  • Simulated Forward Centroid   : Lat 51.7816°, Lon 4.2369°
  • Measured SAR Drift Error     : 12.41 km spatial variance
  • Forward Alignment Match (IoU): 44.1% Match Score
  • Future Forecast Target Window: T + 48 Hours @ 2018-06-25 13:30:00 UTC
  • Future Intercept Centroid    : Lat 51.8800°, Lon 4.2900°`,
    name: "Port of Rotterdam Collision / Bow Jubail (Netherlands)",
    date: "2018-06-23",
    center: [51.8800, 4.2900],
    image: "/benchmark_data/data/Rotterdam_2018/sample_sar.png",
    segmentationImage: "/benchmark_data/outputs/Rotterdam_2018_production_segmentation.png",
    hindcastPlot: "/benchmark_data/outputs/Port_of_Rotterdam_Collision_hindcast_plot.png",
    metrics: {
      area: "2.1 sq km",
      perimeter: "8.4 km",
      volume: "220 Metric Tons",
      oilType: "Heavy Bunker Oil",
      anomaly: "Sudden Dock Impact & Course Deviation"
    },
    polygon: [
      [51.890, 4.275],
      [51.895, 4.305],
      [51.870, 4.300],
      [51.868, 4.280]
    ],
    ships: [
      {
        name: "BOW JUBAIL",
        mmsi: "259757000",
        type: "Chemical Tanker",
        flag: "Norway",
        confidence: 99,
        isCulprit: true,
        sog: 4.5,
        cog: 85,
        track: [
          [51.875, 4.280],
          [51.880, 4.290]
        ]
      }
    ]
  },
  {
    id: "tobago-2024",
    name: "Tobago Barge Oil Spill (Caribbean)",
    date: "2024-02-07",
    center: [11.1400, -60.7900],
    image: "/benchmark_data/data/Tobago_2024/sample_sar.png",
    segmentationImage: "/benchmark_data/outputs/Tobago_2024_production_segmentation.png",
    panelImage: "/benchmark_data/outputs/Tobago_Barge_2024_3panel_segmentation.png",
    hindcastPlot: "/benchmark_data/outputs/Tobago_Gulfstream_Oil_Spill_hindcast_plot.png",
    metrics: {
      area: "160.0 sq km",
      perimeter: "85.2 km",
      volume: "35,000 Barrels",
      oilType: "Heavy Bunker Fuel",
      anomaly: "Transponder Blackout (Dark Fleet AIS Gap)"
    },
    polygon: [
      [11.180, -60.840],
      [11.170, -60.740],
      [11.100, -60.750],
      [11.110, -60.830]
    ],
    ships: [
      {
        name: "SOLO CREED (TUG)",
        mmsi: "677045700",
        type: "Tugboat / Towing Vessel",
        flag: "Tanzania",
        confidence: 95,
        isCulprit: true,
        sog: 0.0,
        cog: 0,
        track: [
          [11.135, -60.785],
          [11.140, -60.790]
        ]
      },
      {
        name: "CARIBBEAN STAR",
        mmsi: "355912000",
        type: "Passenger/Ro-Ro",
        flag: "Trinidad & Tobago",
        confidence: 12,
        isCulprit: false,
        sog: 16.0,
        cog: 110,
        track: [
          [11.120, -60.760],
          [11.130, -60.770]
        ]
      }
    ]
  }
];

// ─── Vessel type config ───────────────────────────────────────────────────
export const VESSEL_TYPE_CONFIG = {
  Tanker:    { color:'#f87171', types:[80,81,82,83,84,85,86,87,88,89] },
  Cargo:     { color:'#fbbf24', types:[70,71,72,73,74,75,76,77,78,79] },
  Passenger: { color:'#c084fc', types:[60,61,62,63,64,65,66,67,68,69] },
  Fishing:   { color:'#34d399', types:[30,31,32,33,34,35,36,37,38,39] },
  Special:   { color:'#60a5fa', types:[50,51,52,53,54,55,56,57,58,59] },
  Other:     { color:'#94a3b8', types:[] },
}

export function getVesselCategory(shipType) {
  const t = Number(shipType)
  for (const [cat, cfg] of Object.entries(VESSEL_TYPE_CONFIG)) {
    if (cfg.types.includes(t)) return cat
  }
  return 'Other'
}

export function getVesselColor(shipType) {
  return VESSEL_TYPE_CONFIG[getVesselCategory(shipType)].color
}

export function getVesselTypeName(shipType) {
  const t = Number(shipType)
  if (isNaN(t) || t === 0) return 'Unknown'
  if (t >= 20 && t <= 29) return 'WIG'
  if (t >= 30 && t <= 39) return 'Fishing'
  if (t >= 40 && t <= 49) return 'High-Speed'
  if (t >= 50 && t <= 59) return 'Special'
  if (t >= 60 && t <= 69) return 'Passenger'
  if (t >= 70 && t <= 79) return 'Cargo'
  if (t >= 80 && t <= 89) return 'Tanker'
  return `Other`
}

export function getNavStatusName(s) {
  return { 0:'Under way (engine)',1:'At anchor',2:'Not under command',
    3:'Restricted manoeuvrability',4:'Constrained by draught',5:'Moored',
    6:'Aground',7:'Engaged in fishing',8:'Under way sailing',15:'Not defined',
  }[s] ?? `Status ${s}`
}

export function getFlagFromMMSI(mmsi) {
  const mid = String(mmsi).slice(0,3)
  return {'419':'🇮🇳 India','232':'🇬🇧 UK','538':'🇲🇭 Marshall Is.','229':'🇲🇹 Malta',
    '566':'🇸🇬 Singapore','477':'🇭🇰 Hong Kong','636':'🇱🇷 Liberia','370':'🇵🇦 Panama',
    '311':'🇧🇸 Bahamas','338':'🇺🇸 USA','503':'🇦🇺 Australia','440':'🇰🇷 S.Korea',
  }[mid] ?? ''
}

