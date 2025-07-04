import React, { useRef, useEffect } from "react";
import * as THREE from "three";

const UniverseSimulationJWST = () => {
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

    // ========== JWST-STYLE NEBULA COMPLEX ==========
    const nebulaGroup = new THREE.Group();
    
    // Carina Nebula style volumetric clouds
    const createNebulaCloud = (position, scale, color1, color2, density) => {
      const cloudGroup = new THREE.Group();
      
      // Main nebula volume
      const geometry = new THREE.IcosahedronGeometry(1, 4);
      const material = new THREE.ShaderMaterial({
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
          
          // 3D Perlin noise
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
            
            // Complex noise pattern
            vec3 p = vPosition * 0.5 + time * 0.01;
            float noise1 = fbm(p);
            float noise2 = fbm(p * 2.0 + 100.0);
            float noise3 = fbm(p * 0.5 - 50.0);
            
            // Combine noises for complex structure
            float density = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
            density = pow(density, 2.0);
            
            // Edge softness based on normal
            float edge = 1.0 - pow(abs(dot(vNormal, viewDir)), 0.5);
            density *= edge;
            
            // Color mixing based on density and position
            vec3 color = mix(color1, color2, noise2);
            
            // Add bright emission lines (like in JWST images)
            float emission = pow(noise1, 3.0) * 2.0;
            color += vec3(emission * 0.5, emission * 0.3, emission);
            
            // Distance fade
            float fade = 1.0 / (1.0 + distToCamera * 0.0001);
            
            // Dark dust lanes
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
      
      const cloud = new THREE.Mesh(geometry, material);
      cloud.scale.set(scale.x, scale.y, scale.z);
      cloud.position.copy(position);
      cloudGroup.add(cloud);
      
      // Add multiple layers for depth
      for(let i = 0; i < 3; i++) {
        const layerMat = material.clone();
        layerMat.uniforms.time.value = i * 100;
        const layer = new THREE.Mesh(geometry, layerMat);
        layer.scale.set(scale.x * (1.2 + i * 0.3), scale.y * (1.2 + i * 0.3), scale.z * (1.2 + i * 0.3));
        layer.position.copy(position);
        layer.material.opacity = 0.3 - i * 0.1;
        cloudGroup.add(layer);
      }
      
      return cloudGroup;
    };
    
    // Create multiple nebula clouds like Pillars of Creation
    const nebula1 = createNebulaCloud(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(3000, 4000, 2000),
      0x0066ff, // Blue
      0xff6600, // Orange
      1.0
    );
    nebulaGroup.add(nebula1);
    
    const nebula2 = createNebulaCloud(
      new THREE.Vector3(-2000, 1000, -1000),
      new THREE.Vector3(2000, 3000, 1500),
      0xff0066, // Magenta
      0x00ffff, // Cyan
      0.8
    );
    nebulaGroup.add(nebula2);
    
    const nebula3 = createNebulaCloud(
      new THREE.Vector3(1500, -1500, 500),
      new THREE.Vector3(2500, 2000, 2000),
      0xffaa00, // Gold
      0xff00ff, // Purple
      0.7
    );
    nebulaGroup.add(nebula3);
    
    scene.add(nebulaGroup);

    // ========== JWST-STYLE STARS ==========
    // Diffraction spikes for bright stars
    const createDiffractionSpikes = (position, size, color) => {
      const spikeGroup = new THREE.Group();
      
      // 6 spikes like JWST
      const spikeAngles = [0, 60, 120, 180, 240, 300];
      
      spikeAngles.forEach(angle => {
        const spikeGeometry = new THREE.PlaneGeometry(size * 0.1, size * 10);
        const spikeMaterial = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide
        });
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        spike.rotation.z = (angle * Math.PI) / 180;
        spikeGroup.add(spike);
      });
      
      // Add central bright star
      const starGeometry = new THREE.SphereGeometry(size, 32, 32);
      const starMaterial = new THREE.MeshBasicMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 2
      });
      const star = new THREE.Mesh(starGeometry, starMaterial);
      spikeGroup.add(star);
      
      // Add glow
      const glowGeometry = new THREE.SphereGeometry(size * 3, 32, 32);
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(color) }
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
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(color, 1.0) * intensity;
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      spikeGroup.add(glow);
      
      spikeGroup.position.copy(position);
      return spikeGroup;
    };
    
    // Add bright stars with diffraction spikes
    for(let i = 0; i < 20; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 20000,
        (Math.random() - 0.5) * 20000,
        (Math.random() - 0.5) * 20000
      );
      const size = 10 + Math.random() * 30;
      const colors = [0xffffff, 0xffeeaa, 0xaaccff, 0xffaaaa];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const star = createDiffractionSpikes(position, size, color);
      scene.add(star);
    }
    
    // Background star field (smaller, numerous)
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 500000;
    const positions = new Float32Array(starsCount * 3);
    const colors = new Float32Array(starsCount * 3);
    const sizes = new Float32Array(starsCount);

    for (let i = 0; i < starsCount; i++) {
      const i3 = i * 3;
      
      // Distribute stars
      const radius = 10000 + Math.random() * 90000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // JWST captures stars in infrared - warmer colors
      const color = new THREE.Color();
      const colorType = Math.random();
      if (colorType < 0.3) {
        color.setHex(0xffffff); // White
      } else if (colorType < 0.6) {
        color.setHex(0xffeecc); // Warm white
      } else if (colorType < 0.8) {
        color.setHex(0xffddaa); // Orange-white
      } else {
        color.setHex(0xffccaa); // Red-white
      }
      
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      // Varied sizes
      sizes[i] = Math.random() * 2 + 0.5;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
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

    // ========== DISTANT GALAXIES (JWST Deep Field Style) ==========
    for(let i = 0; i < 200; i++) {
      const galaxyGroup = new THREE.Group();
      
      // Galaxy types
      const type = Math.random();
      
      if(type < 0.7) {
        // Spiral galaxy
        const spiralGeometry = new THREE.BufferGeometry();
        const spiralVertices = [];
        const spiralColors = [];
        
        // Create spiral arms
        const arms = 2 + Math.floor(Math.random() * 3);
        const points = 1000;
        
        for(let arm = 0; arm < arms; arm++) {
          const armOffset = (arm / arms) * Math.PI * 2;
          
          for(let j = 0; j < points; j++) {
            const t = j / points;
            const angle = t * Math.PI * 4 + armOffset;
            const radius = t * 200;
            const spread = Math.random() * 20;
            
            const x = Math.cos(angle) * (radius + spread);
            const y = (Math.random() - 0.5) * 10;
            const z = Math.sin(angle) * (radius + spread);
            
            spiralVertices.push(x, y, z);
            
            // Color gradient
            const brightness = 1 - t * 0.7;
            spiralColors.push(brightness, brightness * 0.9, brightness * 0.8);
          }
        }
        
        spiralGeometry.setAttribute('position', new THREE.Float32BufferAttribute(spiralVertices, 3));
        spiralGeometry.setAttribute('color', new THREE.Float32BufferAttribute(spiralColors, 3));
        
        const spiralMaterial = new THREE.PointsMaterial({
          size: 3,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          transparent: true,
          opacity: 0.8
        });
        
        const spiral = new THREE.Points(spiralGeometry, spiralMaterial);
        galaxyGroup.add(spiral);
        
        // Galaxy core
        const coreGeometry = new THREE.SphereGeometry(20, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffaa,
          transparent: true,
          opacity: 0.9
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        galaxyGroup.add(core);
        
      } else {
        // Elliptical galaxy
        const ellipticalGeometry = new THREE.SphereGeometry(100 + Math.random() * 100, 16, 16);
        const ellipticalMaterial = new THREE.ShaderMaterial({
          uniforms: {
            color: { value: new THREE.Color(0xffddaa) }
          },
          vertexShader: `
            varying vec3 vPosition;
            void main() {
              vPosition = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 color;
            varying vec3 vPosition;
            void main() {
              float d = length(vPosition) / 100.0;
              float intensity = 1.0 / (1.0 + d * d * 10.0);
              gl_FragColor = vec4(color * intensity * 2.0, intensity);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending
        });
        const elliptical = new THREE.Mesh(ellipticalGeometry, ellipticalMaterial);
        elliptical.scale.y = 0.6 + Math.random() * 0.4;
        galaxyGroup.add(elliptical);
      }
      
      // Position in deep field
      const distance = 50000 + Math.random() * 150000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      galaxyGroup.position.x = distance * Math.sin(phi) * Math.cos(theta);
      galaxyGroup.position.y = distance * Math.sin(phi) * Math.sin(theta);
      galaxyGroup.position.z = distance * Math.cos(phi);
      
      // Random orientation
      galaxyGroup.rotation.x = Math.random() * Math.PI;
      galaxyGroup.rotation.y = Math.random() * Math.PI;
      galaxyGroup.rotation.z = Math.random() * Math.PI;
      
      // Scale based on distance (redshift effect)
      const scale = 1 - (distance - 50000) / 150000 * 0.5;
      galaxyGroup.scale.setScalar(scale);
      
      scene.add(galaxyGroup);
    }

    // ========== COSMIC DUST LANES ==========
    const dustGeometry = new THREE.BufferGeometry();
    const dustCount = 100000;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    
    for(let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      
      // Dust concentrated near nebulae
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 5000;
      const height = (Math.random() - 0.5) * 2000;
      
      dustPositions[i3] = Math.cos(angle) * radius;
      dustPositions[i3 + 1] = height;
      dustPositions[i3 + 2] = Math.sin(angle) * radius;
      
      // Dark brown dust
      const darkness = Math.random() * 0.3;
      dustColors[i3] = darkness * 0.4;
      dustColors[i3 + 1] = darkness * 0.3;
      dustColors[i3 + 2] = darkness * 0.2;
    }
    
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    
    const dustMaterial = new THREE.PointsMaterial({
      size: 10,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.NormalBlending
    });
    
    const cosmicDust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(cosmicDust);

    // Lighting for volumetric effects
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

    // Animation loop
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.016;

      // Update nebula shaders
      nebulaGroup.children.forEach((cloud, index) => {
        cloud.children.forEach((mesh, i) => {
          if(mesh.material.uniforms) {
            mesh.material.uniforms.time.value = time + index * 0.5 + i * 0.1;
            mesh.material.uniforms.cameraPos.value = camera.position;
          }
        });
        cloud.rotation.y += 0.0001;
      });

      // Slowly rotate star field
      starField.rotation.y += 0.00002;

      // Update star shader
      starsMaterial.uniforms.time.value = time;

      // Dust movement
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

export default UniverseSimulationJWST;