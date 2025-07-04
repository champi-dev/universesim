// Dynamic Level of Detail (LOD) System
// Efficiently renders millions of astronomical objects based on distance and importance

import * as THREE from 'three';

export class LODSystem {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.objects = new Map(); // id -> object data
    this.visibleObjects = new Set();
    this.renderBudget = {
      stars: 50000,
      galaxies: 5000,
      nebulae: 500,
      planets: 100,
      asteroids: 10000,
    };
    
    // Instanced meshes for efficient rendering
    this.instancedMeshes = {
      stars: null,
      distantGalaxies: null,
      asteroids: null,
    };
    
    // Octree for spatial partitioning
    this.octree = new Octree(
      new THREE.Vector3(-1e6, -1e6, -1e6),
      new THREE.Vector3(1e6, 1e6, 1e6),
      8
    );
    
    this.lastCameraPosition = new THREE.Vector3();
    this.updateDistance = 100; // Update when camera moves this far
  }
  
  // Initialize instanced meshes
  initInstancedMeshes() {
    // Stars instanced mesh
    const starGeometry = new THREE.SphereGeometry(1, 6, 6);
    const starMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
    });
    this.instancedMeshes.stars = new THREE.InstancedMesh(
      starGeometry,
      starMaterial,
      this.renderBudget.stars
    );
    this.instancedMeshes.stars.frustumCulled = false;
    this.scene.add(this.instancedMeshes.stars);
    
    // Distant galaxies instanced mesh
    const galaxyGeometry = new THREE.PlaneGeometry(1, 1);
    const galaxyMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    this.instancedMeshes.distantGalaxies = new THREE.InstancedMesh(
      galaxyGeometry,
      galaxyMaterial,
      this.renderBudget.galaxies
    );
    this.instancedMeshes.distantGalaxies.frustumCulled = false;
    this.scene.add(this.instancedMeshes.distantGalaxies);
    
    // Asteroids instanced mesh
    const asteroidGeometry = new THREE.TetrahedronGeometry(1, 0);
    const asteroidMaterial = new THREE.MeshLambertMaterial({
      color: 0x888888,
    });
    this.instancedMeshes.asteroids = new THREE.InstancedMesh(
      asteroidGeometry,
      asteroidMaterial,
      this.renderBudget.asteroids
    );
    this.scene.add(this.instancedMeshes.asteroids);
  }
  
  // Add object to LOD system
  addObject(object) {
    const lodObject = {
      id: object.id,
      position: new THREE.Vector3(object.position.x, object.position.y, object.position.z),
      type: object.type,
      data: object,
      lodLevel: -1,
      importance: this.calculateImportance(object),
      mesh: null,
    };
    
    this.objects.set(object.id, lodObject);
    this.octree.insert(lodObject);
  }
  
  // Calculate object importance for LOD decisions
  calculateImportance(object) {
    let importance = 0;
    
    switch (object.type) {
      case 'star':
        // Brighter stars are more important
        importance = Math.max(0, 10 - object.mag);
        if (object.name) importance += 5; // Named stars
        break;
        
      case 'galaxy':
        // Larger/brighter galaxies more important
        importance = Math.max(0, 20 - object.magnitude);
        if (object.name) importance += 10; // Named galaxies
        break;
        
      case 'nebula':
        importance = object.size / 10;
        if (object.name) importance += 8;
        break;
        
      case 'planet':
        importance = 20;
        if (object.name === 'Earth') importance = 100;
        break;
        
      case 'asteroid':
        importance = object.radius / 100;
        break;
        
      default:
        importance = 1;
    }
    
    return importance;
  }
  
  // Update visible objects based on camera position
  update() {
    const cameraPosition = this.camera.position;
    
    // Only update if camera moved significantly
    if (cameraPosition.distanceTo(this.lastCameraPosition) < this.updateDistance) {
      return;
    }
    
    this.lastCameraPosition.copy(cameraPosition);
    
    // Get objects in view frustum
    const frustum = new THREE.Frustum();
    const cameraMatrix = new THREE.Matrix4().multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(cameraMatrix);
    
    // Query octree for nearby objects
    const viewDistance = this.getViewDistance();
    const nearbyObjects = this.octree.query(
      cameraPosition,
      viewDistance
    );
    
    // Score and sort objects
    const scoredObjects = nearbyObjects.map(obj => {
      const distance = obj.position.distanceTo(cameraPosition);
      const score = obj.importance / (1 + distance / 1000);
      return { object: obj, score, distance };
    });
    
    scoredObjects.sort((a, b) => b.score - a.score);
    
    // Select objects to render within budget
    const objectsByType = {
      stars: [],
      galaxies: [],
      nebulae: [],
      planets: [],
      asteroids: [],
    };
    
    for (const { object, distance } of scoredObjects) {
      const typeArray = objectsByType[object.type + 's'];
      if (typeArray && typeArray.length < this.renderBudget[object.type + 's']) {
        object.renderDistance = distance;
        typeArray.push(object);
      }
    }
    
    // Update LOD levels and render
    this.updateStarLODs(objectsByType.stars);
    this.updateGalaxyLODs(objectsByType.galaxies);
    this.updateNebulaLODs(objectsByType.nebulae);
    this.updatePlanetLODs(objectsByType.planets);
    this.updateAsteroidLODs(objectsByType.asteroids);
  }
  
  // Get view distance based on camera position
  getViewDistance() {
    const cameraDistance = this.camera.position.length();
    
    if (cameraDistance < 100) return 500;
    if (cameraDistance < 1000) return 5000;
    if (cameraDistance < 10000) return 50000;
    if (cameraDistance < 100000) return 500000;
    return 5000000;
  }
  
  // Update star LODs
  updateStarLODs(stars) {
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    let instanceIndex = 0;
    
    for (const star of stars) {
      if (instanceIndex >= this.renderBudget.stars) break;
      
      // Calculate size based on magnitude and distance
      const apparentMag = star.data.mag + 5 * Math.log10(star.renderDistance / 10);
      const size = Math.max(0.1, Math.pow(2.512, -apparentMag / 2));
      
      // Set position and scale
      matrix.setPosition(star.position);
      matrix.scale(new THREE.Vector3(size, size, size));
      
      this.instancedMeshes.stars.setMatrixAt(instanceIndex, matrix);
      
      // Set color based on spectral type
      if (star.data.color) {
        color.setHex(star.data.color);
      } else {
        color.setHex(0xffffff);
      }
      this.instancedMeshes.stars.setColorAt(instanceIndex, color);
      
      instanceIndex++;
    }
    
    // Hide unused instances
    for (let i = instanceIndex; i < this.renderBudget.stars; i++) {
      matrix.makeScale(0, 0, 0);
      this.instancedMeshes.stars.setMatrixAt(i, matrix);
    }
    
    this.instancedMeshes.stars.instanceMatrix.needsUpdate = true;
    if (this.instancedMeshes.stars.instanceColor) {
      this.instancedMeshes.stars.instanceColor.needsUpdate = true;
    }
  }
  
  // Update galaxy LODs
  updateGalaxyLODs(galaxies) {
    let instanceIndex = 0;
    
    for (const galaxy of galaxies) {
      if (galaxy.renderDistance < 100000) {
        // Close galaxy - render detailed mesh
        this.renderDetailedGalaxy(galaxy);
      } else {
        // Distant galaxy - use instanced mesh
        if (instanceIndex < this.renderBudget.galaxies) {
          this.renderDistantGalaxy(galaxy, instanceIndex);
          instanceIndex++;
        }
      }
    }
    
    // Hide unused instances
    const matrix = new THREE.Matrix4();
    for (let i = instanceIndex; i < this.renderBudget.galaxies; i++) {
      matrix.makeScale(0, 0, 0);
      this.instancedMeshes.distantGalaxies.setMatrixAt(i, matrix);
    }
    
    this.instancedMeshes.distantGalaxies.instanceMatrix.needsUpdate = true;
  }
  
  // Render detailed galaxy
  renderDetailedGalaxy(galaxy) {
    if (!galaxy.mesh) {
      // Create detailed galaxy mesh
      const group = new THREE.Group();
      
      // Galaxy core
      const coreGeometry = new THREE.SphereGeometry(galaxy.data.size * 0.1, 16, 16);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: galaxy.data.color?.core || 0xffffaa,
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      group.add(core);
      
      // Spiral arms or elliptical shape
      if (galaxy.data.type === 'spiral') {
        const armGeometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        
        for (let i = 0; i < 1000; i++) {
          const angle = (i / 1000) * Math.PI * 6;
          const radius = (i / 1000) * galaxy.data.size;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const y = (Math.random() - 0.5) * galaxy.data.size * 0.1;
          
          positions.push(x, y, z);
          
          const color = new THREE.Color(galaxy.data.color?.arms || 0xaaccff);
          colors.push(color.r, color.g, color.b);
        }
        
        armGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        armGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const armMaterial = new THREE.PointsMaterial({
          size: 2,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          transparent: true,
          opacity: 0.8,
        });
        
        const arms = new THREE.Points(armGeometry, armMaterial);
        group.add(arms);
      }
      
      group.position.copy(galaxy.position);
      galaxy.mesh = group;
      this.scene.add(group);
    }
    
    galaxy.mesh.visible = true;
  }
  
  // Render distant galaxy using instanced mesh
  renderDistantGalaxy(galaxy, instanceIndex) {
    const matrix = new THREE.Matrix4();
    const size = galaxy.data.size * 0.5;
    
    matrix.makeScale(size, size, 1);
    matrix.setPosition(galaxy.position);
    
    // Billboard - face camera
    const quaternion = this.camera.quaternion.clone();
    matrix.makeRotationFromQuaternion(quaternion);
    matrix.scale(new THREE.Vector3(size, size, 1));
    matrix.setPosition(galaxy.position);
    
    this.instancedMeshes.distantGalaxies.setMatrixAt(instanceIndex, matrix);
    
    if (galaxy.mesh) {
      galaxy.mesh.visible = false;
    }
  }
  
  // Update nebula LODs
  updateNebulaLODs(nebulae) {
    for (const nebula of nebulae) {
      const lodLevel = this.getNebulaLOD(nebula.renderDistance);
      
      if (lodLevel !== nebula.lodLevel) {
        this.updateNebulaLOD(nebula, lodLevel);
        nebula.lodLevel = lodLevel;
      }
    }
  }
  
  getNebulaLOD(distance) {
    if (distance < 1000) return 0; // High detail
    if (distance < 10000) return 1; // Medium detail
    if (distance < 100000) return 2; // Low detail
    return 3; // Billboard
  }
  
  updateNebulaLOD(nebula, lodLevel) {
    if (nebula.mesh) {
      this.scene.remove(nebula.mesh);
      nebula.mesh.geometry.dispose();
      nebula.mesh.material.dispose();
    }
    
    // Create appropriate LOD mesh
    // (Implementation depends on specific nebula rendering approach)
  }
  
  // Update planet LODs
  updatePlanetLODs(planets) {
    for (const planet of planets) {
      const lodLevel = this.getPlanetLOD(planet.renderDistance);
      
      if (lodLevel !== planet.lodLevel) {
        this.updatePlanetLOD(planet, lodLevel);
        planet.lodLevel = lodLevel;
      }
    }
  }
  
  getPlanetLOD(distance) {
    if (distance < 50) return 0; // High detail with atmosphere
    if (distance < 200) return 1; // Medium detail
    if (distance < 1000) return 2; // Low detail
    return 3; // Point
  }
  
  updatePlanetLOD(planet, lodLevel) {
    // Update planet mesh based on LOD level
    // (Implementation depends on specific planet rendering)
  }
  
  // Update asteroid LODs
  updateAsteroidLODs(asteroids) {
    const matrix = new THREE.Matrix4();
    let instanceIndex = 0;
    
    for (const asteroid of asteroids) {
      if (instanceIndex >= this.renderBudget.asteroids) break;
      
      const size = asteroid.data.radius || 1;
      
      matrix.makeScale(size, size, size);
      matrix.setPosition(asteroid.position);
      
      this.instancedMeshes.asteroids.setMatrixAt(instanceIndex, matrix);
      instanceIndex++;
    }
    
    // Hide unused instances
    for (let i = instanceIndex; i < this.renderBudget.asteroids; i++) {
      matrix.makeScale(0, 0, 0);
      this.instancedMeshes.asteroids.setMatrixAt(i, matrix);
    }
    
    this.instancedMeshes.asteroids.instanceMatrix.needsUpdate = true;
  }
  
  // Clean up resources
  dispose() {
    for (const mesh of Object.values(this.instancedMeshes)) {
      if (mesh) {
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.scene.remove(mesh);
      }
    }
    
    for (const object of this.objects.values()) {
      if (object.mesh) {
        this.scene.remove(object.mesh);
        object.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }
    }
  }
}

// Simple Octree implementation for spatial partitioning
class Octree {
  constructor(min, max, maxDepth = 8) {
    this.min = min;
    this.max = max;
    this.maxDepth = maxDepth;
    this.root = new OctreeNode(min, max, 0, maxDepth);
  }
  
  insert(object) {
    this.root.insert(object);
  }
  
  query(position, radius) {
    return this.root.query(position, radius);
  }
}

class OctreeNode {
  constructor(min, max, depth, maxDepth) {
    this.min = min;
    this.max = max;
    this.depth = depth;
    this.maxDepth = maxDepth;
    this.objects = [];
    this.children = null;
    this.center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
  }
  
  insert(object) {
    if (this.depth >= this.maxDepth || this.objects.length < 8) {
      this.objects.push(object);
      return;
    }
    
    if (!this.children) {
      this.subdivide();
    }
    
    const childIndex = this.getChildIndex(object.position);
    this.children[childIndex].insert(object);
  }
  
  subdivide() {
    this.children = [];
    const { min, max, center } = this;
    
    for (let i = 0; i < 8; i++) {
      const childMin = new THREE.Vector3(
        i & 1 ? center.x : min.x,
        i & 2 ? center.y : min.y,
        i & 4 ? center.z : min.z
      );
      const childMax = new THREE.Vector3(
        i & 1 ? max.x : center.x,
        i & 2 ? max.y : center.y,
        i & 4 ? max.z : center.z
      );
      
      this.children[i] = new OctreeNode(childMin, childMax, this.depth + 1, this.maxDepth);
    }
    
    // Move objects to children
    for (const object of this.objects) {
      const childIndex = this.getChildIndex(object.position);
      this.children[childIndex].insert(object);
    }
    this.objects = [];
  }
  
  getChildIndex(position) {
    let index = 0;
    if (position.x > this.center.x) index |= 1;
    if (position.y > this.center.y) index |= 2;
    if (position.z > this.center.z) index |= 4;
    return index;
  }
  
  query(position, radius) {
    const results = [];
    
    // Check if sphere intersects this node
    const closest = new THREE.Vector3(
      Math.max(this.min.x, Math.min(position.x, this.max.x)),
      Math.max(this.min.y, Math.min(position.y, this.max.y)),
      Math.max(this.min.z, Math.min(position.z, this.max.z))
    );
    
    if (closest.distanceTo(position) > radius) {
      return results;
    }
    
    // Add objects from this node
    for (const object of this.objects) {
      if (object.position.distanceTo(position) <= radius) {
        results.push(object);
      }
    }
    
    // Query children
    if (this.children) {
      for (const child of this.children) {
        results.push(...child.query(position, radius));
      }
    }
    
    return results;
  }
}