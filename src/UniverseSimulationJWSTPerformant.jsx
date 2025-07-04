import React, { useRef, useEffect } from "react";
import * as THREE from "three";

const UniverseSimulationJWSTPerformant = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene with pure black background like JWST
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera with JWST-like FOV
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000000);
    camera.position.set(0, 0, 5000);

    // Renderer with balanced quality/performance
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.appendChild(renderer.domElement);

    // ========== OPTIMIZED NEBULA SYSTEM ==========
    const nebulaGroup = new THREE.Group();
    
    // Simplified but beautiful nebula shader
    const createOptimizedNebula = (position, scale, color1, color2) => {
      const geometry = new THREE.IcosahedronGeometry(1, 3);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(color1) },
          color2: { value: new THREE.Color(color2) },
          scale: { value: scale.x }
        },
        vertexShader: `
          varying vec3 vPosition;
          varying vec3 vNormal;
          uniform float time;
          uniform float scale;
          
          void main() {
            vPosition = position;
            vNormal = normalize(normalMatrix * normal);
            
            // Simple vertex animation
            vec3 pos = position;
            float displacement = sin(time * 0.5 + position.x * 0.1) * 0.1;
            pos += normal * displacement;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 color1;
          uniform vec3 color2;
          uniform float scale;
          varying vec3 vPosition;
          varying vec3 vNormal;
          
          // Simplified noise function
          float hash(vec3 p) {
            p = fract(p * 0.3183099 + 0.1);
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
          }
          
          float noise(vec3 x) {
            vec3 i = floor(x);
            vec3 f = fract(x);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(hash(i + vec3(0, 0, 0)), 
                              hash(i + vec3(1, 0, 0)), f.x),
                          mix(hash(i + vec3(0, 1, 0)), 
                              hash(i + vec3(1, 1, 0)), f.x), f.y),
                      mix(mix(hash(i + vec3(0, 0, 1)), 
                              hash(i + vec3(1, 0, 1)), f.x),
                          mix(hash(i + vec3(0, 1, 1)), 
                              hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
          }
          
          void main() {
            vec3 p = vPosition * 0.5 + time * 0.01;
            
            // Two octaves instead of six
            float n = noise(p) * 0.5 + noise(p * 2.0) * 0.25;
            
            // Edge softness
            float edge = 1.0 - smoothstep(0.0, 1.0, length(vPosition));
            n *= edge;
            
            // Color mixing
            vec3 color = mix(color1, color2, n);
            
            // Emission
            float emission = pow(n, 2.0) * 2.0;
            color += vec3(emission * 0.5, emission * 0.3, emission);
            
            // Output
            float alpha = n * edge * 0.8;
            gl_FragColor = vec4(color * 3.0, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.copy(scale);
      mesh.position.copy(position);
      
      return { mesh, material };
    };
    
    // Create 3 main nebulae
    const nebulae = [];
    const nebula1 = createOptimizedNebula(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(3000, 4000, 2000),
      0x0066ff,
      0xff6600
    );
    nebulaGroup.add(nebula1.mesh);
    nebulae.push(nebula1);
    
    const nebula2 = createOptimizedNebula(
      new THREE.Vector3(-2000, 1000, -1000),
      new THREE.Vector3(2000, 3000, 1500),
      0xff0066,
      0x00ffff
    );
    nebulaGroup.add(nebula2.mesh);
    nebulae.push(nebula2);
    
    const nebula3 = createOptimizedNebula(
      new THREE.Vector3(1500, -1500, 500),
      new THREE.Vector3(2500, 2000, 2000),
      0xffaa00,
      0xff00ff
    );
    nebulaGroup.add(nebula3.mesh);
    nebulae.push(nebula3);
    
    scene.add(nebulaGroup);

    // ========== INSTANCED DIFFRACTION SPIKES ==========
    const spikeCount = 20;
    const spikeGeometry = new THREE.PlaneGeometry(1, 1);
    const spikeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    // Create instanced mesh for all spikes
    const instancedSpikes = new THREE.InstancedMesh(
      spikeGeometry, 
      spikeMaterial, 
      spikeCount * 6
    );
    
    const starPositions = [];
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();
    
    let instanceIndex = 0;
    for(let i = 0; i < spikeCount; i++) {
      position.set(
        (Math.random() - 0.5) * 20000,
        (Math.random() - 0.5) * 20000,
        (Math.random() - 0.5) * 20000
      );
      starPositions.push(position.clone());
      
      const size = 10 + Math.random() * 30;
      const spikeAngles = [0, 60, 120, 180, 240, 300];
      
      spikeAngles.forEach(angle => {
        rotation.set(0, 0, (angle * Math.PI) / 180);
        scale.set(size * 0.1, size * 10, 1);
        matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
        instancedSpikes.setMatrixAt(instanceIndex++, matrix);
      });
    }
    instancedSpikes.instanceMatrix.needsUpdate = true;
    scene.add(instancedSpikes);
    
    // Add bright star cores
    const starCores = new THREE.Group();
    starPositions.forEach((pos, i) => {
      const size = 10 + Math.random() * 30;
      const geometry = new THREE.SphereGeometry(size, 8, 6);
      const material = new THREE.MeshBasicMaterial({
        color: [0xffffff, 0xffeeaa, 0xaaccff, 0xffaaaa][Math.floor(Math.random() * 4)]
      });
      const star = new THREE.Mesh(geometry, material);
      star.position.copy(pos);
      starCores.add(star);
    });
    scene.add(starCores);

    // ========== OPTIMIZED BACKGROUND STARS ==========
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 200000; // Reduced from 500k
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

      // Warm JWST colors
      const warmth = 0.7 + Math.random() * 0.3;
      colors[i3] = 1;
      colors[i3 + 1] = warmth;
      colors[i3 + 2] = warmth * 0.8;
      
      sizes[i] = Math.random() * 2 + 0.5;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Optimized star shader
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
          float ll = dot(xy, xy);
          if (ll > 0.25) discard;
          
          float intensity = 1.0 - ll * 4.0;
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

    // ========== INSTANCED GALAXIES ==========
    const galaxyCount = 100;
    const galaxyGeometry = new THREE.CircleGeometry(1, 8);
    const galaxyMaterial = new THREE.MeshBasicMaterial({
      color: 0xffddaa,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    const instancedGalaxies = new THREE.InstancedMesh(
      galaxyGeometry, 
      galaxyMaterial, 
      galaxyCount
    );
    
    for(let i = 0; i < galaxyCount; i++) {
      const distance = 50000 + Math.random() * 100000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      position.set(
        distance * Math.sin(phi) * Math.cos(theta),
        distance * Math.sin(phi) * Math.sin(theta),
        distance * Math.cos(phi)
      );
      
      rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      const s = (100 + Math.random() * 100) * (1 - (distance - 50000) / 100000 * 0.5);
      scale.set(s, s, 1);
      
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      instancedGalaxies.setMatrixAt(i, matrix);
    }
    instancedGalaxies.instanceMatrix.needsUpdate = true;
    scene.add(instancedGalaxies);

    // ========== OPTIMIZED DUST ==========
    const dustGeometry = new THREE.BufferGeometry();
    const dustCount = 10000; // Reduced from 100k
    const dustPositions = new Float32Array(dustCount * 3);
    
    for(let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 5000;
      const height = (Math.random() - 0.5) * 2000;
      
      dustPositions[i3] = Math.cos(angle) * radius;
      dustPositions[i3 + 1] = height;
      dustPositions[i3 + 2] = Math.sin(angle) * radius;
    }
    
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    
    const dustMaterial = new THREE.PointsMaterial({
      size: 10,
      color: 0x332211,
      transparent: true,
      opacity: 0.3,
      blending: THREE.NormalBlending
    });
    
    const cosmicDust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(cosmicDust);

    // Single light source
    const light = new THREE.PointLight(0xffffff, 0.5, 10000);
    light.position.set(0, 0, 0);
    scene.add(light);

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

    // Performance monitoring
    let frameCount = 0;
    let lastTime = performance.now();
    
    // Animation loop
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      
      // FPS counter
      frameCount++;
      const currentTime = performance.now();
      if (currentTime >= lastTime + 1000) {
        console.log(`FPS: ${frameCount}`);
        frameCount = 0;
        lastTime = currentTime;
      }
      
      time += 0.016;

      // Update only nebula shaders
      nebulae.forEach((nebula, index) => {
        nebula.material.uniforms.time.value = time + index * 0.5;
      });

      // Minimal rotations
      starField.rotation.y += 0.00002;
      cosmicDust.rotation.y += 0.00005;

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

export default UniverseSimulationJWSTPerformant;