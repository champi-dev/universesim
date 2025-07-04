import React, { useRef, useEffect } from "react";
import * as THREE from "three";

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
    
    // O(1) cache lookup
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

// Optimized LOD system
class LODSystem {
  constructor() {
    this.levels = new Map();
  }
  
  addLevel(object, distance, level) {
    if (!this.levels.has(object)) {
      this.levels.set(object, []);
    }
    this.levels.get(object).push({ distance, level });
    this.levels.get(object).sort((a, b) => a.distance - b.distance);
  }
  
  updateLOD(object, cameraPosition) {
    const levels = this.levels.get(object);
    if (!levels) return;
    
    const distance = object.position.distanceTo(cameraPosition);
    let activeLevel = levels[levels.length - 1].level;
    
    for (const { distance: d, level } of levels) {
      if (distance < d) {
        activeLevel = level;
        break;
      }
    }
    
    // O(1) visibility update
    levels.forEach(({ level }) => {
      level.visible = level === activeLevel;
    });
  }
}

const UniverseSimulationJWSTOptimizedFull = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene with pure black background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera with JWST-like FOV
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000000);
    camera.position.set(0, 0, 5000);

    // Renderer with maximum quality
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Initialize optimization systems
    const spatialGrid = new SpatialHashGrid(10000);
    const lodSystem = new LODSystem();
    const visibilityDistance = 200000;

    // ========== JWST-STYLE NEBULA COMPLEX WITH LOD ==========
    const nebulaGroup = new THREE.Group();
    const nebulaMaterials = [];
    
    const createNebulaLOD = (position, scale, color1, color2) => {
      const lodGroup = new THREE.LOD();
      
      // HIGH DETAIL (near) - Full 6-octave noise
      const highGeometry = new THREE.IcosahedronGeometry(1, 4);
      const highMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(color1) },
          color2: { value: new THREE.Color(color2) },
          cameraPos: { value: camera.position }
        },
        vertexShader: `
          varying vec3 vPosition;
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          
          void main() {
            vPosition = position;
            vNormal = normalize(normalMatrix * normal);
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 color1;
          uniform vec3 color2;
          uniform vec3 cameraPos;
          varying vec3 vPosition;
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          
          // Full 3D Perlin noise implementation
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
          vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
          
          float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
          }
          
          float fbm(vec3 p) {
            float value = 0.0;
            float amplitude = 1.0;
            float frequency = 1.0;
            for(int i = 0; i < 6; i++) {
              value += amplitude * abs(snoise(p * frequency));
              frequency *= 2.0;
              amplitude *= 0.5;
            }
            return value;
          }
          
          void main() {
            vec3 viewDir = normalize(cameraPos - vWorldPosition);
            float distToCamera = length(cameraPos - vWorldPosition);
            
            vec3 p = vPosition * 0.5 + time * 0.01;
            float noise1 = fbm(p);
            float noise2 = fbm(p * 2.0 + 100.0);
            float noise3 = fbm(p * 0.5 - 50.0);
            
            float density = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
            density = pow(density, 2.0);
            
            float edge = 1.0 - pow(abs(dot(vNormal, viewDir)), 0.5);
            density *= edge;
            
            vec3 color = mix(color1, color2, noise2);
            float emission = pow(noise1, 3.0) * 2.0;
            color += vec3(emission * 0.5, emission * 0.3, emission);
            
            float fade = 1.0 / (1.0 + distToCamera * 0.0001);
            float dust = smoothstep(0.3, 0.7, noise3);
            color *= dust;
            
            gl_FragColor = vec4(color * 3.0, density * fade * 0.8);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      
      const highMesh = new THREE.Mesh(highGeometry, highMaterial);
      highMesh.scale.copy(scale);
      lodGroup.addLevel(highMesh, 0);
      nebulaMaterials.push(highMaterial);
      
      // MEDIUM DETAIL - 3 octaves
      const mediumMaterial = highMaterial.clone();
      mediumMaterial.fragmentShader = mediumMaterial.fragmentShader.replace('for(int i = 0; i < 6; i++)', 'for(int i = 0; i < 3; i++)');
      const mediumGeometry = new THREE.IcosahedronGeometry(1, 3);
      const mediumMesh = new THREE.Mesh(mediumGeometry, mediumMaterial);
      mediumMesh.scale.copy(scale);
      lodGroup.addLevel(mediumMesh, 30000);
      
      // LOW DETAIL - 1 octave
      const lowMaterial = highMaterial.clone();
      lowMaterial.fragmentShader = mediumMaterial.fragmentShader.replace('for(int i = 0; i < 3; i++)', 'for(int i = 0; i < 1; i++)');
      const lowGeometry = new THREE.IcosahedronGeometry(1, 2);
      const lowMesh = new THREE.Mesh(lowGeometry, lowMaterial);
      lowMesh.scale.copy(scale);
      lodGroup.addLevel(lowMesh, 60000);
      
      lodGroup.position.copy(position);
      spatialGrid.insert(lodGroup, position, 'nebula');
      
      return lodGroup;
    };
    
    // Create nebulae
    nebulaGroup.add(createNebulaLOD(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(3000, 4000, 2000),
      0x0066ff, 0xff6600
    ));
    
    nebulaGroup.add(createNebulaLOD(
      new THREE.Vector3(-2000, 1000, -1000),
      new THREE.Vector3(2000, 3000, 1500),
      0xff0066, 0x00ffff
    ));
    
    nebulaGroup.add(createNebulaLOD(
      new THREE.Vector3(1500, -1500, 500),
      new THREE.Vector3(2500, 2000, 2000),
      0xffaa00, 0xff00ff
    ));
    
    scene.add(nebulaGroup);

    // ========== INSTANCED DIFFRACTION SPIKES WITH CULLING ==========
    const starData = [];
    const visibleStars = new Set();
    
    for(let i = 0; i < 20; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 20000,
        (Math.random() - 0.5) * 20000,
        (Math.random() - 0.5) * 20000
      );
      const size = 10 + Math.random() * 30;
      const color = [0xffffff, 0xffeeaa, 0xaaccff, 0xffaaaa][Math.floor(Math.random() * 4)];
      
      starData.push({ position, size, color, index: i });
      spatialGrid.insert({ index: i }, position, 'star');
    }
    
    // Create diffraction spike instances
    const maxVisibleStars = 20;
    const spikeGeometry = new THREE.PlaneGeometry(1, 10);
    const spikeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    const instancedSpikes = new THREE.InstancedMesh(
      spikeGeometry, 
      spikeMaterial, 
      maxVisibleStars * 6
    );
    instancedSpikes.frustumCulled = false;
    scene.add(instancedSpikes);
    
    // Star cores
    const starCoreGeometry = new THREE.SphereGeometry(1, 32, 32);
    const starCoreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const instancedStarCores = new THREE.InstancedMesh(
      starCoreGeometry,
      starCoreMaterial,
      maxVisibleStars
    );
    instancedStarCores.frustumCulled = false;
    scene.add(instancedStarCores);

    // ========== 500K BACKGROUND STARS WITH CHUNKING ==========
    const CHUNK_SIZE = 50000;
    const TOTAL_STARS = 500000;
    const starChunks = [];
    
    for(let chunk = 0; chunk < TOTAL_STARS / CHUNK_SIZE; chunk++) {
      const positions = new Float32Array(CHUNK_SIZE * 3);
      const colors = new Float32Array(CHUNK_SIZE * 3);
      const sizes = new Float32Array(CHUNK_SIZE);
      
      for(let i = 0; i < CHUNK_SIZE; i++) {
        const i3 = i * 3;
        const radius = 10000 + Math.random() * 90000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);
        
        const colorType = Math.random();
        if (colorType < 0.3) {
          colors[i3] = colors[i3 + 1] = colors[i3 + 2] = 1;
        } else if (colorType < 0.6) {
          colors[i3] = 1; colors[i3 + 1] = 0.93; colors[i3 + 2] = 0.8;
        } else if (colorType < 0.8) {
          colors[i3] = 1; colors[i3 + 1] = 0.87; colors[i3 + 2] = 0.67;
        } else {
          colors[i3] = 1; colors[i3 + 1] = 0.8; colors[i3 + 2] = 0.67;
        }
        
        sizes[i] = Math.random() * 2 + 0.5;
      }
      
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      
      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
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
      
      const points = new THREE.Points(geometry, material);
      starChunks.push(points);
      scene.add(points);
    }

    // ========== 200 DEEP FIELD GALAXIES WITH LOD ==========
    for(let i = 0; i < 200; i++) {
      const galaxyLOD = new THREE.LOD();
      const distance = 50000 + Math.random() * 150000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const position = new THREE.Vector3(
        distance * Math.sin(phi) * Math.cos(theta),
        distance * Math.sin(phi) * Math.sin(theta),
        distance * Math.cos(phi)
      );
      
      // High detail spiral
      if(Math.random() < 0.7) {
        const spiralGroup = new THREE.Group();
        const arms = 2 + Math.floor(Math.random() * 3);
        const points = 1000;
        const vertices = [];
        const colors = [];
        
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
        
        const spiralGeometry = new THREE.BufferGeometry();
        spiralGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        spiralGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const spiralMaterial = new THREE.PointsMaterial({
          size: 3,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          transparent: true,
          opacity: 0.8
        });
        
        spiralGroup.add(new THREE.Points(spiralGeometry, spiralMaterial));
        
        // Galaxy core
        const coreGeometry = new THREE.SphereGeometry(20, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffaa });
        spiralGroup.add(new THREE.Mesh(coreGeometry, coreMaterial));
        
        galaxyLOD.addLevel(spiralGroup, 0);
        
        // Low detail
        const lowDetail = new THREE.Mesh(
          new THREE.SphereGeometry(50, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xffddaa, transparent: true, opacity: 0.6 })
        );
        galaxyLOD.addLevel(lowDetail, 100000);
      } else {
        // Elliptical
        const ellipticalMesh = new THREE.Mesh(
          new THREE.SphereGeometry(100 + Math.random() * 100, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xffddaa })
        );
        ellipticalMesh.scale.y = 0.6 + Math.random() * 0.4;
        galaxyLOD.addLevel(ellipticalMesh, 0);
      }
      
      galaxyLOD.position.copy(position);
      galaxyLOD.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      const scale = 1 - (distance - 50000) / 150000 * 0.5;
      galaxyLOD.scale.setScalar(scale);
      
      scene.add(galaxyLOD);
      spatialGrid.insert(galaxyLOD, position, 'galaxy');
    }

    // ========== 100K COSMIC DUST WITH CHUNKING ==========
    const DUST_CHUNK_SIZE = 10000;
    const TOTAL_DUST = 100000;
    
    for(let chunk = 0; chunk < TOTAL_DUST / DUST_CHUNK_SIZE; chunk++) {
      const dustPositions = new Float32Array(DUST_CHUNK_SIZE * 3);
      const dustColors = new Float32Array(DUST_CHUNK_SIZE * 3);
      
      for(let i = 0; i < DUST_CHUNK_SIZE; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 5000;
        const height = (Math.random() - 0.5) * 2000;
        
        dustPositions[i3] = Math.cos(angle) * radius;
        dustPositions[i3 + 1] = height;
        dustPositions[i3 + 2] = Math.sin(angle) * radius;
        
        const darkness = Math.random() * 0.3;
        dustColors[i3] = darkness * 0.4;
        dustColors[i3 + 1] = darkness * 0.3;
        dustColors[i3 + 2] = darkness * 0.2;
      }
      
      const dustGeometry = new THREE.BufferGeometry();
      dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
      
      const dustMaterial = new THREE.PointsMaterial({
        size: 10,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        blending: THREE.NormalBlending
      });
      
      const dust = new THREE.Points(dustGeometry, dustMaterial);
      scene.add(dust);
    }

    // Lighting
    const light1 = new THREE.PointLight(0xffffff, 0.5, 10000);
    light1.position.set(0, 0, 0);
    scene.add(light1);

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

    // Animation loop with optimization
    let time = 0;
    let frameCount = 0;
    let lastTime = performance.now();
    
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();
    
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.016;
      
      // FPS monitoring
      frameCount++;
      const currentTime = performance.now();
      if (currentTime >= lastTime + 1000) {
        console.log(`FPS: ${frameCount}`);
        frameCount = 0;
        lastTime = currentTime;
      }

      // Update nebula shaders
      nebulaMaterials.forEach(mat => {
        mat.uniforms.time.value = time;
        mat.uniforms.cameraPos.value = camera.position;
      });

      // Update visible stars using spatial grid - O(1) lookup
      const visibleStarData = spatialGrid.getVisibleObjects(camera.position, 50000);
      let instanceIndex = 0;
      let coreIndex = 0;
      
      visibleStarData.forEach(({ object, position: pos }) => {
        if (object.index !== undefined && instanceIndex < maxVisibleStars) {
          const star = starData[object.index];
          
          // Update star core
          scale.setScalar(star.size);
          matrix.compose(star.position, new THREE.Quaternion(), scale);
          instancedStarCores.setMatrixAt(coreIndex++, matrix);
          
          // Update 6 spikes
          const spikeAngles = [0, 60, 120, 180, 240, 300];
          spikeAngles.forEach(angle => {
            rotation.set(0, 0, (angle * Math.PI) / 180);
            scale.set(star.size * 0.1, star.size * 10, 1);
            matrix.compose(star.position, new THREE.Quaternion().setFromEuler(rotation), scale);
            instancedSpikes.setMatrixAt(instanceIndex++, matrix);
          });
        }
      });
      
      instancedSpikes.count = instanceIndex;
      instancedStarCores.count = coreIndex;
      instancedSpikes.instanceMatrix.needsUpdate = true;
      instancedStarCores.instanceMatrix.needsUpdate = true;

      // Rotate star chunks slowly
      starChunks.forEach((chunk, i) => {
        chunk.rotation.y += 0.00002 * (1 + i * 0.1);
      });

      // Update LODs
      scene.traverse((object) => {
        if (object.isLOD) {
          object.update(camera);
        }
      });

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

export default UniverseSimulationJWSTOptimizedFull;