import React, { useRef, useEffect } from "react";
import * as THREE from "three";

// Spatial hash grid for O(1) lookups
class SpatialHashGrid {
  constructor(cellSize = 1000) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }
  
  hash(x, y, z) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }
  
  insert(object, position) {
    const key = this.hash(position.x, position.y, position.z);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push({ object, position });
  }
  
  getNearbyCells(position, radius) {
    const results = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCell = {
      x: Math.floor(position.x / this.cellSize),
      y: Math.floor(position.y / this.cellSize),
      z: Math.floor(position.z / this.cellSize)
    };
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const key = `${centerCell.x + dx},${centerCell.y + dy},${centerCell.z + dz}`;
          if (this.grid.has(key)) {
            results.push(...this.grid.get(key));
          }
        }
      }
    }
    return results;
  }
}

const UniverseSimulationJWSTOptimized = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene with pure black background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera with JWST-like FOV
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 200000);
    camera.position.set(0, 0, 5000);

    // Renderer optimized for performance
    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, // Disable for performance
      powerPreference: "high-performance",
      precision: "lowp" // Lower precision for better performance
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio
    renderer.shadowMap.enabled = false; // Disable shadows for performance
    mountRef.current.appendChild(renderer.domElement);

    // Spatial grid for all objects
    const spatialGrid = new SpatialHashGrid(5000);
    
    // LOD system for nebulae
    const nebulaLODs = [];
    
    // Simplified nebula shader for performance
    const createOptimizedNebula = (position, scale, color1, color2) => {
      const lod = new THREE.LOD();
      
      // High detail (close)
      const highGeometry = new THREE.IcosahedronGeometry(1, 2);
      const highMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color1: { value: new THREE.Color(color1) },
          color2: { value: new THREE.Color(color2) },
          time: { value: 0 }
        },
        vertexShader: `
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color1;
          uniform vec3 color2;
          uniform float time;
          varying vec3 vPosition;
          
          void main() {
            float d = length(vPosition);
            vec3 color = mix(color1, color2, d);
            float alpha = 1.0 - smoothstep(0.5, 1.0, d);
            gl_FragColor = vec4(color * 2.0, alpha * 0.7);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const highMesh = new THREE.Mesh(highGeometry, highMaterial);
      highMesh.scale.copy(scale);
      lod.addLevel(highMesh, 0);
      
      // Low detail (far)
      const lowGeometry = new THREE.SphereGeometry(1, 8, 6);
      const lowMaterial = new THREE.MeshBasicMaterial({
        color: color1,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      });
      const lowMesh = new THREE.Mesh(lowGeometry, lowMaterial);
      lowMesh.scale.copy(scale);
      lod.addLevel(lowMesh, 20000);
      
      // Empty for very far
      lod.addLevel(new THREE.Object3D(), 50000);
      
      lod.position.copy(position);
      nebulaLODs.push({ lod, material: highMaterial });
      spatialGrid.insert(lod, position);
      
      return lod;
    };
    
    // Add 3 nebulae with LOD
    scene.add(createOptimizedNebula(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(3000, 4000, 2000),
      0x0066ff,
      0xff6600
    ));
    
    scene.add(createOptimizedNebula(
      new THREE.Vector3(-2000, 1000, -1000),
      new THREE.Vector3(2000, 3000, 1500),
      0xff0066,
      0x00ffff
    ));
    
    scene.add(createOptimizedNebula(
      new THREE.Vector3(1500, -1500, 500),
      new THREE.Vector3(2500, 2000, 2000),
      0xffaa00,
      0xff00ff
    ));

    // Instanced stars with diffraction spikes
    const starCount = 20;
    const spikeGeometry = new THREE.PlaneGeometry(1, 10);
    const spikeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    // Create instanced mesh for spikes
    const instancedSpikes = new THREE.InstancedMesh(spikeGeometry, spikeMaterial, starCount * 6);
    const spikeMatrix = new THREE.Matrix4();
    const spikeRotation = new THREE.Euler();
    const spikeScale = new THREE.Vector3();
    
    let spikeIndex = 0;
    for(let i = 0; i < starCount; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 20000,
        (Math.random() - 0.5) * 20000,
        (Math.random() - 0.5) * 20000
      );
      const size = 10 + Math.random() * 30;
      
      // Add to spatial grid
      spatialGrid.insert({ type: 'star', size }, position);
      
      // Create 6 spikes per star
      const spikeAngles = [0, 60, 120, 180, 240, 300];
      spikeAngles.forEach(angle => {
        spikeScale.set(size * 0.1, size * 10, 1);
        spikeRotation.set(0, 0, (angle * Math.PI) / 180);
        spikeMatrix.compose(position, spikeRotation, spikeScale);
        instancedSpikes.setMatrixAt(spikeIndex++, spikeMatrix);
      });
    }
    instancedSpikes.instanceMatrix.needsUpdate = true;
    scene.add(instancedSpikes);

    // Background stars using Points with buffer geometry
    const bgStarsGeometry = new THREE.BufferGeometry();
    const bgStarsCount = 100000; // Reduced from 500k
    const positions = new Float32Array(bgStarsCount * 3);
    const colors = new Float32Array(bgStarsCount * 3);
    const sizes = new Float32Array(bgStarsCount);

    // Pre-calculate star positions
    for (let i = 0; i < bgStarsCount; i++) {
      const i3 = i * 3;
      const radius = 10000 + Math.random() * 90000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // Warm colors only
      const warmth = 0.7 + Math.random() * 0.3;
      colors[i3] = 1;
      colors[i3 + 1] = warmth;
      colors[i3 + 2] = warmth * 0.8;
      
      sizes[i] = Math.random() * 2 + 0.5;
    }

    bgStarsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    bgStarsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    bgStarsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Simplified star shader
    const starsMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float intensity = 1.0 - d * 2.0;
          gl_FragColor = vec4(vColor * intensity * 2.0, intensity);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColors: true
    });

    const starField = new THREE.Points(bgStarsGeometry, starsMaterial);
    scene.add(starField);

    // Instanced galaxies
    const galaxyCount = 50; // Reduced from 200
    const galaxyGeometry = new THREE.CircleGeometry(1, 6);
    const galaxyMaterial = new THREE.MeshBasicMaterial({
      color: 0xffddaa,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    const instancedGalaxies = new THREE.InstancedMesh(galaxyGeometry, galaxyMaterial, galaxyCount);
    const galaxyMatrix = new THREE.Matrix4();
    const galaxyRotation = new THREE.Quaternion();
    const galaxyScale = new THREE.Vector3();
    
    for(let i = 0; i < galaxyCount; i++) {
      const distance = 50000 + Math.random() * 100000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const position = new THREE.Vector3(
        distance * Math.sin(phi) * Math.cos(theta),
        distance * Math.sin(phi) * Math.sin(theta),
        distance * Math.cos(phi)
      );
      
      galaxyRotation.setFromEuler(new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ));
      
      const scale = (100 + Math.random() * 100) * (1 - (distance - 50000) / 100000 * 0.5);
      galaxyScale.set(scale, scale, 1);
      
      galaxyMatrix.compose(position, galaxyRotation, galaxyScale);
      instancedGalaxies.setMatrixAt(i, galaxyMatrix);
      
      spatialGrid.insert({ type: 'galaxy', scale }, position);
    }
    instancedGalaxies.instanceMatrix.needsUpdate = true;
    scene.add(instancedGalaxies);

    // Simple light
    const light = new THREE.PointLight(0xffffff, 0.5, 10000);
    light.position.set(0, 0, 0);
    scene.add(light);

    // Camera controls
    let isPointerLocked = false;
    const keys = {};
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();

    window.addEventListener('keydown', (e) => {
      keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
    });

    renderer.domElement.addEventListener('click', () => {
      renderer.domElement.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      isPointerLocked = document.pointerLockElement === renderer.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isPointerLocked) return;
      
      const sensitivity = 0.002;
      camera.rotation.y -= e.movementX * sensitivity;
      camera.rotation.x -= e.movementY * sensitivity;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    });

    // Animation loop
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.016;

      // Update nebula shaders
      nebulaLODs.forEach(({ lod, material }) => {
        material.uniforms.time.value = time;
      });

      // Camera movement with acceleration
      direction.set(0, 0, 0);
      
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      
      if (keys['w']) direction.add(forward);
      if (keys['s']) direction.sub(forward);
      if (keys['a']) direction.sub(right);
      if (keys['d']) direction.add(right);
      if (keys[' ']) direction.y += 1;
      if (keys['control']) direction.y -= 1;
      
      direction.normalize();
      
      const speed = keys['shift'] ? 200 : 50;
      if (direction.length() > 0) {
        velocity.lerp(direction.multiplyScalar(speed), 0.1);
      } else {
        velocity.multiplyScalar(0.9);
      }
      
      camera.position.add(velocity);

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default UniverseSimulationJWSTOptimized;