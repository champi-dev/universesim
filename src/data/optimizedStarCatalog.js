// Optimized Star Catalog with Spatial Indexing
// Uses efficient data structures for O(1) lookups and lazy generation

import { getSpectralColor } from './nasaDataFetcher.js';

// Spatial hash grid for efficient lookups
class SpatialHashGrid {
  constructor(cellSize = 10) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.objectMap = new Map();
  }

  // Hash function for 3D coordinates
  hash(x, y, z) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  // Add object to grid
  add(id, position) {
    const key = this.hash(position.x, position.y, position.z);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key).add(id);
    this.objectMap.set(id, { position, key });
  }

  // Get objects in cell
  getCell(x, y, z) {
    const key = this.hash(x, y, z);
    return this.grid.get(key) || new Set();
  }

  // Get nearby objects
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

// Star generator using deterministic pseudo-random for consistency
class StarGenerator {
  constructor(seed = 42) {
    this.seed = seed;
    this.generated = new Map();
    this.spatialIndex = new SpatialHashGrid(100); // 100 parsec cells
  }

  // Simple pseudo-random number generator
  random(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Generate star properties from ID
  generateStar(id) {
    if (this.generated.has(id)) {
      return this.generated.get(id);
    }

    const seed = this.seed + id;
    const rand1 = this.random(seed);
    const rand2 = this.random(seed + 1);
    const rand3 = this.random(seed + 2);
    const rand4 = this.random(seed + 3);
    const rand5 = this.random(seed + 4);

    // Position
    const ra = rand1 * 360;
    const dec = (rand2 - 0.5) * 180;
    const distance = Math.pow(10, rand3 * 4 - 1); // 0.1 to 1000 parsecs

    // Convert to cartesian for spatial indexing
    const raRad = (ra * Math.PI) / 180;
    const decRad = (dec * Math.PI) / 180;
    const x = distance * Math.cos(decRad) * Math.cos(raRad);
    const y = distance * Math.cos(decRad) * Math.sin(raRad);
    const z = distance * Math.sin(decRad);

    // Properties
    const absoluteMag = this.gaussianApprox(rand4, rand5, 4.8, 2.5);
    const mag = absoluteMag + 5 * Math.log10(distance) - 5;
    const spectralType = this.generateSpectralType(rand4);

    const star = {
      id: `FS${id}`,
      ra,
      dec,
      mag,
      distance,
      spectralType,
      color: getSpectralColor(spectralType),
      position: { x, y, z }
    };

    this.generated.set(id, star);
    this.spatialIndex.add(id, { x, y, z });

    return star;
  }

  // Approximate Gaussian distribution
  gaussianApprox(u1, u2, mean, stdDev) {
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  // Generate spectral type
  generateSpectralType(rand) {
    if (rand < 0.0003) return 'O' + Math.floor(rand * 10000 % 10);
    if (rand < 0.0013) return 'B' + Math.floor(rand * 10000 % 10);
    if (rand < 0.0073) return 'A' + Math.floor(rand * 10000 % 10);
    if (rand < 0.0303) return 'F' + Math.floor(rand * 10000 % 10);
    if (rand < 0.1213) return 'G' + Math.floor(rand * 10000 % 10);
    if (rand < 0.2343) return 'K' + Math.floor(rand * 10000 % 10);
    return 'M' + Math.floor(rand * 10000 % 10);
  }

  // Get stars in view frustum (lazy generation)
  getVisibleStars(cameraPosition, viewDistance, maxMagnitude = 15) {
    const visibleStars = [];
    
    // Estimate which star IDs might be visible based on position
    const cellSize = 100; // parsecs
    const numCells = Math.ceil(viewDistance / cellSize);
    
    // Generate stars in visible cells
    for (let dx = -numCells; dx <= numCells; dx++) {
      for (let dy = -numCells; dy <= numCells; dy++) {
        for (let dz = -numCells; dz <= numCells; dz++) {
          // Generate a deterministic set of stars for this cell
          const cellX = Math.floor(cameraPosition.x / cellSize) + dx;
          const cellY = Math.floor(cameraPosition.y / cellSize) + dy;
          const cellZ = Math.floor(cameraPosition.z / cellSize) + dz;
          
          // Use cell coordinates as base for star IDs in this cell
          const baseId = (cellX * 1000000 + cellY * 1000 + cellZ) * 100;
          
          // Generate ~100 stars per cell
          for (let i = 0; i < 100; i++) {
            const starId = Math.abs(baseId + i);
            const star = this.generateStar(starId);
            
            // Check if star is visible
            if (star.mag <= maxMagnitude) {
              const dx = star.position.x - cameraPosition.x;
              const dy = star.position.y - cameraPosition.y;
              const dz = star.position.z - cameraPosition.z;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              
              if (dist <= viewDistance) {
                visibleStars.push(star);
              }
            }
          }
        }
      }
    }
    
    return visibleStars;
  }
}

// Optimized star catalog class
export class OptimizedStarCatalog {
  constructor() {
    this.brightStars = new Map();
    this.clusters = new Map();
    this.generator = new StarGenerator();
    this.loaded = false;
  }

  // Initialize with precomputed bright stars
  initialize(brightStarsData, clustersData) {
    // Store bright stars in hash map for O(1) lookup
    brightStarsData.forEach((star, index) => {
      this.brightStars.set(star.name, { ...star, id: `BS${index}` });
    });

    // Store clusters
    clustersData.forEach((cluster, index) => {
      this.clusters.set(cluster.name, { ...cluster, id: `CL${index}` });
    });

    this.loaded = true;
  }

  // Get stars visible from current position
  getVisibleStars(viewerPosition, viewDistance, options = {}) {
    const { maxMagnitude = 15, includeFieldStars = true } = options;
    const visible = [];

    // Add bright stars if visible
    this.brightStars.forEach(star => {
      if (star.mag <= maxMagnitude && star.distance <= viewDistance) {
        visible.push(star);
      }
    });

    // Add procedurally generated field stars
    if (includeFieldStars) {
      const fieldStars = this.generator.getVisibleStars(
        viewerPosition,
        viewDistance,
        maxMagnitude
      );
      visible.push(...fieldStars);
    }

    return visible;
  }

  // Get star by name (O(1))
  getStarByName(name) {
    return this.brightStars.get(name);
  }

  // Get nearby stars using spatial index
  getNearbyStars(position, radius) {
    const nearbyIds = this.generator.spatialIndex.getNearby(position, radius);
    const nearby = [];
    
    nearbyIds.forEach(id => {
      const star = this.generator.generated.get(id);
      if (star) {
        const dx = star.position.x - position.x;
        const dy = star.position.y - position.y;
        const dz = star.position.z - position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist <= radius) {
          nearby.push({ ...star, distance: dist });
        }
      }
    });

    return nearby.sort((a, b) => a.distance - b.distance);
  }

  // Get total count (approximation for procedural stars)
  getTotalCount() {
    return this.brightStars.size + 100000; // Approximate field star count
  }
}

// Export singleton instance
export const optimizedCatalog = new OptimizedStarCatalog();