import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { ParallelNaniteSystem, createParallelNanitePlanet, createParallelNaniteGalaxy } from "./NaniteSystemParallel";
import { preloadedAsteroids, preloadedNebulae } from "./data/preloadedData";
import { STAR_COLORS, NEBULA_COLORS } from "./data/astronomicalColors";
import EnhancedMinimap from "./EnhancedMinimap";
import { createJWSTNebula } from "./JWSTNebula";
import { createObservableUniverse } from "./ObservableUniverse";
import { SmoothNavigation } from "./SmoothNavigation";
import { CameraFocusManager } from "./CameraFocusManager";

// Constants
const AU_SCALE = 100;
const TIME_SCALE = 1440; // 1 day = 1 minute

const UniverseSimulationParallel = () => {
  const mountRef = useRef(null);
  const [error, setError] = useState(null);
  const keysRef = useRef({
    w: false, s: false, a: false, d: false,
    ' ': false, shift: false, control: false, p: false
  });
  const sceneRef = useRef(null);
  const naniteSystemRef = useRef(null);
  const [camera, setCamera] = useState(null);
  const cameraRef = useRef(null);
  const controlsResetRef = useRef(null);
  const smoothNavRef = useRef(null);
  const cameraFocusManagerRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    
    let renderer = null;
    let animationId = null;
    
    const initAsync = async () => {
      try {
        // Initialization started
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
        
        // Camera with mobile-optimized FOV and extended far plane for universe scale
        const camera = new THREE.PerspectiveCamera(
          mobile ? 60 : 45, 
          width / height, 
          0.1, 
          1e15 // Extended to handle universe scale (billions of light-years)
        );
        
        // Start camera position with sun occupying ~30% of screen
        const startPos = new THREE.Vector3(AU_SCALE * 0.8, AU_SCALE * 0.5, AU_SCALE * 0.8);
        camera.position.copy(startPos);
        camera.lookAt(0, 0, 0); // Look at sun
        
        // Store camera references
        cameraRef.current = camera;
        setCamera(camera);
        
        // Initialize smooth navigation
        smoothNavRef.current = new SmoothNavigation(camera);
        
        // Expose camera for testing (dev only)
        if (process.env.NODE_ENV === 'development') {
          window.__camera__ = camera;
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
        // Renderer created and attached
        
        // Initialize parallel Nanite system
        const workerCount = mobile ? 2 : navigator.hardwareConcurrency || 4;
        try {
          naniteSystemRef.current = new ParallelNaniteSystem(renderer, camera, workerCount);
          // Nanite system initialized
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
            sunColor: { value: new THREE.Color(STAR_COLORS['G'].r, STAR_COLORS['G'].g, STAR_COLORS['G'].b) },
            coronaColor: { value: new THREE.Color(1.0, 0.5, 0.1) }
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
        
        // ========== HYPERDETAILED PLANETS with PBR materials ==========
        const createHyperdetailedPlanet = async (data) => {
          const group = new THREE.Group();
          group.name = data.name;
          
          
          // Create planet with dynamic LOD
          const createPlanetMesh = (detailLevel) => {
            let segments = 16;
            if (detailLevel === 'ultra') segments = 256;
            else if (detailLevel === 'high') segments = 128;
            else if (detailLevel === 'medium') segments = 64;
            
            const geometry = new THREE.SphereGeometry(data.size, segments, segments);
            
            // Add surface detail with displacement
            if (detailLevel === 'ultra' || detailLevel === 'high') {
              const positions = geometry.attributes.position;
              for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const z = positions.getZ(i);
                
                // Add terrain features
                let displacement = 0;
                
                // Normalize position for noise calculations
                const len = Math.sqrt(x * x + y * y + z * z);
                const nx = x / len;
                const ny = y / len;
                const nz = z / len;
                
                // Craters for rocky planets
                if (data.type === 'rocky' || data.name === 'Mercury' || data.name === 'Mars') {
                  // Large impact craters
                  const crater1 = Math.exp(-((nx - 0.5) * (nx - 0.5) + (ny - 0.3) * (ny - 0.3)) * 50) * -0.03;
                  const crater2 = Math.exp(-((nx + 0.4) * (nx + 0.4) + (nz - 0.6) * (nz - 0.6)) * 40) * -0.02;
                  const crater3 = Math.exp(-((ny - 0.7) * (ny - 0.7) + (nz + 0.2) * (nz + 0.2)) * 60) * -0.025;
                  displacement += crater1 + crater2 + crater3;
                  
                  // Small crater field
                  const smallCraters = Math.sin(nx * 80) * Math.cos(ny * 80) * Math.sin(nz * 80);
                  displacement += smallCraters * 0.005;
                }
                
                // Mountains and valleys with multiple octaves
                const mountainNoise1 = Math.sin(nx * 5) * Math.cos(ny * 5) * 0.02;
                const mountainNoise2 = Math.sin(nx * 15 + 1) * Math.cos(nz * 15 + 2) * 0.01;
                const mountainNoise3 = Math.sin(ny * 25 + 3) * Math.cos(nz * 25 + 4) * 0.005;
                const terrainNoise = mountainNoise1 + mountainNoise2 + mountainNoise3;
                
                // Continental features for Earth
                if (data.name === 'Earth') {
                  const continental = Math.sin(nx * 3 + 0.5) * Math.cos(ny * 2 - 0.3) + 
                                    Math.sin(nz * 2.5 + 1.2) * 0.5;
                  displacement += continental > 0.3 ? terrainNoise * 2 : terrainNoise * 0.1;
                } else {
                  displacement += terrainNoise;
                }
                
                // Mars specific - Olympus Mons and Valles Marineris
                if (data.name === 'Mars') {
                  // Olympus Mons
                  const olympus = Math.exp(-((nx - 0.2) * (nx - 0.2) + (ny - 0.4) * (ny - 0.4)) * 100) * 0.04;
                  displacement += olympus;
                  
                  // Valles Marineris canyon
                  if (Math.abs(ny) < 0.1 && nx > -0.3 && nx < 0.5) {
                    displacement -= 0.015;
                  }
                }
                
                // Apply displacement
                const length = Math.sqrt(x * x + y * y + z * z);
                const scale = (length + displacement * data.size) / length;
                positions.setXYZ(i, x * scale, y * scale, z * scale);
              }
              geometry.computeVertexNormals();
            }
            
            return geometry;
          };
          
          // Create hyperrealistic material
          const createPlanetMaterial = () => {
            // Earth special case - most detailed
            if (data.name === 'Earth') {
              return new THREE.ShaderMaterial({
                uniforms: {
                  dayTexture: { value: null }, // Would load Earth day texture
                  nightTexture: { value: null }, // Would load Earth night texture
                  cloudsTexture: { value: null }, // Would load clouds
                  time: { value: 0 },
                  sunPosition: { value: new THREE.Vector3(0, 0, 0) },
                  atmosphereColor: { value: new THREE.Color(0.3, 0.5, 1.0) }
                },
                vertexShader: `
                  varying vec3 vNormal;
                  varying vec3 vPosition;
                  varying vec2 vUv;
                  
                  void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                  }
                `,
                fragmentShader: `
                  uniform vec3 sunPosition;
                  uniform float time;
                  uniform vec3 atmosphereColor;
                  varying vec3 vNormal;
                  varying vec3 vPosition;
                  varying vec2 vUv;
                  
                  void main() {
                    vec3 lightDir = normalize(sunPosition - vPosition);
                    float diff = max(dot(vNormal, lightDir), 0.0);
                    
                    // Base color with continents
                    vec3 landColor = vec3(0.2, 0.5, 0.1);
                    vec3 oceanColor = vec3(0.1, 0.3, 0.6);
                    
                    // Simple continent pattern
                    float continents = sin(vUv.x * 10.0) * cos(vUv.y * 5.0);
                    vec3 surfaceColor = mix(oceanColor, landColor, step(0.3, continents));
                    
                    // Cloud layer
                    float clouds = sin(vUv.x * 20.0 + time * 0.1) * cos(vUv.y * 15.0 - time * 0.05);
                    clouds = smoothstep(0.5, 0.7, clouds);
                    surfaceColor = mix(surfaceColor, vec3(1.0), clouds * 0.7);
                    
                    // Atmosphere on edges
                    float rim = 1.0 - dot(vNormal, normalize(cameraPosition - vPosition));
                    rim = pow(rim, 2.0);
                    vec3 atmosphere = atmosphereColor * rim;
                    
                    // Night side city lights
                    float nightLights = 0.0;
                    if (diff < 0.1) {
                      nightLights = continents * (1.0 - clouds) * 0.5;
                      surfaceColor += vec3(1.0, 0.8, 0.4) * nightLights;
                    }
                    
                    // Final color
                    vec3 finalColor = surfaceColor * (diff + 0.2) + atmosphere;
                    gl_FragColor = vec4(finalColor, 1.0);
                  }
                `
              });
            }
            
            // Gas giants with atmospheric bands
            if (data.name === 'Jupiter' || data.name === 'Saturn') {
              return new THREE.ShaderMaterial({
                uniforms: {
                  time: { value: 0 },
                  baseColor: { value: new THREE.Color(data.color) },
                  bandColor1: { value: new THREE.Color(data.color).multiplyScalar(1.2) },
                  bandColor2: { value: new THREE.Color(data.color).multiplyScalar(0.8) }
                },
                vertexShader: `
                  varying vec3 vNormal;
                  varying vec3 vPosition;
                  varying vec2 vUv;
                  
                  void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                  }
                `,
                fragmentShader: `
                  uniform float time;
                  uniform vec3 baseColor;
                  uniform vec3 bandColor1;
                  uniform vec3 bandColor2;
                  varying vec3 vNormal;
                  varying vec3 vPosition;
                  varying vec2 vUv;
                  
                  void main() {
                    // Atmospheric bands
                    float bands = sin(vUv.y * 20.0 + sin(vUv.x * 5.0 + time * 0.1) * 0.5);
                    vec3 color = mix(baseColor, bandColor1, smoothstep(-0.5, 0.5, bands));
                    color = mix(color, bandColor2, smoothstep(0.5, 1.0, bands));
                    
                    // Storm patterns
                    float storm = sin(vUv.x * 30.0 + time * 0.5) * cos(vUv.y * 40.0 - time * 0.3);
                    storm = smoothstep(0.7, 0.9, storm);
                    color = mix(color, vec3(1.0, 0.9, 0.8), storm * 0.3);
                    
                    // Great Red Spot for Jupiter
                    ${data.name === 'Jupiter' ? `
                      vec2 spotCenter = vec2(0.3, 0.6);
                      float spotDist = distance(vUv, spotCenter);
                      if (spotDist < 0.05) {
                        float spotIntensity = 1.0 - spotDist / 0.05;
                        color = mix(color, vec3(0.8, 0.3, 0.2), spotIntensity * 0.7);
                      }
                    ` : ''}
                    
                    // Lighting
                    vec3 lightDir = normalize(vec3(1.0, 0.5, 0.3));
                    float diff = max(dot(vNormal, lightDir), 0.0);
                    
                    gl_FragColor = vec4(color * (diff + 0.3), 1.0);
                  }
                `
              });
            }
            
            // Default PBR material for other planets
            return new THREE.MeshPhysicalMaterial({
              color: data.color,
              metalness: data.metalness,
              roughness: data.roughness,
              normalScale: new THREE.Vector2(1, 1),
              emissive: data.color,
              emissiveIntensity: 0.01,
              clearcoat: data.atmosphere ? 0.3 : 0,
              clearcoatRoughness: 0.4,
              // Add bump map for surface detail
              bumpScale: 0.05
            });
          };
          
          // Create the base planet mesh
          const material = createPlanetMaterial();
          let planet;
          
          if (naniteSystemRef.current && data.size > 0.5) { // Use Nanite for larger objects
            try {
              // Create high-detail base mesh for Nanite
              const baseGeometry = createPlanetMesh('high');
              const baseMesh = new THREE.Mesh(baseGeometry, material);
              await naniteSystemRef.current.createLODHierarchy(baseMesh, 6); // More LOD levels
              planet = baseMesh;
            } catch (err) {
              console.error(`Failed to create Nanite planet ${data.name}:`, err);
              planet = new THREE.Mesh(createPlanetMesh('medium'), material);
            }
          } else {
            planet = new THREE.Mesh(createPlanetMesh('medium'), material);
          }
          
          planet.castShadow = !mobile && data.size > 0.5;
          planet.receiveShadow = !mobile;
          group.add(planet);
          
          // Add atmosphere for planets that have one
          if (data.atmosphere) {
            const atmosphereGeometry = new THREE.SphereGeometry(data.size * 1.15, 64, 64);
            const atmosphereMaterial = new THREE.ShaderMaterial({
              uniforms: {
                color: { value: data.atmosphereColor || new THREE.Color(0.3, 0.5, 1.0) },
                intensity: { value: 1.5 }
              },
              vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                  vNormal = normalize(normalMatrix * normal);
                  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                uniform vec3 color;
                uniform float intensity;
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                // Rayleigh scattering coefficients
                const vec3 betaR = vec3(5.8e-3, 1.35e-2, 3.31e-2);
                
                void main() {
                  vec3 viewDir = normalize(cameraPosition - vPosition);
                  float rim = 1.0 - abs(dot(vNormal, viewDir));
                  rim = pow(rim, 2.0);
                  
                  // Rayleigh scattering effect
                  float sunAngle = dot(normalize(vec3(0.0, 0.0, 0.0) - vPosition), viewDir);
                  float rayleighPhase = 0.75 * (1.0 + sunAngle * sunAngle);
                  
                  // Wavelength-dependent scattering
                  vec3 scatteredColor = color;
                  scatteredColor.r *= 1.0 + betaR.r * rayleighPhase;
                  scatteredColor.g *= 1.0 + betaR.g * rayleighPhase;
                  scatteredColor.b *= 1.0 + betaR.b * rayleighPhase * 1.5; // More blue scattering
                  
                  // Add sunset/sunrise effect at grazing angles
                  float sunsetFactor = pow(max(0.0, -sunAngle), 3.0);
                  scatteredColor = mix(scatteredColor, vec3(1.0, 0.6, 0.3), sunsetFactor * 0.5);
                  
                  gl_FragColor = vec4(scatteredColor * intensity, rim * 0.8);
                }
              `,
              transparent: true,
              blending: THREE.AdditiveBlending,
              side: THREE.BackSide,
              depthWrite: false
            });
            
            const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            group.add(atmosphere);
          }
          
          // Add rings for Saturn
          if (data.name === 'Saturn') {
            const ringGeometry = new THREE.RingGeometry(data.size * 1.5, data.size * 2.5, 128);
            const ringMaterial = new THREE.ShaderMaterial({
              uniforms: {
                innerRadius: { value: data.size * 1.5 },
                outerRadius: { value: data.size * 2.5 }
              },
              vertexShader: `
                varying vec2 vUv;
                void main() {
                  vUv = uv;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                uniform float innerRadius;
                uniform float outerRadius;
                varying vec2 vUv;
                
                void main() {
                  float dist = length(vUv - 0.5) * 2.0;
                  float radius = mix(innerRadius, outerRadius, vUv.x);
                  
                  // Ring bands
                  float bands = sin(vUv.x * 100.0) * 0.5 + 0.5;
                  vec3 color = mix(vec3(0.8, 0.7, 0.5), vec3(0.6, 0.5, 0.3), bands);
                  
                  // Transparency based on density
                  float alpha = 0.8 - vUv.x * 0.3;
                  alpha *= smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
                  
                  gl_FragColor = vec4(color, alpha);
                }
              `,
              transparent: true,
              side: THREE.DoubleSide,
              depthWrite: false
            });
            
            const rings = new THREE.Mesh(ringGeometry, ringMaterial);
            rings.rotation.x = Math.PI / 2;
            group.add(rings);
          }
          
          // Add moons for major planets
          if (data.moons && data.moons.length > 0) {
            for (const moonData of data.moons) {
              const moonGeometry = createPlanetMesh('medium');
              
              // Create detailed moon material with craters
              const moonMaterial = new THREE.ShaderMaterial({
                uniforms: {
                  sunPosition: { value: new THREE.Vector3(0, 0, 0) },
                  baseColor: { value: new THREE.Color(0xaaaaaa) }
                },
                vertexShader: `
                  varying vec3 vNormal;
                  varying vec3 vPosition;
                  varying vec2 vUv;
                  
                  void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                  }
                `,
                fragmentShader: `
                  uniform vec3 sunPosition;
                  uniform vec3 baseColor;
                  varying vec3 vNormal;
                  varying vec3 vPosition;
                  varying vec2 vUv;
                  
                  void main() {
                    vec3 lightDir = normalize(sunPosition - vPosition);
                    float diff = max(dot(vNormal, lightDir), 0.0);
                    
                    // Crater pattern
                    float crater1 = 1.0 - smoothstep(0.0, 0.05, distance(vUv, vec2(0.3, 0.4)));
                    float crater2 = 1.0 - smoothstep(0.0, 0.03, distance(vUv, vec2(0.7, 0.6)));
                    float crater3 = 1.0 - smoothstep(0.0, 0.04, distance(vUv, vec2(0.5, 0.8)));
                    float craters = max(max(crater1, crater2), crater3) * 0.3;
                    
                    // Mare (dark regions)
                    float mare = smoothstep(0.4, 0.6, sin(vUv.x * 5.0) * cos(vUv.y * 3.0));
                    vec3 surfaceColor = mix(baseColor, baseColor * 0.7, mare);
                    surfaceColor = mix(surfaceColor, baseColor * 0.5, craters);
                    
                    // Final color with lighting
                    vec3 finalColor = surfaceColor * (diff * 0.8 + 0.2);
                    gl_FragColor = vec4(finalColor, 1.0);
                  }
                `
              });
              
              const moon = new THREE.Mesh(moonGeometry, moonMaterial);
              moon.scale.setScalar(moonData.size);
              
              // Store moon orbit data
              moon.userData = {
                distance: moonData.distance * data.size,
                speed: moonData.speed,
                angle: Math.random() * Math.PI * 2
              };
              
              group.add(moon);
            }
          }
          
          return group;
        };
        
        // Enhanced planet data with more properties
        const planetData = [
          { 
            name: "Mercury", distance: 0.39, size: 0.38, color: 0x8c7853, speed: 4.15, 
            metalness: 0.8, roughness: 0.9, type: 'rocky', atmosphere: false 
          },
          { 
            name: "Venus", distance: 0.72, size: 0.95, color: 0xffc649, speed: 1.62, 
            metalness: 0.3, roughness: 0.7, type: 'rocky', atmosphere: true,
            atmosphereColor: new THREE.Color(0.9, 0.8, 0.3)
          },
          { 
            name: "Earth", distance: 1.0, size: 1.0, color: 0x2233ff, speed: 1, 
            metalness: 0.2, roughness: 0.5, type: 'rocky', atmosphere: true,
            atmosphereColor: new THREE.Color(0.3, 0.5, 1.0),
            moons: [{ name: "Moon", size: 0.27, distance: 3, speed: 0.1 }]
          },
          { 
            name: "Mars", distance: 1.52, size: 0.53, color: 0xcd5c5c, speed: 0.53, 
            metalness: 0.6, roughness: 0.8, type: 'rocky', atmosphere: true,
            atmosphereColor: new THREE.Color(0.8, 0.6, 0.4),
            moons: [
              { name: "Phobos", size: 0.1, distance: 2, speed: 0.3 },
              { name: "Deimos", size: 0.08, distance: 3, speed: 0.2 }
            ]
          },
          { 
            name: "Jupiter", distance: 5.2, size: 11.2, color: 0xdaa520, speed: 0.084, 
            metalness: 0.1, roughness: 0.3, type: 'gas', atmosphere: true,
            atmosphereColor: new THREE.Color(0.9, 0.8, 0.6),
            moons: [
              { name: "Io", size: 0.28, distance: 3, speed: 0.4 },
              { name: "Europa", size: 0.24, distance: 4, speed: 0.3 },
              { name: "Ganymede", size: 0.41, distance: 5, speed: 0.2 },
              { name: "Callisto", size: 0.38, distance: 6, speed: 0.1 }
            ]
          },
          { 
            name: "Saturn", distance: 9.58, size: 9.45, color: 0xf4a460, speed: 0.034, 
            metalness: 0.1, roughness: 0.4, type: 'gas', atmosphere: true,
            atmosphereColor: new THREE.Color(0.9, 0.8, 0.5),
            moons: [
              { name: "Titan", size: 0.40, distance: 4, speed: 0.2 },
              { name: "Rhea", size: 0.12, distance: 5, speed: 0.15 }
            ]
          },
          { 
            name: "Uranus", distance: 19.22, size: 4.0, color: 0x4fd1c5, speed: 0.012, 
            metalness: 0.2, roughness: 0.3, type: 'ice', atmosphere: true,
            atmosphereColor: new THREE.Color(0.4, 0.7, 0.8)
          },
          { 
            name: "Neptune", distance: 30.05, size: 3.88, color: 0x4169e1, speed: 0.006, 
            metalness: 0.2, roughness: 0.3, type: 'ice', atmosphere: true,
            atmosphereColor: new THREE.Color(0.2, 0.4, 0.8)
          }
        ];
        
        const planets = [];
        for (const data of planetData) {
          const planetGroup = await createHyperdetailedPlanet(data);
          planetGroup.position.set(
            Math.cos(Math.random() * Math.PI * 2) * data.distance * AU_SCALE,
            0,
            Math.sin(Math.random() * Math.PI * 2) * data.distance * AU_SCALE
          );
          
          // Store planet data for animation
          planets.push({
            name: data.name,
            group: planetGroup,
            mesh: planetGroup.children[0], // Main planet mesh
            distance: data.distance * AU_SCALE,
            speed: data.speed * TIME_SCALE,
            angle: Math.random() * Math.PI * 2,
            moons: planetGroup.children.filter(child => child.userData.distance)
          });
          
          scene.add(planetGroup);
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
              
              // Use real star colors based on spectral distribution
              const spectralRoll = Math.random();
              let starColor;
              if (spectralRoll < 0.001) starColor = STAR_COLORS['O']; // Rare blue giants
              else if (spectralRoll < 0.006) starColor = STAR_COLORS['B']; // Blue-white
              else if (spectralRoll < 0.03) starColor = STAR_COLORS['A']; // White
              else if (spectralRoll < 0.08) starColor = STAR_COLORS['F']; // Yellow-white
              else if (spectralRoll < 0.16) starColor = STAR_COLORS['G']; // Sun-like
              else if (spectralRoll < 0.40) starColor = STAR_COLORS['K']; // Orange
              else starColor = STAR_COLORS['M']; // Red dwarfs (most common)
              
              // Add some variation
              const variation = 0.2;
              colors[i3] = starColor.r + (Math.random() - 0.5) * variation;
              colors[i3 + 1] = starColor.g + (Math.random() - 0.5) * variation;
              colors[i3 + 2] = starColor.b + (Math.random() - 0.5) * variation;
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
        
        // ========== OBSERVABLE UNIVERSE ==========
        // Add the full observable universe with proper scale
        createObservableUniverse(scene, mobile);
        console.log('Observable universe created with:', {
          milkyWay: 'Full spiral structure around solar system',
          localGroup: 'Andromeda, Triangulum, Magellanic Clouds',
          cosmicWeb: 'Galaxy clusters and filaments',
          quasars: 'Distant active galactic nuclei',
          cmb: mobile ? 'Disabled on mobile' : 'Cosmic microwave background sphere'
        });
        
        // ========== NEBULAE with volumetric rendering ==========
        const nebulaGroup = new THREE.Group();
        nebulaGroup.name = 'nebulae';
        
        // eslint-disable-next-line no-unused-vars
        const createNebula = (nebula, index) => {
          const nebulaGroup = new THREE.Group();
          
          // Use real nebula colors based on type
          const nebulaColors = NEBULA_COLORS[nebula.type] || NEBULA_COLORS['emission'];
          const color1 = new THREE.Color(nebulaColors[0].r, nebulaColors[0].g, nebulaColors[0].b);
          const color2 = new THREE.Color(nebulaColors[1].r, nebulaColors[1].g, nebulaColors[1].b);
          const color3 = nebulaColors[2] ? new THREE.Color(nebulaColors[2].r, nebulaColors[2].g, nebulaColors[2].b) : color1;
          
          // Create multiple layers for JWST-like depth
          const layerCount = mobile ? 3 : 5;
          const baseSize = nebula.size || 1000;
          
          for (let layer = 0; layer < layerCount; layer++) {
            const layerSize = baseSize * (1 + layer * 0.3);
            const layerOpacity = 0.15 - layer * 0.02; // Much less opacity
            
            // Create volumetric cloud particles for each layer
            const particleCount = mobile ? 100 : 300; // Much fewer particles for subtle effect
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);
            const sizes = new Float32Array(particleCount);
            const alphas = new Float32Array(particleCount);
            
            for (let i = 0; i < particleCount; i++) {
              // Create pillar-like structures
              const angle = Math.random() * Math.PI * 2;
              const radius = Math.random() * layerSize;
              const height = (Math.random() - 0.5) * layerSize * 0.8;
              
              // Add turbulence for realistic cloud structure
              const turbulence = Math.random() * 100;
              const pillarProbability = Math.random();
              
              if (pillarProbability < 0.3) {
                // Create pillar structures
                positions[i * 3] = Math.cos(angle) * radius * 0.3 + turbulence;
                positions[i * 3 + 1] = height * 2; // Tall pillars
                positions[i * 3 + 2] = Math.sin(angle) * radius * 0.3 + turbulence;
              } else {
                // Regular cloud distribution
                positions[i * 3] = Math.cos(angle) * radius + turbulence;
                positions[i * 3 + 1] = height + Math.sin(radius * 0.01) * 200;
                positions[i * 3 + 2] = Math.sin(angle) * radius + turbulence;
              }
              
              // Color variation based on position
              const colorMix = Math.random();
              const selectedColor = colorMix < 0.33 ? color1 : colorMix < 0.66 ? color2 : color3;
              colors[i * 3] = selectedColor.r;
              colors[i * 3 + 1] = selectedColor.g;
              colors[i * 3 + 2] = selectedColor.b;
              
              // Size variation for depth
              sizes[i] = Math.random() * 50 + 20;
              alphas[i] = Math.random() * layerOpacity + 0.1;
            }
            
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
            
            // JWST-style shader
            const material = new THREE.ShaderMaterial({
              uniforms: {
                time: { value: 0 },
                layer: { value: layer }
              },
              vertexShader: `
                attribute float size;
                attribute float alpha;
                varying vec3 vColor;
                varying float vAlpha;
                uniform float time;
                
                void main() {
                  vColor = color;
                  vAlpha = alpha;
                  
                  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                  gl_PointSize = size * (1000.0 / -mvPosition.z);
                  gl_PointSize = clamp(gl_PointSize, 1.0, 100.0);
                  gl_Position = projectionMatrix * mvPosition;
                }
              `,
              fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                uniform float time;
                uniform float layer;
                
                void main() {
                  vec2 coord = gl_PointCoord - vec2(0.5);
                  float distance = length(coord);
                  
                  // Soft gaussian falloff for cloud-like appearance
                  float strength = exp(-distance * distance * 4.0);
                  
                  // Add some noise for texture
                  float noise = sin(gl_PointCoord.x * 10.0 + time * 0.5) * 
                               sin(gl_PointCoord.y * 10.0 - time * 0.3) * 0.1;
                  
                  strength += noise;
                  
                  // Bright core, darker edges (like JWST images)
                  vec3 finalColor = vColor * (1.0 + strength * 2.0);
                  
                  gl_FragColor = vec4(finalColor, vAlpha * strength * 0.005); // 0.5% opacity - almost invisible
                }
              `,
              transparent: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              vertexColors: true
            });
            
            const particles = new THREE.Points(geometry, material);
            particles.rotation.set(
              Math.random() * 0.2,
              layer * 0.1,
              Math.random() * 0.2
            );
            nebulaGroup.add(particles);
          }
          
          // Add bright stars with diffraction spikes (JWST signature)
          const starCount = mobile ? 5 : 15;
          for (let i = 0; i < starCount; i++) {
            const starGeometry = new THREE.SphereGeometry(5, 8, 8);
            const starMaterial = new THREE.MeshBasicMaterial({
              color: new THREE.Color(1.2, 1.2, 1.4)
            });
            
            const star = new THREE.Mesh(starGeometry, starMaterial);
            star.position.set(
              (Math.random() - 0.5) * baseSize * 2,
              (Math.random() - 0.5) * baseSize,
              (Math.random() - 0.5) * baseSize * 2
            );
            
            // Add glow
            const glowGeometry = new THREE.SphereGeometry(20, 8, 8);
            const glowMaterial = new THREE.ShaderMaterial({
              uniforms: {
                time: { value: 0 }
              },
              vertexShader: `
                varying vec3 vNormal;
                void main() {
                  vNormal = normalize(normalMatrix * normal);
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                varying vec3 vNormal;
                uniform float time;
                void main() {
                  float intensity = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
                  vec3 color = vec3(1.0, 0.95, 0.8) * intensity * 2.0;
                  gl_FragColor = vec4(color, intensity * 0.3); // Reduced glow
                }
              `,
              transparent: true,
              blending: THREE.AdditiveBlending,
              side: THREE.BackSide,
              depthWrite: false
            });
            
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            star.add(glow);
            
            // Add diffraction spikes (JWST signature feature)
            const spikeGeometry = new THREE.PlaneGeometry(100, 2);
            const spikeMaterial = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.2, // Reduced spike opacity
              blending: THREE.AdditiveBlending,
              side: THREE.DoubleSide,
              depthWrite: false
            });
            
            // Create 6 spikes like JWST
            for (let j = 0; j < 6; j++) {
              const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
              spike.rotation.z = (j / 6) * Math.PI;
              star.add(spike);
            }
            
            nebulaGroup.add(star);
          }
          
          // Position nebulae far away and mostly above the solar system plane
          nebulaGroup.position.set(
            nebula.ra ? (nebula.ra - 180) * 100 : (Math.random() - 0.5) * 30000,
            nebula.dec ? nebula.dec * 100 : 5000 + Math.random() * 20000, // Mostly above
            (Math.random() - 0.5) * 30000
          );
          
          nebulaGroup.userData = { layers: layerCount };
          
          return nebulaGroup;
        };
        
        // Add JWST-style nebulae
        const nebulaCount = mobile ? 3 : 8; // Select a subset for performance
        const selectedNebulae = [
          // Pick diverse and famous nebulae
          preloadedNebulae.find(n => n.name.includes('Orion')),
          preloadedNebulae.find(n => n.name.includes('Eagle')),
          preloadedNebulae.find(n => n.name.includes('Crab')),
          preloadedNebulae.find(n => n.name.includes('Ring')),
          preloadedNebulae.find(n => n.name.includes('Helix')),
          preloadedNebulae.find(n => n.name.includes('Carina')),
          preloadedNebulae.find(n => n.name.includes('Horsehead')),
          preloadedNebulae.find(n => n.name.includes('Rosette'))
        ].filter(Boolean).slice(0, nebulaCount);
        
        const jwstNebulaGroup = new THREE.Group();
        jwstNebulaGroup.name = 'jwst-nebulae';
        
        selectedNebulae.forEach((nebula) => {
          const jwstNebula = createJWSTNebula(nebula, mobile);
          jwstNebulaGroup.add(jwstNebula);
        });
        
        scene.add(jwstNebulaGroup);
        
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
            
            // More colorful dust with nebula-like colors
            const colorType = Math.random();
            let dustColor;
            if (colorType < 0.3) {
              // Blue/cyan dust
              dustColor = { r: 0.3, g: 0.6, b: 1.0 };
            } else if (colorType < 0.6) {
              // Pink/magenta dust
              dustColor = { r: 1.0, g: 0.3, b: 0.6 };
            } else if (colorType < 0.8) {
              // Golden dust
              dustColor = { r: 1.0, g: 0.8, b: 0.4 };
            } else {
              // Green/teal dust
              dustColor = { r: 0.3, g: 1.0, b: 0.7 };
            }
            
            const brightness = 0.5 + Math.random() * 0.5;
            colors[i3] = dustColor.r * brightness;
            colors[i3 + 1] = dustColor.g * brightness;
            colors[i3 + 2] = dustColor.b * brightness;
            
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
        // eslint-disable-next-line no-unused-vars
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
                opacity: { value: 0.2 + Math.random() * 0.2 },
                color1: { value: new THREE.Color(0xff0080).multiplyScalar(Math.random() + 0.5) }, // Pink/magenta
                color2: { value: new THREE.Color(0x0080ff).multiplyScalar(Math.random() + 0.5) }, // Cyan/blue
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
          
          // scene.add(cloudGroup); // DISABLED
          return cloudGroup;
        };
        
        // GAS CLOUDS DISABLED - unrealistic bright pink/cyan spheres
        // const gasClouds = createGasClouds();
        
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
        let isMouseDown = false;
        let touchStartX = 0, touchStartY = 0;
        let pinchStartDistance = 0;
        let lastTouchDistance = 0;
        let rotationVelocity = { x: 0, y: 0 }; // For smooth mouse look
        
        // Camera rotation state for proper FPS controls
        let pitch = 0; // X rotation
        let yaw = 0;   // Y rotation
        
        // Initialize camera pitch/yaw based on lookAt direction
        const initialDir = new THREE.Vector3(0, 0, 0).sub(camera.position).normalize();
        pitch = Math.asin(-initialDir.y);
        yaw = Math.atan2(-initialDir.x, -initialDir.z);
        
        // Mobile movement state
        let mobileMovement = { forward: 0, strafe: 0, up: 0 };
        let lastTapTime = 0;
        let doubleTapTimer = null;
        
        // Create controls reset function
        controlsResetRef.current = () => {
          rotationVelocity.x = 0;
          rotationVelocity.y = 0;
          mobileMovement.forward = 0;
          mobileMovement.strafe = 0;
          mobileMovement.up = 0;
        };
        
        // Mobile touch controls
        if (mobile) {
          renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
              touchStartX = e.touches[0].clientX;
              touchStartY = e.touches[0].clientY;
              isMouseDown = true;
              
              // Double tap to move forward, triple tap to log position
              const currentTime = Date.now();
              if (currentTime - lastTapTime < 300) {
                if (doubleTapTimer && currentTime - lastTapTime < 300) {
                  // Triple tap - log position
                  // Debug: Camera position and rotation
                  clearTimeout(doubleTapTimer);
                  doubleTapTimer = null;
                } else {
                  // Double tap - move forward
                  mobileMovement.forward = 1;
                  if (doubleTapTimer) clearTimeout(doubleTapTimer);
                  doubleTapTimer = setTimeout(() => {
                    mobileMovement.forward = 0;
                  }, 2000); // Move forward for 2 seconds
                }
              }
              lastTapTime = currentTime;
            } else if (e.touches.length === 2) {
              // Pinch zoom moves camera forward/backward
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              pinchStartDistance = Math.sqrt(dx * dx + dy * dy);
              lastTouchDistance = pinchStartDistance;
            } else if (e.touches.length === 3) {
              // Three finger touch for up/down movement
              mobileMovement.up = 1;
            }
          });
          
          renderer.domElement.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (e.touches.length === 1 && isMouseDown) {
              const deltaX = e.touches[0].clientX - touchStartX;
              const deltaY = e.touches[0].clientY - touchStartY;
              
              // Update pitch and yaw for full 360-degree rotation
              yaw -= deltaX * 0.01;  // Inverted to match user expectation
              pitch -= deltaY * 0.01;
              
              // No limits - allow full 360-degree rotation
              // Apply rotation using quaternion to avoid gimbal lock
              const quaternion = new THREE.Quaternion();
              const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
              quaternion.setFromEuler(euler);
              camera.quaternion.copy(quaternion);
              
              touchStartX = e.touches[0].clientX;
              touchStartY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
              // Pinch to move forward/backward in view direction
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              const scale = distance / lastTouchDistance;
              const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
              
              // Move along view direction based on pinch
              const moveSpeed = (scale > 1 ? 100 : -100) * Math.abs(scale - 1);
              camera.position.addScaledVector(forward, moveSpeed);
              
              lastTouchDistance = distance;
            }
          });
          
          renderer.domElement.addEventListener('touchend', (e) => {
            isMouseDown = false;
            // Stop up/down movement when lifting 3 fingers
            if (e.touches.length < 3) {
              mobileMovement.up = 0;
            }
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
          });
          
          // Mouse movement (only when pointer locked)
          document.addEventListener('mousemove', (e) => {
            if (!isPointerLocked) return;
            
            // Use smooth navigation for rotation
            if (smoothNavRef.current) {
              smoothNavRef.current.addRotation(e.movementX * 0.002, e.movementY * 0.002);
            } else {
              // Fallback to old system
              rotationVelocity.x = -e.movementX * 0.005;
              rotationVelocity.y = e.movementY * 0.005;
            }
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
            } else if (e.key === 'p' || e.key === 'P') {
              // Press P to log current camera position and movement state
              console.log('Camera position:', camera.position);
              console.log('Camera rotation:', { pitch, yaw });
              console.log('Keys pressed:', Object.entries(keysRef.current).filter(([k, v]) => v).map(([k]) => k));
              keysRef.current['p'] = true;
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
        let lastFrameTime = performance.now();
        let frameSkipCounter = 0;
        
        // Fade animation helper with error checking
        const fadeObject = (object, targetOpacity, deltaTime, fadeSpeed = 2) => {
          // Check if object exists and is valid
          if (!object || typeof object !== 'object') return;
          
          // Initialize userData if needed
          if (!object.userData) object.userData = {};
          
          // Initialize fade opacity
          if (!object.userData.fadeOpacity) {
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.userData.fadeOpacity = object.material[0]?.opacity || 1;
              } else {
                object.userData.fadeOpacity = object.material.opacity || 1;
              }
            } else {
              object.userData.fadeOpacity = 1;
            }
          }
          
          // Update fade opacity
          object.userData.fadeOpacity += (targetOpacity - object.userData.fadeOpacity) * deltaTime * fadeSpeed;
          
          // Apply to material if it exists
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(mat => {
                if (mat) {
                  mat.transparent = true;
                  mat.opacity = object.userData.fadeOpacity;
                }
              });
            } else {
              object.material.transparent = true;
              object.material.opacity = object.userData.fadeOpacity;
            }
          }
          
          // Hide completely when faded out
          object.visible = object.userData.fadeOpacity > 0.01;
        };
        
        // Fade group helper
        const fadeGroup = (group, targetVisible, deltaTime, fadeSpeed = 2) => {
          if (!group.userData.groupOpacity) {
            group.userData.groupOpacity = targetVisible ? 1 : 0;
          }
          
          const targetOpacity = targetVisible ? 1 : 0;
          group.userData.groupOpacity += (targetOpacity - group.userData.groupOpacity) * deltaTime * fadeSpeed;
          
          group.traverse((child) => {
            if (child.material && child !== group) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                  mat.transparent = true;
                  mat.opacity = child.userData.originalOpacity ? 
                    child.userData.originalOpacity * group.userData.groupOpacity : 
                    group.userData.groupOpacity;
                });
              } else {
                if (!child.userData.originalOpacity && child.material.opacity !== undefined) {
                  child.userData.originalOpacity = child.material.opacity;
                }
                child.material.transparent = true;
                child.material.opacity = child.userData.originalOpacity ? 
                  child.userData.originalOpacity * group.userData.groupOpacity : 
                  group.userData.groupOpacity;
              }
            }
          });
          
          group.visible = group.userData.groupOpacity > 0.01;
        };
        
        // Initialize camera focus manager
        cameraFocusManagerRef.current = new CameraFocusManager(camera, scene);
        console.log('Camera focus manager initialized');
        
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          const deltaTime = clock.getDelta();
          time += deltaTime;
          
          // Get current camera reference
          const camera = cameraRef.current;
          if (!camera) return;
          
          // Frame limiting when performance is poor
          const now = performance.now();
          const frameTime = now - lastFrameTime;
          lastFrameTime = now;
          
          // Skip frames if running too slow (< 20 FPS)
          if (frameTime > 50 && frameSkipCounter < 2) {
            frameSkipCounter++;
            return;
          }
          frameSkipCounter = 0;
          
          // Update Nanite system (parallel processing) - don't await in animation loop
          if (naniteSystemRef.current) {
            naniteSystemRef.current.update().catch(err => console.error('Nanite update error:', err));
          }
          
          // Update sun with distance-based corona fading
          sunGroup.rotation.y += deltaTime * 0.1;
          if (sunMaterial.uniforms) {
            sunMaterial.uniforms.time.value = time;
            sunMaterial.uniforms.viewVector.value.subVectors(
              camera.position, 
              sunGroup.position
            ).normalize();
          }
          
          // Fade sun corona based on distance
          const sunDistance = camera.position.distanceTo(sunGroup.position);
          const corona = sunGroup.children.find(child => child.name === 'corona' || child.material?.blending === THREE.AdditiveBlending);
          if (corona) {
            const coronaShouldBeVisible = sunDistance < 5000;
            fadeObject(corona, coronaShouldBeVisible ? 0.5 : 0, deltaTime, 2);
          }
          
          // Update planets with distance-based optimizations
          planets.forEach((planet, index) => {
            // Calculate distance from camera to planet
            const planetDistance = camera.position.distanceTo(planet.group.position);
            
            // Only update orbital position for visible planets
            if (planetDistance < 100000) {
              planet.angle += deltaTime * planet.speed * 0.0001;
              planet.group.position.x = Math.cos(planet.angle) * planet.distance;
              planet.group.position.z = Math.sin(planet.angle) * planet.distance;
              
              // Skip rotation and moon updates when far
              if (planetDistance < 50000) {
                planet.mesh.rotation.y += deltaTime * 0.5;
                
                // Update moons only when close
                if (planetDistance < 10000) {
                  planet.moons.forEach((moon) => {
                    if (moon.userData.distance) {
                      moon.userData.angle = (moon.userData.angle || 0) + deltaTime * moon.userData.speed * 0.01;
                      moon.position.x = Math.cos(moon.userData.angle) * moon.userData.distance;
                      moon.position.z = Math.sin(moon.userData.angle) * moon.userData.distance;
                      moon.rotation.y += deltaTime * 0.3;
                    }
                  });
                }
                
                // Update shader uniforms only when close
                if (planetDistance < 20000 && planet.mesh.material && planet.mesh.material.uniforms) {
                  if (planet.mesh.material.uniforms.sunPosition) {
                    planet.mesh.material.uniforms.sunPosition.value.copy(sunGroup.position);
                  }
                  if (planet.mesh.material.uniforms.time) {
                    planet.mesh.material.uniforms.time.value = time;
                  }
                }
              }
              
              // Fade moons based on distance
              planet.moons.forEach(moon => {
                const moonShouldBeVisible = planetDistance < 10000;
                fadeObject(moon, moonShouldBeVisible ? 1 : 0, deltaTime, 2);
              });
              
              fadeGroup(planet.group, true, deltaTime, 1.5);
            } else {
              // Fade out distant planets entirely
              fadeGroup(planet.group, false, deltaTime, 1.5);
            }
            
            // Update planet trails with fading
            if (planetTrails && planetTrails.children[index]) {
              const trail = planetTrails.children[index];
              
              // Fade trail based on planet distance
              const trailShouldBeVisible = planetDistance < 50000;
              fadeObject(trail, trailShouldBeVisible ? 0.3 : 0, deltaTime, 2);
              
              if (trail.visible) {
                const positions = trail.geometry.attributes.position.array;
                const trailCount = positions.length / 3;
                
                // Shift positions back
                for (let i = trailCount - 1; i > 0; i--) {
                  positions[i * 3] = positions[(i - 1) * 3];
                  positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
                  positions[i * 3 + 2] = positions[(i - 1) * 3 + 2];
                }
                
                // Add new position at front
                positions[0] = planet.group.position.x;
                positions[1] = planet.group.position.y;
                positions[2] = planet.group.position.z;
                
                trail.geometry.attributes.position.needsUpdate = true;
              }
            }
          });
          
          // Update shader uniforms and particle effects (skip when zoomed out)
          if (!camera.userData.skipShaderUpdates) {
            scene.traverse((object) => {
              if (object.material && object.material.uniforms) {
                if (object.material.uniforms.time) {
                  object.material.uniforms.time.value = time;
                }
                // Update dust camera position
                if (object.name === 'cosmicDust' && object.material.uniforms.cameraPos) {
                  object.material.uniforms.cameraPos.value.copy(camera.position);
                }
                // Update nebula camera position for parallax effect
                if (object.parent && object.parent.name && object.parent.name.startsWith('nebula-')) {
                  if (object.material.uniforms.cameraPos) {
                    object.material.uniforms.cameraPos.value.copy(camera.position);
                  }
                }
              }
              
              // Animate nebula layers only when visible
              if (object.parent && object.parent.userData && object.parent.userData.layers && 
                  object.parent.visible) {
                object.rotation.y += deltaTime * 0.02;
                object.rotation.x += deltaTime * 0.01;
              }
            });
          }
          
          // LOD for particle effects based on camera speed and distance
          const cameraSpeed = new THREE.Vector3(
            camera.position.x - (camera.userData.lastPosition?.x || camera.position.x),
            camera.position.y - (camera.userData.lastPosition?.y || camera.position.y),
            camera.position.z - (camera.userData.lastPosition?.z || camera.position.z)
          ).length();
          
          const cameraDistance = camera.position.length();
          
          // Aggressive culling when zoomed out with fade animations
          if (cameraDistance > 10000) {
            // Fade out particle effects when very far
            if (cosmicDust) fadeObject(cosmicDust, 0, deltaTime, 3);
            // if (gasClouds) fadeObject(gasClouds, 0, deltaTime, 3); // DISABLED
            
            // Update JWST nebulae visibility based on distance
            if (jwstNebulaGroup) {
              jwstNebulaGroup.children.forEach(nebula => {
                const distance = camera.position.distanceTo(nebula.position);
                const maxDistance = 50000;
                
                if (distance > maxDistance) {
                  fadeObject(nebula, 0, deltaTime, 2);
                } else {
                  // Fade in/out based on distance
                  const opacity = 1.0 - (distance / maxDistance);
                  fadeObject(nebula, opacity, deltaTime, 3);
                  
                  // LOD: Reduce particle count when far
                  nebula.children.forEach(child => {
                    if (child.isPoints && child.material.uniforms) {
                      const lodFactor = distance > 20000 ? 0.5 : 1.0;
                      child.visible = Math.random() < lodFactor;
                    }
                  });
                }
              });
            }
            
            // Fade detail for various objects based on distance
            scene.traverse((object) => {
              if (object.type === 'InstancedMesh' && object.geometry) {
                const shouldBeVisible = cameraDistance < 30000;
                fadeObject(object, shouldBeVisible ? 1 : 0, deltaTime, 2);
              }
              // Reduce star field particle size when far
              if (object.type === 'Points' && object.material && object.material.size) {
                if (cameraDistance > 20000) {
                  object.material.size = 1; // Minimal size when far
                } else {
                  object.material.size = 2; // Normal size
                }
              }
            });
            
            // Skip shader updates when far
            camera.userData.skipShaderUpdates = true;
          } else {
            // Normal visibility based on speed with fading
            if (cosmicDust) {
              const shouldBeVisible = cameraSpeed < 1000 && cameraDistance < 5000;
              fadeObject(cosmicDust, shouldBeVisible ? 1 : 0, deltaTime, 3);
            }
            // if (gasClouds) {
            //   const shouldBeVisible = cameraSpeed < 5000 && cameraDistance < 8000;
            //   fadeObject(gasClouds, shouldBeVisible ? 1 : 0, deltaTime, 3);
            // } // DISABLED
            // Nebula fading disabled
            camera.userData.skipShaderUpdates = false;
          }
          
          // Store last position
          camera.userData.lastPosition = camera.position.clone();
          
          // Camera movement
          if (mobile) {
            // Mobile movement based on touch gestures
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            const up = new THREE.Vector3(0, 1, 0);
            
            // Calculate speed based on distance from origin
            const cameraDistance = camera.position.length();
            let baseSpeed = Math.max(10, Math.pow(cameraDistance, 1.1) * 0.001);
            const moveDistance = baseSpeed * deltaTime * 60;
            
            // Apply movement
            if (mobileMovement.forward !== 0) {
              camera.position.addScaledVector(forward, moveDistance * mobileMovement.forward);
            }
            if (mobileMovement.strafe !== 0) {
              camera.position.addScaledVector(right, moveDistance * mobileMovement.strafe);
            }
            if (mobileMovement.up !== 0) {
              camera.position.addScaledVector(up, moveDistance * mobileMovement.up);
            }
          } else {
            // Use smooth navigation system
            if (smoothNavRef.current) {
              const rotationUpdate = smoothNavRef.current.update(keysRef.current, deltaTime, pitch, yaw);
              pitch = rotationUpdate.pitch;
              yaw = rotationUpdate.yaw;
            }
            
            // Update camera focus manager
            if (cameraFocusManagerRef.current) {
              cameraFocusManagerRef.current.update();
            }
            
            if (!smoothNavRef.current) {
              // Fallback to old movement system
              if (rotationVelocity) {
                yaw += rotationVelocity.x;
                pitch -= rotationVelocity.y;
                
                const quaternion = new THREE.Quaternion();
                const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
                quaternion.setFromEuler(euler);
                camera.quaternion.copy(quaternion);
                
                rotationVelocity.x *= 0.85;
                rotationVelocity.y *= 0.85;
              }
              
              const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
              const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
              const up = new THREE.Vector3(0, 1, 0);
              
              const cameraDistance = camera.position.length();
              let baseSpeed = Math.pow(cameraDistance, 1.1) * 0.001;
              baseSpeed = Math.max(10, baseSpeed);
              
              const speed = keysRef.current['shift'] ? baseSpeed * 10 : baseSpeed;
              const moveDistance = speed * deltaTime * 60;
              
              if (keysRef.current['w']) camera.position.addScaledVector(forward, moveDistance);
              if (keysRef.current['s']) camera.position.addScaledVector(forward, -moveDistance);
              if (keysRef.current['a']) camera.position.addScaledVector(right, -moveDistance);
              if (keysRef.current['d']) camera.position.addScaledVector(right, moveDistance);
              if (keysRef.current[' ']) camera.position.addScaledVector(up, moveDistance);
              if (keysRef.current['control']) camera.position.addScaledVector(up, -moveDistance);
            }
            
            // Debug: Log camera position when P is pressed
            if (keysRef.current['p']) {
              // Camera position logged
              keysRef.current['p'] = false; // Prevent spam
            }
          }
          
          
          // Adjust camera far plane based on zoom level
          const oldFar = camera.far;
          if (cameraDistance > 50000) {
            camera.far = cameraDistance * 2; // Reduce far plane when zoomed out
          } else {
            camera.far = 100000000; // Normal far plane
          }
          if (oldFar !== camera.far) {
            camera.updateProjectionMatrix();
          }
          
          // Render with Nanite if available
          if (naniteSystemRef.current && cameraDistance < 50000) {
            naniteSystemRef.current.render(scene);
          }
          
          // Render scene
          renderer.render(scene, camera);
        };
        
        
        animate();
        
        
        
        // Handle resize
        const handleResize = () => {
          const width = window.innerWidth;
          const height = window.innerHeight;
          
          if (cameraRef.current) {
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
          }
          if (renderer) {
            renderer.setSize(width, height);
          }
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

  const handleTeleport = (x, y, z) => {
    if (cameraRef.current) {
      cameraRef.current.position.set(x, y, z);
      cameraRef.current.updateMatrixWorld(true);
      
      // Update lastPosition to prevent speed calculation issues
      if (cameraRef.current.userData) {
        cameraRef.current.userData.lastPosition = cameraRef.current.position.clone();
      }
      
      // Reset any movement states
      if (keysRef.current) {
        Object.keys(keysRef.current).forEach(key => {
          keysRef.current[key] = false;
        });
      }
      
      // Reset rotation and mobile movement
      if (controlsResetRef.current) {
        controlsResetRef.current();
      }
      
      // Reset smooth navigation
      if (smoothNavRef.current) {
        smoothNavRef.current.reset();
      }
    }
  };

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
      {camera && sceneRef.current && (
        <EnhancedMinimap 
          camera={camera} 
          scene={sceneRef.current} 
          onTeleport={handleTeleport}
          smoothNav={smoothNavRef.current}
        />
      )}
    </div>
  );
};

export default UniverseSimulationParallel;