// NASA Data Fetcher Module
// Uses preloaded data to avoid CORS issues with NASA APIs

import { preloadedExoplanets, preloadedAsteroids, preloadedNebulae } from './preloadedData';

const NASA_APIS = {
  // NASA Exoplanet Archive
  exoplanets: 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync',
  
  // NASA Horizons API for solar system objects
  horizons: 'https://ssd.jpl.nasa.gov/api/horizons.api',
  
  // Small Bodies Database for asteroids/comets
  sbdb: 'https://ssd-api.jpl.nasa.gov/sbdb.api',
  
  // Open Science Data Repository
  osdr: 'https://osdr.nasa.gov/osdr/data/api',
};

// Cache to store fetched data
const dataCache = {
  exoplanets: null,
  asteroids: null,
  comets: null,
  stars: null,
  galaxies: null,
  nebulae: null,
  lastFetch: {},
};

// Fetch exoplanet data - returns preloaded data immediately
export async function fetchExoplanets() {
  // Return preloaded data to avoid CORS issues
  return preloadedExoplanets;
}

// Fetch asteroid data - returns preloaded data immediately
export async function fetchAsteroids() {
  // Return preloaded data to avoid CORS issues
  return preloadedAsteroids;
}

// Fetch real star catalog data (using Hipparcos catalog subset)
export async function fetchStarCatalog() {
  if (dataCache.stars && Date.now() - dataCache.lastFetch.stars < 86400000) {
    return dataCache.stars;
  }

  try {
    // For now, we'll use a curated list of brightest stars
    // In production, this would connect to a proper star catalog API
    const stars = getBrightestStars();
    
    dataCache.stars = stars;
    dataCache.lastFetch.stars = Date.now();
    
    return stars;
  } catch (error) {
    console.error('Error fetching star catalog:', error);
    return getBrightestStars();
  }
}

// Fetch galaxy catalog data
export async function fetchGalaxyCatalog() {
  if (dataCache.galaxies && Date.now() - dataCache.lastFetch.galaxies < 86400000) {
    return dataCache.galaxies;
  }

  try {
    // Using known galaxy data from various catalogs
    const galaxies = getGalaxyCatalog();
    
    dataCache.galaxies = galaxies;
    dataCache.lastFetch.galaxies = Date.now();
    
    return galaxies;
  } catch (error) {
    console.error('Error fetching galaxy catalog:', error);
    return getGalaxyCatalog();
  }
}

// Get brightest stars from Hipparcos catalog
function getBrightestStars() {
  return [
    { name: 'Sirius', ra: 101.287, dec: -16.716, mag: -1.46, distance: 2.64, spectralType: 'A1V' },
    { name: 'Canopus', ra: 95.988, dec: -52.696, mag: -0.74, distance: 95.88, spectralType: 'A9II' },
    { name: 'Arcturus', ra: 213.915, dec: 19.182, mag: -0.05, distance: 11.26, spectralType: 'K1.5III' },
    { name: 'Alpha Centauri A', ra: 219.899, dec: -60.834, mag: -0.01, distance: 1.34, spectralType: 'G2V' },
    { name: 'Vega', ra: 279.234, dec: 38.784, mag: 0.03, distance: 7.68, spectralType: 'A0V' },
    { name: 'Capella', ra: 79.172, dec: 45.998, mag: 0.08, distance: 12.92, spectralType: 'G5III' },
    { name: 'Rigel', ra: 78.634, dec: -8.202, mag: 0.13, distance: 264.55, spectralType: 'B8I' },
    { name: 'Procyon', ra: 114.826, dec: 5.225, mag: 0.37, distance: 3.51, spectralType: 'F5IV' },
    { name: 'Achernar', ra: 24.429, dec: -57.237, mag: 0.46, distance: 44.1, spectralType: 'B6V' },
    { name: 'Betelgeuse', ra: 88.793, dec: 7.407, mag: 0.50, distance: 197.43, spectralType: 'M1I' },
    // Add more stars as needed
  ];
}

// Get galaxy catalog including Messier objects and notable galaxies
function getGalaxyCatalog() {
  return [
    // Local Group
    { name: 'Andromeda Galaxy (M31)', ra: 10.685, dec: 41.269, distance: 0.78, type: 'SA(s)b', magnitude: 3.44 },
    { name: 'Triangulum Galaxy (M33)', ra: 23.462, dec: 30.660, distance: 0.84, type: 'SA(s)cd', magnitude: 5.72 },
    { name: 'Large Magellanic Cloud', ra: 80.894, dec: -69.756, distance: 0.05, type: 'SB(s)m', magnitude: 0.13 },
    { name: 'Small Magellanic Cloud', ra: 13.158, dec: -72.800, distance: 0.06, type: 'SB(s)m pec', magnitude: 2.7 },
    
    // Messier galaxies
    { name: 'Whirlpool Galaxy (M51)', ra: 202.470, dec: 47.195, distance: 7.22, type: 'SA(s)bc pec', magnitude: 8.4 },
    { name: 'Sombrero Galaxy (M104)', ra: 189.998, dec: -11.623, distance: 9.55, type: 'SA(s)a', magnitude: 8.0 },
    { name: 'Pinwheel Galaxy (M101)', ra: 210.802, dec: 54.349, distance: 6.4, type: 'SAB(rs)cd', magnitude: 7.86 },
    { name: 'Bode\'s Galaxy (M81)', ra: 148.888, dec: 69.065, distance: 3.63, type: 'SA(s)ab', magnitude: 6.94 },
    { name: 'Cigar Galaxy (M82)', ra: 148.970, dec: 69.681, distance: 3.53, type: 'I0', magnitude: 8.41 },
    { name: 'Southern Pinwheel (M83)', ra: 204.254, dec: -29.866, distance: 4.61, type: 'SAB(s)c', magnitude: 7.54 },
    { name: 'Black Eye Galaxy (M64)', ra: 194.183, dec: 21.683, distance: 5.3, type: '(R)SA(rs)ab', magnitude: 8.52 },
    { name: 'Sunflower Galaxy (M63)', ra: 198.956, dec: 42.029, distance: 8.99, type: 'SA(rs)bc', magnitude: 8.59 },
    
    // Other notable galaxies
    { name: 'Centaurus A', ra: 201.365, dec: -43.019, distance: 3.8, type: 'S0 pec', magnitude: 6.84 },
    { name: 'Sculptor Galaxy', ra: 15.039, dec: -25.288, distance: 3.9, type: 'SAB(s)c', magnitude: 8.0 },
    { name: 'Leo Triplet (M65)', ra: 169.733, dec: 13.092, distance: 10.25, type: 'SAB(rs)a', magnitude: 10.25 },
    { name: 'Leo Triplet (M66)', ra: 170.062, dec: 12.991, distance: 9.7, type: 'SAB(s)b', magnitude: 8.92 },
    
    // Distant galaxies
    { name: 'Virgo A (M87)', ra: 187.706, dec: 12.391, distance: 16.4, type: 'E+0-1 pec', magnitude: 8.63 },
    { name: 'NGC 1300', ra: 49.921, dec: -19.411, distance: 18.7, type: 'SB(rs)bc', magnitude: 10.4 },
    { name: 'Antennae Galaxies', ra: 180.475, dec: -18.869, distance: 13.3, type: 'SB(s)m pec', magnitude: 10.7 },
    { name: 'Cartwheel Galaxy', ra: 9.424, dec: -33.727, distance: 150.0, type: 'S pec', magnitude: 15.2 },
    
    // Add many more galaxies...
  ];
}

// Get notable nebulae from catalogs - returns preloaded data
export function getNebulaCatalog() {
  return preloadedNebulae;
}

// Fallback data in case API calls fail
function getFallbackExoplanets() {
  return [
    { pl_name: 'Proxima Centauri b', ra: 217.429, dec: -62.679, st_dist: 1.295, pl_rade: 1.17, pl_masse: 1.27 },
    { pl_name: 'TRAPPIST-1 b', ra: 346.622, dec: -5.041, st_dist: 12.43, pl_rade: 1.116, pl_masse: 1.374 },
    { pl_name: 'Kepler-452 b', ra: 287.469, dec: 44.278, st_dist: 430.25, pl_rade: 1.63, pl_masse: 5.0 },
    { pl_name: 'HD 209458 b', ra: 330.795, dec: 18.884, st_dist: 48.31, pl_rade: 1.359, pl_masse: 0.69 },
    { pl_name: 'Gliese 667 C c', ra: 259.455, dec: -34.993, st_dist: 7.24, pl_rade: 1.54, pl_masse: 3.8 },
  ];
}

function getFallbackAsteroids() {
  return [
    { name: '1 Ceres', orbit: { a: 2.77, e: 0.08, i: 10.6 }, diameter: 939.4 },
    { name: '4 Vesta', orbit: { a: 2.36, e: 0.09, i: 7.1 }, diameter: 525.4 },
    { name: '2 Pallas', orbit: { a: 2.77, e: 0.23, i: 34.8 }, diameter: 511 },
    { name: '10 Hygiea', orbit: { a: 3.14, e: 0.12, i: 3.8 }, diameter: 433 },
  ];
}

// Convert astronomical coordinates to 3D positions
export function convertRADecToCartesian(ra, dec, distance) {
  // Convert RA (in degrees) and Dec (in degrees) to radians
  const raRad = (ra * Math.PI) / 180;
  const decRad = (dec * Math.PI) / 180;
  
  // Convert to cartesian coordinates
  // distance is in parsecs, convert to simulation units
  const distanceUnits = distance * 100; // Scale factor for visualization
  
  const x = distanceUnits * Math.cos(decRad) * Math.cos(raRad);
  const y = distanceUnits * Math.cos(decRad) * Math.sin(raRad);
  const z = distanceUnits * Math.sin(decRad);
  
  return { x, y, z };
}

// Convert orbital elements to 3D position
export function orbitalElementsToPosition(a, e, i, omega, Omega, M, epoch) {
  // a: semi-major axis (AU)
  // e: eccentricity
  // i: inclination (degrees)
  // omega: argument of periapsis (degrees)
  // Omega: longitude of ascending node (degrees)
  // M: mean anomaly (degrees)
  
  // Convert degrees to radians
  const iRad = (i * Math.PI) / 180;
  const omegaRad = (omega * Math.PI) / 180;
  const OmegaRad = (Omega * Math.PI) / 180;
  const MRad = (M * Math.PI) / 180;
  
  // Solve Kepler's equation for eccentric anomaly
  let E = MRad;
  for (let j = 0; j < 10; j++) {
    E = MRad + e * Math.sin(E);
  }
  
  // True anomaly
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
  
  // Distance from focus
  const r = a * (1 - e * Math.cos(E));
  
  // Position in orbital plane
  const xOrbital = r * Math.cos(nu);
  const yOrbital = r * Math.sin(nu);
  
  // Rotate to 3D space
  const cosOmega = Math.cos(OmegaRad);
  const sinOmega = Math.sin(OmegaRad);
  const cosI = Math.cos(iRad);
  const sinI = Math.sin(iRad);
  const cosOmegaArg = Math.cos(omegaRad);
  const sinOmegaArg = Math.sin(omegaRad);
  
  const x = (cosOmega * cosOmegaArg - sinOmega * sinOmegaArg * cosI) * xOrbital +
            (-cosOmega * sinOmegaArg - sinOmega * cosOmegaArg * cosI) * yOrbital;
  
  const y = (sinOmega * cosOmegaArg + cosOmega * sinOmegaArg * cosI) * xOrbital +
            (-sinOmega * sinOmegaArg + cosOmega * cosOmegaArg * cosI) * yOrbital;
  
  const z = (sinOmegaArg * sinI) * xOrbital + (cosOmegaArg * sinI) * yOrbital;
  
  // Scale AU to simulation units (1 AU = ~50 units in the simulation)
  return { x: x * 50, y: y * 50, z: z * 50 };
}

// Get spectral type color
export function getSpectralColor(spectralType) {
  const type = spectralType ? spectralType.charAt(0) : 'G';
  
  const spectralColors = {
    'O': 0x9bb0ff, // Blue
    'B': 0xaabfff, // Blue-white
    'A': 0xcad7ff, // White
    'F': 0xf8f7ff, // Yellow-white
    'G': 0xfff4ea, // Yellow
    'K': 0xffd2a1, // Orange
    'M': 0xffcc6f, // Red
  };
  
  return spectralColors[type] || spectralColors['G'];
}

// Get magnitude-based size
export function getMagnitudeSize(magnitude) {
  // Brighter stars (lower magnitude) should be bigger
  const baseSize = 5;
  const scaleFactor = Math.pow(2.512, -magnitude / 2);
  return Math.max(0.5, Math.min(20, baseSize * scaleFactor));
}

// Load all astronomical data
export function loadAstronomicalData() {
  return {
    exoplanets: preloadedExoplanets,
    asteroids: preloadedAsteroids,
    nebulae: preloadedNebulae,
    stars: [], // Can be populated from fetchStarCatalog if needed
    galaxies: [] // Can be populated from fetchGalaxyCatalog if needed
  };
}