// Preloaded astronomical data to avoid CORS issues with NASA APIs
export const preloadedExoplanets = [
  { pl_name: 'Proxima Centauri b', ra: 217.429, dec: -62.679, st_dist: 1.295, pl_rade: 1.17, pl_masse: 1.27, pl_orbper: 11.186, pl_orbsmax: 0.0485, st_teff: 3050, disc_year: 2016 },
  { pl_name: 'TRAPPIST-1 b', ra: 346.622, dec: -5.041, st_dist: 12.43, pl_rade: 1.116, pl_masse: 1.374, pl_orbper: 1.51, pl_orbsmax: 0.0115, st_teff: 2566, disc_year: 2016 },
  { pl_name: 'TRAPPIST-1 c', ra: 346.622, dec: -5.041, st_dist: 12.43, pl_rade: 1.097, pl_masse: 1.308, pl_orbper: 2.42, pl_orbsmax: 0.0158, st_teff: 2566, disc_year: 2016 },
  { pl_name: 'TRAPPIST-1 d', ra: 346.622, dec: -5.041, st_dist: 12.43, pl_rade: 0.788, pl_masse: 0.388, pl_orbper: 4.05, pl_orbsmax: 0.0223, st_teff: 2566, disc_year: 2016 },
  { pl_name: 'TRAPPIST-1 e', ra: 346.622, dec: -5.041, st_dist: 12.43, pl_rade: 0.920, pl_masse: 0.692, pl_orbper: 6.10, pl_orbsmax: 0.0293, st_teff: 2566, disc_year: 2016 },
  { pl_name: 'TRAPPIST-1 f', ra: 346.622, dec: -5.041, st_dist: 12.43, pl_rade: 1.045, pl_masse: 1.039, pl_orbper: 9.21, pl_orbsmax: 0.0385, st_teff: 2566, disc_year: 2016 },
  { pl_name: 'TRAPPIST-1 g', ra: 346.622, dec: -5.041, st_dist: 12.43, pl_rade: 1.148, pl_masse: 1.321, pl_orbper: 12.35, pl_orbsmax: 0.0469, st_teff: 2566, disc_year: 2017 },
  { pl_name: 'TRAPPIST-1 h', ra: 346.622, dec: -5.041, st_dist: 12.43, pl_rade: 0.773, pl_masse: 0.326, pl_orbper: 18.77, pl_orbsmax: 0.0619, st_teff: 2566, disc_year: 2017 },
  { pl_name: 'Kepler-452 b', ra: 287.469, dec: 44.278, st_dist: 430.25, pl_rade: 1.63, pl_masse: 5.0, pl_orbper: 384.84, pl_orbsmax: 1.046, st_teff: 5757, disc_year: 2015 },
  { pl_name: 'HD 209458 b', ra: 330.795, dec: 18.884, st_dist: 48.31, pl_rade: 1.359, pl_masse: 0.69, pl_orbper: 3.52, pl_orbsmax: 0.0475, st_teff: 6065, disc_year: 1999 },
  { pl_name: 'Gliese 667 C c', ra: 259.455, dec: -34.993, st_dist: 7.24, pl_rade: 1.54, pl_masse: 3.8, pl_orbper: 28.14, pl_orbsmax: 0.125, st_teff: 3700, disc_year: 2011 },
  { pl_name: '51 Pegasi b', ra: 344.367, dec: 20.769, st_dist: 15.36, pl_rade: 1.27, pl_masse: 0.472, pl_orbper: 4.23, pl_orbsmax: 0.0527, st_teff: 5793, disc_year: 1995 },
  { pl_name: 'Kepler-22 b', ra: 290.175, dec: 47.886, st_dist: 191.58, pl_rade: 2.38, pl_masse: 5.0, pl_orbper: 289.86, pl_orbsmax: 0.849, st_teff: 5518, disc_year: 2011 },
  { pl_name: 'Kepler-442 b', ra: 286.577, dec: 39.607, st_dist: 369.74, pl_rade: 1.34, pl_masse: 2.69, pl_orbper: 112.31, pl_orbsmax: 0.409, st_teff: 4402, disc_year: 2015 },
  { pl_name: 'Kepler-186 f', ra: 130.718, dec: 43.571, st_dist: 178.76, pl_rade: 1.17, pl_masse: 1.71, pl_orbper: 129.94, pl_orbsmax: 0.432, st_teff: 3755, disc_year: 2014 },
  { pl_name: 'HD 189733 b', ra: 300.179, dec: 22.711, st_dist: 19.76, pl_rade: 1.138, pl_masse: 1.13, pl_orbper: 2.22, pl_orbsmax: 0.0313, st_teff: 5040, disc_year: 2005 },
  { pl_name: 'WASP-12 b', ra: 97.637, dec: 29.672, st_dist: 427.48, pl_rade: 1.736, pl_masse: 1.404, pl_orbper: 1.09, pl_orbsmax: 0.0234, st_teff: 6300, disc_year: 2008 },
  { pl_name: 'GJ 1214 b', ra: 258.831, dec: 4.961, st_dist: 14.55, pl_rade: 2.678, pl_masse: 6.55, pl_orbper: 1.58, pl_orbsmax: 0.0143, st_teff: 3026, disc_year: 2009 },
  { pl_name: 'Kepler-16 b', ra: 289.071, dec: 51.759, st_dist: 75.02, pl_rade: 8.449, pl_masse: 105.38, pl_orbper: 228.78, pl_orbsmax: 0.7048, st_teff: 5629, disc_year: 2011 },
  { pl_name: 'HR 8799 b', ra: 346.870, dec: 21.134, st_dist: 40.98, pl_rade: 13.00, pl_masse: 1440.0, pl_orbper: 164250, pl_orbsmax: 68.0, st_teff: 7430, disc_year: 2008 },
  { pl_name: 'HR 8799 c', ra: 346.870, dec: 21.134, st_dist: 40.98, pl_rade: 13.00, pl_masse: 2862.0, pl_orbper: 82145, pl_orbsmax: 38.0, st_teff: 7430, disc_year: 2008 },
  { pl_name: 'HR 8799 d', ra: 346.870, dec: 21.134, st_dist: 40.98, pl_rade: 13.00, pl_masse: 2862.0, pl_orbper: 41054, pl_orbsmax: 24.0, st_teff: 7430, disc_year: 2008 },
  { pl_name: 'HR 8799 e', ra: 346.870, dec: 21.134, st_dist: 40.98, pl_rade: 12.00, pl_masse: 2227.0, pl_orbper: 18000, pl_orbsmax: 14.5, st_teff: 7430, disc_year: 2010 },
  { pl_name: 'CoRoT-7 b', ra: 102.473, dec: -1.093, st_dist: 154.35, pl_rade: 1.58, pl_masse: 7.42, pl_orbper: 0.85, pl_orbsmax: 0.0172, st_teff: 5250, disc_year: 2009 },
  { pl_name: 'Kepler-438 b', ra: 287.690, dec: 41.951, st_dist: 144.89, pl_rade: 1.12, pl_masse: 1.46, pl_orbper: 35.23, pl_orbsmax: 0.166, st_teff: 3748, disc_year: 2015 },
  { pl_name: 'K2-18 b', ra: 172.560, dec: 7.584, st_dist: 38.07, pl_rade: 2.61, pl_masse: 8.63, pl_orbper: 32.94, pl_orbsmax: 0.1429, st_teff: 3457, disc_year: 2015 },
  { pl_name: 'TOI-700 d', ra: 90.764, dec: -65.580, st_dist: 31.13, pl_rade: 1.19, pl_masse: 1.72, pl_orbper: 37.42, pl_orbsmax: 0.163, st_teff: 3480, disc_year: 2020 },
  { pl_name: 'LHS 1140 b', ra: 14.993, dec: -15.268, st_dist: 14.99, pl_rade: 1.73, pl_masse: 6.98, pl_orbper: 24.74, pl_orbsmax: 0.0936, st_teff: 3131, disc_year: 2017 },
  { pl_name: 'Kepler-1649 c', ra: 293.057, dec: 41.782, st_dist: 92.91, pl_rade: 1.06, pl_masse: 1.20, pl_orbper: 19.54, pl_orbsmax: 0.0649, st_teff: 3240, disc_year: 2020 },
  { pl_name: 'GJ 357 d', ra: 138.760, dec: -21.867, st_dist: 9.44, pl_rade: 1.84, pl_masse: 6.1, pl_orbper: 55.66, pl_orbsmax: 0.204, st_teff: 3505, disc_year: 2019 }
];

export const preloadedAsteroids = [
  { 
    name: '(1) Ceres', 
    orbit: { a: 2.7691651, e: 0.0760091, i: 10.59407, omega: 80.3055, Omega: 80.3276, M: 77.372 }, 
    phys_par: { diameter: 939.4, albedo: 0.09, rot_per: 9.07417 }
  },
  { 
    name: '(4) Vesta', 
    orbit: { a: 2.3615158, e: 0.0887388, i: 7.14043, omega: 151.198, Omega: 103.851, M: 20.863 }, 
    phys_par: { diameter: 525.4, albedo: 0.4228, rot_per: 5.342 }
  },
  { 
    name: '(2) Pallas', 
    orbit: { a: 2.7714730, e: 0.2305816, i: 34.84100, omega: 310.418, Omega: 173.080, M: 78.057 }, 
    phys_par: { diameter: 511, albedo: 0.159, rot_per: 7.8132 }
  },
  { 
    name: '(10) Hygiea', 
    orbit: { a: 3.1416280, e: 0.1146482, i: 3.84228, omega: 313.557, Omega: 283.201, M: 108.639 }, 
    phys_par: { diameter: 433, albedo: 0.0717, rot_per: 27.623 }
  },
  { 
    name: '(704) Interamnia', 
    orbit: { a: 3.0637551, e: 0.1485127, i: 17.28532, omega: 280.411, Omega: 95.854, M: 241.735 }, 
    phys_par: { diameter: 326, albedo: 0.0736, rot_per: 8.727 }
  },
  { 
    name: '(511) Davida', 
    orbit: { a: 3.1662859, e: 0.1806413, i: 15.93683, omega: 269.101, Omega: 107.644, M: 316.077 }, 
    phys_par: { diameter: 289, albedo: 0.0540, rot_per: 5.1299 }
  },
  { 
    name: '(87) Sylvia', 
    orbit: { a: 3.4909555, e: 0.0790775, i: 10.85555, omega: 266.195, Omega: 73.330, M: 163.951 }, 
    phys_par: { diameter: 286, albedo: 0.0435, rot_per: 5.18363 }
  },
  { 
    name: '(65) Cybele', 
    orbit: { a: 3.4286907, e: 0.1058189, i: 3.56269, omega: 106.672, Omega: 155.650, M: 24.606 }, 
    phys_par: { diameter: 278, albedo: 0.0503, rot_per: 6.0814 }
  },
  { 
    name: '(101955) Bennu', 
    orbit: { a: 1.1264391, e: 0.2037451, i: 6.03494, omega: 66.223, Omega: 2.061, M: 196.026 }, 
    phys_par: { diameter: 0.49, albedo: 0.044, rot_per: 4.297 }
  },
  { 
    name: '(162173) Ryugu', 
    orbit: { a: 1.1895919, e: 0.1902658, i: 5.88395, omega: 211.433, Omega: 251.616, M: 316.020 }, 
    phys_par: { diameter: 0.896, albedo: 0.045, rot_per: 7.627 }
  },
  { 
    name: '(433) Eros', 
    orbit: { a: 1.4582690, e: 0.2229889, i: 10.82872, omega: 178.648, Omega: 304.299, M: 156.421 }, 
    phys_par: { diameter: 16.84, albedo: 0.25, rot_per: 5.270 }
  },
  { 
    name: '(951) Gaspra', 
    orbit: { a: 2.2093882, e: 0.1734117, i: 4.10262, omega: 129.531, Omega: 253.195, M: 94.217 }, 
    phys_par: { diameter: 12.2, albedo: 0.22, rot_per: 7.042 }
  },
  { 
    name: '(243) Ida', 
    orbit: { a: 2.8615145, e: 0.0451564, i: 1.13744, omega: 324.586, Omega: 107.811, M: 131.594 }, 
    phys_par: { diameter: 31.4, albedo: 0.238, rot_per: 4.634 }
  },
  { 
    name: '(25143) Itokawa', 
    orbit: { a: 1.3240263, e: 0.2801215, i: 1.62232, omega: 162.805, Omega: 69.080, M: 209.022 }, 
    phys_par: { diameter: 0.33, albedo: 0.19, rot_per: 12.132 }
  },
  { 
    name: '(99942) Apophis', 
    orbit: { a: 0.9224657, e: 0.1910302, i: 3.33866, omega: 126.364, Omega: 204.446, M: 312.719 }, 
    phys_par: { diameter: 0.34, albedo: 0.23, rot_per: 30.56 }
  }
];

export const preloadedNebulae = [
  // Emission nebulae
  { name: 'Orion Nebula (M42)', ra: 83.822, dec: -5.391, distance: 0.412, type: 'emission', size: 85 },
  { name: 'Eagle Nebula (M16)', ra: 274.700, dec: -13.807, distance: 2.0, type: 'emission', size: 70 },
  { name: 'Lagoon Nebula (M8)', ra: 271.104, dec: -24.383, distance: 1.25, type: 'emission', size: 90 },
  { name: 'Trifid Nebula (M20)', ra: 270.621, dec: -23.030, distance: 1.68, type: 'emission', size: 28 },
  { name: 'Carina Nebula', ra: 161.265, dec: -59.867, distance: 2.3, type: 'emission', size: 120 },
  { name: 'Rosette Nebula', ra: 98.070, dec: 4.983, distance: 1.6, type: 'emission', size: 130 },
  { name: 'North America Nebula', ra: 313.700, dec: 44.500, distance: 0.6, type: 'emission', size: 120 },
  { name: 'Horsehead Nebula', ra: 85.242, dec: -2.460, distance: 0.4, type: 'dark', size: 8 },
  { name: 'Omega Nebula (M17)', ra: 275.196, dec: -16.178, distance: 1.8, type: 'emission', size: 40 },
  { name: 'Flame Nebula', ra: 85.400, dec: -1.920, distance: 0.4, type: 'emission', size: 30 },
  { name: 'Heart Nebula', ra: 38.500, dec: 61.450, distance: 2.3, type: 'emission', size: 150 },
  { name: 'Soul Nebula', ra: 34.750, dec: 60.933, distance: 2.0, type: 'emission', size: 150 },
  { name: 'Pelican Nebula', ra: 314.750, dec: 44.333, distance: 0.6, type: 'emission', size: 60 },
  { name: 'Cocoon Nebula', ra: 328.383, dec: 47.267, distance: 1.2, type: 'emission', size: 12 },
  
  // Planetary nebulae
  { name: 'Ring Nebula (M57)', ra: 283.396, dec: 33.029, distance: 0.7, type: 'planetary', size: 3.8 },
  { name: 'Dumbbell Nebula (M27)', ra: 299.902, dec: 22.721, distance: 0.38, type: 'planetary', size: 8 },
  { name: 'Helix Nebula', ra: 337.411, dec: -20.837, distance: 0.215, type: 'planetary', size: 25 },
  { name: 'Cat\'s Eye Nebula', ra: 269.640, dec: 66.633, distance: 1.0, type: 'planetary', size: 0.65 },
  { name: 'Eskimo Nebula', ra: 112.295, dec: 20.912, distance: 1.3, type: 'planetary', size: 0.8 },
  { name: 'Saturn Nebula', ra: 315.023, dec: -11.373, distance: 1.5, type: 'planetary', size: 0.7 },
  { name: 'Owl Nebula (M97)', ra: 168.700, dec: 55.019, distance: 0.7, type: 'planetary', size: 3.4 },
  { name: 'Blue Snowball Nebula', ra: 351.307, dec: -11.362, distance: 1.1, type: 'planetary', size: 0.6 },
  { name: 'Little Dumbbell Nebula (M76)', ra: 25.582, dec: 51.575, distance: 0.78, type: 'planetary', size: 2.7 },
  
  // Supernova remnants
  { name: 'Crab Nebula (M1)', ra: 83.633, dec: 22.015, distance: 2.0, type: 'supernova', size: 11 },
  { name: 'Veil Nebula', ra: 313.200, dec: 31.217, distance: 0.47, type: 'supernova', size: 180 },
  { name: 'Cassiopeia A', ra: 350.850, dec: 58.815, distance: 3.4, type: 'supernova', size: 5 },
  { name: 'Tycho\'s Supernova Remnant', ra: 6.340, dec: 64.140, distance: 2.5, type: 'supernova', size: 8 },
  { name: 'Kepler\'s Supernova Remnant', ra: 262.675, dec: -21.480, distance: 5.0, type: 'supernova', size: 4 },
  
  // Reflection nebulae
  { name: 'Pleiades Nebula', ra: 56.871, dec: 24.105, distance: 0.136, type: 'reflection', size: 110 },
  { name: 'Witch Head Nebula', ra: 76.646, dec: -7.223, distance: 0.3, type: 'reflection', size: 180 },
  { name: 'Iris Nebula', ra: 324.267, dec: 68.167, distance: 0.42, type: 'reflection', size: 6 },
  { name: 'Trifid Nebula (reflection component)', ra: 270.590, dec: -22.983, distance: 1.68, type: 'reflection', size: 20 },
  
  // Star-forming regions
  { name: 'Pillars of Creation', ra: 274.700, dec: -13.816, distance: 2.0, type: 'star-forming', size: 4.5 },
  { name: 'Mystic Mountain', ra: 161.250, dec: -59.867, distance: 2.3, type: 'star-forming', size: 3 },
  { name: 'Tarantula Nebula', ra: 84.676, dec: -69.100, distance: 49.97, type: 'star-forming', size: 40 },
  { name: 'Thor\'s Helmet', ra: 110.933, dec: -13.200, distance: 3.67, type: 'star-forming', size: 30 }
];