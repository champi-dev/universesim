// Comprehensive Star Catalog
// Based on real astronomical data from Hipparcos, Gaia, and other surveys

import { getSpectralColor } from './nasaDataFetcher.js';
import { optimizedCatalog } from './optimizedStarCatalog.js';

// Brightest stars visible from Earth (Hipparcos catalog subset)
export const brightStars = [
  // Magnitude < 0
  { name: 'Sirius', hip: 32349, ra: 101.287, dec: -16.716, mag: -1.46, distance: 2.64, spectralType: 'A1V', constellation: 'CMa' },
  { name: 'Canopus', hip: 30438, ra: 95.988, dec: -52.696, mag: -0.74, distance: 95.88, spectralType: 'A9II', constellation: 'Car' },
  { name: 'Rigil Kentaurus', hip: 71683, ra: 219.899, dec: -60.834, mag: -0.27, distance: 1.34, spectralType: 'G2V', constellation: 'Cen' },
  { name: 'Arcturus', hip: 69673, ra: 213.915, dec: 19.182, mag: -0.05, distance: 11.26, spectralType: 'K1.5III', constellation: 'Boo' },
  
  // Magnitude 0-1
  { name: 'Vega', hip: 91262, ra: 279.234, dec: 38.784, mag: 0.03, distance: 7.68, spectralType: 'A0V', constellation: 'Lyr' },
  { name: 'Capella', hip: 24608, ra: 79.172, dec: 45.998, mag: 0.08, distance: 12.92, spectralType: 'G5III', constellation: 'Aur' },
  { name: 'Rigel', hip: 24436, ra: 78.634, dec: -8.202, mag: 0.13, distance: 264.55, spectralType: 'B8I', constellation: 'Ori' },
  { name: 'Procyon', hip: 37279, ra: 114.826, dec: 5.225, mag: 0.37, distance: 3.51, spectralType: 'F5IV', constellation: 'CMi' },
  { name: 'Achernar', hip: 7588, ra: 24.429, dec: -57.237, mag: 0.46, distance: 44.1, spectralType: 'B6V', constellation: 'Eri' },
  { name: 'Betelgeuse', hip: 27989, ra: 88.793, dec: 7.407, mag: 0.50, distance: 197.43, spectralType: 'M1I', constellation: 'Ori' },
  { name: 'Hadar', hip: 68702, ra: 210.956, dec: -60.373, mag: 0.61, distance: 161.26, spectralType: 'B1III', constellation: 'Cen' },
  { name: 'Altair', hip: 97649, ra: 297.696, dec: 8.868, mag: 0.77, distance: 5.13, spectralType: 'A7V', constellation: 'Aql' },
  { name: 'Acrux', hip: 60718, ra: 186.650, dec: -63.099, mag: 0.76, distance: 99.39, spectralType: 'B0.5V', constellation: 'Cru' },
  { name: 'Aldebaran', hip: 21421, ra: 68.980, dec: 16.509, mag: 0.85, distance: 20.04, spectralType: 'K5III', constellation: 'Tau' },
  { name: 'Antares', hip: 80763, ra: 247.352, dec: -26.432, mag: 0.96, distance: 181.82, spectralType: 'M1I', constellation: 'Sco' },
  { name: 'Spica', hip: 65474, ra: 201.298, dec: -11.161, mag: 0.97, distance: 77.52, spectralType: 'B1V', constellation: 'Vir' },
  
  // Magnitude 1-2 (selection)
  { name: 'Pollux', hip: 37826, ra: 116.329, dec: 28.026, mag: 1.14, distance: 10.36, spectralType: 'K0III', constellation: 'Gem' },
  { name: 'Fomalhaut', hip: 113368, ra: 344.413, dec: -29.622, mag: 1.16, distance: 7.70, spectralType: 'A3V', constellation: 'PsA' },
  { name: 'Deneb', hip: 102098, ra: 310.358, dec: 45.280, mag: 1.25, distance: 802.32, spectralType: 'A2I', constellation: 'Cyg' },
  { name: 'Mimosa', hip: 62434, ra: 191.930, dec: -59.689, mag: 1.30, distance: 108.70, spectralType: 'B0.5III', constellation: 'Cru' },
  { name: 'Regulus', hip: 49669, ra: 152.093, dec: 11.967, mag: 1.35, distance: 23.76, spectralType: 'B8V', constellation: 'Leo' },
  { name: 'Adhara', hip: 33579, ra: 104.656, dec: -28.972, mag: 1.50, distance: 129.87, spectralType: 'B2V', constellation: 'CMa' },
  { name: 'Shaula', hip: 85927, ra: 263.402, dec: -37.104, mag: 1.63, distance: 213.22, spectralType: 'B2IV', constellation: 'Sco' },
  { name: 'Castor', hip: 36850, ra: 113.650, dec: 31.888, mag: 1.57, distance: 15.58, spectralType: 'A1V', constellation: 'Gem' },
  { name: 'Gacrux', hip: 61084, ra: 187.791, dec: -57.113, mag: 1.64, distance: 27.23, spectralType: 'M3III', constellation: 'Cru' },
  { name: 'Bellatrix', hip: 25336, ra: 81.283, dec: 6.350, mag: 1.64, distance: 77.52, spectralType: 'B2III', constellation: 'Ori' },
];

// Notable variable stars
export const variableStars = [
  { name: 'Mira', hip: 10819, ra: 34.837, dec: -2.978, mag: 3.04, magRange: [2.0, 10.1], period: 332, distance: 92.59, spectralType: 'M7III', type: 'Mira' },
  { name: 'Algol', hip: 14576, ra: 47.042, dec: 40.956, mag: 2.12, magRange: [2.12, 3.39], period: 2.87, distance: 27.40, spectralType: 'B8V', type: 'Eclipsing' },
  { name: 'Delta Cephei', hip: 110991, ra: 337.290, dec: 58.415, mag: 4.07, magRange: [3.48, 4.37], period: 5.37, distance: 273.22, spectralType: 'F5I', type: 'Cepheid' },
  { name: 'Eta Carinae', hip: 45348, ra: 161.265, dec: -59.684, mag: 4.3, magRange: [-1.0, 7.9], period: null, distance: 2300, spectralType: 'LBV', type: 'Luminous Blue Variable' },
  { name: 'R Coronae Borealis', hip: 76221, ra: 234.258, dec: 28.157, mag: 5.89, magRange: [5.89, 14.8], period: null, distance: 1400, spectralType: 'F8I', type: 'R CrB' },
];

// Double and multiple star systems
export const multipleStars = [
  { name: 'Alpha Centauri AB', components: 2, separation: 23.7, ra: 219.899, dec: -60.834, distance: 1.34 },
  { name: 'Albireo', components: 2, separation: 34.6, ra: 292.680, dec: 27.960, distance: 133.33, colors: ['K2II', 'B8V'] },
  { name: 'Epsilon Lyrae', components: 4, separation: 208.2, ra: 281.084, dec: 39.673, distance: 48.78 },
  { name: 'Castor', components: 6, separation: 2.9, ra: 113.650, dec: 31.888, distance: 15.58 },
  { name: 'Mizar', components: 4, separation: 14.4, ra: 200.981, dec: 54.926, distance: 24.88 },
];

// Star clusters
export const openClusters = [
  { name: 'Pleiades (M45)', ra: 56.871, dec: 24.105, distance: 136.2, stars: 1000, age: 100, size: 110 },
  { name: 'Hyades', ra: 66.752, dec: 15.870, distance: 46.3, stars: 724, age: 625, size: 330 },
  { name: 'Praesepe (M44)', ra: 130.100, dec: 19.667, distance: 186.2, stars: 1000, age: 600, size: 95 },
  { name: 'Double Cluster', ra: 34.750, dec: 57.133, distance: 2300, stars: 8000, age: 12.8, size: 60 },
  { name: 'Jewel Box', ra: 191.908, dec: -60.752, distance: 1900, stars: 100, age: 14, size: 10 },
  { name: 'M11 Wild Duck', ra: 282.767, dec: -6.267, distance: 1890, stars: 2900, age: 220, size: 14 },
  { name: 'M67', ra: 132.846, dec: 11.814, distance: 850, stars: 1200, age: 4000, size: 30 },
];

export const globularClusters = [
  { name: 'Omega Centauri', ra: 201.697, dec: -47.480, distance: 5200, stars: 10000000, mag: 3.68 },
  { name: 'M13 Hercules', ra: 250.423, dec: 36.460, distance: 7700, stars: 300000, mag: 5.8 },
  { name: 'M22', ra: 279.100, dec: -23.905, distance: 3200, stars: 80000, mag: 5.1 },
  { name: '47 Tucanae', ra: 6.024, dec: -72.081, distance: 4500, stars: 2000000, mag: 4.09 },
  { name: 'M3', ra: 205.548, dec: 28.377, distance: 10400, stars: 500000, mag: 6.2 },
  { name: 'M5', ra: 229.638, dec: 2.081, distance: 7500, stars: 100000, mag: 5.6 },
  { name: 'M15', ra: 322.493, dec: 12.167, distance: 10400, stars: 100000, mag: 6.2 },
];

// Generate additional field stars based on real distribution
export function generateFieldStars(count = 100000) {
  const fieldStars = [];
  
  for (let i = 0; i < count; i++) {
    // Random position on celestial sphere
    const ra = Math.random() * 360;
    const dec = (Math.random() - 0.5) * 180;
    
    // Distance distribution follows roughly real stellar density
    const distanceLog = Math.random() * 4 - 1; // log10(distance) from -1 to 3
    const distance = Math.pow(10, distanceLog); // 0.1 to 1000 parsecs
    
    // Magnitude based on distance and absolute magnitude distribution
    const absoluteMag = gaussianRandom(4.8, 2.5); // Sun-like average
    const mag = absoluteMag + 5 * Math.log10(distance) - 5;
    
    // Skip if too faint
    if (mag > 15) continue;
    
    // Spectral type distribution
    const spectralType = generateSpectralType();
    
    fieldStars.push({
      id: `FS${i}`,
      ra: ra,
      dec: dec,
      mag: mag,
      distance: distance,
      spectralType: spectralType,
      color: getSpectralColor(spectralType),
    });
  }
  
  return fieldStars;
}

// Generate spectral type based on IMF
function generateSpectralType() {
  const rand = Math.random();
  
  if (rand < 0.0003) return 'O' + Math.floor(Math.random() * 10);
  if (rand < 0.0013) return 'B' + Math.floor(Math.random() * 10);
  if (rand < 0.0073) return 'A' + Math.floor(Math.random() * 10);
  if (rand < 0.0303) return 'F' + Math.floor(Math.random() * 10);
  if (rand < 0.1213) return 'G' + Math.floor(Math.random() * 10);
  if (rand < 0.2343) return 'K' + Math.floor(Math.random() * 10);
  return 'M' + Math.floor(Math.random() * 10); // ~76.5% are M dwarfs
}

// Gaussian random number generator
function gaussianRandom(mean = 0, std = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Generate stars for a specific cluster
export function generateClusterStars(cluster, isGlobular = false) {
  const stars = [];
  const starCount = isGlobular ? Math.min(cluster.stars / 100, 5000) : cluster.stars; // Limit for performance
  
  for (let i = 0; i < starCount; i++) {
    // Position within cluster (King profile for globulars, Gaussian for open)
    let r, theta, phi;
    
    if (isGlobular) {
      // King profile
      const rc = cluster.size * 0.1; // Core radius
      const rt = cluster.size; // Tidal radius
      r = kingProfile(rc, rt);
    } else {
      // Gaussian distribution
      r = Math.abs(gaussianRandom(0, cluster.size / 3));
    }
    
    theta = Math.random() * Math.PI * 2;
    phi = Math.acos(2 * Math.random() - 1);
    
    // Convert to RA/Dec offset
    const dRa = (r * Math.sin(phi) * Math.cos(theta)) / Math.cos(cluster.dec * Math.PI / 180);
    const dDec = r * Math.sin(phi) * Math.sin(theta);
    
    const ra = cluster.ra + dRa / 60; // Convert arcmin to degrees
    const dec = cluster.dec + dDec / 60;
    
    // Magnitude distribution
    let mag;
    if (isGlobular) {
      // Old population - red giants and main sequence
      mag = Math.random() < 0.1 ? 
            gaussianRandom(cluster.mag + 2, 1) : // Red giants
            gaussianRandom(cluster.mag + 6, 2);  // Main sequence
    } else {
      // Young population - more massive stars
      mag = gaussianRandom(cluster.mag + 4, 3);
    }
    
    // Age affects color
    const spectralType = isGlobular ? 
                        (Math.random() < 0.1 ? 'K' : 'G') + Math.floor(Math.random() * 5) :
                        generateSpectralType();
    
    stars.push({
      id: `${cluster.name}-${i}`,
      ra: ra,
      dec: dec,
      mag: mag,
      distance: cluster.distance,
      spectralType: spectralType,
      cluster: cluster.name,
      color: getSpectralColor(spectralType),
    });
  }
  
  return stars;
}

// King profile for globular clusters
function kingProfile(rc, rt) {
  const x = Math.random();
  const c = Math.log10(rt / rc);
  
  // Inverse transform sampling
  let r = rc;
  for (let i = 0; i < 10; i++) {
    const f = (Math.sqrt(1 + (r/rc)**2) - 1) / (Math.sqrt(1 + (rt/rc)**2) - 1);
    if (f > x) break;
    r *= 1.5;
  }
  
  return Math.min(r, rt);
}

// Pulsars and neutron stars
export const pulsars = [
  { name: 'PSR B0531+21 (Crab)', ra: 83.633, dec: 22.015, period: 0.033, distance: 2000, type: 'young' },
  { name: 'PSR B1919+21', ra: 290.877, dec: 21.902, period: 1.337, distance: 1000, type: 'normal' },
  { name: 'PSR B1937+21', ra: 294.911, dec: 21.583, period: 0.00156, distance: 3600, type: 'millisecond' },
  { name: 'PSR J0737-3039', ra: 114.290, dec: -30.660, period: 0.023, distance: 600, type: 'double' },
];

// Wolf-Rayet stars
export const wolfRayetStars = [
  { name: 'WR 104', ra: 276.125, dec: -15.965, mag: 13.54, distance: 2580, spectralType: 'WC9' },
  { name: 'WR 136', ra: 303.613, dec: 38.322, mag: 7.85, distance: 1500, spectralType: 'WN6' },
  { name: 'Gamma Velorum', ra: 122.383, dec: -47.337, mag: 1.83, distance: 342, spectralType: 'WC8' },
];


// Export complete star catalog generator
export function generateCompleteStarCatalog() {
  // Initialize optimized catalog with bright stars and clusters
  optimizedCatalog.initialize(brightStars, [...openClusters, ...globularClusters]);
  
  const catalog = {
    bright: brightStars,
    variable: variableStars,
    multiple: multipleStars,
    openClusters: openClusters.map(cluster => ({
      cluster: cluster,
      stars: [] // Stars generated on demand
    })),
    globularClusters: globularClusters.map(cluster => ({
      cluster: cluster,
      stars: [] // Stars generated on demand
    })),
    field: [], // Field stars generated procedurally on demand
    pulsars: pulsars,
    wolfRayet: wolfRayetStars,
    total: optimizedCatalog.getTotalCount(),
    optimized: optimizedCatalog // Reference to optimized catalog
  };
  
  return catalog;
}