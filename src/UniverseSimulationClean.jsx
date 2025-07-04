import React, { useRef, useEffect } from "react";
import * as THREE from "three";

const UniverseSimulationClean = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000000);
    camera.position.set(0, 50, 300);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x0a0a2a, 0.3);
    scene.add(ambientLight);

    // ========== SUN ==========
    const sunGroup = new THREE.Group();
    
    // Sun sphere
    const sunGeometry = new THREE.IcosahedronGeometry(20, 5);
    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
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
          float n = noise(position * 0.3) * 2.0;
          pos += normal * n;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vec3 sunColor = vec3(1.0, 0.9, 0.6);
          float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0)) * 0.5 + 0.5;
          
          vec3 color = sunColor * intensity * 2.0;
          color += vec3(1.0, 0.5, 0.0) * pow(intensity, 3.0);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sunGroup.add(sun);

    // Sun glow
    const glowGeometry = new THREE.SphereGeometry(35, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    sunGroup.add(glow);

    scene.add(sunGroup);

    // Sun light
    const sunLight = new THREE.PointLight(0xffffff, 2, 3000);
    sun.add(sunLight);

    // ========== PLANETS ==========
    const planets = [];
    const planetData = [
      { distance: 60, size: 4, color: 0x8c7853, speed: 4.15 },
      { distance: 90, size: 9, color: 0xffc649, speed: 1.62 },
      { distance: 120, size: 10, color: 0x2233ff, speed: 1 },
      { distance: 180, size: 5, color: 0xcd5c5c, speed: 0.53 },
      { distance: 400, size: 40, color: 0xdaa520, speed: 0.084 },
      { distance: 700, size: 35, color: 0xf4a460, speed: 0.034 },
      { distance: 1200, size: 20, color: 0x4fd1c5, speed: 0.012 },
      { distance: 1600, size: 19, color: 0x4169e1, speed: 0.006 }
    ];

    planetData.forEach((data, index) => {
      const geometry = new THREE.SphereGeometry(data.size, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: 0.1
      });
      const planet = new THREE.Mesh(geometry, material);
      planet.userData = {
        distance: data.distance,
        speed: data.speed,
        angle: Math.random() * Math.PI * 2
      };
      scene.add(planet);
      planets.push(planet);
    });

    // ========== STARS ==========
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 100000;
    const positions = new Float32Array(starsCount * 3);
    const colors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
      const radius = 500 + Math.random() * 10000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);

      const color = new THREE.Color();
      const colorChoice = Math.random();
      if (colorChoice < 0.15) {
        color.setHex(0x9bb0ff); // Blue
      } else if (colorChoice < 0.40) {
        color.setHex(0xffffff); // White
      } else if (colorChoice < 0.70) {
        color.setHex(0xfff4ea); // Yellow
      } else {
        color.setHex(0xffcc6f); // Red
      }
      
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      blending: THREE.AdditiveBlending
    });

    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // ========== GALAXIES ==========
    for (let i = 0; i < 50; i++) {
      const galaxyGroup = new THREE.Group();
      
      const size = 200 + Math.random() * 300;
      const distance = 20000 + Math.random() * 60000;
      
      // Galaxy core
      const coreGeometry = new THREE.SphereGeometry(size * 0.1, 16, 16);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffaa,
        transparent: true,
        opacity: 0.8
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      galaxyGroup.add(core);
      
      // Galaxy disk
      const diskGeometry = new THREE.PlaneGeometry(size, size);
      const diskMaterial = new THREE.MeshBasicMaterial({
        color: 0xaaccff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const disk = new THREE.Mesh(diskGeometry, diskMaterial);
      galaxyGroup.add(disk);
      
      // Position galaxy
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      galaxyGroup.position.x = distance * Math.sin(phi) * Math.cos(theta);
      galaxyGroup.position.y = distance * Math.sin(phi) * Math.sin(theta);
      galaxyGroup.position.z = distance * Math.cos(phi);
      
      galaxyGroup.rotation.x = Math.random() * Math.PI;
      galaxyGroup.rotation.y = Math.random() * Math.PI;
      galaxyGroup.rotation.z = Math.random() * Math.PI;
      
      scene.add(galaxyGroup);
    }

    // ========== NEBULA ==========
    const nebulaGeometry = new THREE.IcosahedronGeometry(1000, 2);
    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: {
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
        uniform float time;
        varying vec3 vPosition;
        
        void main() {
          float d = length(vPosition) / 1000.0;
          vec3 color1 = vec3(1.0, 0.3, 0.3);
          vec3 color2 = vec3(0.3, 0.3, 1.0);
          vec3 color = mix(color1, color2, d + sin(time) * 0.2);
          
          float alpha = 1.0 - d;
          alpha *= 0.3;
          
          gl_FragColor = vec4(color * 2.0, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
    const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    nebula.position.set(3000, 1000, -2000);
    scene.add(nebula);

    // Camera controls
    const cameraState = {
      position: camera.position.clone(),
      velocity: new THREE.Vector3(),
      lookAt: new THREE.Vector3(0, 0, 0)
    };

    const keys = {};
    let isPointerLocked = false;

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

      // Update sun
      sun.material.uniforms.time.value = time;
      sunGroup.rotation.y += 0.001;

      // Update planets
      planets.forEach(planet => {
        planet.userData.angle += planet.userData.speed * 0.01;
        planet.position.x = Math.cos(planet.userData.angle) * planet.userData.distance;
        planet.position.z = Math.sin(planet.userData.angle) * planet.userData.distance;
        planet.rotation.y += 0.01;
      });

      // Update nebula
      nebula.material.uniforms.time.value = time;

      // Camera movement
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      
      const speed = 5;
      if (keys['w']) camera.position.addScaledVector(forward, speed);
      if (keys['s']) camera.position.addScaledVector(forward, -speed);
      if (keys['a']) camera.position.addScaledVector(right, -speed);
      if (keys['d']) camera.position.addScaledVector(right, speed);
      if (keys[' ']) camera.position.y += speed;
      if (keys['shift']) camera.position.y -= speed;

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

export default UniverseSimulationClean;