import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { loadAstronomicalData } from "./data/nasaDataFetcher";
import { preloadedAsteroids, preloadedNebulae } from "./data/preloadedData";
import { OptimizedStarCatalog } from "./data/optimizedStarCatalog";
import { OptimizedGalaxyCatalog } from "./data/optimizedGalaxyCatalog";

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
// Parsec to Three.js units (1 parsec = 206265 AU = 20,626,500 units, scaled down to 10,000)
const PARSEC_SCALE = 10000;
// Megaparsec scale (1 Mpc = 1,000,000 parsecs, scaled to 10,000,000 units)
const MPC_SCALE = 10000000;

const UniverseSimulationFullUniverse = () => {
  const mountRef = useRef(null);
  // const minimapRef = useRef(null); // Reserved for future use
  const [cameraPos, setCameraPos] = useState({ x: 0, y: 0, z: 0 });
  const [currentScale, setCurrentScale] = useState('Solar System');
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState(null);
  const touchRef = useRef({ 
    startX: 0, 
    startY: 0, 
    startDistance: 0,
    cameraStartPos: null,
    isPinching: false,
    lastTap: 0
  });

  useEffect(() => {
    if (!mountRef.current) return;
    
    console.log('Starting universe simulation...');
    
    try {

    const width = window.innerWidth;
    const height = window.innerHeight;
    console.log('Window size:', width, height);
    
    // Detect mobile device
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth < 768;
      setIsMobile(mobile);
      return mobile;
    };
    const mobile = checkMobile();
    console.log('Mobile detected:', mobile);

    // Scene with pure black background and atmospheric effects
    console.log('Creating scene...');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Add exponential fog for depth perception
    scene.fog = new THREE.FogExp2(0x000000, 0.00000001);
    console.log('Scene created');

    // Camera with extended range for universe scale
    console.log('Creating camera...');
    const camera = new THREE.PerspectiveCamera(mobile ? 60 : 45, width / height, 0.1, 100000000000);
    // Mobile starts closer for better planet visibility
    if (mobile) {
      camera.position.set(AU_SCALE * 2, AU_SCALE * 0.5, AU_SCALE * 2);
    } else {
      camera.position.set(AU_SCALE, 0, 0);
    }
    camera.lookAt(0, 0, 0);
    console.log('Camera created at position:', camera.position);

    // Renderer with state-of-the-art quality and HDR
    console.log('Creating renderer...');
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance",
        logarithmicDepthBuffer: true, // Important for universe scale
        alpha: false,
        stencil: false,
        depth: true
      });
      console.log('Renderer created successfully');
    } catch (rendererError) {
      console.error('Failed to create WebGL renderer:', rendererError);
      throw new Error('WebGL not supported or failed to initialize');
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // HDR-like tone mapping and color grading
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    mountRef.current.appendChild(renderer.domElement);
    console.log('Renderer attached to DOM');
    
    // Post-processing for HDR bloom and effects (reserved for future use)
    // const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    //   type: THREE.HalfFloatType,
    //   format: THREE.RGBAFormat,
    //   colorSpace: THREE.SRGBColorSpace,
    //   samples: 4
    // });

    // Create environment map for reflections (simplified)
    console.log('Setting up environment...');
    let pmremGenerator = null;
    try {
      pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      console.log('Environment generator created');
    } catch (envError) {
      console.warn('Could not create environment map:', envError);
    }

    // Initialize optimization systems
    console.log('Initializing optimization systems...');
    const starCatalog = new OptimizedStarCatalog();
    const galaxyCatalog = new OptimizedGalaxyCatalog();
    const spatialGrid = new SpatialHashGrid(10000);
    console.log('Optimization systems initialized');

    // Load all astronomical data
    console.log('Loading astronomical data...');
    loadAstronomicalData(); // Data is loaded from preloaded files
    console.log('Astronomical data loaded');

    // ========== MINIMAP SETUP ==========
    const minimapCanvas = document.createElement('canvas');
    const minimapSize = mobile ? 150 : 250;
    minimapCanvas.width = minimapSize;
    minimapCanvas.height = minimapSize;
    minimapCanvas.style.position = 'fixed';
    minimapCanvas.style.bottom = mobile ? '10px' : '20px';
    minimapCanvas.style.right = mobile ? '10px' : '20px';
    minimapCanvas.style.border = '2px solid rgba(255, 255, 255, 0.5)';
    minimapCanvas.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    minimapCanvas.style.borderRadius = '10px';
    minimapCanvas.style.pointerEvents = 'none';
    minimapCanvas.style.zIndex = '1000';
    minimapCanvas.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.8)';
    document.body.appendChild(minimapCanvas);
    
    const minimapCtx = minimapCanvas.getContext('2d');
    let minimapScale = 0.001; // Dynamic based on view scale
    const minimapCenter = { x: minimapSize / 2, y: minimapSize / 2 };

    // ========== SUN (Our Star) ==========
    console.log('Creating sun...');
    const sunGroup = new THREE.Group();
    const sunGeometry = new THREE.IcosahedronGeometry(10, 5);
    
    let sunMaterial;
    try {
      sunMaterial = new THREE.ShaderMaterial({
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
        
        // HDR tone mapping
        vec3 ACESFilmicToneMapping(vec3 color) {
          const float a = 2.51;
          const float b = 0.03;
          const float c = 2.43;
          const float d = 0.59;
          const float e = 0.14;
          return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
        }
        
        void main() {
          float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0)) * 0.5 + 0.5;
          vec3 color = mix(color2, color1, intensity);
          
          // Solar flares
          float flare = sin(time + vPosition.x * 0.1) * 0.5 + 0.5;
          color += vec3(1.0, 0.5, 0.0) * flare * 0.3;
          
          // Corona effect
          float corona = pow(intensity, 3.0);
          color += vec3(1.0, 0.8, 0.4) * corona * 2.0;
          
          // HDR bloom
          vec3 hdrColor = color * 4.0;
          vec3 mapped = ACESFilmicToneMapping(hdrColor);
          
          // Output with gamma correction
          gl_FragColor = vec4(pow(mapped, vec2(1.0/2.2)).rgb, 1.0);
        }
      `
    });
    } catch (shaderError) {
      console.error('Failed to create sun shader material:', shaderError);
      // Fallback to basic material
      sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.5
      });
    }
    
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sunGroup.add(sun);
    console.log('Sun created');

    // Advanced lighting setup
    const sunLight = new THREE.PointLight(0xffffff, 3, 20000);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 5000;
    sun.add(sunLight);
    
    // Add volumetric light rays
    const sunGodRays = new THREE.PointLight(0xffaa00, 1, 15000);
    sun.add(sunGodRays);
    
    // Ambient lighting for space realism
    const ambientLight = new THREE.AmbientLight(0x040408, 0.3);
    scene.add(ambientLight);
    
    // Add bloom glow to sun
    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(15, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      })
    );
    sun.add(sunGlow);
    
    scene.add(sunGroup);

    // ========== SOLAR SYSTEM ==========
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
      const geometry = new THREE.SphereGeometry(data.size, 64, 64);
      
      // Create realistic planet material with PBR
      const material = new THREE.MeshPhysicalMaterial({
        color: data.color,
        metalness: data.name === 'Mercury' ? 0.3 : 0.0,
        roughness: data.name === 'Earth' ? 0.7 : 0.9,
        emissive: data.color,
        emissiveIntensity: 0.02,
        clearcoat: data.name === 'Earth' ? 0.3 : 0,
        clearcoatRoughness: 0.1,
        reflectivity: data.name === 'Venus' ? 0.9 : 0.5,
        envMapIntensity: 1.5,
        sheen: data.name === 'Jupiter' || data.name === 'Saturn' ? 1.0 : 0,
        sheenColor: new THREE.Color(data.color).multiplyScalar(1.2)
      });
      
      const planet = new THREE.Mesh(geometry, material);
      planet.castShadow = true;
      planet.receiveShadow = true;
      
      // Add atmosphere glow for certain planets
      if (['Earth', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].includes(data.name)) {
        const atmosGeometry = new THREE.SphereGeometry(data.size * 1.1, 32, 32);
        const atmosMaterial = new THREE.ShaderMaterial({
          uniforms: {
            color: { value: new THREE.Color(data.color) },
            viewVector: { value: camera.position }
          },
          vertexShader: `
            uniform vec3 viewVector;
            varying float intensity;
            void main() {
              vec3 vNormal = normalize(normalMatrix * normal);
              vec3 vNormel = normalize(viewVector - modelViewMatrix * vec4(position, 1.0)).xyz;
              intensity = pow(0.65 - dot(vNormal, vNormel), 2.0);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 color;
            varying float intensity;
            void main() {
              vec3 glow = color * intensity;
              gl_FragColor = vec4(glow, intensity * 0.3);
            }
          `,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          transparent: true
        });
        const atmosphere = new THREE.Mesh(atmosGeometry, atmosMaterial);
        planet.add(atmosphere);
      }
      
      planet.userData = {
        distance: data.distance * AU_SCALE,
        speed: data.speed,
        angle: Math.random() * Math.PI * 2,
        name: data.name
      };
      scene.add(planet);
      planets.push(planet);
    });

    // ========== ASTEROIDS ==========
    const asteroids = [];
    preloadedAsteroids.forEach((asteroid) => {
      const diameter = asteroid.phys_par?.diameter || 100;
      const geometry = new THREE.IcosahedronGeometry(diameter / 100, 0);
      const material = new THREE.MeshLambertMaterial({ 
        color: 0x888888,
        emissive: 0x111111
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.userData = {
        name: asteroid.name,
        angle: Math.random() * Math.PI * 2,
        a: (asteroid.orbit?.a || 2.5) * AU_SCALE,
        e: asteroid.orbit?.e || 0,
        orbitalPeriod: Math.pow(asteroid.orbit?.a || 2.5, 1.5) * 365.25
      };
      
      const r = mesh.userData.a * (1 - mesh.userData.e);
      mesh.position.x = Math.cos(mesh.userData.angle) * r;
      mesh.position.z = Math.sin(mesh.userData.angle) * r;
      mesh.position.y = (Math.random() - 0.5) * 10;
      
      scene.add(mesh);
      asteroids.push(mesh);
    });

    // ========== STARS FROM OPTIMIZED CATALOG ==========
    // Load nearby stars (within 100 parsecs)
    const nearbyStars = starCatalog.getVisibleStars(
      new THREE.Vector3(0, 0, 0),
      100 * PARSEC_SCALE
    ) || [];
    
    const starGroup = new THREE.Group();
    nearbyStars.forEach(star => {
      // Create star based on spectral type with HDR glow
      const starGeometry = new THREE.SphereGeometry(star.size || 5, 16, 16);
      
      // HDR emissive material for stars
      const starMaterial = new THREE.MeshBasicMaterial({
        color: star.color || 0xffffff,
        emissive: star.color || 0xffffff,
        emissiveIntensity: 2.0
      });
      const starMesh = new THREE.Mesh(starGeometry, starMaterial);
      
      // Add volumetric glow
      const glowGeometry = new THREE.SphereGeometry((star.size || 5) * 2, 16, 16);
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(star.color || 0xffffff) },
          intensity: { value: star.mag ? Math.pow(2.512, -star.mag) : 1.0 }
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float intensity;
          varying vec3 vNormal;
          void main() {
            float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
            rim = pow(rim, 2.0);
            vec3 glow = color * rim * intensity * 3.0;
            gl_FragColor = vec4(glow, rim * 0.5);
          }
        `,
        blending: THREE.AdditiveBlending,
        transparent: true,
        side: THREE.BackSide
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      starMesh.add(glowMesh);
      
      if (star.position) {
        starMesh.position.copy(star.position);
      } else if (star.x !== undefined && star.y !== undefined && star.z !== undefined) {
        starMesh.position.set(star.x, star.y, star.z);
      }
      starMesh.userData = star;
      starGroup.add(starMesh);
      
      // Add to spatial grid
      spatialGrid.insert(starMesh, starMesh.position, 'star');
    });
    scene.add(starGroup);

    // ========== NEBULAE ==========
    const nebulaGroup = new THREE.Group();
    preloadedNebulae.forEach((nebula) => {
      const position = raDecTo3D(nebula.ra, nebula.dec, (nebula.distance || 1000) * PARSEC_SCALE / 1000);
      const nebulaLOD = new THREE.LOD();
      
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
      
      // High detail
      const highMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
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
          uniform float time;
          uniform vec3 color1;
          uniform vec3 color2;
          varying vec3 vPosition;
          
          // Noise function for nebula detail
          float noise(vec3 p) {
            return sin(p.x * 0.01) * cos(p.y * 0.01) * sin(p.z * 0.01 + time * 0.1);
          }
          
          // HDR tone mapping
          vec3 ACESFilmicToneMapping(vec3 color) {
            const float a = 2.51;
            const float b = 0.03;
            const float c = 2.43;
            const float d = 0.59;
            const float e = 0.14;
            return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
          }
          
          void main() {
            float d = length(vPosition) / 100.0;
            
            // Multi-layered nebula structure
            float n1 = noise(vPosition * 0.5);
            float n2 = noise(vPosition * 1.0 + 100.0);
            float n3 = noise(vPosition * 2.0 + 200.0);
            float turbulence = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
            
            // Color mixing with turbulence
            vec3 color = mix(color1, color2, d + turbulence * 0.3);
            
            // HDR emission
            vec3 emission = color * (3.0 + turbulence * 2.0);
            
            // Density falloff
            float density = (1.0 - d) * (0.7 + turbulence * 0.3);
            float alpha = density * density;
            
            // Apply tone mapping
            vec3 hdrColor = ACESFilmicToneMapping(emission);
            
            gl_FragColor = vec4(pow(hdrColor, vec3(1.0/2.2)), alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false
      });
      
      const highGeometry = new THREE.IcosahedronGeometry(nebula.size || 1000, 3);
      const highMesh = new THREE.Mesh(highGeometry, highMaterial);
      nebulaLOD.addLevel(highMesh, 0);
      
      // Low detail sprite
      const spriteMaterial = new THREE.SpriteMaterial({
        color: color1,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set((nebula.size || 1000) * 2, (nebula.size || 1000) * 2, 1);
      nebulaLOD.addLevel(sprite, 50000);
      
      nebulaLOD.position.copy(position);
      nebulaGroup.add(nebulaLOD);
      spatialGrid.insert(nebulaLOD, position, 'nebula');
    });
    scene.add(nebulaGroup);

    // ========== GALAXIES FROM OPTIMIZED CATALOG ==========
    const galaxyGroup = new THREE.Group();
    // const galaxyMaterials = []; // Reserved for instanced rendering
    
    // Load visible galaxies based on camera position
    let currentGalaxies = [];
    
    const updateGalaxies = (cameraPos) => {
      // Clear old galaxies
      galaxyGroup.clear();
      
      // Get visible galaxies
      const visibleGalaxies = galaxyCatalog.getVisibleGalaxies(
        cameraPos,
        10 * MPC_SCALE, // 10 Mpc view distance
        { maxGalaxies: 1000 }
      );
      
      visibleGalaxies.forEach(galaxy => {
        const galaxyLOD = new THREE.LOD();
        
        // High detail for nearby galaxies
        if (galaxy.distance < MPC_SCALE) {
          const spiralGroup = new THREE.Group();
          
          // Create spiral arms
          const spiralGeometry = new THREE.BufferGeometry();
          const vertices = [];
          const colors = [];
          
          const arms = galaxy.morphology?.arms || 2;
          const points = 500;
          
          for(let arm = 0; arm < arms; arm++) {
            const armOffset = (arm / arms) * Math.PI * 2;
            
            for(let j = 0; j < points / arms; j++) {
              const t = j / (points / arms);
              const angle = t * Math.PI * 4 + armOffset;
              const radius = t * galaxy.size * 0.5;
              const spread = Math.random() * galaxy.size * 0.1;
              
              vertices.push(
                Math.cos(angle) * (radius + spread),
                (Math.random() - 0.5) * galaxy.size * 0.05,
                Math.sin(angle) * (radius + spread)
              );
              
              const brightness = 1 - t * 0.7;
              colors.push(brightness, brightness * 0.9, brightness * 0.8);
            }
          }
          
          spiralGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
          spiralGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
          
          const spiralMaterial = new THREE.PointsMaterial({
            size: 10,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true
          });
          
          spiralGroup.add(new THREE.Points(spiralGeometry, spiralMaterial));
          
          // Galaxy core with HDR emission
          const coreGeometry = new THREE.SphereGeometry(galaxy.size * 0.1, 32, 32);
          const coreMaterial = new THREE.ShaderMaterial({
            uniforms: {
              color: { value: new THREE.Color(galaxy.color || 0xffffaa) },
              time: { value: 0 }
            },
            vertexShader: `
              varying vec3 vNormal;
              varying vec3 vPosition;
              void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform vec3 color;
              uniform float time;
              varying vec3 vNormal;
              varying vec3 vPosition;
              
              vec3 ACESFilmicToneMapping(vec3 color) {
                const float a = 2.51;
                const float b = 0.03;
                const float c = 2.43;
                const float d = 0.59;
                const float e = 0.14;
                return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
              }
              
              void main() {
                // Active galactic nucleus emission
                float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
                rim = pow(rim, 1.5);
                
                // Pulsating core
                float pulse = sin(time * 2.0) * 0.5 + 0.5;
                
                // HDR emission with relativistic jets
                vec3 coreColor = color * (5.0 + pulse * 3.0);
                vec3 jetColor = vec3(0.4, 0.7, 1.0) * rim * 10.0;
                
                vec3 finalColor = coreColor + jetColor;
                vec3 mapped = ACESFilmicToneMapping(finalColor);
                
                gl_FragColor = vec4(pow(mapped, vec3(1.0/2.2)), 1.0);
              }
            `
          });
          const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
          
          // Add accretion disk
          const diskGeometry = new THREE.RingGeometry(galaxy.size * 0.15, galaxy.size * 0.3, 64);
          const diskMaterial = new THREE.ShaderMaterial({
            uniforms: {
              color: { value: new THREE.Color(0xffaa44) },
              time: { value: 0 }
            },
            vertexShader: `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform vec3 color;
              uniform float time;
              varying vec2 vUv;
              
              void main() {
                float r = length(vUv - 0.5) * 2.0;
                float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
                
                // Spiral density waves
                float spiral = sin(angle * 3.0 - r * 10.0 + time) * 0.5 + 0.5;
                
                // Radial falloff
                float intensity = pow(1.0 - r, 2.0) * spiral;
                
                vec3 diskColor = color * intensity * 4.0;
                gl_FragColor = vec4(diskColor, intensity);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
          });
          const disk = new THREE.Mesh(diskGeometry, diskMaterial);
          disk.rotation.x = Math.PI / 2;
          spiralGroup.add(disk);
          
          spiralGroup.add(coreMesh);
          
          galaxyLOD.addLevel(spiralGroup, 0);
        }
        
        // Medium detail - simple ellipsoid
        const mediumGeometry = new THREE.SphereGeometry(galaxy.size * 0.5, 16, 16);
        const mediumMaterial = new THREE.MeshBasicMaterial({
          color: galaxy.color || 0xffddaa,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending
        });
        const mediumMesh = new THREE.Mesh(mediumGeometry, mediumMaterial);
        if (galaxy.morphology?.type === 'elliptical') {
          mediumMesh.scale.y = 0.6;
        }
        galaxyLOD.addLevel(mediumMesh, MPC_SCALE);
        
        // Low detail - point
        const pointGeometry = new THREE.BufferGeometry();
        pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
        const pointMaterial = new THREE.PointsMaterial({
          size: 20,
          color: galaxy.color || 0xffddaa,
          blending: THREE.AdditiveBlending
        });
        galaxyLOD.addLevel(new THREE.Points(pointGeometry, pointMaterial), 10 * MPC_SCALE);
        
        galaxyLOD.position.copy(galaxy.position);
        galaxyLOD.userData = galaxy;
        galaxyGroup.add(galaxyLOD);
      });
      
      currentGalaxies = visibleGalaxies;
    };
    
    scene.add(galaxyGroup);

    // ========== COSMIC WEB (for very large scales) ==========
    const cosmicWebGroup = new THREE.Group();
    const createCosmicWeb = () => {
      const filamentMaterial = new THREE.LineBasicMaterial({
        color: 0x4444ff,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending
      });
      
      // Create filaments connecting galaxy clusters
      for(let i = 0; i < 50; i++) {
        const points = [];
        const start = new THREE.Vector3(
          (Math.random() - 0.5) * 100 * MPC_SCALE,
          (Math.random() - 0.5) * 100 * MPC_SCALE,
          (Math.random() - 0.5) * 100 * MPC_SCALE
        );
        const end = new THREE.Vector3(
          (Math.random() - 0.5) * 100 * MPC_SCALE,
          (Math.random() - 0.5) * 100 * MPC_SCALE,
          (Math.random() - 0.5) * 100 * MPC_SCALE
        );
        
        for(let t = 0; t <= 1; t += 0.1) {
          const point = new THREE.Vector3().lerpVectors(start, end, t);
          point.x += (Math.random() - 0.5) * MPC_SCALE;
          point.y += (Math.random() - 0.5) * MPC_SCALE;
          point.z += (Math.random() - 0.5) * MPC_SCALE;
          points.push(point);
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const filament = new THREE.Line(geometry, filamentMaterial);
        cosmicWebGroup.add(filament);
      }
    };
    createCosmicWeb();
    scene.add(cosmicWebGroup);

    // ========== SCALE-AWARE RENDERING ==========
    const updateScaleVisibility = (cameraDistance) => {
      // Determine current scale
      let scale = 'Solar System';
      if (cameraDistance > 100 * AU_SCALE) scale = 'Stellar Neighborhood';
      if (cameraDistance > PARSEC_SCALE) scale = 'Local Stars';
      if (cameraDistance > 100 * PARSEC_SCALE) scale = 'Galaxy';
      if (cameraDistance > MPC_SCALE) scale = 'Local Group';
      if (cameraDistance > 10 * MPC_SCALE) scale = 'Galaxy Clusters';
      if (cameraDistance > 100 * MPC_SCALE) scale = 'Cosmic Web';
      
      setCurrentScale(scale);
      
      // Update visibility based on scale
      sunGroup.visible = cameraDistance < 1000 * AU_SCALE;
      planets.forEach(p => p.visible = cameraDistance < 1000 * AU_SCALE);
      asteroids.forEach(a => a.visible = cameraDistance < 100 * AU_SCALE);
      starGroup.visible = cameraDistance < 10 * MPC_SCALE;
      nebulaGroup.visible = cameraDistance < MPC_SCALE;
      galaxyGroup.visible = cameraDistance > 10 * PARSEC_SCALE;
      cosmicWebGroup.visible = cameraDistance > 10 * MPC_SCALE;
      
      // Update minimap scale
      if (cameraDistance < 1000 * AU_SCALE) {
        minimapScale = 0.001; // Solar system scale
      } else if (cameraDistance < 100 * PARSEC_SCALE) {
        minimapScale = 0.00001; // Stellar scale
      } else if (cameraDistance < 10 * MPC_SCALE) {
        minimapScale = 0.0000001; // Galaxy scale
      } else {
        minimapScale = 0.000000001; // Universe scale
      }
    };

    // Camera controls
    let isPointerLocked = false;
    const keys = {};
    let cameraRotation = { x: 0, y: 0 };

    // Desktop controls
    if (!mobile) {
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
    }

    // Mobile touch controls
    if (mobile) {
      touchRef.current.moveVelocity = { x: 0, z: 0 };
      
      // Touch start
      renderer.domElement.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touches = e.touches;
        
        if (touches.length === 1) {
          // Single touch - rotation
          touchRef.current.startX = touches[0].clientX;
          touchRef.current.startY = touches[0].clientY;
          touchRef.current.cameraStartPos = {
            x: camera.rotation.x,
            y: camera.rotation.y
          };
        } else if (touches.length === 2) {
          // Two finger touch - pinch zoom
          const dx = touches[0].clientX - touches[1].clientX;
          const dy = touches[0].clientY - touches[1].clientY;
          touchRef.current.startDistance = Math.sqrt(dx * dx + dy * dy);
          touchRef.current.isPinching = true;
        }
        
        // Double tap to move forward
        const now = Date.now();
        if (now - touchRef.current.lastTap < 300) {
          touchRef.current.moveVelocity.z = 1;
        }
        touchRef.current.lastTap = now;
      }, { passive: false });

      // Touch move
      renderer.domElement.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touches = e.touches;
        
        if (touches.length === 1 && !touchRef.current.isPinching) {
          // Single touch - rotate camera
          const deltaX = touches[0].clientX - touchRef.current.startX;
          const deltaY = touches[0].clientY - touchRef.current.startY;
          
          const sensitivity = 0.01;
          cameraRotation.y = touchRef.current.cameraStartPos.y - deltaX * sensitivity;
          cameraRotation.x = touchRef.current.cameraStartPos.x - deltaY * sensitivity;
          cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotation.x));
          
          camera.rotation.x = cameraRotation.x;
          camera.rotation.y = cameraRotation.y;
        } else if (touches.length === 2) {
          // Pinch zoom - move forward/backward
          const dx = touches[0].clientX - touches[1].clientX;
          const dy = touches[0].clientY - touches[1].clientY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (touchRef.current.startDistance) {
            const scale = distance / touchRef.current.startDistance;
            touchRef.current.moveVelocity.z = (scale - 1) * 5;
          }
        }
      }, { passive: false });

      // Touch end
      renderer.domElement.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (e.touches.length === 0) {
          touchRef.current.isPinching = false;
          touchRef.current.moveVelocity = { x: 0, z: 0 };
        }
      }, { passive: false });
    }

    // Animation loop
    let time = 0;
    const TIME_SCALE = 1440; // 1 day per minute
    
    const animate = () => {
      requestAnimationFrame(animate);
      const deltaTime = 0.016;
      time += deltaTime;

      // Update Sun
      sun.material.uniforms.time.value = time;
      sunGroup.rotation.y += (deltaTime * TIME_SCALE / 60) * (2 * Math.PI / 25);

      // Update planets
      const orbitalPeriods = {
        "Mercury": 88, "Venus": 225, "Earth": 365.25, "Mars": 687,
        "Jupiter": 4333, "Saturn": 10759, "Uranus": 30687, "Neptune": 60190
      };
      
      planets.forEach(planet => {
        const period = orbitalPeriods[planet.userData.name] || 365.25;
        const angularVelocity = (2 * Math.PI) / period;
        planet.userData.angle += angularVelocity * (deltaTime * TIME_SCALE / 60);
        planet.position.x = Math.cos(planet.userData.angle) * planet.userData.distance;
        planet.position.z = Math.sin(planet.userData.angle) * planet.userData.distance;
        planet.rotation.y += 0.01;
      });

      // Update asteroids
      asteroids.forEach(asteroid => {
        const angularVelocity = (2 * Math.PI) / asteroid.userData.orbitalPeriod;
        asteroid.userData.angle += angularVelocity * (deltaTime * TIME_SCALE / 60);
        const r = asteroid.userData.a * (1 - asteroid.userData.e * Math.cos(asteroid.userData.angle));
        asteroid.position.x = Math.cos(asteroid.userData.angle) * r;
        asteroid.position.z = Math.sin(asteroid.userData.angle) * r;
        asteroid.rotation.y += 0.01;
      });

      // Update scale-based visibility
      const cameraDistance = camera.position.length();
      updateScaleVisibility(cameraDistance);

      // Update galaxies based on camera position
      if (cameraDistance > 10 * PARSEC_SCALE) {
        updateGalaxies(camera.position);
      }

      // Update LODs
      scene.traverse((object) => {
        if (object.isLOD) {
          object.update(camera);
        }
      });

      // Camera movement - scale-aware speed
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      
      // Speed scales with distance
      let baseSpeed = 500; // AU/s at solar system scale
      if (cameraDistance > 100 * AU_SCALE) baseSpeed = 0.1 * PARSEC_SCALE; // 0.1 pc/s
      if (cameraDistance > 100 * PARSEC_SCALE) baseSpeed = 0.01 * MPC_SCALE; // 0.01 Mpc/s
      if (cameraDistance > 10 * MPC_SCALE) baseSpeed = 0.1 * MPC_SCALE; // 0.1 Mpc/s
      
      const speed = keys['shift'] ? baseSpeed * 10 : baseSpeed;
      const moveDistance = speed * deltaTime;
      
      if (mobile) {
        // Mobile movement from touch controls
        if (touchRef.current && touchRef.current.moveVelocity) {
          camera.position.addScaledVector(forward, touchRef.current.moveVelocity.z * moveDistance);
          camera.position.addScaledVector(right, touchRef.current.moveVelocity.x * moveDistance);
        }
      } else {
        // Desktop keyboard movement
        if (keys['w']) camera.position.addScaledVector(forward, moveDistance);
        if (keys['s']) camera.position.addScaledVector(forward, -moveDistance);
        if (keys['a']) camera.position.addScaledVector(right, -moveDistance);
        if (keys['d']) camera.position.addScaledVector(right, moveDistance);
        if (keys[' ']) camera.position.y += moveDistance;
        if (keys['control']) camera.position.y -= moveDistance;
      }

      // Update camera position state
      setCameraPos({ 
        x: camera.position.x, 
        y: camera.position.y, 
        z: camera.position.z 
      });

      // Draw minimap
      minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      minimapCtx.fillRect(0, 0, minimapSize, minimapSize);
      
      // Draw border
      minimapCtx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      minimapCtx.lineWidth = 2;
      minimapCtx.strokeRect(1, 1, minimapSize - 2, minimapSize - 2);
      
      // Draw title and scale
      minimapCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      minimapCtx.font = mobile ? 'bold 10px monospace' : 'bold 12px monospace';
      minimapCtx.fillText(`NAV - ${currentScale}`, 10, mobile ? 15 : 20);
      
      // Draw appropriate content based on scale
      if (currentScale === 'Solar System' || currentScale === 'Stellar Neighborhood') {
        // Draw Sun
        minimapCtx.fillStyle = '#ffff00';
        minimapCtx.beginPath();
        minimapCtx.arc(minimapCenter.x, minimapCenter.y, 5, 0, Math.PI * 2);
        minimapCtx.fill();
        
        // Draw planets
        planets.forEach(planet => {
          const x = minimapCenter.x + planet.position.x * minimapScale;
          const y = minimapCenter.y + planet.position.z * minimapScale;
          if (x >= 0 && x <= minimapSize && y >= 0 && y <= minimapSize) {
            minimapCtx.fillStyle = '#4444ff';
            minimapCtx.beginPath();
            minimapCtx.arc(x, y, 2, 0, Math.PI * 2);
            minimapCtx.fill();
          }
        });
      } else if (currentScale === 'Local Stars' || currentScale === 'Galaxy') {
        // Draw nearby stars
        minimapCtx.fillStyle = 'rgba(255, 255, 100, 0.5)';
        nearbyStars.forEach(star => {
          const x = minimapCenter.x + star.position.x * minimapScale;
          const y = minimapCenter.y + star.position.z * minimapScale;
          if (x >= 0 && x <= minimapSize && y >= 0 && y <= minimapSize) {
            minimapCtx.fillRect(x, y, 1, 1);
          }
        });
      } else {
        // Draw galaxies
        minimapCtx.fillStyle = 'rgba(255, 200, 100, 0.7)';
        currentGalaxies.forEach(galaxy => {
          const x = minimapCenter.x + galaxy.position.x * minimapScale;
          const y = minimapCenter.y + galaxy.position.z * minimapScale;
          if (x >= 0 && x <= minimapSize && y >= 0 && y <= minimapSize) {
            minimapCtx.beginPath();
            minimapCtx.arc(x, y, 2, 0, Math.PI * 2);
            minimapCtx.fill();
          }
        });
      }
      
      // Draw camera position
      const camX = minimapCenter.x + camera.position.x * minimapScale;
      const camZ = minimapCenter.y + camera.position.z * minimapScale;
      
      minimapCtx.strokeStyle = '#00ff00';
      minimapCtx.lineWidth = 2;
      minimapCtx.beginPath();
      minimapCtx.arc(camX, camZ, 5, 0, Math.PI * 2);
      minimapCtx.stroke();

      // Update shader uniforms
      scene.traverse((object) => {
        if (object.material && object.material.uniforms) {
          if (object.material.uniforms.time) {
            object.material.uniforms.time.value = time;
          }
          if (object.material.uniforms.viewVector) {
            object.material.uniforms.viewVector.value = camera.position;
          }
        }
      });
      
      renderer.render(scene, camera);
    };

    animate();
    console.log('Universe simulation initialized successfully');

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      checkMobile();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      if (minimapCanvas && minimapCanvas.parentNode) {
        document.body.removeChild(minimapCanvas);
      }
      if (renderer) {
        renderer.dispose();
      }
      if (pmremGenerator) {
        pmremGenerator.dispose();
      }
    };
    
    } catch (error) {
      console.error('Error initializing universe simulation:', error);
      setError(error.message);
    }
  }, [isMobile]); // Only re-run if mobile status changes

  if (error) {
    return (
      <div style={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        color: 'red',
        fontSize: '18px',
        textAlign: 'center',
        backgroundColor: 'black',
        padding: '20px'
      }}>
        <h2>Error Loading Universe Simulation</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: 'black' }}>
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        color: 'yellow',
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        padding: '10px',
        zIndex: 10000
      }}>
        Universe Component Mounted
      </div>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute',
        top: isMobile ? '5px' : '10px',
        left: isMobile ? '5px' : '10px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: isMobile ? '12px' : '14px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: isMobile ? '8px' : '10px',
        borderRadius: '5px',
        pointerEvents: 'none',
        maxWidth: isMobile ? '200px' : '300px'
      }}>
        <div>Scale: {currentScale}</div>
        <div>Time: 1 day = 1 minute</div>
        <div>Position: ({Math.round(cameraPos.x).toLocaleString()}, {Math.round(cameraPos.y).toLocaleString()}, {Math.round(cameraPos.z).toLocaleString()})</div>
        {isMobile ? (
          <div style={{ marginTop: '5px' }}>
            <div>Touch: Drag to look</div>
            <div>Pinch: Move forward/back</div>
            <div>Double tap: Move forward</div>
          </div>
        ) : (
          <div>Controls: WASD + Mouse | Shift: 10x speed</div>
        )}
      </div>
      {isMobile && (
        <div style={{
          position: 'absolute',
          bottom: '170px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '10px',
          zIndex: 1001
        }}>
          <button style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            color: 'white',
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'manipulation'
          }}
          onTouchStart={() => { touchRef.current.moveVelocity = { x: 0, z: 1 }; }}
          onTouchEnd={() => { touchRef.current.moveVelocity = { x: 0, z: 0 }; }}
          >↑</button>
          <button style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            color: 'white',
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'manipulation'
          }}
          onTouchStart={() => { touchRef.current.moveVelocity = { x: 0, z: -1 }; }}
          onTouchEnd={() => { touchRef.current.moveVelocity = { x: 0, z: 0 }; }}
          >↓</button>
        </div>
      )}
    </div>
  );
};

export default UniverseSimulationFullUniverse;