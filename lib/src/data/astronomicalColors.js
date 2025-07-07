/**
 * Real astronomical color data based on spectral types and NASA observations
 */

// Star colors based on spectral type (O, B, A, F, G, K, M)
export const STAR_COLORS = {
  'O': { r: 0.6, g: 0.7, b: 1.0, temp: 30000 },    // Blue
  'B': { r: 0.7, g: 0.8, b: 1.0, temp: 20000 },    // Blue-white
  'A': { r: 0.9, g: 0.9, b: 1.0, temp: 10000 },    // White
  'F': { r: 1.0, g: 1.0, b: 0.9, temp: 7000 },     // Yellow-white
  'G': { r: 1.0, g: 1.0, b: 0.8, temp: 5500 },     // Yellow (like our Sun)
  'K': { r: 1.0, g: 0.8, b: 0.6, temp: 4000 },     // Orange
  'M': { r: 1.0, g: 0.6, b: 0.4, temp: 3000 },     // Red
  'L': { r: 0.8, g: 0.4, b: 0.3, temp: 2000 },     // Dark red
  'T': { r: 0.6, g: 0.3, b: 0.4, temp: 1000 },     // Brown dwarf
  'Y': { r: 0.4, g: 0.2, b: 0.3, temp: 500 }       // Cool brown dwarf
};

// Get star color from spectral type string
export function getStarColor(spectralType) {
  if (!spectralType) return STAR_COLORS['G']; // Default to sun-like
  
  const firstChar = spectralType.charAt(0).toUpperCase();
  return STAR_COLORS[firstChar] || STAR_COLORS['G'];
}

// Nebula colors based on emission types (from Hubble data)
export const NEBULA_COLORS = {
  'emission': [
    { r: 1.0, g: 0.0, b: 0.4 },  // H-alpha red
    { r: 0.0, g: 1.0, b: 0.8 },  // OIII cyan
    { r: 0.5, g: 0.0, b: 1.0 }   // H-beta blue
  ],
  'planetary': [
    { r: 0.0, g: 1.0, b: 0.5 },  // OIII green
    { r: 1.0, g: 0.0, b: 1.0 },  // H-alpha + NII magenta
    { r: 0.0, g: 0.5, b: 1.0 }   // HeII blue
  ],
  'reflection': [
    { r: 0.3, g: 0.5, b: 1.0 },  // Blue reflection
    { r: 0.5, g: 0.6, b: 0.9 },  // Light blue
    { r: 0.7, g: 0.8, b: 1.0 }   // Very light blue
  ],
  'supernova': [
    { r: 1.0, g: 0.5, b: 0.0 },  // Orange shock
    { r: 0.0, g: 1.0, b: 1.0 },  // Cyan oxygen
    { r: 1.0, g: 1.0, b: 0.0 }   // Yellow sulfur
  ],
  'dark': [
    { r: 0.1, g: 0.05, b: 0.0 }, // Brown dust
    { r: 0.2, g: 0.1, b: 0.05 }, // Dark brown
    { r: 0.3, g: 0.15, b: 0.1 }  // Light brown
  ],
  'star-forming': [
    { r: 1.0, g: 0.3, b: 0.0 },  // Orange hot gas
    { r: 0.0, g: 0.3, b: 1.0 },  // Blue young stars
    { r: 1.0, g: 0.0, b: 0.3 }   // Red H-alpha
  ]
};

// Galaxy colors based on type
export const GALAXY_COLORS = {
  'spiral': {
    core: { r: 1.0, g: 0.9, b: 0.7 },     // Yellow core
    arms: { r: 0.4, g: 0.6, b: 1.0 },     // Blue star-forming arms
    halo: { r: 1.0, g: 0.8, b: 0.6 }      // Orange old stars
  },
  'elliptical': {
    core: { r: 1.0, g: 0.8, b: 0.6 },     // Red-orange old stars
    arms: { r: 1.0, g: 0.7, b: 0.5 },     // Orange
    halo: { r: 0.9, g: 0.6, b: 0.4 }      // Dark orange
  },
  'irregular': {
    core: { r: 0.6, g: 0.8, b: 1.0 },     // Blue young stars
    arms: { r: 1.0, g: 0.0, b: 0.5 },     // Pink H-alpha regions
    halo: { r: 0.0, g: 1.0, b: 0.8 }      // Cyan OIII
  },
  'lenticular': {
    core: { r: 1.0, g: 0.9, b: 0.8 },     // Pale yellow
    arms: { r: 0.9, g: 0.8, b: 0.7 },     // Beige
    halo: { r: 0.8, g: 0.7, b: 0.6 }      // Light brown
  },
  'ring': {
    core: { r: 0.8, g: 0.9, b: 1.0 },     // Light blue center
    arms: { r: 0.0, g: 0.5, b: 1.0 },     // Blue ring
    halo: { r: 1.0, g: 0.5, b: 0.0 }      // Orange outer
  },
  'quasar': {
    core: { r: 1.0, g: 1.0, b: 1.0 },     // Bright white
    arms: { r: 0.0, g: 0.5, b: 1.0 },     // Blue jets
    halo: { r: 1.0, g: 0.0, b: 0.5 }      // Pink accretion
  }
};

// Exoplanet colors based on type
export const PLANET_COLORS = {
  'hot_jupiter': { r: 0.8, g: 0.2, b: 0.0 },     // Dark red/orange
  'gas_giant': { r: 0.9, g: 0.7, b: 0.4 },       // Jupiter-like
  'ice_giant': { r: 0.4, g: 0.6, b: 0.9 },       // Neptune-like
  'terrestrial': { r: 0.6, g: 0.5, b: 0.4 },     // Rocky brown
  'ocean': { r: 0.2, g: 0.4, b: 0.8 },           // Deep blue
  'desert': { r: 0.9, g: 0.7, b: 0.3 },          // Sandy yellow
  'lava': { r: 1.0, g: 0.3, b: 0.0 }             // Molten orange
};

// Convert RGB to Three.js color (Three.js must be imported in the consuming file)
export function rgbToThreeColor(rgb) {
  return { r: rgb.r, g: rgb.g, b: rgb.b };
}

// Get enhanced star color with temperature variation
export function getEnhancedStarColor(spectralType, magnitude) {
  const baseColor = getStarColor(spectralType);
  
  // Add slight variation based on magnitude
  const variation = (Math.random() - 0.5) * 0.1;
  
  return {
    r: Math.min(1, Math.max(0, baseColor.r + variation)),
    g: Math.min(1, Math.max(0, baseColor.g + variation)),
    b: Math.min(1, Math.max(0, baseColor.b + variation))
  };
}