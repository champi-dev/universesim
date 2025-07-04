import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { ParallelNaniteSystem, createParallelNanitePlanet, createParallelNaniteGalaxy } from "./NaniteSystemParallel";
import { preloadedAsteroids, preloadedNebulae } from "./data/preloadedData";

// Constants
const AU_SCALE = 100;
const TIME_SCALE = 1440; // 1 day = 1 minute

const UniverseSimulationParallel = () => {
  const mountRef = useRef(null);
  const [error, setError] = useState(null);
  const keysRef = useRef({});
  const sceneRef = useRef(null);
  const naniteSystemRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    
    let renderer = null;
    let animationId = null;
    let camera = null;
    
    const initAsync = async () => {
      try {
        console.log('UniverseSimulationParallel: Starting initialization...');
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Detect mobile
        const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                       window.innerWidth < 768;
        
        // Scene with fog for depth
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        scene.fog = new THREE.FogExp2(0x000000, 0.00000001);
        sceneRef.current = scene;
        
        // Camera with mobile-optimized FOV
        camera = new THREE.PerspectiveCamera(
          mobile ? 60 : 45, 
          width / height, 
          0.1, 
          100000000
        );
        
        // Mobile starts at solar system level
        if (mobile) {
          camera.position.set(AU_SCALE * 10, AU_SCALE * 5, AU_SCALE * 10);
          camera.lookAt(0, 0, 0);
        } else {
          camera.position.set(AU_SCALE * 1.5, AU_SCALE * 0.5, AU_SCALE * 1.5);
          camera.lookAt(0, 0, 0);
        }
        
        // Renderer with HDR and optimizations
        renderer = new THREE.WebGLRenderer({ 
          antialias: !mobile, // Disable AA on mobile for performance
          powerPreference: "high-performance",
          logarithmicDepthBuffer: true,
          alpha: false,
          stencil: false,
          depth: true,
          // Enable float textures for advanced effects
          precision: 'highp'
        });
        
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.5;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = !mobile;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        mountRef.current.appendChild(renderer.domElement);
        console.log('Renderer created and attached');
        
        // Initialize parallel Nanite system
        const workerCount = mobile ? 2 : navigator.hardwareConcurrency || 4;
        try {
          naniteSystemRef.current = new ParallelNaniteSystem(renderer, camera, workerCount);
          console.log(`Nanite system initialized with ${workerCount} workers`);
        } catch (naniteError) {
          console.error('Failed to initialize Nanite system:', naniteError);
          // Continue without Nanite system
        }
        
        // ========== LIGHTING ==========
        const ambientLight = new THREE.AmbientLight(0x040408, 0.3);
        scene.add(ambientLight);
        
        // Directional light for planet shadows
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(1, 1, 0.5);
        if (!mobile) {
          dirLight.castShadow = true;
          dirLight.shadow.mapSize.width = 2048;
          dirLight.shadow.mapSize.height = 2048;
        }
        scene.add(dirLight);
        
        // ========== SUN with HDR glow ==========
        const sunGroup = new THREE.Group();
        sunGroup.name = 'sun';
        
        // HDR sun shader with corona
        const sunMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            viewVector: { value: new THREE.Vector3() },
            sunColor: { value: new THREE.Color(0xffffff) },
            coronaColor: { value: new THREE.Color(0xffaa00) }
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
            uniform float time;
            uniform vec3 viewVector;
            uniform vec3 sunColor;
            uniform vec3 coronaColor;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
              float intensity = pow(0.5 + 0.5 * dot(vNormal, normalize(viewVector)), 2.0);
              vec3 color = mix(coronaColor, sunColor, intensity);
              
              // Animated surface
              float noise = sin(vPosition.x * 10.0 + time) * 
                           sin(vPosition.y * 10.0 + time * 0.8) * 
                           sin(vPosition.z * 10.0 + time * 1.2) * 0.1 + 0.9;
              
              color *= noise;
              
              // HDR output
              gl_FragColor = vec4(color * 3.0, 1.0);
            }
          `
        });
        
        // Create sun with Nanite LODs
        let sun;
        if (naniteSystemRef.current) {
          try {
            sun = await createParallelNanitePlanet(10, 64, sunMaterial, naniteSystemRef.current);
          } catch (err) {
            console.error('Failed to create Nanite sun:', err);
            sun = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 64), sunMaterial);
          }
        } else {
          sun = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 64), sunMaterial);
        }
        sunGroup.add(sun);
        
        // Sun light with shadows
        const sunLight = new THREE.PointLight(0xffffff, 3, 20000);
        sunLight.castShadow = !mobile;
        sunGroup.add(sunLight);
        
        // Corona glow
        const coronaGeometry = new THREE.SphereGeometry(15, 32, 32);
        const coronaMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            color: { value: new THREE.Color(0xffaa00) }
          },
          vertexShader: `
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform float time;
            uniform vec3 color;
            varying vec3 vNormal;
            
            void main() {
              float intensity = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
              float pulse = sin(time * 2.0) * 0.1 + 0.9;
              gl_FragColor = vec4(color * intensity * pulse * 2.0, intensity * 0.5);
            }
          `,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          transparent: true,
          depthWrite: false
        });
        const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        sunGroup.add(corona);
        
        scene.add(sunGroup);
        
        // ========== PLANETS with realistic materials ==========
        const planetData = [
          { name: "Mercury", distance: 0.39, size: 0.38, color: 0x8c7853, speed: 4.15, metalness: 0.8, roughness: 0.9 },
          { name: "Venus", distance: 0.72, size: 0.95, color: 0xffc649, speed: 1.62, metalness: 0.3, roughness: 0.7 },
          { name: "Earth", distance: 1.0, size: 1.0, color: 0x2233ff, speed: 1, metalness: 0.2, roughness: 0.5 },
          { name: "Mars", distance: 1.52, size: 0.53, color: 0xcd5c5c, speed: 0.53, metalness: 0.6, roughness: 0.8 },
          { name: "Jupiter", distance: 5.2, size: 11.2, color: 0xdaa520, speed: 0.084, metalness: 0.1, roughness: 0.3 },
          { name: "Saturn", distance: 9.58, size: 9.45, color: 0xf4a460, speed: 0.034, metalness: 0.1, roughness: 0.4 },
          { name: "Uranus", distance: 19.22, size: 4.0, color: 0x4fd1c5, speed: 0.012, metalness: 0.2, roughness: 0.3 },
          { name: "Neptune", distance: 30.05, size: 3.88, color: 0x4169e1, speed: 0.006, metalness: 0.2, roughness: 0.3 }
        ];
        
        const planets = [];
        for (const data of planetData) {
          const material = new THREE.MeshPhysicalMaterial({
            color: data.color,
            metalness: data.metalness,
            roughness: data.roughness,
            emissive: data.color,
            emissiveIntensity: 0.02,
            clearcoat: data.name === "Earth" ? 0.3 : 0,
            clearcoatRoughness: 0.4
          });
          
          let planet;
          if (naniteSystemRef.current) {
            try {
              planet = await createParallelNanitePlanet(data.size, 32, material, naniteSystemRef.current);
            } catch (err) {
              console.error(`Failed to create Nanite planet ${data.name}:`, err);
              planet = new THREE.Mesh(new THREE.SphereGeometry(data.size, 32, 32), material);
            }
          } else {
            planet = new THREE.Mesh(new THREE.SphereGeometry(data.size, 32, 32), material);
          }
          planet.castShadow = !mobile;
          planet.receiveShadow = !mobile;
          
          // Store planet data for animation
          planets.push({
            name: data.name,
            mesh: planet,
            distance: data.distance * AU_SCALE,
            speed: data.speed * TIME_SCALE,
            angle: Math.random() * Math.PI * 2
          });
          
          scene.add(planet);
        }
        
        // ========== ASTEROID BELT with instancing ==========
        if (!mobile || preloadedAsteroids.length < 20) {
          const asteroidGeometry = new THREE.IcosahedronGeometry(1, 0);
          const asteroidMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x888888,
            emissive: 0x222222
          });
          
          const asteroidCount = mobile ? 50 : 200;
          const asteroidMesh = new THREE.InstancedMesh(
            asteroidGeometry, 
            asteroidMaterial, 
            asteroidCount
          );
          
          const matrix = new THREE.Matrix4();
          const position = new THREE.Vector3();
          const rotation = new THREE.Euler();
          const quaternion = new THREE.Quaternion();
          const scale = new THREE.Vector3();
          
          for (let i = 0; i < asteroidCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 2.2 + Math.random() * 1.2; // Between Mars and Jupiter
            const size = Math.random() * 50 + 10;
            
            position.set(
              Math.cos(angle) * distance * AU_SCALE,
              (Math.random() - 0.5) * 20,
              Math.sin(angle) * distance * AU_SCALE
            );
            
            rotation.set(
              Math.random() * Math.PI * 2,
              Math.random() * Math.PI * 2,
              Math.random() * Math.PI * 2
            );
            
            scale.set(size / 100, size / 100, size / 100);
            
            quaternion.setFromEuler(rotation);
            matrix.compose(position, quaternion, scale);
            asteroidMesh.setMatrixAt(i, matrix);
          }
          
          asteroidMesh.instanceMatrix.needsUpdate = true;
          scene.add(asteroidMesh);
        }
        
        // ========== STAR FIELD with parallel generation ==========
        let starField;
        if (naniteSystemRef.current) {
          try {
            starField = await createParallelNaniteGalaxy(
              mobile ? 50000 : 200000, 
              50000, 
              naniteSystemRef.current
            );
          } catch (err) {
            console.error('Failed to create Nanite star field:', err);
            // Fallback to simple star field
            const starGeometry = new THREE.BufferGeometry();
            const starCount = mobile ? 50000 : 200000;
            const positions = new Float32Array(starCount * 3);
            const colors = new Float32Array(starCount * 3);
            
            for (let i = 0; i < starCount; i++) {
              const i3 = i * 3;
              const radius = Math.random() * 50000;
              const theta = Math.random() * Math.PI * 2;
              const phi = Math.acos(2 * Math.random() - 1);
              
              positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
              positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
              positions[i3 + 2] = radius * Math.cos(phi);
              
              colors[i3] = 0.8 + Math.random() * 0.2;
              colors[i3 + 1] = 0.8 + Math.random() * 0.2;
              colors[i3 + 2] = 0.9 + Math.random() * 0.1;
            }
            
            starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            
            const starMaterial = new THREE.PointsMaterial({
              size: 2,
              vertexColors: true,
              blending: THREE.AdditiveBlending,
              transparent: true
            });
            
            starField = new THREE.Points(starGeometry, starMaterial);
          }
        } else {
          // Fallback if no Nanite system
          const starGeometry = new THREE.BufferGeometry();
          const starCount = mobile ? 50000 : 200000;
          const positions = new Float32Array(starCount * 3);
          const colors = new Float32Array(starCount * 3);
          
          for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            const radius = Math.random() * 50000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            colors[i3] = 0.8 + Math.random() * 0.2;
            colors[i3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i3 + 2] = 0.9 + Math.random() * 0.1;
          }
          
          starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          
          const starMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true
          });
          
          starField = new THREE.Points(starGeometry, starMaterial);
        }
        scene.add(starField);
        
        // ========== GALAXIES ==========
        if (!mobile) {
          const galaxyPromises = [];
          const galaxyPositions = [
            { x: 100000, y: 0, z: 50000 },
            { x: -80000, y: 20000, z: -60000 },
            { x: 50000, y: -10000, z: 100000 },
            { x: -120000, y: -30000, z: -80000 },
            { x: 90000, y: 40000, z: -120000 }
          ];
          
          for (const pos of galaxyPositions) {
            if (naniteSystemRef.current) {
              try {
                const galaxy = createParallelNaniteGalaxy(100000, 5000, naniteSystemRef.current);
                galaxyPromises.push(galaxy.then(g => {
                  g.position.set(pos.x, pos.y, pos.z);
                  scene.add(g);
                  return g;
                }).catch(err => {
                  console.error('Failed to create galaxy:', err);
                  // Create fallback galaxy
                  const galaxyGeometry = new THREE.BufferGeometry();
                  const positions = new Float32Array(30000);
                  const colors = new Float32Array(30000);
                  
                  for (let i = 0; i < 10000; i++) {
                    const i3 = i * 3;
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * 5000;
                    const armAngle = angle + radius * 0.2;
                    const height = (Math.random() - 0.5) * 500;
                    
                    positions[i3] = Math.cos(armAngle) * radius;
                    positions[i3 + 1] = height;
                    positions[i3 + 2] = Math.sin(armAngle) * radius;
                    
                    colors[i3] = 0.8 + Math.random() * 0.2;
                    colors[i3 + 1] = 0.8 + Math.random() * 0.2;
                    colors[i3 + 2] = 0.9 + Math.random() * 0.1;
                  }
                  
                  galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                  galaxyGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                  
                  const galaxyMaterial = new THREE.PointsMaterial({
                    size: 2,
                    vertexColors: true,
                    blending: THREE.AdditiveBlending,
                    transparent: true
                  });
                  
                  const galaxy = new THREE.Points(galaxyGeometry, galaxyMaterial);
                  galaxy.position.set(pos.x, pos.y, pos.z);
                  scene.add(galaxy);
                  return galaxy;
                }));
              } catch (err) {
                console.error('Failed to create galaxy:', err);
              }
            }
          }
          
          if (galaxyPromises.length > 0) {
            await Promise.all(galaxyPromises);
          }
        }
        
        // ========== NEBULAE with volumetric rendering ==========
        const nebulaGroup = new THREE.Group();
        nebulaGroup.name = 'nebulae';
        
        const createNebula = (nebula, index) => {
          const nebulaShader = new THREE.ShaderMaterial({
            uniforms: {
              time: { value: 0 },
              color1: { value: new THREE.Color(nebula.type === 'emission' ? 0xff0066 : 0x00ff66) },
              color2: { value: new THREE.Color(nebula.type === 'emission' ? 0xff6600 : 0x00ffff) },
              opacity: { value: 0.3 }
            },
            vertexShader: `
              varying vec3 vPosition;
              varying vec3 vNormal;
              
              void main() {
                vPosition = position;
                vNormal = normal;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform float time;
              uniform vec3 color1;
              uniform vec3 color2;
              uniform float opacity;
              varying vec3 vPosition;
              varying vec3 vNormal;
              
              void main() {
                float noise = sin(vPosition.x * 0.01 + time) * 
                             sin(vPosition.y * 0.01 + time * 0.8) * 
                             sin(vPosition.z * 0.01 + time * 1.2);
                
                float d = length(vPosition) / 1000.0;
                vec3 color = mix(color1, color2, d + noise * 0.2);
                
                float alpha = (1.0 - d) * opacity * (0.8 + noise * 0.2);
                gl_FragColor = vec4(color * 2.0, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          
          const nebulaGeometry = new THREE.IcosahedronGeometry(nebula.size || 1000, 3);
          const nebulaMesh = new THREE.Mesh(nebulaGeometry, nebulaShader);
          
          nebulaMesh.position.set(
            nebula.ra ? (nebula.ra - 180) * 100 : (Math.random() - 0.5) * 20000,
            (Math.random() - 0.5) * 10000,
            nebula.dec ? nebula.dec * 100 : (Math.random() - 0.5) * 20000
          );
          
          return nebulaMesh;
        };
        
        const nebulaCount = mobile ? 5 : 20;
        preloadedNebulae.slice(0, nebulaCount).forEach((nebula, i) => {
          nebulaGroup.add(createNebula(nebula, i));
        });
        
        scene.add(nebulaGroup);
        
        // ========== COSMIC DUST PARTICLES ==========
        const createCosmicDust = () => {
          const dustCount = mobile ? 10000 : 50000;
          const dustGeometry = new THREE.BufferGeometry();
          const positions = new Float32Array(dustCount * 3);
          const colors = new Float32Array(dustCount * 3);
          const sizes = new Float32Array(dustCount);
          const velocities = new Float32Array(dustCount * 3);
          
          for (let i = 0; i < dustCount; i++) {
            const i3 = i * 3;
            
            // Distribute particles around camera's starting position
            const radius = Math.random() * 5000 + 100;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            // Subtle color variations
            const brightness = 0.3 + Math.random() * 0.7;
            colors[i3] = brightness * (0.8 + Math.random() * 0.2);
            colors[i3 + 1] = brightness * (0.8 + Math.random() * 0.2);
            colors[i3 + 2] = brightness * (0.9 + Math.random() * 0.1);
            
            // Varied sizes for depth
            sizes[i] = Math.random() * 3 + 0.5;
            
            // Slow drift velocities
            velocities[i3] = (Math.random() - 0.5) * 0.1;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.1;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
          }
          
          dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          dustGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
          dustGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
          
          const dustMaterial = new THREE.ShaderMaterial({
            uniforms: {
              time: { value: 0 },
              cameraPos: { value: camera.position },
              fogColor: { value: new THREE.Color(0x000011) },
              fogDensity: { value: 0.00001 }
            },
            vertexShader: `
              attribute float size;
              attribute vec3 velocity;
              varying vec3 vColor;
              varying float vDistance;
              uniform float time;
              uniform vec3 cameraPos;
              
              void main() {
                vColor = color;
                
                // Gentle drift animation
                vec3 pos = position + velocity * time * 10.0;
                
                // Wrap around camera
                vec3 offset = pos - cameraPos;
                float dist = length(offset);
                if (dist > 5000.0) {
                  offset = normalize(offset) * mod(dist, 5000.0);
                  pos = cameraPos + offset;
                }
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                vDistance = -mvPosition.z;
                
                // Size attenuation
                float sizeAttenuation = 300.0 / vDistance;
                gl_PointSize = size * sizeAttenuation;
                gl_PointSize = clamp(gl_PointSize, 0.1, 5.0);
                
                gl_Position = projectionMatrix * mvPosition;
              }
            `,
            fragmentShader: `
              varying vec3 vColor;
              varying float vDistance;
              uniform vec3 fogColor;
              uniform float fogDensity;
              
              void main() {
                // Soft circular particle
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.6; // Overall transparency
                
                // Distance fog
                float fogFactor = 1.0 - exp(-fogDensity * vDistance);
                vec3 finalColor = mix(vColor, fogColor, fogFactor);
                
                gl_FragColor = vec4(finalColor, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
          });
          
          const dustParticles = new THREE.Points(dustGeometry, dustMaterial);
          dustParticles.name = 'cosmicDust';
          scene.add(dustParticles);
          
          return dustParticles;
        };
        
        const cosmicDust = createCosmicDust();
        
        // ========== VOLUMETRIC GAS CLOUDS ==========
        const createGasClouds = () => {
          const cloudGroup = new THREE.Group();
          cloudGroup.name = 'gasClouds';
          
          // Create multiple gas cloud layers for volume effect
          const cloudCount = mobile ? 5 : 10;
          for (let i = 0; i < cloudCount; i++) {
            const cloudGeometry = new THREE.IcosahedronGeometry(Math.random() * 500 + 200, 2);
            
            const cloudMaterial = new THREE.ShaderMaterial({
              uniforms: {
                time: { value: 0 },
                opacity: { value: 0.1 + Math.random() * 0.1 },
                color1: { value: new THREE.Color(0x1a0033) },
                color2: { value: new THREE.Color(0x330066) },
                scale: { value: 1 + Math.random() }
              },
              vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                uniform float time;
                uniform float scale;
                
                void main() {
                  vPosition = position;
                  vNormal = normal;
                  
                  // Animated distortion
                  vec3 pos = position;
                  float noise = sin(position.x * 0.01 + time * 0.5) * 
                               cos(position.y * 0.01 - time * 0.3) * 
                               sin(position.z * 0.01 + time * 0.7);
                  pos += normal * noise * 20.0;
                  
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos * scale, 1.0);
                }
              `,
              fragmentShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                uniform float time;
                uniform float opacity;
                uniform vec3 color1;
                uniform vec3 color2;
                
                void main() {
                  // Rim lighting effect
                  vec3 viewDir = normalize(cameraPosition - vPosition);
                  float rim = 1.0 - dot(vNormal, viewDir);
                  rim = pow(rim, 2.0);
                  
                  // Animated color mixing
                  float mixFactor = sin(time * 0.5 + vPosition.x * 0.01) * 0.5 + 0.5;
                  vec3 color = mix(color1, color2, mixFactor);
                  
                  // Fade based on rim
                  float alpha = rim * opacity;
                  
                  gl_FragColor = vec4(color * 2.0, alpha);
                }
              `,
              transparent: true,
              blending: THREE.AdditiveBlending,
              side: THREE.DoubleSide,
              depthWrite: false
            });
            
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(
              (Math.random() - 0.5) * 10000,
              (Math.random() - 0.5) * 5000,
              (Math.random() - 0.5) * 10000
            );
            cloud.rotation.set(
              Math.random() * Math.PI,
              Math.random() * Math.PI,
              Math.random() * Math.PI
            );
            cloud.scale.setScalar(Math.random() * 2 + 1);
            
            cloudGroup.add(cloud);
          }
          
          scene.add(cloudGroup);
          return cloudGroup;
        };
        
        const gasClouds = createGasClouds();
        
        // ========== PARTICLE TRAILS FOR PLANETS ==========
        const createPlanetTrails = () => {
          const trailGroup = new THREE.Group();
          trailGroup.name = 'planetTrails';
          
          planets.forEach((planet, index) => {
            const trailCount = 200;
            const trailGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(trailCount * 3);
            const alphas = new Float32Array(trailCount);
            
            // Initialize trail positions
            for (let i = 0; i < trailCount; i++) {
              const angle = planet.angle - (i / trailCount) * Math.PI * 0.5;
              positions[i * 3] = Math.cos(angle) * planet.distance;
              positions[i * 3 + 1] = 0;
              positions[i * 3 + 2] = Math.sin(angle) * planet.distance;
              alphas[i] = 1.0 - (i / trailCount);
            }
            
            trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
            
            const trailMaterial = new THREE.ShaderMaterial({
              uniforms: {
                color: { value: new THREE.Color().setHex(planetData[index].color) },
                time: { value: 0 }
              },
              vertexShader: `
                attribute float alpha;
                varying float vAlpha;
                
                void main() {
                  vAlpha = alpha;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                uniform vec3 color;
                varying float vAlpha;
                
                void main() {
                  gl_FragColor = vec4(color, vAlpha * 0.3);
                }
              `,
              transparent: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false
            });
            
            const trail = new THREE.Line(trailGeometry, trailMaterial);
            trail.userData = { planet: planet, index: index };
            trailGroup.add(trail);
          });
          
          scene.add(trailGroup);
          return trailGroup;
        };
        
        // Only create trails on desktop for performance
        let planetTrails = null;
        if (!mobile) {
          planetTrails = createPlanetTrails();
        }
        
        // ========== CONTROLS ==========
        let mouseX = 0, mouseY = 0;
        let isMouseDown = false;
        let touchStartX = 0, touchStartY = 0;
        let pinchStartDistance = 0;
        let lastTouchDistance = 0;
        let rotationVelocity = { x: 0, y: 0 }; // For smooth mouse look
        
        // Mobile touch controls
        if (mobile) {
          renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
              touchStartX = e.touches[0].clientX;
              touchStartY = e.touches[0].clientY;
              isMouseDown = true;
            } else if (e.touches.length === 2) {
              // Pinch zoom
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              pinchStartDistance = Math.sqrt(dx * dx + dy * dy);
              lastTouchDistance = pinchStartDistance;
            }
          });
          
          renderer.domElement.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (e.touches.length === 1 && isMouseDown) {
              const deltaX = e.touches[0].clientX - touchStartX;
              const deltaY = e.touches[0].clientY - touchStartY;
              
              mouseX = deltaX * 0.01;
              mouseY = deltaY * 0.01;
              
              touchStartX = e.touches[0].clientX;
              touchStartY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
              // Pinch zoom - exponential scaling for fast traversal
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              const scale = distance / lastTouchDistance;
              // Exponential zoom - 5% change becomes much larger at distance
              const zoomFactor = scale > 1 ? 1.05 : 0.95;
              camera.position.multiplyScalar(Math.pow(zoomFactor, Math.abs(scale - 1) * 10));
              
              lastTouchDistance = distance;
            }
          });
          
          renderer.domElement.addEventListener('touchend', () => {
            isMouseDown = false;
            mouseX = 0;
            mouseY = 0;
          });
        } else {
          // Desktop controls - initialize keys object
          keysRef.current = {
            w: false,
            a: false,
            s: false,
            d: false,
            shift: false,
            ' ': false,
            control: false
          };
          
          let isPointerLocked = false;
          
          // Click to capture mouse
          renderer.domElement.addEventListener('click', () => {
            renderer.domElement.requestPointerLock();
          });
          
          // Pointer lock change handler
          document.addEventListener('pointerlockchange', () => {
            isPointerLocked = document.pointerLockElement === renderer.domElement;
            if (!isPointerLocked) {
              // Reset any ongoing movement when pointer lock is released
              mouseX = 0;
              mouseY = 0;
            }
          });
          
          // Mouse movement (only when pointer locked)
          document.addEventListener('mousemove', (e) => {
            if (!isPointerLocked) return;
            
            // Add to rotation velocity for smooth movement
            rotationVelocity.x = e.movementX * 0.005;
            rotationVelocity.y = e.movementY * 0.005;
          });
          
          // Keyboard controls
          window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (keysRef.current.hasOwnProperty(key)) {
              keysRef.current[key] = true;
            } else if (e.key === 'Shift') {
              keysRef.current['shift'] = true;
            } else if (e.key === 'Control') {
              keysRef.current['control'] = true;
            } else if (e.key === 'Escape' && isPointerLocked) {
              document.exitPointerLock();
            }
          });
          
          window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (keysRef.current.hasOwnProperty(key)) {
              keysRef.current[key] = false;
            } else if (e.key === 'Shift') {
              keysRef.current['shift'] = false;
            } else if (e.key === 'Control') {
              keysRef.current['control'] = false;
            }
          });
          
          // Mouse wheel zoom - exponential speed for fast traversal
          renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 1.15 : 0.85; // 15% change per scroll
            camera.position.multiplyScalar(zoomFactor);
          });
        }
        
        
        // ========== ANIMATION LOOP ==========
        let time = 0;
        const clock = new THREE.Clock();
        
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          const deltaTime = clock.getDelta();
          time += deltaTime;
          
          // Update Nanite system (parallel processing) - don't await in animation loop
          if (naniteSystemRef.current) {
            naniteSystemRef.current.update().catch(err => console.error('Nanite update error:', err));
          }
          
          // Update sun
          sunGroup.rotation.y += deltaTime * 0.1;
          if (sunMaterial.uniforms) {
            sunMaterial.uniforms.time.value = time;
            sunMaterial.uniforms.viewVector.value.subVectors(
              camera.position, 
              sunGroup.position
            ).normalize();
          }
          
          // Update planets
          planets.forEach((planet, index) => {
            planet.angle += deltaTime * planet.speed * 0.0001;
            planet.mesh.position.x = Math.cos(planet.angle) * planet.distance;
            planet.mesh.position.z = Math.sin(planet.angle) * planet.distance;
            planet.mesh.rotation.y += deltaTime * 0.5;
            
            // Update planet trails
            if (planetTrails && planetTrails.children[index]) {
              const trail = planetTrails.children[index];
              const positions = trail.geometry.attributes.position.array;
              const trailCount = positions.length / 3;
              
              // Shift positions back
              for (let i = trailCount - 1; i > 0; i--) {
                positions[i * 3] = positions[(i - 1) * 3];
                positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
                positions[i * 3 + 2] = positions[(i - 1) * 3 + 2];
              }
              
              // Add new position at front
              positions[0] = planet.mesh.position.x;
              positions[1] = planet.mesh.position.y;
              positions[2] = planet.mesh.position.z;
              
              trail.geometry.attributes.position.needsUpdate = true;
            }
          });
          
          // Update shader uniforms and particle effects
          scene.traverse((object) => {
            if (object.material && object.material.uniforms) {
              if (object.material.uniforms.time) {
                object.material.uniforms.time.value = time;
              }
              // Update dust camera position
              if (object.name === 'cosmicDust' && object.material.uniforms.cameraPos) {
                object.material.uniforms.cameraPos.value.copy(camera.position);
              }
            }
          });
          
          // LOD for particle effects based on camera speed
          const cameraSpeed = new THREE.Vector3(
            camera.position.x - (camera.userData.lastPosition?.x || camera.position.x),
            camera.position.y - (camera.userData.lastPosition?.y || camera.position.y),
            camera.position.z - (camera.userData.lastPosition?.z || camera.position.z)
          ).length();
          
          // Hide particles when moving very fast
          if (cosmicDust) {
            cosmicDust.visible = cameraSpeed < 1000;
          }
          if (gasClouds) {
            gasClouds.visible = cameraSpeed < 5000;
          }
          
          // Store last position
          camera.userData.lastPosition = camera.position.clone();
          
          // Camera movement - only for desktop when pointer is locked
          if (!mobile) {
            // Apply smooth rotation with damping
            if (rotationVelocity) {
              camera.rotation.y -= rotationVelocity.x;
              camera.rotation.x -= rotationVelocity.y;
              camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
              
              // Damping for smooth stop
              rotationVelocity.x *= 0.85;
              rotationVelocity.y *= 0.85;
            }
            
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            const up = new THREE.Vector3(0, 1, 0);
            
            // Exponential speed scaling for fast universe traversal
            const cameraDistance = camera.position.length();
            let baseSpeed = Math.pow(cameraDistance, 1.1) * 0.001;
            
            // Minimum speed to ensure movement at close distances
            baseSpeed = Math.max(10, baseSpeed);
            
            // Shift for 10x boost
            const speed = keysRef.current['shift'] ? baseSpeed * 10 : baseSpeed;
            const moveDistance = speed * deltaTime * 60; // Normalize to 60fps
            
            if (keysRef.current['w']) camera.position.addScaledVector(forward, moveDistance);
            if (keysRef.current['s']) camera.position.addScaledVector(forward, -moveDistance);
            if (keysRef.current['a']) camera.position.addScaledVector(right, -moveDistance);
            if (keysRef.current['d']) camera.position.addScaledVector(right, moveDistance);
            if (keysRef.current[' ']) camera.position.addScaledVector(up, moveDistance);
            if (keysRef.current['control']) camera.position.addScaledVector(up, -moveDistance);
          }
          
          // Mobile touch rotation
          if (mobile && (isMouseDown || mouseX !== 0 || mouseY !== 0)) {
            camera.rotation.y -= mouseX * deltaTime;
            camera.rotation.x -= mouseY * deltaTime;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
            
            mouseX *= 0.9;
            mouseY *= 0.9;
          }
          
          // Render with Nanite if available
          if (naniteSystemRef.current) {
            naniteSystemRef.current.render(scene);
          }
          
          // Render scene
          renderer.render(scene, camera);
        };
        
        console.log('Starting animation loop...');
        animate();
        
        console.log('UniverseSimulationParallel: Initialization complete');
        
        // Handle resize
        const handleResize = () => {
          const width = window.innerWidth;
          const height = window.innerHeight;
          
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);
        
        // Cleanup
        return () => {
          window.removeEventListener('resize', handleResize);
          if (animationId) cancelAnimationFrame(animationId);
          if (naniteSystemRef.current) naniteSystemRef.current.dispose();
          if (renderer) {
            if (renderer.domElement && renderer.domElement.parentNode) {
              renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
            renderer.dispose();
          }
        };
        
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
      }
    };
    
    initAsync();
  }, []);

  if (error) {
    return (
      <div style={{ color: 'red', padding: '20px', backgroundColor: 'black' }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: 'black' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default UniverseSimulationParallel;