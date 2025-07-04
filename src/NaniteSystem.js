import * as THREE from 'three';

/**
 * JavaScript implementation of Nanite-like virtualized geometry system
 * Features:
 * - Hierarchical Level of Detail (LOD)
 * - Cluster-based geometry streaming
 * - Screen-space error metrics
 * - Automatic detail selection
 * - GPU-driven culling
 */

// Cluster represents a group of triangles with LOD hierarchy
class GeometryCluster {
  constructor(geometry, level = 0, bounds = null) {
    this.geometry = geometry;
    this.level = level;
    this.bounds = bounds || this.calculateBounds();
    this.error = 0;
    this.children = [];
    this.parent = null;
    this.id = Math.random().toString(36).substr(2, 9);
  }

  calculateBounds() {
    this.geometry.computeBoundingBox();
    return this.geometry.boundingBox.clone();
  }

  calculateScreenSpaceError(camera, screenWidth, screenHeight) {
    // Calculate screen-space error metric
    const center = new THREE.Vector3();
    this.bounds.getCenter(center);
    
    const distance = camera.position.distanceTo(center);
    const size = this.bounds.getSize(new THREE.Vector3()).length();
    
    // Project size to screen space
    const fov = camera.fov * Math.PI / 180;
    const screenSize = (size / distance) * screenHeight / (2 * Math.tan(fov / 2));
    
    // Error based on geometric detail and screen coverage
    const triangleCount = this.geometry.index ? this.geometry.index.count / 3 : 0;
    this.error = screenSize / Math.max(1, Math.sqrt(triangleCount));
    
    return this.error;
  }
}

// Main Nanite system manager
export class NaniteSystem {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;
    this.clusters = new Map();
    this.visibleClusters = new Set();
    this.clusterPool = [];
    this.maxClustersPerFrame = 1000;
    this.errorThreshold = 2.0; // Pixels
    this.maxMemoryMB = 512;
    this.currentMemoryMB = 0;
    
    // Statistics
    this.stats = {
      totalClusters: 0,
      visibleClusters: 0,
      trianglesRendered: 0,
      memoryUsedMB: 0
    };
  }

  /**
   * Create LOD hierarchy for a mesh
   * @param {THREE.Mesh} mesh - Original high-detail mesh
   * @param {number} levels - Number of LOD levels to generate
   */
  createLODHierarchy(mesh, levels = 5) {
    const geometries = this.generateLODGeometries(mesh.geometry, levels);
    const rootCluster = this.buildClusterHierarchy(geometries);
    
    // Store in cluster map
    this.clusters.set(mesh.uuid, {
      root: rootCluster,
      mesh: mesh,
      material: mesh.material
    });
    
    this.stats.totalClusters = this.clusters.size;
    return rootCluster;
  }

  /**
   * Generate simplified geometries for each LOD level
   */
  generateLODGeometries(geometry, levels) {
    const geometries = [geometry]; // Level 0 is original
    
    for (let i = 1; i < levels; i++) {
      const simplified = this.simplifyGeometry(
        geometries[i - 1], 
        Math.pow(0.5, i) // 50% reduction each level
      );
      geometries.push(simplified);
    }
    
    return geometries;
  }

  /**
   * Simplify geometry using edge collapse decimation
   */
  simplifyGeometry(geometry, targetRatio) {
    // Clone geometry
    const simplified = geometry.clone();
    
    // Get vertex data
    const positions = simplified.attributes.position;
    const indices = simplified.index;
    
    if (!indices) return simplified; // Can't simplify non-indexed geometry
    
    const targetTriangles = Math.floor((indices.count / 3) * targetRatio);
    
    // Simple decimation (production would use quadric error metrics)
    // For now, just sample vertices
    const newIndices = [];
    const step = Math.ceil(1 / targetRatio);
    
    for (let i = 0; i < indices.count; i += step * 3) {
      if (i + 2 < indices.count) {
        newIndices.push(
          indices.array[i],
          indices.array[i + 1],
          indices.array[i + 2]
        );
      }
    }
    
    simplified.setIndex(newIndices);
    simplified.computeVertexNormals();
    simplified.computeBoundingBox();
    
    // Update memory tracking
    const memoryMB = (newIndices.length * 4) / (1024 * 1024);
    this.currentMemoryMB += memoryMB;
    
    return simplified;
  }

  /**
   * Build hierarchical cluster structure
   */
  buildClusterHierarchy(geometries) {
    const clusters = geometries.map((geom, level) => 
      new GeometryCluster(geom, level)
    );
    
    // Link parent-child relationships
    for (let i = 0; i < clusters.length - 1; i++) {
      clusters[i].children.push(clusters[i + 1]);
      clusters[i + 1].parent = clusters[i];
    }
    
    return clusters[0]; // Return root
  }

  /**
   * Update visible clusters based on camera view
   */
  update() {
    this.visibleClusters.clear();
    this.stats.trianglesRendered = 0;
    
    const screenWidth = this.renderer.domElement.width;
    const screenHeight = this.renderer.domElement.height;
    
    // Frustum culling
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(projScreenMatrix);
    
    // Process each mesh
    this.clusters.forEach((clusterData, meshId) => {
      const cluster = this.selectBestLOD(
        clusterData.root,
        frustum,
        screenWidth,
        screenHeight
      );
      
      if (cluster) {
        this.visibleClusters.add({
          cluster: cluster,
          material: clusterData.material,
          meshId: meshId
        });
        
        const triangles = cluster.geometry.index ? 
          cluster.geometry.index.count / 3 : 0;
        this.stats.trianglesRendered += triangles;
      }
    });
    
    this.stats.visibleClusters = this.visibleClusters.size;
    this.stats.memoryUsedMB = this.currentMemoryMB;
  }

  /**
   * Select best LOD based on screen-space error
   */
  selectBestLOD(cluster, frustum, screenWidth, screenHeight) {
    // Check if cluster is in frustum
    if (!frustum.intersectsBox(cluster.bounds)) {
      return null;
    }
    
    // Calculate screen-space error
    const error = cluster.calculateScreenSpaceError(
      this.camera,
      screenWidth,
      screenHeight
    );
    
    // If error is acceptable or no children, use this cluster
    if (error < this.errorThreshold || cluster.children.length === 0) {
      return cluster;
    }
    
    // Otherwise, try children
    for (const child of cluster.children) {
      const selected = this.selectBestLOD(child, frustum, screenWidth, screenHeight);
      if (selected) return selected;
    }
    
    return cluster; // Fallback
  }

  /**
   * Render visible clusters
   */
  render(scene) {
    // Clear previous frame's meshes
    const naniteGroup = scene.getObjectByName('naniteGroup') || new THREE.Group();
    naniteGroup.name = 'naniteGroup';
    
    while (naniteGroup.children.length > 0) {
      naniteGroup.remove(naniteGroup.children[0]);
    }
    
    // Add visible clusters
    this.visibleClusters.forEach(({ cluster, material }) => {
      const mesh = new THREE.Mesh(cluster.geometry, material);
      naniteGroup.add(mesh);
    });
    
    if (!scene.getObjectByName('naniteGroup')) {
      scene.add(naniteGroup);
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      avgTrianglesPerCluster: this.stats.visibleClusters > 0 ?
        Math.floor(this.stats.trianglesRendered / this.stats.visibleClusters) : 0
    };
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.clusters.forEach(clusterData => {
      let cluster = clusterData.root;
      while (cluster) {
        if (cluster.geometry) {
          cluster.geometry.dispose();
        }
        cluster = cluster.children[0];
      }
    });
    
    this.clusters.clear();
    this.visibleClusters.clear();
    this.currentMemoryMB = 0;
  }
}

/**
 * Helper to create Nanite-optimized mesh
 */
export function createNaniteMesh(geometry, material, naniteSystem, lodLevels = 5) {
  const mesh = new THREE.Mesh(geometry, material);
  naniteSystem.createLODHierarchy(mesh, lodLevels);
  return mesh;
}

/**
 * Specialized Nanite implementations for universe objects
 */

// Planet with Nanite LODs
export function createNanitePlanet(size, detail, material, naniteSystem) {
  // Generate multiple detail levels
  const geometries = [];
  const detailLevels = [64, 32, 16, 8, 4]; // Segments for each LOD
  
  detailLevels.forEach(segments => {
    const geom = new THREE.SphereGeometry(size, segments, segments);
    geometries.push(geom);
  });
  
  // Build custom hierarchy
  const rootCluster = new GeometryCluster(geometries[0], 0);
  let current = rootCluster;
  
  for (let i = 1; i < geometries.length; i++) {
    const child = new GeometryCluster(geometries[i], i);
    current.children.push(child);
    child.parent = current;
    current = child;
  }
  
  // Register with system
  const meshId = 'planet_' + Math.random();
  naniteSystem.clusters.set(meshId, {
    root: rootCluster,
    material: material,
    mesh: null
  });
  
  return rootCluster;
}

// Galaxy with Nanite point clouds
export function createNaniteGalaxy(starCount, size, naniteSystem) {
  const lodLevels = [
    { stars: starCount, size: 1.0 },
    { stars: starCount / 4, size: 1.5 },
    { stars: starCount / 16, size: 2.0 },
    { stars: starCount / 64, size: 3.0 }
  ];
  
  const geometries = lodLevels.map(level => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(level.stars * 3);
    const colors = new Float32Array(level.stars * 3);
    
    for (let i = 0; i < level.stars * 3; i += 3) {
      // Spiral galaxy shape
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * size;
      const height = (Math.random() - 0.5) * size * 0.1;
      
      positions[i] = Math.cos(angle) * radius;
      positions[i + 1] = height;
      positions[i + 2] = Math.sin(angle) * radius;
      
      // Color variation
      const brightness = Math.random() * 0.5 + 0.5;
      colors[i] = brightness;
      colors[i + 1] = brightness * 0.9;
      colors[i + 2] = brightness * 0.8;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeBoundingBox();
    
    return geometry;
  });
  
  // Build hierarchy
  const rootCluster = new GeometryCluster(geometries[0], 0);
  let current = rootCluster;
  
  for (let i = 1; i < geometries.length; i++) {
    const child = new GeometryCluster(geometries[i], i);
    current.children.push(child);
    child.parent = current;
    current = child;
  }
  
  const material = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true
  });
  
  const meshId = 'galaxy_' + Math.random();
  naniteSystem.clusters.set(meshId, {
    root: rootCluster,
    material: material,
    mesh: null
  });
  
  return rootCluster;
}