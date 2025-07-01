import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const UniverseSimulation = () => {
  // Version 2.7 - Debugging material errors
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const frameRef = useRef(0);

  const [timeSpeed, setTimeSpeed] = useState(1);
  const [currentScale, setCurrentScale] = useState("planet");
  const [isMobile] = useState(
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  );

  // Camera state with larger range
  const cameraState = useRef({
    position: new THREE.Vector3(0, 50, 300),
    lookAt: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
  });

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene with massive render distance
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000011, 0.00003);
    sceneRef.current = scene;

    // Camera with extreme range
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1e12);
    camera.position.copy(cameraState.current.position);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

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

    // ========== SUN WITH DETAILS ==========
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

    // Sun glow
    const sunGlowGeometry = new THREE.SphereGeometry(30, 32, 32);
    const sunGlowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        viewVector: { value: new THREE.Vector3() },
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
        void main() {
          float intensity = pow(0.8 - dot(vNormal, vec3(0, 0, 1.0)), 3.0);
          gl_FragColor = vec4(1.0, 0.8, 0.3, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    sun.add(sunGlow);

    // Sun light
    const sunLight = new THREE.PointLight(0xffffff, 2, 1000);
    sun.add(sunLight);

    // ========== PLANETS WITH LOD ==========
    const planets = [];
    const planetData = [
      {
        name: "Mercury",
        radius: 3,
        distance: 50,
        color: 0x8b7355,
        speed: 1,
        detail: 2,
      },
      {
        name: "Venus",
        radius: 5,
        distance: 80,
        color: 0xffc649,
        speed: 0.8,
        detail: 3,
      },
      {
        name: "Earth",
        radius: 5,
        distance: 120,
        color: 0x4169e1,
        speed: 0.6,
        detail: 4,
      },
      {
        name: "Mars",
        radius: 4,
        distance: 170,
        color: 0xcd5c5c,
        speed: 0.5,
        detail: 3,
      },
      {
        name: "Jupiter",
        radius: 12,
        distance: 280,
        color: 0xffb366,
        speed: 0.3,
        detail: 3,
      },
      {
        name: "Saturn",
        radius: 10,
        distance: 400,
        color: 0xf4ca16,
        speed: 0.2,
        detail: 3,
      },
      {
        name: "Uranus",
        radius: 6,
        distance: 550,
        color: 0x4fd5d6,
        speed: 0.15,
        detail: 2,
      },
      {
        name: "Neptune",
        radius: 6,
        distance: 700,
        color: 0x4166f5,
        speed: 0.1,
        detail: 2,
      },
    ];

    planetData.forEach((data) => {
      const geometry = new THREE.IcosahedronGeometry(data.radius, data.detail);
      const material = new THREE.MeshPhongMaterial({
        color: data.color,
        shininess: 30,
        specular: 0x222222,
      });
      const planet = new THREE.Mesh(geometry, material);
      planet.userData = { ...data, angle: Math.random() * Math.PI * 2 };
      planets.push(planet);
      scene.add(planet);

      // Orbit line
      const curve = new THREE.EllipseCurve(
        0,
        0,
        data.distance,
        data.distance,
        0,
        2 * Math.PI
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

    // ========== ASTEROID BELT ==========
    const asteroidGeometry = new THREE.BufferGeometry();
    const asteroidCount = 500;
    const asteroidPositions = new Float32Array(asteroidCount * 3);

    for (let i = 0; i < asteroidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 200 + Math.random() * 50;
      const i3 = i * 3;
      asteroidPositions[i3] = Math.cos(angle) * radius;
      asteroidPositions[i3 + 1] = (Math.random() - 0.5) * 10;
      asteroidPositions[i3 + 2] = Math.sin(angle) * radius;
    }

    asteroidGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(asteroidPositions, 3)
    );
    const asteroidMaterial = new THREE.PointsMaterial({
      color: 0x666666,
      size: 2,
    });
    const asteroids = new THREE.Points(asteroidGeometry, asteroidMaterial);
    scene.add(asteroids);

    // ========== COMET ==========
    const cometGeometry = new THREE.SphereGeometry(2, 16, 16);
    const cometMaterial = new THREE.MeshBasicMaterial({
      color: 0x88aaff,
      emissive: 0x4488ff,
      emissiveIntensity: 1,
    });
    const comet = new THREE.Mesh(cometGeometry, cometMaterial);
    comet.userData = {
      angle: 0,
      radius: 350,
      speed: 2,
      verticalSpeed: 0.5,
    };
    scene.add(comet);

    // Comet tail
    const cometTailGeometry = new THREE.ConeGeometry(1, 20, 8);
    const cometTailMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    const cometTail = new THREE.Mesh(cometTailGeometry, cometTailMaterial);
    comet.add(cometTail);
    cometTail.rotation.z = Math.PI / 2;

    // ========== NEBULAE ==========
    const createNebula = (position, color1, color2, size) => {
      const particleCount = 5000;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.random() * size * (0.5 + 0.5 * Math.random());

        positions[i3] =
          r * Math.sin(phi) * Math.cos(theta) +
          (Math.random() - 0.5) * size * 0.5;
        positions[i3 + 1] =
          r * Math.sin(phi) * Math.sin(theta) +
          (Math.random() - 0.5) * size * 0.3;
        positions[i3 + 2] =
          r * Math.cos(phi) + (Math.random() - 0.5) * size * 0.5;

        const mixFactor = Math.random();
        const color = new THREE.Color().lerpColors(color1, color2, mixFactor);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        sizes[i] = Math.random() * 5 + 2;
      }

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
        },
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

      const nebula = new THREE.Points(geometry, material);
      nebula.position.copy(position);
      return nebula;
    };

    // ========== JWST-INSPIRED NEBULAE ==========
    const createJWSTNebula = (position, config) => {
      const group = new THREE.Group();

      // Layer 1: Dense core with volumetric clouds
      const coreGeometry = new THREE.BufferGeometry();
      const coreCount = 20000;
      const corePositions = new Float32Array(coreCount * 3);
      const coreColors = new Float32Array(coreCount * 3);
      const coreSizes = new Float32Array(coreCount);

      for (let i = 0; i < coreCount; i++) {
        const i3 = i * 3;

        // Create complex 3D structures like pillars
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.random() * config.size;

        // Add pillar-like structures
        const pillarNoise =
          Math.sin(theta * 3) * Math.cos(phi * 2) * config.size * 0.3;
        const turbulence = (Math.random() - 0.5) * config.size * 0.2;

        corePositions[i3] =
          r * Math.sin(phi) * Math.cos(theta) + pillarNoise + turbulence;
        corePositions[i3 + 1] =
          r * Math.sin(phi) * Math.sin(theta) + turbulence * 0.5;
        corePositions[i3 + 2] =
          r * Math.cos(phi) + pillarNoise * 0.7 + turbulence;

        // Multi-color gradients
        const zone = Math.random();
        let color;
        if (zone < 0.3) {
          color = new THREE.Color().lerpColors(
            config.colors[0],
            config.colors[1],
            Math.random()
          );
        } else if (zone < 0.6) {
          color = new THREE.Color().lerpColors(
            config.colors[1],
            config.colors[2],
            Math.random()
          );
        } else {
          color = new THREE.Color().lerpColors(
            config.colors[2],
            config.colors[3],
            Math.random()
          );
        }

        const brightness = 0.5 + Math.random() * 0.5;
        coreColors[i3] = color.r * brightness;
        coreColors[i3 + 1] = color.g * brightness;
        coreColors[i3 + 2] = color.b * brightness;

        coreSizes[i] = Math.random() * 8 + 2;
      }

      coreGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(corePositions, 3)
      );
      coreGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(coreColors, 3)
      );
      coreGeometry.setAttribute(
        "size",
        new THREE.BufferAttribute(coreSizes, 1)
      );

      const coreMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          scale: { value: 1.0 },
        },
        vertexShader: `
          attribute float size;
          varying vec3 vColor;
          uniform float time;
          uniform float scale;
          
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            
            // Pulsing and swirling motion
            float pulse = sin(time * 0.5 + position.x * 0.01 + position.y * 0.01) * 0.2 + 1.0;
            float swirl = sin(time * 0.3 + length(position.xy) * 0.005) * 0.1;
            
            gl_PointSize = size * pulse * scale * (500.0 / -mvPosition.z);
            vec3 pos = position;
            pos.xy += vec2(cos(swirl), sin(swirl)) * 5.0;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          
          void main() {
            float r = distance(gl_PointCoord, vec2(0.5));
            if (r > 0.5) discard;
            
            // Soft, glowing particles
            float intensity = 1.0 - (r * 2.0);
            intensity = pow(intensity, 1.5);
            
            // Add subtle color variations
            vec3 color = vColor;
            color += vec3(0.1, 0.05, 0.15) * (1.0 - intensity);
            
            gl_FragColor = vec4(color * intensity, intensity * 0.7);
          }
        `,
        blending: THREE.AdditiveBlending,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
      });

      const core = new THREE.Points(coreGeometry, coreMaterial);
      group.add(core);

      // Layer 2: Wispy outer regions
      const wispsGeometry = new THREE.BufferGeometry();
      const wispsCount = 15000;
      const wispsPositions = new Float32Array(wispsCount * 3);
      const wispsColors = new Float32Array(wispsCount * 3);
      const wispsSizes = new Float32Array(wispsCount);

      for (let i = 0; i < wispsCount; i++) {
        const i3 = i * 3;

        // Create flowing, wispy structures
        const angle = Math.random() * Math.PI * 2;
        const radius = config.size * (0.8 + Math.random() * 0.6);
        const height = (Math.random() - 0.5) * config.size;

        // Add flowing motion
        const flow = Math.sin(angle * 4) * config.size * 0.2;

        wispsPositions[i3] = Math.cos(angle) * radius + flow;
        wispsPositions[i3 + 1] =
          height + Math.sin(radius * 0.01) * config.size * 0.1;
        wispsPositions[i3 + 2] = Math.sin(angle) * radius + flow;

        // Ethereal colors for wisps
        const wispColor =
          config.colors[Math.floor(Math.random() * config.colors.length)];
        const fade = 1.0 - (radius - config.size * 0.8) / (config.size * 0.6);

        wispsColors[i3] = wispColor.r * fade * 0.6;
        wispsColors[i3 + 1] = wispColor.g * fade * 0.6;
        wispsColors[i3 + 2] = wispColor.b * fade * 0.8;

        wispsSizes[i] = Math.random() * 15 + 5;
      }

      wispsGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(wispsPositions, 3)
      );
      wispsGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(wispsColors, 3)
      );
      wispsGeometry.setAttribute(
        "size",
        new THREE.BufferAttribute(wispsSizes, 1)
      );

      const wispsMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
        },
        vertexShader: `
          attribute float size;
          varying vec3 vColor;
          uniform float time;
          
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            
            // Gentle floating motion
            vec3 pos = position;
            pos.y += sin(time * 0.2 + position.x * 0.01) * 2.0;
            pos.x += cos(time * 0.15 + position.z * 0.01) * 1.5;
            
            gl_PointSize = size * (800.0 / -mvPosition.z);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          
          void main() {
            float r = distance(gl_PointCoord, vec2(0.5));
            if (r > 0.5) discard;
            
            float intensity = 1.0 - (r * 2.0);
            intensity = pow(intensity, 2.5);
            
            gl_FragColor = vec4(vColor * intensity, intensity * 0.3);
          }
        `,
        blending: THREE.AdditiveBlending,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
      });

      const wisps = new THREE.Points(wispsGeometry, wispsMaterial);
      group.add(wisps);

      // Layer 3: Bright stars embedded in nebula
      const starsGeometry = new THREE.BufferGeometry();
      const starsCount = 200;
      const starsPositions = new Float32Array(starsCount * 3);
      const starsColors = new Float32Array(starsCount * 3);
      const starsSizes = new Float32Array(starsCount);

      for (let i = 0; i < starsCount; i++) {
        const i3 = i * 3;

        // Cluster stars in certain regions
        const cluster = Math.random() < 0.3;
        const spread = cluster ? config.size * 0.2 : config.size * 0.8;

        starsPositions[i3] = (Math.random() - 0.5) * spread;
        starsPositions[i3 + 1] = (Math.random() - 0.5) * spread;
        starsPositions[i3 + 2] = (Math.random() - 0.5) * spread;

        // Hot blue stars and cooler red stars
        const hot = Math.random() < 0.6;
        if (hot) {
          starsColors[i3] = 0.8;
          starsColors[i3 + 1] = 0.9;
          starsColors[i3 + 2] = 1.0;
        } else {
          starsColors[i3] = 1.0;
          starsColors[i3 + 1] = 0.7;
          starsColors[i3 + 2] = 0.4;
        }

        starsSizes[i] = cluster
          ? Math.random() * 30 + 20
          : Math.random() * 20 + 10;
      }

      starsGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(starsPositions, 3)
      );
      starsGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(starsColors, 3)
      );
      starsGeometry.setAttribute(
        "size",
        new THREE.BufferAttribute(starsSizes, 1)
      );

      const starsMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
        },
        vertexShader: `
          attribute float size;
          varying vec3 vColor;
          uniform float time;
          
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            
            // Twinkling effect
            float twinkle = sin(time * 3.0 + position.x * position.y) * 0.2 + 1.0;
            
            gl_PointSize = size * twinkle * (1000.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          
          void main() {
            float r = distance(gl_PointCoord, vec2(0.5));
            
            // Star spike effect
            float spike = 1.0 - abs(gl_PointCoord.x - 0.5) * 2.0;
            spike *= 1.0 - abs(gl_PointCoord.y - 0.5) * 2.0;
            spike = pow(spike, 3.0);
            
            // Circular core
            float core = 1.0 - smoothstep(0.0, 0.5, r);
            core = pow(core, 2.0);
            
            float intensity = max(core, spike * 0.5);
            
            vec3 color = vColor * (1.0 + spike);
            
            gl_FragColor = vec4(color * intensity, intensity);
          }
        `,
        blending: THREE.AdditiveBlending,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
      });

      const stars = new THREE.Points(starsGeometry, starsMaterial);
      group.add(stars);

      // Store materials for animation
      group.userData = {
        coreMaterial,
        wispsMaterial,
        starsMaterial,
        config,
      };

      group.position.copy(position);
      return group;
    };

    // Create JWST-style nebulae
    const jwstNebulae = [
      // Pillars of Creation style
      createJWSTNebula(new THREE.Vector3(500, 100, -300), {
        size: 250,
        colors: [
          new THREE.Color(0x8b4513), // Saddle Brown
          new THREE.Color(0xcd853f), // Peru
          new THREE.Color(0xffd700), // Gold
          new THREE.Color(0x4682b4), // Steel Blue
        ],
      }),
      // Carina Nebula style
      createJWSTNebula(new THREE.Vector3(-600, -100, 400), {
        size: 350,
        colors: [
          new THREE.Color(0xff1493), // Deep Pink
          new THREE.Color(0xff6347), // Tomato
          new THREE.Color(0xffd700), // Gold
          new THREE.Color(0x00ced1), // Dark Turquoise
        ],
      }),
      // Supernova remnant style
      createJWSTNebula(new THREE.Vector3(200, -200, 600), {
        size: 300,
        colors: [
          new THREE.Color(0x00bfff), // Deep Sky Blue
          new THREE.Color(0x32cd32), // Lime Green
          new THREE.Color(0xff69b4), // Hot Pink
          new THREE.Color(0x9370db), // Medium Purple
        ],
      }),
    ];

    jwstNebulae.forEach((nebula) => scene.add(nebula));

    // ========== LIGHTNING EFFECTS ==========
    const lightningBolts = [];
    const createLightning = () => {
      const points = [];
      const startPoint = new THREE.Vector3(
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 1000
      );
      const endPoint = new THREE.Vector3(
        startPoint.x + (Math.random() - 0.5) * 200,
        startPoint.y + (Math.random() - 0.5) * 200,
        startPoint.z + (Math.random() - 0.5) * 200
      );

      points.push(startPoint);

      const segments = 8;
      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const point = new THREE.Vector3().lerpVectors(startPoint, endPoint, t);
        point.x += (Math.random() - 0.5) * 20;
        point.y += (Math.random() - 0.5) * 20;
        point.z += (Math.random() - 0.5) * 20;
        points.push(point);
      }
      points.push(endPoint);

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(0x88ccff),
        linewidth: 2,
        transparent: true,
        opacity: 0.8,
      });

      const lightning = new THREE.Line(geometry, material);
      lightning.userData.lifetime = 0;

      // Add glow effect to lightning
      const glowGeometry = geometry.clone();
      const glowMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(0xffffff),
        linewidth: 3,
        transparent: true,
        opacity: 0.3,
      });
      const glowLine = new THREE.Line(glowGeometry, glowMaterial);
      lightning.add(glowLine);

      return lightning;
    };

    // ========== STARS WITH VARIETY ==========
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(50000 * 3);
    const starColors = new Float32Array(50000 * 3);
    const starSizes = new Float32Array(50000);

    for (let i = 0; i < 50000; i++) {
      const i3 = i * 3;
      const radius = 500 + Math.random() * 10000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = radius * Math.cos(phi);

      const starType = Math.random();
      if (starType > 0.9) {
        starColors[i3] = 0.7;
        starColors[i3 + 1] = 0.8;
        starColors[i3 + 2] = 1.0;
      } else if (starType > 0.8) {
        starColors[i3] = 1.0;
        starColors[i3 + 1] = 0.9;
        starColors[i3 + 2] = 0.7;
      } else if (starType > 0.7) {
        starColors[i3] = 1.0;
        starColors[i3 + 1] = 0.6;
        starColors[i3 + 2] = 0.4;
      } else {
        starColors[i3] = 1.0;
        starColors[i3 + 1] = 1.0;
        starColors[i3 + 2] = 1.0;
      }

      starSizes[i] = Math.random() * 3 + 1;
    }

    starsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3)
    );
    starsGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(starColors, 3)
    );
    starsGeometry.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));

    const starsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        scale: { value: 1.0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float scale;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          float intensity = 1.0 - (r * 2.0);
          intensity = pow(intensity, 3.0);
          gl_FragColor = vec4(vColor * intensity, intensity);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // ========== DISTANT STARS (MILKY WAY BAND) ==========
    const milkyWayGeometry = new THREE.BufferGeometry();
    const milkyWayPositions = new Float32Array(100000 * 3);
    const milkyWayColors = new Float32Array(100000 * 3);

    for (let i = 0; i < 100000; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = 10000 + Math.random() * 50000;
      const y = (Math.random() - 0.5) * 2000;

      milkyWayPositions[i3] = Math.cos(angle) * radius;
      milkyWayPositions[i3 + 1] = y;
      milkyWayPositions[i3 + 2] = Math.sin(angle) * radius;

      const brightness = Math.random() * 0.5 + 0.5;
      milkyWayColors[i3] = brightness;
      milkyWayColors[i3 + 1] = brightness * 0.9;
      milkyWayColors[i3 + 2] = brightness * 0.8;
    }

    milkyWayGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(milkyWayPositions, 3)
    );
    milkyWayGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(milkyWayColors, 3)
    );

    const milkyWayMaterial = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const milkyWay = new THREE.Points(milkyWayGeometry, milkyWayMaterial);
    scene.add(milkyWay);

    // ========== DISTANT GALAXIES ==========
    const galaxies = [];

    // Random background galaxies
    for (let i = 0; i < 100; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 1000000,
        (Math.random() - 0.5) * 1000000,
        (Math.random() - 0.5) * 1000000
      );

      const galaxyGeometry = new THREE.BufferGeometry();
      const galaxyPositions = new Float32Array(1000 * 3);
      const galaxyColors = new Float32Array(1000 * 3);

      for (let j = 0; j < 1000; j++) {
        const armAngle = (j % 3) * ((Math.PI * 2) / 3);
        const radius = Math.random() * 1000;
        const spiralAngle = armAngle + radius * 0.01;

        const j3 = j * 3;
        galaxyPositions[j3] = Math.cos(spiralAngle) * radius;
        galaxyPositions[j3 + 1] = (Math.random() - 0.5) * radius * 0.1;
        galaxyPositions[j3 + 2] = Math.sin(spiralAngle) * radius;

        const brightness = 1 - (radius / 1000) * 0.5;
        galaxyColors[j3] = brightness * (0.5 + Math.random() * 0.5);
        galaxyColors[j3 + 1] = brightness * (0.5 + Math.random() * 0.5);
        galaxyColors[j3 + 2] = brightness * (0.5 + Math.random() * 0.5);
      }

      galaxyGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(galaxyPositions, 3)
      );
      galaxyGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(galaxyColors, 3)
      );

      const galaxyMaterial = new THREE.PointsMaterial({
        size: 5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: false,
      });

      const galaxy = new THREE.Points(galaxyGeometry, galaxyMaterial);
      galaxy.position.copy(pos);
      galaxy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      galaxies.push(galaxy);
      scene.add(galaxy);
    }

    // ========== REAL ASTRONOMICAL OBJECTS ==========
    // Known exoplanets
    const exoplanets = [
      { name: "Proxima Centauri b", distance: 4.24, color: 0xff6b6b },
      { name: "TRAPPIST-1 system", distance: 39.5, color: 0xff9f40 },
      { name: "Kepler-452b", distance: 1400, color: 0x4ecdc4 },
      { name: "HD 209458 b", distance: 159, color: 0xffe66d },
    ];

    exoplanets.forEach((exo) => {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(10, 16, 16),
        new THREE.MeshBasicMaterial({
          color: exo.color,
        })
      );
      marker.position.set(
        exo.distance * 100 * Math.cos(Math.random() * Math.PI * 2),
        (Math.random() - 0.5) * 1000,
        exo.distance * 100 * Math.sin(Math.random() * Math.PI * 2)
      );
      scene.add(marker);
    });

    // Known nebulae from NASA catalog
    const realNebulae = [
      {
        name: "Orion Nebula",
        pos: new THREE.Vector3(1344, 0, 0),
        color1: 0xff0080,
        color2: 0x0080ff,
        size: 200,
      },
      {
        name: "Eagle Nebula",
        pos: new THREE.Vector3(7000, 500, 1000),
        color1: 0xff6600,
        color2: 0xffff00,
        size: 300,
      },
      {
        name: "Crab Nebula",
        pos: new THREE.Vector3(6523, -200, 500),
        color1: 0x00ff80,
        color2: 0xff0080,
        size: 150,
      },
      {
        name: "Helix Nebula",
        pos: new THREE.Vector3(700, 100, -300),
        color1: 0x00ffff,
        color2: 0xff00ff,
        size: 180,
      },
      {
        name: "Rosette Nebula",
        pos: new THREE.Vector3(5200, -300, 800),
        color1: 0xff0066,
        color2: 0x6600ff,
        size: 250,
      },
    ];

    realNebulae.forEach((neb) => {
      const nebula = createNebula(
        neb.pos,
        new THREE.Color(neb.color1),
        new THREE.Color(neb.color2),
        neb.size
      );
      scene.add(nebula);
    });

    // Known galaxies
    const knownGalaxies = [
      {
        name: "Andromeda (M31)",
        pos: new THREE.Vector3(250000, 20000, 100000),
        size: 2000,
      },
      {
        name: "Triangulum (M33)",
        pos: new THREE.Vector3(300000, -50000, 150000),
        size: 1000,
      },
      {
        name: "Large Magellanic Cloud",
        pos: new THREE.Vector3(16000, -30000, -50000),
        size: 500,
      },
      {
        name: "Small Magellanic Cloud",
        pos: new THREE.Vector3(20000, -40000, -60000),
        size: 300,
      },
      {
        name: "Whirlpool (M51)",
        pos: new THREE.Vector3(2300000, 100000, 500000),
        size: 1500,
      },
      {
        name: "Sombrero (M104)",
        pos: new THREE.Vector3(2900000, -200000, 800000),
        size: 1200,
      },
    ];

    knownGalaxies.forEach((gal) => {
      const galaxyGroup = new THREE.Group();

      // Create more detailed galaxy structure
      const coreGeometry = new THREE.SphereGeometry(gal.size * 0.2, 16, 16);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffaa,
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      galaxyGroup.add(core);

      // Spiral arms
      const armGeometry = new THREE.BufferGeometry();
      const armPositions = new Float32Array(5000 * 3);
      const armColors = new Float32Array(5000 * 3);

      for (let i = 0; i < 5000; i++) {
        const armIndex = i % 4;
        const armAngle = (armIndex / 4) * Math.PI * 2;
        const radius = Math.random() * gal.size;
        const spiralAngle = armAngle + radius * 0.002;

        const i3 = i * 3;
        armPositions[i3] = Math.cos(spiralAngle) * radius;
        armPositions[i3 + 1] = (Math.random() - 0.5) * gal.size * 0.1;
        armPositions[i3 + 2] = Math.sin(spiralAngle) * radius;

        const brightness = 1 - (radius / gal.size) * 0.7;
        armColors[i3] = brightness * 0.8;
        armColors[i3 + 1] = brightness * 0.8;
        armColors[i3 + 2] = brightness;
      }

      armGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(armPositions, 3)
      );
      armGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(armColors, 3)
      );

      const armMaterial = new THREE.PointsMaterial({
        size: 10,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: false,
      });

      const arms = new THREE.Points(armGeometry, armMaterial);
      galaxyGroup.add(arms);

      galaxyGroup.position.copy(gal.pos);
      galaxyGroup.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        0
      );
      scene.add(galaxyGroup);
    });

    // Asteroid belt objects (named asteroids)
    const namedAsteroids = [
      { name: "Ceres", radius: 0.5, distance: 220 },
      { name: "Vesta", radius: 0.3, distance: 210 },
      { name: "Pallas", radius: 0.3, distance: 230 },
      { name: "Hygiea", radius: 0.2, distance: 240 },
    ];

    namedAsteroids.forEach((ast) => {
      const asteroid = new THREE.Mesh(
        new THREE.IcosahedronGeometry(ast.radius * 5, 1),
        new THREE.MeshPhongMaterial({ color: 0x888888, flatShading: true })
      );
      const angle = Math.random() * Math.PI * 2;
      asteroid.position.set(
        Math.cos(angle) * ast.distance,
        (Math.random() - 0.5) * 5,
        Math.sin(angle) * ast.distance
      );
      scene.add(asteroid);
    });

    // Kuiper Belt objects
    const kuiperBeltObjects = [
      { name: "Pluto", radius: 2, distance: 900, color: 0xaa8866 },
      { name: "Eris", radius: 1.8, distance: 1000, color: 0xcccccc },
      { name: "Makemake", radius: 1.5, distance: 950, color: 0xffaa88 },
      { name: "Haumea", radius: 1.3, distance: 980, color: 0xaaaaaa },
    ];

    kuiperBeltObjects.forEach((kbo) => {
      const obj = new THREE.Mesh(
        new THREE.SphereGeometry(kbo.radius, 16, 16),
        new THREE.MeshPhongMaterial({ color: kbo.color })
      );
      obj.userData = {
        name: kbo.name,
        angle: Math.random() * Math.PI * 2,
        distance: kbo.distance,
        speed: 0.05,
      };
      planets.push(obj);
      scene.add(obj);

      // Orbit
      const curve = new THREE.EllipseCurve(
        0,
        0,
        kbo.distance,
        kbo.distance,
        0,
        2 * Math.PI
      );
      const points = curve.getPoints(64);
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: 0x333333,
        opacity: 0.2,
        transparent: true,
      });
      const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      scene.add(orbit);
    });

    // Saturn's rings
    const saturnRingGeometry = new THREE.RingGeometry(15, 25, 64);
    const saturnRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd99,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const saturnRings = new THREE.Mesh(saturnRingGeometry, saturnRingMaterial);
    saturnRings.rotation.x = Math.PI / 2;
    planets[5].add(saturnRings); // Saturn is index 5

    // Jupiter's moons
    const jupiterMoons = [
      { name: "Io", radius: 0.5, distance: 15, color: 0xffff99 },
      { name: "Europa", radius: 0.4, distance: 20, color: 0xaaffff },
      { name: "Ganymede", radius: 0.6, distance: 25, color: 0xaa8855 },
      { name: "Callisto", radius: 0.5, distance: 30, color: 0x665544 },
    ];

    jupiterMoons.forEach((moon) => {
      const moonMesh = new THREE.Mesh(
        new THREE.SphereGeometry(moon.radius, 8, 8),
        new THREE.MeshPhongMaterial({ color: moon.color })
      );
      moonMesh.userData = {
        angle: Math.random() * Math.PI * 2,
        distance: moon.distance,
        speed: 5,
      };
      planets[4].add(moonMesh); // Jupiter is index 4
    });

    // Voyager 1 & 2 positions (approximate)
    const voyager1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    voyager1.position.set(15000, 1000, 5000);
    scene.add(voyager1);

    const voyager2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    voyager2.position.set(12000, -800, 4000);
    scene.add(voyager2);

    // Black hole at galactic center
    const blackHoleGeometry = new THREE.SphereGeometry(50, 32, 32);
    const blackHoleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
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
        varying vec3 vPosition;
        void main() {
          float dist = length(vPosition);
          float intensity = 1.0 - smoothstep(0.0, 50.0, dist);
          vec3 color = vec3(0.0);
          
          // Event horizon effect
          float swirl = sin(atan(vPosition.y, vPosition.x) * 5.0 + time * 2.0) * 0.5 + 0.5;
          color += vec3(0.5, 0.0, 1.0) * swirl * intensity;
          
          gl_FragColor = vec4(color, intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    const blackHole = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
    blackHole.position.set(0, 0, -50000);
    scene.add(blackHole);

    // Accretion disk
    const diskGeometry = new THREE.RingGeometry(100, 300, 64);
    const diskMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        void main() {
          float radius = length(vUv - 0.5) * 2.0;
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
          
          float spiral = sin(angle * 10.0 - radius * 20.0 + time * 5.0) * 0.5 + 0.5;
          vec3 color = mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 0.0), spiral);
          
          float intensity = 1.0 - smoothstep(0.3, 1.0, radius);
          
          gl_FragColor = vec4(color * intensity, intensity);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    const accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
    accretionDisk.rotation.x = Math.PI / 2;
    blackHole.add(accretionDisk);

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

      // Adjust star sizes based on distance
      starsMaterial.uniforms.scale.value = Math.min(5, distance / 1000);

      // Hide/show elements based on scale
      planets.forEach((planet) => {
        planet.visible = distance < 10000;
      });

      asteroids.visible = distance < 5000;
      comet.visible = distance < 5000;
      milkyWay.visible = distance > 1000;

      galaxies.forEach((galaxy) => {
        galaxy.visible = distance > 10000;
      });
    };

    // Store cleanup references
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

      // Desktop scroll handling - matches mobile pinch behavior
      renderer.domElement.addEventListener("wheel", (e) => {
        e.preventDefault();
        
        const direction = cameraState.current.lookAt
          .clone()
          .sub(cameraState.current.position)
          .normalize();
        
        const currentDist = cameraState.current.position.length();
        
        // Scale movement speed based on current distance (same as mobile pinch)
        const baseSpeed = currentDist < 100
          ? currentDist * 0.1
          : currentDist < 1000
          ? currentDist * 1
          : currentDist < 10000
          ? currentDist * 10
          : currentDist < 100000
          ? currentDist * 100
          : currentDist * 1000;
        
        // Normalize wheel delta and apply movement
        const wheelDirection = e.deltaY > 0 ? 1 : -1; // Scroll down = zoom out, scroll up = zoom in
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
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      time += 0.016 * timeSpeed;

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

      // Update comet
      comet.userData.angle += comet.userData.speed * 0.003 * timeSpeed;
      comet.position.x = Math.cos(comet.userData.angle) * comet.userData.radius;
      comet.position.z = Math.sin(comet.userData.angle) * comet.userData.radius;
      comet.position.y =
        Math.sin(comet.userData.angle * comet.userData.verticalSpeed) * 50;

      const cometToSun = new THREE.Vector3()
        .subVectors(sun.position, comet.position)
        .normalize();
      comet.lookAt(comet.position.clone().sub(cometToSun));

      // Update JWST nebulae
      jwstNebulae.forEach((nebula) => {
        if (nebula.userData) {
          nebula.userData.coreMaterial.uniforms.time.value = time;
          nebula.userData.wispsMaterial.uniforms.time.value = time;
          nebula.userData.starsMaterial.uniforms.time.value = time;

          // Adjust detail based on distance
          const dist = camera.position.distanceTo(nebula.position);
          const scale = Math.max(0.5, Math.min(2.0, 1000 / dist));
          nebula.userData.coreMaterial.uniforms.scale.value = scale;
        }
      });

      // Lightning effects
      if (Math.random() < 0.02) {
        const lightning = createLightning();
        lightningBolts.push(lightning);
        scene.add(lightning);
      }

      for (let i = lightningBolts.length - 1; i >= 0; i--) {
        const bolt = lightningBolts[i];
        bolt.userData.lifetime += 0.05;
        bolt.material.opacity = Math.max(0, 0.8 - bolt.userData.lifetime);

        if (bolt.userData.lifetime > 1) {
          scene.remove(bolt);
          lightningBolts.splice(i, 1);
        }
      }

      // Rotate all galaxies
      galaxies.forEach((galaxy) => {
        galaxy.rotation.y += 0.00001 * timeSpeed;
      });

      // Also rotate known galaxies
      knownGalaxies.forEach((gal, index) => {
        if (scene.children[index]) {
          scene.traverse((child) => {
            if (child.type === "Group" && child.position.equals(gal.pos)) {
              child.rotation.y += 0.00001 * timeSpeed;
            }
          });
        }
      });

      // Update Jupiter's moons
      if (planets[4] && planets[4].children) {
        planets[4].children.forEach((moon) => {
          if (moon.userData && moon.userData.distance) {
            moon.userData.angle += moon.userData.speed * 0.01 * timeSpeed;
            moon.position.x =
              Math.cos(moon.userData.angle) * moon.userData.distance;
            moon.position.z =
              Math.sin(moon.userData.angle) * moon.userData.distance;
          }
        });
      }

      // Update black hole
      if (blackHole) {
        blackHole.material.uniforms.time.value = time;
        blackHole.children.forEach((child) => {
          if (child.material && child.material.uniforms) {
            child.material.uniforms.time.value = time;
          }
        });
      }

      // Apply velocity with damping
      cameraState.current.position.add(cameraState.current.velocity);
      cameraState.current.lookAt.add(cameraState.current.velocity);
      cameraState.current.velocity.multiplyScalar(0.95);

      // Update camera
      camera.position.copy(cameraState.current.position);
      camera.lookAt(cameraState.current.lookAt);

      // Update scale
      updateScale();

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

      // Clean up desktop controls
      if (velocityInterval) {
        clearInterval(velocityInterval);
      }
      if (keydownHandler) {
        document.removeEventListener("keydown", keydownHandler);
      }
      if (keyupHandler) {
        document.removeEventListener("keyup", keyupHandler);
      }

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [timeSpeed, isMobile]);

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
      <div ref={mountRef} className="w-full h-full" />

      {/* Minimal UI */}
      {isMobile ? (
        <>
          {/* Mobile UI */}
          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur px-2 py-1 rounded text-white text-xs">
            <div>{getScaleLabel()}</div>
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
            <div className="text-xs space-y-1 text-gray-300">
              <div>Click to capture mouse</div>
              <div>WASD + Mouse to fly</div>
              <div>Space/Shift: Up/Down</div>
              <div>ESC: Release mouse</div>
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
    </div>
  );
};

export default UniverseSimulation;
