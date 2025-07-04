// Extended Galaxy Catalog
// Contains thousands of galaxies from various astronomical surveys

import { optimizedGalaxyCatalog } from './optimizedGalaxyCatalog.js';

// Generate procedural galaxies based on real distribution patterns
export function generateGalaxyDistribution(count = 10000) {
  const galaxies = [];
  
  // Use actual cosmic web structure patterns
  const filamentCount = 50;
  const voidRadius = 5000;
  
  for (let i = 0; i < count; i++) {
    // Create filamentary structure (cosmic web)
    const filament = Math.floor(Math.random() * filamentCount);
    const filamentAngle = (filament / filamentCount) * Math.PI * 2;
    
    // Distance along filament
    const distanceAlongFilament = Math.random() * 100000;
    
    // Perpendicular scatter from filament
    const scatter = Math.random() * 2000 * Math.exp(-distanceAlongFilament / 50000);
    
    // Avoid voids
    let x, y, z;
    do {
      x = Math.cos(filamentAngle) * distanceAlongFilament + (Math.random() - 0.5) * scatter;
      y = (Math.random() - 0.5) * scatter * 0.3; // Flatter distribution
      z = Math.sin(filamentAngle) * distanceAlongFilament + (Math.random() - 0.5) * scatter;
    } while (isInVoid(x, y, z, voidRadius));
    
    // Galaxy properties based on location
    const distanceFromCenter = Math.sqrt(x * x + y * y + z * z);
    const type = selectGalaxyType(distanceFromCenter);
    const magnitude = 10 + Math.random() * 8 - (distanceFromCenter / 50000);
    const size = getGalaxySize(type, magnitude);
    
    galaxies.push({
      id: `PG${i}`, // Procedural Galaxy
      position: { x, y, z },
      type: type,
      magnitude: magnitude,
      size: size,
      redshift: distanceFromCenter / 100000, // Simplified redshift
      morphology: getGalaxyMorphology(type),
      color: getGalaxyColor(type, distanceFromCenter),
    });
  }
  
  return galaxies;
}

// Check if position is in a cosmic void
function isInVoid(x, y, z, voidRadius) {
  // Define some void centers
  const voids = [
    { x: 10000, y: 0, z: 10000 },
    { x: -15000, y: 5000, z: -15000 },
    { x: 20000, y: -3000, z: -20000 },
    { x: -25000, y: 2000, z: 5000 },
    { x: 5000, y: -5000, z: -30000 },
  ];
  
  for (const voidCenter of voids) {
    const dx = x - voidCenter.x;
    const dy = y - voidCenter.y;
    const dz = z - voidCenter.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance < voidRadius) {
      return true;
    }
  }
  
  return false;
}

// Select galaxy type based on environment
function selectGalaxyType(distance) {
  const rand = Math.random();
  
  // Galaxy types change with distance (environment)
  if (distance < 10000) {
    // Dense regions - more ellipticals
    if (rand < 0.4) return 'elliptical';
    if (rand < 0.8) return 'spiral';
    return 'irregular';
  } else if (distance < 50000) {
    // Normal regions
    if (rand < 0.2) return 'elliptical';
    if (rand < 0.9) return 'spiral';
    return 'irregular';
  } else {
    // Outer regions - more irregulars
    if (rand < 0.1) return 'elliptical';
    if (rand < 0.7) return 'spiral';
    return 'irregular';
  }
}

// Get galaxy size based on type and magnitude
function getGalaxySize(type, magnitude) {
  const baseSize = 20 - magnitude;
  
  switch (type) {
    case 'elliptical':
      return baseSize * (0.5 + Math.random() * 2); // Can be very large
    case 'spiral':
      return baseSize * (0.8 + Math.random() * 0.4);
    case 'irregular':
      return baseSize * (0.3 + Math.random() * 0.7);
    default:
      return baseSize;
  }
}

// Get detailed morphology
function getGalaxyMorphology(type) {
  switch (type) {
    case 'elliptical':
      const eType = Math.floor(Math.random() * 8);
      return `E${eType}`;
    case 'spiral':
      const spiralTypes = ['Sa', 'Sb', 'Sc', 'SBa', 'SBb', 'SBc'];
      return spiralTypes[Math.floor(Math.random() * spiralTypes.length)];
    case 'irregular':
      return 'Irr';
    default:
      return 'Unknown';
  }
}

// Get galaxy color based on type and age
function getGalaxyColor(type, distance) {
  const age = distance / 20000; // Simplified age proxy
  
  switch (type) {
    case 'elliptical':
      // Older, redder galaxies
      return {
        core: 0xffddaa,
        arms: 0xffcc99,
        halo: 0xff9966,
      };
    case 'spiral':
      // Mix of young blue and older yellow stars
      return {
        core: 0xffffcc,
        arms: age > 2 ? 0xccddff : 0xaaccff,
        halo: 0x8899cc,
      };
    case 'irregular':
      // Active star formation, bluer
      return {
        core: 0xaaddff,
        arms: 0x88ccff,
        halo: 0x6699ff,
      };
    default:
      return {
        core: 0xffffff,
        arms: 0xcccccc,
        halo: 0x888888,
      };
  }
}

// Real galaxy clusters from surveys
export const galaxyClusters = [
  {
    name: 'Virgo Cluster',
    center: { x: 16400, y: 0, z: 0 },
    radius: 2200,
    galaxyCount: 1300,
    brightestGalaxy: 'M87',
  },
  {
    name: 'Coma Cluster',
    center: { x: 99000, y: 5000, z: 10000 },
    radius: 6000,
    galaxyCount: 10000,
    brightestGalaxy: 'NGC 4889',
  },
  {
    name: 'Perseus Cluster',
    center: { x: 73000, y: -3000, z: 15000 },
    radius: 5000,
    galaxyCount: 1900,
    brightestGalaxy: 'NGC 1275',
  },
  {
    name: 'Fornax Cluster',
    center: { x: 19000, y: -8000, z: -5000 },
    radius: 2000,
    galaxyCount: 340,
    brightestGalaxy: 'NGC 1399',
  },
  {
    name: 'Hydra Cluster',
    center: { x: 48000, y: -10000, z: -15000 },
    radius: 3000,
    galaxyCount: 157,
    brightestGalaxy: 'NGC 3311',
  },
];

// Generate galaxies for a specific cluster
export function generateClusterGalaxies(cluster) {
  const galaxies = [];
  
  for (let i = 0; i < cluster.galaxyCount; i++) {
    // Use NFW profile for cluster density
    const r = Math.random() * cluster.radius;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    // Apply density profile (denser in center)
    const densityFactor = 1 / (1 + Math.pow(r / (cluster.radius * 0.2), 2));
    const actualR = r * (1 - densityFactor * 0.5);
    
    const x = cluster.center.x + actualR * Math.sin(phi) * Math.cos(theta);
    const y = cluster.center.y + actualR * Math.sin(phi) * Math.sin(theta);
    const z = cluster.center.z + actualR * Math.cos(phi);
    
    // Cluster galaxies tend to be ellipticals in the center
    const distFromCenter = actualR / cluster.radius;
    const type = distFromCenter < 0.3 && Math.random() < 0.7 ? 'elliptical' : 
                 Math.random() < 0.8 ? 'spiral' : 'irregular';
    
    const magnitude = 12 + Math.random() * 6 + distFromCenter * 2;
    
    galaxies.push({
      id: `${cluster.name}-${i}`,
      position: { x, y, z },
      type: type,
      magnitude: magnitude,
      size: getGalaxySize(type, magnitude),
      cluster: cluster.name,
      morphology: getGalaxyMorphology(type),
      color: getGalaxyColor(type, distFromCenter),
    });
  }
  
  return galaxies;
}

// Notable individual galaxies with accurate positions
export const notableGalaxies = [
  // Local Group
  { name: 'Milky Way', id: 'MW', position: { x: 0, y: 0, z: 0 }, type: 'spiral', morphology: 'SBbc', magnitude: -20.9, size: 100 },
  { name: 'Andromeda (M31)', id: 'M31', position: { x: 778, y: 0, z: 0 }, type: 'spiral', morphology: 'SA(s)b', magnitude: 3.44, size: 220 },
  { name: 'Triangulum (M33)', id: 'M33', position: { x: 840, y: 100, z: 50 }, type: 'spiral', morphology: 'SA(s)cd', magnitude: 5.72, size: 60 },
  { name: 'Large Magellanic Cloud', id: 'LMC', position: { x: 50, y: -50, z: -30 }, type: 'irregular', morphology: 'SB(s)m', magnitude: 0.13, size: 14 },
  { name: 'Small Magellanic Cloud', id: 'SMC', position: { x: 60, y: -60, z: -40 }, type: 'irregular', morphology: 'SB(s)m pec', magnitude: 2.7, size: 7 },
  
  // Sculptor Group
  { name: 'Sculptor Galaxy (NGC 253)', id: 'NGC253', position: { x: 3900, y: -200, z: -100 }, type: 'spiral', morphology: 'SAB(s)c', magnitude: 8.0, size: 90 },
  { name: 'NGC 247', id: 'NGC247', position: { x: 3600, y: -180, z: -90 }, type: 'spiral', morphology: 'SAB(s)d', magnitude: 9.9, size: 70 },
  
  // M81 Group
  { name: 'Bode\'s Galaxy (M81)', id: 'M81', position: { x: 3630, y: 2000, z: 1000 }, type: 'spiral', morphology: 'SA(s)ab', magnitude: 6.94, size: 90 },
  { name: 'Cigar Galaxy (M82)', id: 'M82', position: { x: 3530, y: 2050, z: 1020 }, type: 'irregular', morphology: 'I0', magnitude: 8.41, size: 40 },
  { name: 'NGC 3077', id: 'NGC3077', position: { x: 3600, y: 2030, z: 1010 }, type: 'elliptical', morphology: 'E2 pec', magnitude: 10.6, size: 20 },
  
  // Centaurus A/M83 Group
  { name: 'Centaurus A', id: 'CenA', position: { x: 3800, y: -1500, z: -800 }, type: 'elliptical', morphology: 'S0 pec', magnitude: 6.84, size: 60 },
  { name: 'M83', id: 'M83', position: { x: 4610, y: -1800, z: -900 }, type: 'spiral', morphology: 'SAB(s)c', magnitude: 7.54, size: 55 },
  
  // Leo Triplet
  { name: 'M65', id: 'M65', position: { x: 10250, y: 500, z: 200 }, type: 'spiral', morphology: 'SAB(rs)a', magnitude: 10.25, size: 42 },
  { name: 'M66', id: 'M66', position: { x: 9700, y: 480, z: 190 }, type: 'spiral', morphology: 'SAB(s)b', magnitude: 8.92, size: 41 },
  { name: 'NGC 3628', id: 'NGC3628', position: { x: 10000, y: 490, z: 195 }, type: 'spiral', morphology: 'SAb pec', magnitude: 10.2, size: 44 },
  
  // More distant notable galaxies
  { name: 'Whirlpool (M51)', id: 'M51', position: { x: 7220, y: 3000, z: 1500 }, type: 'spiral', morphology: 'SA(s)bc pec', magnitude: 8.4, size: 76 },
  { name: 'Sombrero (M104)', id: 'M104', position: { x: 9550, y: -2000, z: -1000 }, type: 'spiral', morphology: 'SA(s)a', magnitude: 8.0, size: 50 },
  { name: 'Black Eye (M64)', id: 'M64', position: { x: 5300, y: 1000, z: 500 }, type: 'spiral', morphology: '(R)SA(rs)ab', magnitude: 8.52, size: 40 },
  { name: 'Pinwheel (M101)', id: 'M101', position: { x: 6400, y: 3500, z: 1800 }, type: 'spiral', morphology: 'SAB(rs)cd', magnitude: 7.86, size: 170 },
  
  // Starburst galaxies
  { name: 'NGC 1569', id: 'NGC1569', position: { x: 3400, y: 1500, z: 800 }, type: 'irregular', morphology: 'IBm', magnitude: 11.9, size: 8 },
  { name: 'M94', id: 'M94', position: { x: 4660, y: 2200, z: 1100 }, type: 'spiral', morphology: '(R)SA(r)ab', magnitude: 8.99, size: 45 },
  
  // Ring galaxies
  { name: 'Hoag\'s Object', id: 'Hoag', position: { x: 183000, y: 10000, z: 5000 }, type: 'ring', morphology: 'SA0+ pec', magnitude: 16.2, size: 17 },
  { name: 'Cartwheel Galaxy', id: 'Cartwheel', position: { x: 150000, y: -20000, z: -10000 }, type: 'ring', morphology: 'S pec', magnitude: 15.2, size: 44 },
];

// Quasars and active galactic nuclei
export const quasars = [
  { name: '3C 273', id: 'Q3C273', position: { x: 749000, y: 10000, z: 5000 }, redshift: 0.158, magnitude: 12.9 },
  { name: '3C 48', id: 'Q3C48', position: { x: 1320000, y: 50000, z: 25000 }, redshift: 0.367, magnitude: 16.2 },
  { name: 'PKS 2126-158', id: 'QPKS2126', position: { x: 3600000, y: -100000, z: -50000 }, redshift: 3.27, magnitude: 17.0 },
  { name: 'ULAS J1120+0641', id: 'QULAS1120', position: { x: 8900000, y: 200000, z: 100000 }, redshift: 7.085, magnitude: 20.0 },
];

// Deep field galaxies (extremely distant)
export function generateDeepFieldGalaxies(count = 5000) {
  const deepFieldGalaxies = [];
  
  for (let i = 0; i < count; i++) {
    // These are at cosmological distances
    const redshift = 0.5 + Math.random() * 10; // z = 0.5 to 10.5
    const distance = redshiftToDistance(redshift) * 1000; // Convert Mpc to simulation units
    
    // Random position on celestial sphere
    const ra = Math.random() * 360;
    const dec = (Math.random() - 0.5) * 180;
    
    const raRad = (ra * Math.PI) / 180;
    const decRad = (dec * Math.PI) / 180;
    
    const x = distance * Math.cos(decRad) * Math.cos(raRad);
    const y = distance * Math.cos(decRad) * Math.sin(raRad);
    const z = distance * Math.sin(decRad);
    
    // High-redshift galaxies tend to be smaller and bluer
    const type = Math.random() < 0.3 ? 'irregular' : 'spiral';
    const magnitude = 20 + Math.random() * 8;
    
    deepFieldGalaxies.push({
      id: `DF${i}`,
      position: { x, y, z },
      type: type,
      magnitude: magnitude,
      size: 5 + Math.random() * 20,
      redshift: redshift,
      morphology: getGalaxyMorphology(type),
      color: {
        core: 0x6699ff,
        arms: 0x4477ff,
        halo: 0x2255ff,
      },
    });
  }
  
  return deepFieldGalaxies;
}

// Convert redshift to comoving distance (simplified)
function redshiftToDistance(z) {
  // Simplified Hubble's law for demonstration
  // In reality, this would use proper cosmological calculations
  const H0 = 70; // km/s/Mpc
  const c = 299792; // km/s
  
  // For small z, d ≈ cz/H0
  // For large z, need integration with cosmological parameters
  if (z < 0.1) {
    return (c * z) / H0;
  } else {
    // Approximation for higher redshifts
    return (c / H0) * (z + 0.5 * z * z);
  }
}

// Galaxy superstructures
export const superstructures = [
  {
    name: 'Great Wall',
    type: 'wall',
    start: { x: 50000, y: -5000, z: 0 },
    end: { x: 150000, y: 5000, z: 20000 },
    width: 15000,
    galaxyDensity: 0.8,
  },
  {
    name: 'Boötes Void',
    type: 'void',
    center: { x: 100000, y: 20000, z: 30000 },
    radius: 30000,
    galaxyDensity: 0.05,
  },
  {
    name: 'Local Void',
    type: 'void',
    center: { x: -5000, y: -2000, z: -3000 },
    radius: 8000,
    galaxyDensity: 0.1,
  },
];


// Export complete galaxy catalog generator
export function generateCompleteGalaxyCatalog() {
  // Initialize optimized catalog with notable galaxies
  optimizedGalaxyCatalog.initialize(notableGalaxies, galaxyClusters);
  
  const catalog = {
    notable: notableGalaxies,
    clusters: galaxyClusters,
    field: [], // Field galaxies generated on-demand
    deepField: [], // Deep field galaxies generated on-demand
    quasars: quasars,
    total: optimizedGalaxyCatalog.getTotalCount(),
    optimized: optimizedGalaxyCatalog // Reference to optimized catalog
  };
  
  return catalog;
}