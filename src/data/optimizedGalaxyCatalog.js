// Optimized Galaxy Catalog with Spatial Indexing
// Uses efficient data structures for O(1) lookups and lazy generation

// Spatial hash grid for galaxies
class GalaxySpatialGrid {
  constructor(cellSize = 10000) { // 10 Mpc cells
    this.cellSize = cellSize;
    this.grid = new Map();
    this.galaxyMap = new Map();
  }

  hash(x, y, z) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  add(id, position, galaxy) {
    const key = this.hash(position.x, position.y, position.z);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key).add(id);
    this.galaxyMap.set(id, { position, galaxy, key });
  }

  getCell(x, y, z) {
    const key = this.hash(x, y, z);
    return this.grid.get(key) || new Set();
  }

  getNearby(position, radius) {
    const nearby = new Set();
    const cellRadius = Math.ceil(radius / this.cellSize);
    
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const cell = this.grid.get(key);
          if (cell) {
            cell.forEach(id => nearby.add(id));
          }
        }
      }
    }
    
    return nearby;
  }
}

// Galaxy generator with deterministic pseudo-random
class GalaxyGenerator {
  constructor(seed = 42) {
    this.seed = seed;
    this.generated = new Map();
    this.spatialIndex = new GalaxySpatialGrid();
    
    // Galaxy type probabilities based on observations
    this.typeDistribution = {
      spiral: 0.77,
      elliptical: 0.20,
      irregular: 0.03
    };
    
    // Hubble sequence subtypes
    this.spiralTypes = ['Sa', 'Sb', 'Sc', 'Sd', 'SBa', 'SBb', 'SBc', 'SBd'];
    this.ellipticalTypes = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7'];
  }

  random(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  generateGalaxy(id) {
    if (this.generated.has(id)) {
      return this.generated.get(id);
    }

    const seed = this.seed + id;
    const rand1 = this.random(seed);
    const rand2 = this.random(seed + 1);
    const rand3 = this.random(seed + 2);
    const rand4 = this.random(seed + 3);
    const rand5 = this.random(seed + 4);
    const rand6 = this.random(seed + 5);

    // Position (large-scale structure)
    const cellX = Math.floor(id / 1000000);
    const cellY = Math.floor((id % 1000000) / 1000);
    const cellZ = id % 1000;
    
    // Add variation within cell (simulating clustering)
    const x = (cellX + rand1 - 0.5) * 50000; // 50 Mpc cells
    const y = (cellY + rand2 - 0.5) * 50000;
    const z = (cellZ + rand3 - 0.5) * 50000;
    
    // Redshift based on distance (simplified Hubble law)
    const distance = Math.sqrt(x * x + y * y + z * z);
    const redshift = distance * 0.000001; // Simplified H0
    
    // Galaxy properties
    const type = this.getGalaxyType(rand4);
    const subtype = this.getSubtype(type, rand5);
    const luminosity = this.getLuminosity(type, rand6);
    const size = this.getSize(type, luminosity, rand1);
    const color = this.getGalaxyColor(type, subtype);
    
    const galaxy = {
      id: `G${id}`,
      name: `Galaxy ${id}`,
      position: { x, y, z },
      distance,
      redshift,
      type,
      subtype,
      luminosity,
      size,
      color,
      magnitude: this.calculateMagnitude(luminosity, distance)
    };

    this.generated.set(id, galaxy);
    this.spatialIndex.add(id, { x, y, z }, galaxy);

    return galaxy;
  }

  getGalaxyType(rand) {
    if (rand < this.typeDistribution.spiral) return 'spiral';
    if (rand < this.typeDistribution.spiral + this.typeDistribution.elliptical) return 'elliptical';
    return 'irregular';
  }

  getSubtype(type, rand) {
    if (type === 'spiral') {
      return this.spiralTypes[Math.floor(rand * this.spiralTypes.length)];
    } else if (type === 'elliptical') {
      return this.ellipticalTypes[Math.floor(rand * this.ellipticalTypes.length)];
    }
    return 'Irr';
  }

  getLuminosity(type, rand) {
    // Luminosity function (simplified Schechter function)
    const L_star = 1e10; // Solar luminosities
    if (type === 'elliptical') {
      return L_star * Math.pow(10, rand * 2 - 0.5); // Brighter on average
    } else if (type === 'spiral') {
      return L_star * Math.pow(10, rand * 1.5 - 0.5);
    }
    return L_star * Math.pow(10, rand - 1); // Irregular, dimmer
  }

  getSize(type, luminosity, rand) {
    // Size-luminosity relation
    const baseSize = Math.pow(luminosity / 1e10, 0.5) * 10; // kpc
    const variation = 1 + (rand - 0.5) * 0.4;
    return baseSize * variation;
  }

  getGalaxyColor(type, subtype) {
    // Galaxy colors based on stellar populations
    if (type === 'elliptical') {
      return { core: 0xffddaa, arms: 0xffccaa }; // Redder (older stars)
    } else if (type === 'spiral') {
      if (subtype.startsWith('Sa') || subtype.startsWith('SBa')) {
        return { core: 0xffffcc, arms: 0xaaccff }; // Yellow core, blue arms
      }
      return { core: 0xffffaa, arms: 0x99bbff }; // Bluer arms (star formation)
    }
    return { core: 0xccddff, arms: 0xaabbff }; // Irregular (young stars)
  }

  calculateMagnitude(luminosity, distance) {
    // Absolute magnitude of the sun is 4.83
    const M_sun = 4.83;
    const M_galaxy = M_sun - 2.5 * Math.log10(luminosity);
    
    // Apparent magnitude
    const m = M_galaxy + 5 * Math.log10(distance * 1e6 / 10); // distance in Mpc to pc
    return m;
  }

  // Get galaxies visible from position
  getVisibleGalaxies(viewerPosition, viewDistance, maxMagnitude = 25) {
    const visibleGalaxies = [];
    
    // Determine which cells to check based on view distance
    const cellSize = 50000; // 50 Mpc
    const numCells = Math.ceil(viewDistance / cellSize);
    
    for (let dx = -numCells; dx <= numCells; dx++) {
      for (let dy = -numCells; dy <= numCells; dy++) {
        for (let dz = -numCells; dz <= numCells; dz++) {
          // Generate deterministic galaxy IDs for this cell
          const cellX = Math.floor(viewerPosition.x / cellSize) + dx;
          const cellY = Math.floor(viewerPosition.y / cellSize) + dy;
          const cellZ = Math.floor(viewerPosition.z / cellSize) + dz;
          
          const baseId = Math.abs((cellX * 1000000 + cellY * 1000 + cellZ) * 10);
          
          // Generate ~10 galaxies per cell (adjustable for density)
          const galaxiesPerCell = this.getGalaxiesPerCell(cellX, cellY, cellZ);
          
          for (let i = 0; i < galaxiesPerCell; i++) {
            const galaxyId = baseId + i;
            const galaxy = this.generateGalaxy(galaxyId);
            
            // Check visibility
            if (galaxy.magnitude <= maxMagnitude) {
              const dx = galaxy.position.x - viewerPosition.x;
              const dy = galaxy.position.y - viewerPosition.y;
              const dz = galaxy.position.z - viewerPosition.z;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              
              if (dist <= viewDistance) {
                visibleGalaxies.push(galaxy);
              }
            }
          }
        }
      }
    }
    
    return visibleGalaxies;
  }

  // Vary galaxy density based on large-scale structure
  getGalaxiesPerCell(x, y, z) {
    // Simulate cosmic web structure
    const scale = 0.01;
    const density = Math.sin(x * scale) * Math.cos(y * scale) * Math.sin(z * scale);
    
    // Base density with variation
    const baseDensity = 10;
    return Math.max(1, Math.floor(baseDensity * (1 + density)));
  }
}

// Optimized galaxy catalog
export class OptimizedGalaxyCatalog {
  constructor() {
    this.notableGalaxies = new Map();
    this.generator = new GalaxyGenerator();
    this.clusters = new Map();
  }

  initialize(notableGalaxiesData, clustersData) {
    // Store notable galaxies for O(1) lookup
    notableGalaxiesData.forEach((galaxy, index) => {
      this.notableGalaxies.set(galaxy.name, { ...galaxy, id: `NG${index}` });
    });

    // Store clusters
    clustersData.forEach((cluster, index) => {
      this.clusters.set(cluster.name, { ...cluster, id: `GC${index}` });
    });
  }

  getVisibleGalaxies(viewerPosition, viewDistance, options = {}) {
    const { maxMagnitude = 25, includeFieldGalaxies = true } = options;
    const visible = [];

    // Add notable galaxies if visible
    this.notableGalaxies.forEach(galaxy => {
      if (galaxy.distance <= viewDistance && (!galaxy.magnitude || galaxy.magnitude <= maxMagnitude)) {
        visible.push(galaxy);
      }
    });

    // Add procedurally generated galaxies
    if (includeFieldGalaxies) {
      const fieldGalaxies = this.generator.getVisibleGalaxies(
        viewerPosition,
        viewDistance,
        maxMagnitude
      );
      visible.push(...fieldGalaxies);
    }

    return visible;
  }

  getGalaxyByName(name) {
    return this.notableGalaxies.get(name);
  }

  getNearbyGalaxies(position, radius) {
    const nearbyIds = this.generator.spatialIndex.getNearby(position, radius);
    const nearby = [];
    
    nearbyIds.forEach(id => {
      const data = this.generator.spatialIndex.galaxyMap.get(id);
      if (data) {
        const galaxy = data.galaxy;
        const dx = galaxy.position.x - position.x;
        const dy = galaxy.position.y - position.y;
        const dz = galaxy.position.z - position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist <= radius) {
          nearby.push({ ...galaxy, distance: dist });
        }
      }
    });

    return nearby.sort((a, b) => a.distance - b.distance);
  }

  getTotalCount() {
    // Approximate based on observable universe
    return this.notableGalaxies.size + 2000000000000; // ~2 trillion galaxies
  }
}

export const optimizedGalaxyCatalog = new OptimizedGalaxyCatalog();