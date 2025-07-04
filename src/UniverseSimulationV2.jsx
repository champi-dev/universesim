import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { LODSystem } from "./rendering/LODSystem";
import { 
  getNebulaCatalog,
  convertRADecToCartesian,
  getSpectralColor
} from "./data/nasaDataFetcher";
import { preloadedExoplanets, preloadedAsteroids } from "./data/preloadedData";
import { generateCompleteGalaxyCatalog } from "./data/extendedGalaxyCatalog";
import { generateCompleteStarCatalog } from "./data/starCatalog";

const UniverseSimulationV2 = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const frameRef = useRef(0);
  const lodSystemRef = useRef(null);

  const [timeSpeed, setTimeSpeed] = useState(1);
  const [currentScale, setCurrentScale] = useState("planet");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [objectCount, setObjectCount] = useState({ total: 0, visible: 0 });
  const [isMobile] = useState(
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  );

  // Camera state with larger range
  const cameraState = useRef({
    position: new THREE.Vector3(0, 50, 300),
    lookAt: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
  });

  // Load astronomical data
  useEffect(() => {
    console.log('Starting to load astronomical data...');
    try {
      setLoadingProgress(10);
      console.log('Loading star catalog...');
      
      // Load all data catalogs - now optimized with O(1) operations
      const starCatalog = generateCompleteStarCatalog();
      console.log('Star catalog loaded:', starCatalog);
      
      const galaxyCatalog = generateCompleteGalaxyCatalog();
      console.log('Galaxy catalog loaded:', galaxyCatalog);
      
      const nebulaCatalog = getNebulaCatalog();
      console.log('Nebula catalog loaded:', nebulaCatalog);
      
      setLoadingProgress(50);
      
      // Store data
      window.astronomicalData = {
        stars: starCatalog,
        galaxies: galaxyCatalog,
        nebulae: nebulaCatalog,
        exoplanets: preloadedExoplanets,
        asteroids: preloadedAsteroids
      };
      
      console.log('All data stored in window.astronomicalData');
      
      setLoadingProgress(100);
      setDataLoaded(true);
      console.log('Data loaded flag set to true');
      
      const total = starCatalog.total + galaxyCatalog.total + nebulaCatalog.length;
      setObjectCount({ total, visible: 0 });
      
    } catch (error) {
      console.error('Error loading astronomical data:', error);
      console.error('Error stack:', error.stack);
      setDataLoaded(true); // Continue with fallback data
    }
  }, []);

  useEffect(() => {
    if (!mountRef.current || !dataLoaded) return;
    
    console.log('Initializing scene with data:', window.astronomicalData);

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene with massive render distance
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000033); // Dark blue background
    scene.fog = new THREE.FogExp2(0x000011, 0.00003);
    sceneRef.current = scene;

    // Camera with extreme range
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1e12);
    camera.position.copy(cameraState.current.position);
    camera.lookAt(cameraState.current.lookAt);
    cameraRef.current = camera;
    console.log('Camera setup:', camera.position, 'looking at:', cameraState.current.lookAt);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Initialize LOD system
    const lodSystem = new LODSystem(camera, scene);
    lodSystem.initInstancedMeshes();
    lodSystemRef.current = lodSystem;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x0a0a2a, 0.5);
    scene.add(ambientLight);

    // Directional lights for cinematic effect
    const rimLight1 = new THREE.DirectionalLight(0x4488ff, 0.5);
    rimLight1.position.set(-100, 50, -100);
    scene.add(rimLight1);

    const rimLight2 = new THREE.DirectionalLight(0xff8844, 0.3);
    rimLight2.position.set(100, -50, 100);
    scene.add(rimLight2);

    // ========== SUN ==========
    const sunGeometry = new THREE.IcosahedronGeometry(20, 4);
    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        detail: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        uniform float time;
        
        void main() {
          vPosition = position;
          vNormal = normal;
          
          vec3 pos = position;
          float noise = sin(position.x * 0.3 + time) * cos(position.y * 0.3 - time * 0.8) * 0.5;
          pos += normal * noise;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float detail;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          vec3 color = vec3(1.0, 0.9, 0.0);
          float pattern = sin(vPosition.x * detail) * cos(vPosition.y * detail) * sin(vPosition.z * detail + time);
          color += vec3(0.2, 0.1, 0.0) * pattern;
          
          float glow = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          color += vec3(1.0, 0.5, 0.0) * glow;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Sun light
    const sunLight = new THREE.PointLight(0xffffff, 2, 1000);
    sun.add(sunLight);
    
    // Test sphere to verify rendering
    const testGeometry = new THREE.SphereGeometry(50, 32, 32);
    const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const testSphere = new THREE.Mesh(testGeometry, testMaterial);
    testSphere.position.set(100, 0, 0);
    scene.add(testSphere);
    console.log('Added test sphere at', testSphere.position);

    // ========== LOAD STARS ==========
    const starData = window.astronomicalData.stars;
    
    // Add bright stars
    starData.bright.forEach(star => {
      const pos = convertRADecToCartesian(star.ra, star.dec, star.distance);
      lodSystem.addObject({
        id: star.name,
        position: pos,
        type: 'star',
        mag: star.mag,
        color: getSpectralColor(star.spectralType),
        name: star.name,
        spectralType: star.spectralType
      });
    });
    
    // Field stars are now generated on-demand by the optimized catalog
    // No need to add them here - they'll be rendered dynamically
    
    // Star clusters are now generated on-demand
    // Just add cluster centers for reference
    starData.openClusters.forEach(({ cluster }) => {
      if (cluster && cluster.ra !== undefined) {
        const pos = convertRADecToCartesian(cluster.ra, cluster.dec, cluster.distance);
        lodSystem.addObject({
          id: cluster.name,
          position: pos,
          type: 'cluster',
          name: cluster.name,
          size: cluster.size
        });
      }
    });

    // ========== LOAD GALAXIES ==========
    const galaxyData = window.astronomicalData.galaxies;
    
    // Add notable galaxies
    galaxyData.notable.forEach(galaxy => {
      const pos = convertRADecToCartesian(galaxy.ra, galaxy.dec, galaxy.distance);
      lodSystem.addObject({
        id: galaxy.name,
        position: pos,
        type: 'galaxy',
        magnitude: galaxy.magnitude,
        size: galaxy.size,
        name: galaxy.name,
        morphology: galaxy.type,
        color: galaxy.color || {
          core: 0xffffaa,
          arms: 0xaaccff,
          halo: 0x8899cc
        }
      });
    });
    
    // Cluster, field, and deep field galaxies are now generated on-demand
    // No need to add them here - they'll be rendered dynamically

    // ========== LOAD NEBULAE ==========
    const nebulaeData = window.astronomicalData.nebulae;
    
    nebulaeData.forEach(nebula => {
      const pos = convertRADecToCartesian(nebula.ra, nebula.dec, nebula.distance * 1000);
      
      // Create nebula visualization
      const nebulaGroup = createNebula(nebula);
      nebulaGroup.position.copy(pos);
      scene.add(nebulaGroup);
      
      lodSystem.addObject({
        id: nebula.name,
        position: pos,
        type: 'nebula',
        size: nebula.size,
        name: nebula.name,
        nebulaType: nebula.type,
        mesh: nebulaGroup
      });
    });

    // ========== SOLAR SYSTEM PLANETS ==========
    const planets = [];
    const planetData = [
      { name: "Mercury", radius: 3, distance: 50, color: 0x8b7355, speed: 1 },
      { name: "Venus", radius: 5, distance: 80, color: 0xffc649, speed: 0.8 },
      { name: "Earth", radius: 5, distance: 120, color: 0x4169e1, speed: 0.6 },
      { name: "Mars", radius: 4, distance: 170, color: 0xcd5c5c, speed: 0.5 },
      { name: "Jupiter", radius: 12, distance: 280, color: 0xffb366, speed: 0.3 },
      { name: "Saturn", radius: 10, distance: 400, color: 0xf4ca16, speed: 0.2 },
      { name: "Uranus", radius: 6, distance: 550, color: 0x4fd5d6, speed: 0.15 },
      { name: "Neptune", radius: 6, distance: 700, color: 0x4166f5, speed: 0.1 },
    ];

    planetData.forEach((data) => {
      const geometry = new THREE.IcosahedronGeometry(data.radius, 3);
      const material = new THREE.MeshPhongMaterial({
        color: data.color,
        shininess: 30,
      });
      const planet = new THREE.Mesh(geometry, material);
      planet.userData = { ...data, angle: Math.random() * Math.PI * 2 };
      planets.push(planet);
      scene.add(planet);

      // Orbit line
      const curve = new THREE.EllipseCurve(
        0, 0, data.distance, data.distance, 0, 2 * Math.PI
      );
      const points = curve.getPoints(64);
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: 0x444444,
        opacity: 0.3,
        transparent: true,
      });
      const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      scene.add(orbit);
    });

    // ========== CREATE NEBULA FUNCTION ==========
    function createNebula(nebula) {
      const group = new THREE.Group();
      const particleCount = Math.min(nebula.size * 100, 10000);
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      const nebulaColors = {
        emission: [new THREE.Color(0xff0080), new THREE.Color(0x0080ff)],
        planetary: [new THREE.Color(0x00ff80), new THREE.Color(0xff00ff)],
        supernova: [new THREE.Color(0xff8800), new THREE.Color(0x00ffff)],
        reflection: [new THREE.Color(0x8888ff), new THREE.Color(0xaaaaff)],
        dark: [new THREE.Color(0x222222), new THREE.Color(0x444444)],
        'star-forming': [new THREE.Color(0xffaa00), new THREE.Color(0xff0066)]
      };

      const colorPalette = nebulaColors[nebula.type] || nebulaColors.emission;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.random() * nebula.size * (0.5 + 0.5 * Math.random());

        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = r * Math.cos(phi);

        const color = new THREE.Color().lerpColors(
          colorPalette[0],
          colorPalette[1],
          Math.random()
        );
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        sizes[i] = Math.random() * 5 + 2;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `
          attribute float size;
          varying vec3 vColor;
          uniform float time;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            float pulse = sin(time * 0.5 + position.x * 0.01) * 0.2 + 1.0;
            gl_PointSize = size * pulse * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            float r = distance(gl_PointCoord, vec2(0.5));
            if (r > 0.5) discard;
            float intensity = 1.0 - (r * 2.0);
            intensity = pow(intensity, 2.0);
            gl_FragColor = vec4(vColor * intensity, intensity * 0.8);
          }
        `,
        blending: THREE.AdditiveBlending,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
      });

      const particles = new THREE.Points(geometry, material);
      group.add(particles);
      group.userData = { material };

      return group;
    }

    // Update scale detection
    const updateScale = () => {
      const distance = camera.position.length();

      if (distance < 50) {
        setCurrentScale("planet");
        scene.fog.density = 0.0001;
      } else if (distance < 1000) {
        setCurrentScale("solar");
        scene.fog.density = 0.00003;
      } else if (distance < 10000) {
        setCurrentScale("stellar");
        scene.fog.density = 0.00001;
      } else if (distance < 100000) {
        setCurrentScale("local");
        scene.fog.density = 0.000001;
      } else if (distance < 1000000) {
        setCurrentScale("galaxy");
        scene.fog.density = 0.0000001;
      } else {
        setCurrentScale("universe");
        scene.fog.density = 0.00000001;
      }

      // Update LOD system
      lodSystem.update();
      
      // Update visible object count
      let visibleCount = 0;
      if (lodSystem.instancedMeshes.stars) {
        visibleCount += lodSystem.instancedMeshes.stars.count;
      }
      if (lodSystem.instancedMeshes.distantGalaxies) {
        visibleCount += lodSystem.instancedMeshes.distantGalaxies.count;
      }
      setObjectCount(prev => ({ ...prev, visible: visibleCount }));
    };

    // Controls setup (same as original)
    let velocityInterval = null;
    let keydownHandler = null;
    let keyupHandler = null;

    // Mobile touch controls
    if (isMobile) {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let lastPinchDistance = 0;
      let isPinching = false;
      let pinchEndTime = 0;

      renderer.domElement.addEventListener("touchstart", (e) => {
        e.preventDefault();

        if (e.touches.length === 1) {
          if (Date.now() - pinchEndTime < 300) return;

          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchStartTime = Date.now();
        } else if (e.touches.length === 2) {
          isPinching = true;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
        }
      });

      renderer.domElement.addEventListener("touchmove", (e) => {
        e.preventDefault();

        if (e.touches.length === 1 && !isPinching) {
          if (Date.now() - pinchEndTime < 300) return;

          const deltaX = e.touches[0].clientX - touchStartX;
          const deltaY = e.touches[0].clientY - touchStartY;

          const spherical = new THREE.Spherical();
          const offset = cameraState.current.lookAt
            .clone()
            .sub(cameraState.current.position);
          spherical.setFromVector3(offset);

          spherical.theta -= deltaX * 0.01;
          spherical.phi += deltaY * 0.01;
          spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

          offset.setFromSpherical(spherical);
          cameraState.current.lookAt
            .copy(cameraState.current.position)
            .add(offset);

          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        } else if (e.touches.length === 2 && lastPinchDistance > 0) {
          isPinching = true;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const currentDistance = Math.sqrt(dx * dx + dy * dy);

          const scale = (currentDistance - lastPinchDistance) * 0.5;
          const direction = cameraState.current.lookAt
            .clone()
            .sub(cameraState.current.position)
            .normalize();

          const currentDist = cameraState.current.position.length();
          const moveScale =
            currentDist < 100
              ? scale * 0.1
              : currentDist < 1000
              ? scale
              : currentDist < 10000
              ? scale * 10
              : currentDist < 100000
              ? scale * 100
              : scale * 1000;

          cameraState.current.position.addScaledVector(direction, moveScale);
          cameraState.current.lookAt.addScaledVector(direction, moveScale);

          lastPinchDistance = currentDistance;
        }
      });

      renderer.domElement.addEventListener("touchend", (e) => {
        if (isPinching && e.touches.length < 2) {
          isPinching = false;
          pinchEndTime = Date.now();
          lastPinchDistance = 0;
        } else if (e.touches.length === 0 && !isPinching) {
          const touchDuration = Date.now() - touchStartTime;
          if (touchDuration < 200 && Date.now() - pinchEndTime > 300) {
            const direction = cameraState.current.lookAt
              .clone()
              .sub(cameraState.current.position)
              .normalize();
            const currentDist = cameraState.current.position.length();
            const speed =
              currentDist < 100
                ? 2
                : currentDist < 1000
                ? 20
                : currentDist < 10000
                ? 200
                : currentDist < 100000
                ? 2000
                : 20000;
            cameraState.current.velocity.copy(direction).multiplyScalar(speed);
          }
        }
      });
    } else {
      // Desktop controls
      let isPointerLocked = false;
      const keys = {
        w: false,
        a: false,
        s: false,
        d: false,
        shift: false,
        space: false,
      };

      renderer.domElement.addEventListener("click", () => {
        renderer.domElement.requestPointerLock();
      });

      document.addEventListener("pointerlockchange", () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
      });

      document.addEventListener("mousemove", (e) => {
        if (!isPointerLocked) return;

        const spherical = new THREE.Spherical();
        const offset = cameraState.current.lookAt
          .clone()
          .sub(cameraState.current.position);
        spherical.setFromVector3(offset);

        spherical.theta -= e.movementX * 0.002;
        spherical.phi += e.movementY * 0.002;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

        offset.setFromSpherical(spherical);
        cameraState.current.lookAt
          .copy(cameraState.current.position)
          .add(offset);
      });

      keydownHandler = (e) => {
        switch (e.key.toLowerCase()) {
          case "w":
            keys.w = true;
            break;
          case "a":
            keys.a = true;
            break;
          case "s":
            keys.s = true;
            break;
          case "d":
            keys.d = true;
            break;
          case " ":
            e.preventDefault();
            keys.space = true;
            break;
          case "shift":
            keys.shift = true;
            break;
        }
      };

      keyupHandler = (e) => {
        switch (e.key.toLowerCase()) {
          case "w":
            keys.w = false;
            break;
          case "a":
            keys.a = false;
            break;
          case "s":
            keys.s = false;
            break;
          case "d":
            keys.d = false;
            break;
          case " ":
            e.preventDefault();
            keys.space = false;
            break;
          case "shift":
            keys.shift = false;
            break;
          case "escape":
            if (document.pointerLockElement) {
              document.exitPointerLock();
            }
            break;
        }
      };

      document.addEventListener("keydown", keydownHandler);
      document.addEventListener("keyup", keyupHandler);

      // Desktop scroll handling
      renderer.domElement.addEventListener("wheel", (e) => {
        e.preventDefault();
        
        const direction = cameraState.current.lookAt
          .clone()
          .sub(cameraState.current.position)
          .normalize();
        
        const currentDist = cameraState.current.position.length();
        
        const baseSpeed = currentDist < 100
          ? currentDist * 0.1
          : currentDist < 1000
          ? currentDist * 1
          : currentDist < 10000
          ? currentDist * 10
          : currentDist < 100000
          ? currentDist * 100
          : currentDist * 1000;
        
        const wheelDirection = e.deltaY > 0 ? 1 : -1;
        const movement = direction.clone().multiplyScalar(wheelDirection * baseSpeed * 0.01);
        
        cameraState.current.velocity.add(movement);
      });

      const updateVelocity = () => {
        if (!isPointerLocked) return;

        const forward = cameraState.current.lookAt
          .clone()
          .sub(cameraState.current.position)
          .normalize();
        const right = new THREE.Vector3()
          .crossVectors(forward, new THREE.Vector3(0, 1, 0))
          .normalize();

        const movement = new THREE.Vector3(0, 0, 0);
        if (keys.w) movement.add(forward);
        if (keys.s) movement.sub(forward);
        if (keys.a) movement.sub(right);
        if (keys.d) movement.add(right);
        if (keys.space) movement.y += 1;
        if (keys.shift) movement.y -= 1;

        if (movement.length() > 0) {
          const currentDist = cameraState.current.position.length();
          const speed =
            currentDist < 100
              ? 0.5
              : currentDist < 1000
              ? 5
              : currentDist < 10000
              ? 50
              : currentDist < 100000
              ? 500
              : 5000;
          movement.normalize().multiplyScalar(speed);
          cameraState.current.velocity.add(movement);
        }
      };

      velocityInterval = setInterval(updateVelocity, 16);
    }

    // Animation
    let time = 0;
    let frameCount = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      time += 0.016 * timeSpeed;
      frameCount++;
      
      if (frameCount % 60 === 0) {
        console.log('Animation running, frame:', frameCount, 'Camera pos:', camera.position);
      }

      // Update sun
      sun.material.uniforms.time.value = time;
      const distance = camera.position.length();
      sun.material.uniforms.detail.value = Math.max(
        0.1,
        Math.min(10, 1000 / distance)
      );

      // Update planets
      planets.forEach((planet) => {
        planet.userData.angle += planet.userData.speed * 0.01 * timeSpeed;
        planet.position.x =
          Math.cos(planet.userData.angle) * planet.userData.distance;
        planet.position.z =
          Math.sin(planet.userData.angle) * planet.userData.distance;
        planet.rotation.y += 0.01;
      });

      // Update nebulae
      scene.traverse((child) => {
        if (child.userData && child.userData.material && child.userData.material.uniforms) {
          child.userData.material.uniforms.time.value = time;
        }
      });

      // Apply velocity with damping
      cameraState.current.position.add(cameraState.current.velocity);
      cameraState.current.lookAt.add(cameraState.current.velocity);
      cameraState.current.velocity.multiplyScalar(0.95);

      // Update camera
      camera.position.copy(cameraState.current.position);
      camera.lookAt(cameraState.current.lookAt);

      // Update scale
      updateScale();

      // Update LOD system with optimized catalogs
      if (lodSystemRef.current) {
        const viewDistance = camera.position.length() * 10; // Adjust based on camera distance
        
        // Update stars
        if (window.astronomicalData?.stars?.optimized) {
          const visibleStars = window.astronomicalData.stars.optimized.getVisibleStars(
            camera.position,
            viewDistance,
            { maxMagnitude: 15 }
          );
          
          // Convert to LOD system format
          const lodStars = visibleStars.map(star => ({
            position: new THREE.Vector3(star.position.x, star.position.y, star.position.z),
            data: star,
            renderDistance: camera.position.distanceTo(new THREE.Vector3(star.position.x, star.position.y, star.position.z))
          }));
          
          lodSystemRef.current.updateStarLODs(lodStars);
        }
        
        // Update galaxies
        if (window.astronomicalData?.galaxies?.optimized) {
          const visibleGalaxies = window.astronomicalData.galaxies.optimized.getVisibleGalaxies(
            camera.position,
            viewDistance * 100, // Galaxies visible at greater distances
            { maxMagnitude: 25 }
          );
          
          // Convert to LOD system format
          const lodGalaxies = visibleGalaxies.map(galaxy => ({
            position: new THREE.Vector3(galaxy.position.x, galaxy.position.y, galaxy.position.z),
            data: galaxy,
            renderDistance: camera.position.distanceTo(new THREE.Vector3(galaxy.position.x, galaxy.position.y, galaxy.position.z))
          }));
          
          lodSystemRef.current.updateGalaxyLODs(lodGalaxies);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", handleResize);

      if (velocityInterval) {
        clearInterval(velocityInterval);
      }
      if (keydownHandler) {
        document.removeEventListener("keydown", keydownHandler);
      }
      if (keyupHandler) {
        document.removeEventListener("keyup", keyupHandler);
      }

      if (lodSystemRef.current) {
        lodSystemRef.current.dispose();
      }

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [timeSpeed, isMobile, dataLoaded]);

  // Get scale label
  const getScaleLabel = () => {
    switch (currentScale) {
      case "planet":
        return "🌍 Planetary Scale";
      case "solar":
        return "☀️ Solar System";
      case "stellar":
        return "⭐ Stellar Neighborhood";
      case "local":
        return "✨ Local Stars";
      case "galaxy":
        return "🌌 Galactic View";
      case "universe":
        return "🌠 Universe Scale";
      default:
        return "🚀 Space";
    }
  };

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden">
      {!dataLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <h2 className="text-2xl mb-4">Loading NASA Astronomical Data...</h2>
            <div className="w-64 h-4 bg-gray-700 rounded-full mx-auto">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="mt-4 text-gray-400">
              Preparing {objectCount.total.toLocaleString()} astronomical objects
            </p>
          </div>
        </div>
      ) : (
        <>
          <div ref={mountRef} className="w-full h-full" />

          {/* UI Overlay */}
          {isMobile ? (
            <>
              {/* Mobile UI */}
              <div className="absolute top-2 left-2 bg-black/50 backdrop-blur px-2 py-1 rounded text-white text-xs">
                <div>{getScaleLabel()}</div>
                <div className="text-gray-400">
                  Objects: {objectCount.visible.toLocaleString()} / {objectCount.total.toLocaleString()}
                </div>
                <div className="text-gray-400">
                  Tap: Forward • Drag: Look • Pinch: Move
                </div>
              </div>

              <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs">⏱️</span>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={timeSpeed}
                    onChange={(e) => setTimeSpeed(parseFloat(e.target.value))}
                    className="flex-1 h-1"
                  />
                  <span className="text-white text-xs font-mono">{timeSpeed}x</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Desktop UI */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-2 rounded-lg text-white">
                <div className="text-sm font-bold mb-1">{getScaleLabel()}</div>
                <div className="text-xs text-gray-300 mb-2">
                  Rendering: {objectCount.visible.toLocaleString()} / {objectCount.total.toLocaleString()} objects
                </div>
                <div className="text-xs space-y-1 text-gray-300">
                  <div>Click to capture mouse</div>
                  <div>WASD + Mouse to fly</div>
                  <div>Space/Shift: Up/Down</div>
                  <div>Scroll: Zoom</div>
                  <div>ESC: Release mouse</div>
                </div>
              </div>

              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-2 rounded-lg text-white">
                <div className="text-xs space-y-1">
                  <div className="font-bold">NASA Data Loaded:</div>
                  <div>✓ {window.astronomicalData?.stars?.total || 0} stars</div>
                  <div>✓ {window.astronomicalData?.galaxies?.total || 0} galaxies</div>
                  <div>✓ {window.astronomicalData?.nebulae?.length || 0} nebulae</div>
                  <div>✓ Solar system objects</div>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs">Time</span>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={timeSpeed}
                    onChange={(e) => setTimeSpeed(parseFloat(e.target.value))}
                    className="w-32 h-1"
                  />
                  <span className="text-white text-xs font-mono">{timeSpeed}x</span>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default UniverseSimulationV2;