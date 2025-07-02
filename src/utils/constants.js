// LOD thresholds in light-years (scientifically accurate)
export const LOD_THRESHOLDS = {
  ATMOSPHERE: 1e-12,      // ~100m - atmospheric/sky detail
  SURFACE: 1e-8,          // ~100km - planetary surface  
  ORBITAL: 5e-6,          // ~50,000km - orbital mechanics
  STELLAR: 4.3,           // 4.3 light-years - stellar neighborhood
  GALACTIC: 100000,       // 100,000 light-years - galactic scale
  LOCAL_GROUP: 3000000,   // 3 million light-years - local galaxy group
  COSMIC_WEB: 30000000,   // 30 million light-years - cosmic web
  CMB: 13800000000,       // Observable universe edge (13.8 billion ly)
};

// Planetary entry system constants
export const PLANETARY_CONSTANTS = {
  ENTRY_THRESHOLD: 1.2, // Enter when within 120% of planet radius
  EXIT_THRESHOLD: 2.0,  // Auto-exit when beyond 200% of planet radius
};

// Camera constants
export const CAMERA_CONSTANTS = {
  FOV: 60,
  NEAR: 0.001,
  FAR: 1e15,
  SMOOTHING: 0.92, // Camera smoothing factor
};

// Mobile detection
export const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Scene constants
export const SCENE_CONSTANTS = {
  FOG_COLOR: 0x000011,
  FOG_DENSITY: 0.00003,
};

// Atmospheric layer data
export const ATMOSPHERE_LAYERS = [
  { name: 'Troposphere', height: 0.012, color: 0x87CEEB, opacity: 0.3 },
  { name: 'Stratosphere', height: 0.050, color: 0x4169E1, opacity: 0.2 },
  { name: 'Mesosphere', height: 0.085, color: 0x191970, opacity: 0.1 },
  { name: 'Thermosphere', height: 0.600, color: 0x000080, opacity: 0.05 },
];