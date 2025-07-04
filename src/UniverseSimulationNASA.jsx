import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { loadAstronomicalData } from "./data/nasaDataFetcher";
import { preloadedExoplanets, preloadedAsteroids, preloadedNebulae } from "./data/preloadedData";

// Spatial hash grid for O(1) lookups
class SpatialHashGrid {
  constructor(cellSize = 10000) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.viewCache = new Map();
  }
  
  hash(x, y, z) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }
  
  insert(object, position, type) {
    const key = this.hash(position.x, position.y, position.z);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push({ object, position, type });
  }
  
  getVisibleObjects(cameraPosition, viewDistance) {
    const cacheKey = `${Math.floor(cameraPosition.x/1000)},${Math.floor(cameraPosition.y/1000)},${Math.floor(cameraPosition.z/1000)}`;
    
    if (this.viewCache.has(cacheKey)) {
      return this.viewCache.get(cacheKey);
    }
    
    const results = [];
    const cellRadius = Math.ceil(viewDistance / this.cellSize);
    const centerCell = {
      x: Math.floor(cameraPosition.x / this.cellSize),
      y: Math.floor(cameraPosition.y / this.cellSize),
      z: Math.floor(cameraPosition.z / this.cellSize)
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
    
    this.viewCache.set(cacheKey, results);
    return results;
  }
}

// Convert RA/Dec to 3D coordinates
function raDecTo3D(ra, dec, distance = 100) {
  const phi = (90 - dec) * Math.PI / 180;
  const theta = ra * Math.PI / 180;
  
  return new THREE.Vector3(
    distance * Math.sin(phi) * Math.cos(theta),
    distance * Math.cos(phi),
    distance * Math.sin(phi) * Math.sin(theta)
  );
}

// Astronomical Units to Three.js units (1 AU = 100 units)
const AU_SCALE = 100;

const UniverseSimulationNASA = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene with pure black background like space
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera starts at Earth's distance from Sun (1 AU = 100 units)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000000);
    // Position at Earth's distance, looking at the Sun
    camera.position.set(AU_SCALE, 0, 0); // 1 AU from Sun
    camera.lookAt(0, 0, 0); // Look at Sun

    // Renderer with high quality
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Load NASA astronomical data
    const astronomicalData = loadAstronomicalData();
    window.astronomicalData = astronomicalData;

    // Initialize spatial grid
    const spatialGrid = new SpatialHashGrid(1000);

    // ========== SUN (Our Star) ==========
    const sunGroup = new THREE.Group();
    
    // Realistic Sun with corona
    const sunGeometry = new THREE.IcosahedronGeometry(10, 5); // Sun radius (696,000 km scaled)
    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0xffffff) },
        color2: { value: new THREE.Color(0xffaa00) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;
        
        float noise(vec3 p) {
          return sin(p.x * 0.1) * cos(p.y * 0.1) * sin(p.z * 0.1 + time * 0.5);
        }
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          
          vec3 pos = position;
          float n = noise(position * 0.3) * 0.5;
          pos += normal * n;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0)) * 0.5 + 0.5;
          vec3 color = mix(color2, color1, intensity);
          
          // Solar flares
          float flare = sin(time + vPosition.x * 0.1) * 0.5 + 0.5;
          color += vec3(1.0, 0.5, 0.0) * flare * 0.3;
          
          gl_FragColor = vec4(color * 2.0, 1.0);
        }
      `
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sunGroup.add(sun);

    // Sun corona
    const coronaGeometry = new THREE.SphereGeometry(15, 32, 32);
    const coronaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        viewVector: { value: camera.position }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vPositionNormal), 2.0);
          vec3 color = vec3(1.0, 0.8, 0.3) * intensity * 3.0;
          gl_FragColor = vec4(color, intensity);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    sunGroup.add(corona);

    scene.add(sunGroup);

    // Sun light
    const sunLight = new THREE.PointLight(0xffffff, 2, 10000);
    sun.add(sunLight);

    // ========== SOLAR SYSTEM PLANETS ==========
    const planetData = [
      { name: "Mercury", distance: 0.39, size: 0.38, color: 0x8c7853, speed: 4.15 },
      { name: "Venus", distance: 0.72, size: 0.95, color: 0xffc649, speed: 1.62 },
      { name: "Earth", distance: 1.0, size: 1.0, color: 0x2233ff, speed: 1 },
      { name: "Mars", distance: 1.52, size: 0.53, color: 0xcd5c5c, speed: 0.53 },
      { name: "Jupiter", distance: 5.2, size: 11.2, color: 0xdaa520, speed: 0.084 },
      { name: "Saturn", distance: 9.58, size: 9.45, color: 0xf4a460, speed: 0.034 },
      { name: "Uranus", distance: 19.22, size: 4.0, color: 0x4fd1c5, speed: 0.012 },
      { name: "Neptune", distance: 30.05, size: 3.88, color: 0x4169e1, speed: 0.006 }
    ];

    const planets = [];
    planetData.forEach((data) => {
      const geometry = new THREE.SphereGeometry(data.size, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: 0.1
      });
      const planet = new THREE.Mesh(geometry, material);
      planet.userData = {
        distance: data.distance * AU_SCALE,
        speed: data.speed,
        angle: Math.random() * Math.PI * 2,
        name: data.name
      };
      scene.add(planet);
      planets.push(planet);
      spatialGrid.insert(planet, planet.position, 'planet');
    });

    // ========== NASA ASTEROIDS ==========
    const asteroidGroup = new THREE.Group();
    preloadedAsteroids.forEach((asteroid) => {
      const geometry = new THREE.IcosahedronGeometry(asteroid.diameter / 100, 0);
      const material = new THREE.MeshLambertMaterial({ 
        color: 0x888888,
        emissive: 0x111111
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // Position based on orbital elements
      const a = asteroid.a * AU_SCALE; // Semi-major axis
      const angle = Math.random() * Math.PI * 2;
      mesh.position.x = Math.cos(angle) * a;
      mesh.position.z = Math.sin(angle) * a;
      mesh.position.y = (Math.random() - 0.5) * 10;
      
      mesh.userData = asteroid;
      asteroidGroup.add(mesh);
      spatialGrid.insert(mesh, mesh.position, 'asteroid');
    });
    scene.add(asteroidGroup);

    // ========== NASA EXOPLANETS ==========
    const exoplanetGroup = new THREE.Group();
    preloadedExoplanets.forEach((exoplanet) => {
      const position = raDecTo3D(exoplanet.ra, exoplanet.dec, exoplanet.st_dist * 100);
      
      // Star system
      const starGeometry = new THREE.SphereGeometry(2, 16, 16);
      const starMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.1, 1, 0.5 + Math.random() * 0.5),
        emissive: 0xffaa00,
        emissiveIntensity: 0.5
      });
      const star = new THREE.Mesh(starGeometry, starMaterial);
      star.position.copy(position);
      exoplanetGroup.add(star);
      
      // Planet
      if (exoplanet.pl_rade) {
        const planetGeometry = new THREE.SphereGeometry(exoplanet.pl_rade * 0.5, 16, 16);
        const planetMaterial = new THREE.MeshPhongMaterial({
          color: 0x4444ff,
          emissive: 0x000022
        });
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planet.position.copy(position);
        planet.position.x += exoplanet.pl_orbsmax * 10;
        planet.userData = exoplanet;
        exoplanetGroup.add(planet);
        spatialGrid.insert(planet, planet.position, 'exoplanet');
      }
    });
    scene.add(exoplanetGroup);

    // ========== NASA NEBULAE WITH LOD ==========
    const nebulaGroup = new THREE.Group();
    const nebulaMaterials = [];
    
    preloadedNebulae.forEach((nebula) => {
      const position = raDecTo3D(nebula.ra, nebula.dec, nebula.distance || 1000);
      const nebulaLOD = new THREE.LOD();
      
      // Color based on nebula type
      let color1, color2;
      switch(nebula.type) {
        case 'emission':
          color1 = 0xff0066; color2 = 0xff6600;
          break;
        case 'planetary':
          color1 = 0x00ff66; color2 = 0x00ffff;
          break;
        case 'supernova':
          color1 = 0xff00ff; color2 = 0xffff00;
          break;
        default:
          color1 = 0x6666ff; color2 = 0xff6666;
      }
      
      // HIGH DETAIL - Complex shader with animation
      const highMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(color1) },
          color2: { value: new THREE.Color(color2) }
        },
        vertexShader: `
          varying vec3 vPosition;
          varying vec3 vNormal;
          uniform float time;
          
          void main() {
            vPosition = position;
            vNormal = normalize(normalMatrix * normal);
            
            vec3 pos = position;
            float wave = sin(time * 0.5 + position.x * 0.1) * 0.5;
            pos += normal * wave;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 color1;
          uniform vec3 color2;
          varying vec3 vPosition;
          varying vec3 vNormal;
          
          float noise(vec3 p) {
            return sin(p.x) * cos(p.y) * sin(p.z + time * 0.1);
          }
          
          void main() {
            float d = length(vPosition) / 100.0;
            float n = noise(vPosition * 0.1);
            vec3 color = mix(color1, color2, d + n * 0.3);
            
            float edge = 1.0 - pow(abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 0.5);
            float alpha = (1.0 - d) * edge * 0.8;
            
            gl_FragColor = vec4(color * 2.0, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      
      const highGeometry = new THREE.IcosahedronGeometry(nebula.size || 100, 3);
      const highMesh = new THREE.Mesh(highGeometry, highMaterial);
      nebulaLOD.addLevel(highMesh, 0);
      nebulaMaterials.push(highMaterial);
      
      // MEDIUM DETAIL - Simpler shader
      const mediumMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color1: { value: new THREE.Color(color1) },
          color2: { value: new THREE.Color(color2) }
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
          varying vec3 vPosition;
          
          void main() {
            float d = length(vPosition) / 100.0;
            vec3 color = mix(color1, color2, d);
            float alpha = (1.0 - d) * 0.5;
            gl_FragColor = vec4(color * 2.0, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false
      });
      
      const mediumGeometry = new THREE.IcosahedronGeometry(nebula.size || 100, 2);
      const mediumMesh = new THREE.Mesh(mediumGeometry, mediumMaterial);
      nebulaLOD.addLevel(mediumMesh, 5000);
      
      // LOW DETAIL - Basic sprite
      const spriteMaterial = new THREE.SpriteMaterial({
        color: color1,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set((nebula.size || 100) * 2, (nebula.size || 100) * 2, 1);
      nebulaLOD.addLevel(sprite, 20000);
      
      nebulaLOD.position.copy(position);
      nebulaLOD.userData = nebula;
      nebulaGroup.add(nebulaLOD);
      spatialGrid.insert(nebulaLOD, position, 'nebula');
    });
    scene.add(nebulaGroup);

    // ========== JWST-STYLE BACKGROUND STARS ==========
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 200000;
    const positions = new Float32Array(starsCount * 3);
    const colors = new Float32Array(starsCount * 3);
    const sizes = new Float32Array(starsCount);

    for (let i = 0; i < starsCount; i++) {
      const i3 = i * 3;
      
      const radius = 10000 + Math.random() * 90000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // JWST infrared colors
      const warmth = 0.7 + Math.random() * 0.3;
      colors[i3] = 1;
      colors[i3 + 1] = warmth;
      colors[i3 + 2] = warmth * 0.8;
      
      sizes[i] = Math.random() * 2 + 0.5;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

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
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float ll = length(xy);
          if (ll > 0.5) discard;
          
          float intensity = 1.0 - (ll * 2.0);
          intensity = pow(intensity, 3.0);
          
          gl_FragColor = vec4(vColor * intensity * 2.0, intensity);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColors: true
    });

    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // ========== JWST DIFFRACTION SPIKES FOR BRIGHT STARS ==========
    for(let i = 0; i < 20; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 20000,
        (Math.random() - 0.5) * 20000,
        (Math.random() - 0.5) * 20000
      );
      const size = 10 + Math.random() * 30;
      
      const spikeGroup = new THREE.Group();
      
      // 6 spikes like JWST
      const spikeAngles = [0, 60, 120, 180, 240, 300];
      
      spikeAngles.forEach(angle => {
        const spikeGeometry = new THREE.PlaneGeometry(size * 0.1, size * 10);
        const spikeMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide
        });
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        spike.rotation.z = (angle * Math.PI) / 180;
        spikeGroup.add(spike);
      });
      
      // Central star
      const starGeometry = new THREE.SphereGeometry(size, 32, 32);
      const starMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 2
      });
      const star = new THREE.Mesh(starGeometry, starMaterial);
      spikeGroup.add(star);
      
      spikeGroup.position.copy(position);
      scene.add(spikeGroup);
    }

    // ========== GALAXIES ==========
    for(let i = 0; i < 100; i++) {
      const distance = 50000 + Math.random() * 150000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const position = new THREE.Vector3(
        distance * Math.sin(phi) * Math.cos(theta),
        distance * Math.sin(phi) * Math.sin(theta),
        distance * Math.cos(phi)
      );
      
      const galaxyGroup = new THREE.Group();
      
      // Spiral galaxy
      if(Math.random() < 0.7) {
        const spiralGeometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        
        const arms = 2 + Math.floor(Math.random() * 3);
        const points = 500;
        
        for(let arm = 0; arm < arms; arm++) {
          const armOffset = (arm / arms) * Math.PI * 2;
          
          for(let j = 0; j < points / arms; j++) {
            const t = j / (points / arms);
            const angle = t * Math.PI * 4 + armOffset;
            const radius = t * 200;
            const spread = Math.random() * 20;
            
            vertices.push(
              Math.cos(angle) * (radius + spread),
              (Math.random() - 0.5) * 10,
              Math.sin(angle) * (radius + spread)
            );
            
            const brightness = 1 - t * 0.7;
            colors.push(brightness, brightness * 0.9, brightness * 0.8);
          }
        }
        
        spiralGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        spiralGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const spiralMaterial = new THREE.PointsMaterial({
          size: 3,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          transparent: true
        });
        
        galaxyGroup.add(new THREE.Points(spiralGeometry, spiralMaterial));
      }
      
      galaxyGroup.position.copy(position);
      galaxyGroup.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      scene.add(galaxyGroup);
      spatialGrid.insert(galaxyGroup, position, 'galaxy');
    }

    // Camera controls
    let isPointerLocked = false;
    const keys = {};

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

      // Update Sun
      sun.material.uniforms.time.value = time;
      corona.material.uniforms.viewVector.value = camera.position;
      sunGroup.rotation.y += 0.001;

      // Update planets
      planets.forEach(planet => {
        planet.userData.angle += planet.userData.speed * 0.01;
        planet.position.x = Math.cos(planet.userData.angle) * planet.userData.distance;
        planet.position.z = Math.sin(planet.userData.angle) * planet.userData.distance;
        planet.rotation.y += 0.01;
      });

      // Update nebulae materials
      nebulaMaterials.forEach(material => {
        material.uniforms.time.value = time;
      });
      
      // Update LODs
      scene.traverse((object) => {
        if (object.isLOD) {
          object.update(camera);
        }
      });

      // Rotate star field
      starField.rotation.y += 0.00002;

      // Camera movement
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      
      const speed = keys['shift'] ? 100 : 20;
      if (keys['w']) camera.position.addScaledVector(forward, speed);
      if (keys['s']) camera.position.addScaledVector(forward, -speed);
      if (keys['a']) camera.position.addScaledVector(right, -speed);
      if (keys['d']) camera.position.addScaledVector(right, speed);
      if (keys[' ']) camera.position.y += speed;
      if (keys['control']) camera.position.y -= speed;

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

export default UniverseSimulationNASA;