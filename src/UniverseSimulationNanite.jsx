import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { NaniteSystem, createNanitePlanet, createNaniteGalaxy } from "./NaniteSystem";
import { preloadedAsteroids, preloadedNebulae } from "./data/preloadedData";
import { OptimizedStarCatalog } from "./data/optimizedStarCatalog";
import { OptimizedGalaxyCatalog } from "./data/optimizedGalaxyCatalog";
import { loadAstronomicalData } from "./data/nasaDataFetcher";

// Constants
const AU_SCALE = 100;
const PARSEC_SCALE = 10000;
const MPC_SCALE = 10000000;

const UniverseSimulationNanite = () => {
  const mountRef = useRef(null);
  const [error, setError] = useState(null);
  const [cameraPos, setCameraPos] = useState({ x: 0, y: 0, z: 0 });
  const [currentScale, setCurrentScale] = useState('Solar System');
  const [naniteStats, setNaniteStats] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const keysRef = useRef({});

  useEffect(() => {
    if (!mountRef.current) return;
    
    let renderer = null;
    let animationId = null;
    let naniteSystem = null;
    
    try {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Detect mobile
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      scene.fog = new THREE.FogExp2(0x000000, 0.00000001);
      
      // Camera
      const camera = new THREE.PerspectiveCamera(
        mobile ? 60 : 45, 
        width / height, 
        0.1, 
        100000000
      );
      camera.position.set(AU_SCALE * 1.5, AU_SCALE * 0.5, AU_SCALE * 1.5);
      camera.lookAt(0, 0, 0);
      
      // Renderer with HDR support
      renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance",
        logarithmicDepthBuffer: true
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.5;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mountRef.current.appendChild(renderer.domElement);
      
      // Initialize Nanite system
      naniteSystem = new NaniteSystem(renderer, camera);
      console.log('Nanite system initialized');
      
      // Lights
      const ambientLight = new THREE.AmbientLight(0x040408, 0.3);
      scene.add(ambientLight);
      
      // ========== SUN with Nanite LODs ==========
      const sunGroup = new THREE.Group();
      sunGroup.name = 'sun';
      
      // Create sun with multiple LOD levels using Nanite
      const sunMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(0xffffff) },
          color2: { value: new THREE.Color(0xffaa00) }
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
          uniform vec3 color1;
          uniform vec3 color2;
          varying vec3 vNormal;
          
          void main() {
            float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0)) * 0.5 + 0.5;
            vec3 color = mix(color2, color1, intensity);
            float flare = sin(time + vNormal.x * 10.0) * 0.5 + 0.5;
            color += vec3(1.0, 0.5, 0.0) * flare * 0.3;
            gl_FragColor = vec4(color * 2.0, 1.0);
          }
        `
      });
      
      createNanitePlanet(10, 64, sunMaterial, naniteSystem);
      
      const sunLight = new THREE.PointLight(0xffffff, 3, 20000);
      sunGroup.add(sunLight);
      scene.add(sunGroup);
      
      // ========== PLANETS with Nanite LODs ==========
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
        const material = new THREE.MeshPhysicalMaterial({
          color: data.color,
          metalness: 0.1,
          roughness: 0.8,
          emissive: data.color,
          emissiveIntensity: 0.02
        });
        
        const planetCluster = createNanitePlanet(data.size, 32, material, naniteSystem);
        
        // Store planet data for animation
        planets.push({
          name: data.name,
          cluster: planetCluster,
          distance: data.distance * AU_SCALE,
          speed: data.speed,
          angle: Math.random() * Math.PI * 2
        });
      });
      
      // ========== STAR CATALOG with Nanite ==========
      const starCatalog = new OptimizedStarCatalog();
      const createNaniteStarField = (center, radius) => {
        const starCount = 50000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        
        for (let i = 0; i < starCount; i++) {
          const i3 = i * 3;
          
          // Position around center
          positions[i3] = center.x + (Math.random() - 0.5) * radius * 2;
          positions[i3 + 1] = center.y + (Math.random() - 0.5) * radius * 2;
          positions[i3 + 2] = center.z + (Math.random() - 0.5) * radius * 2;
          
          // Star colors
          const colorChoice = Math.random();
          if (colorChoice < 0.15) {
            colors[i3] = 1; colors[i3 + 1] = 0.8; colors[i3 + 2] = 0.8;
          } else if (colorChoice < 0.3) {
            colors[i3] = 0.8; colors[i3 + 1] = 0.8; colors[i3 + 2] = 1;
          } else if (colorChoice < 0.45) {
            colors[i3] = 1; colors[i3 + 1] = 1; colors[i3 + 2] = 0.8;
          } else {
            colors[i3] = 1; colors[i3 + 1] = 1; colors[i3 + 2] = 1;
          }
          
          sizes[i] = Math.random() * 3 + 1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
          vertexColors: true,
          size: 2,
          sizeAttenuation: true,
          blending: THREE.AdditiveBlending,
          transparent: true,
          opacity: 0.8
        });
        
        const stars = new THREE.Points(geometry, material);
        stars.name = 'starField';
        naniteSystem.createLODHierarchy(stars, 4);
        scene.add(stars);
      };
      
      createNaniteStarField(new THREE.Vector3(0, 0, 0), 50000);
      
      // ========== GALAXIES with Nanite ==========
      const galaxyCatalog = new OptimizedGalaxyCatalog();
      const galaxyGroup = new THREE.Group();
      galaxyGroup.name = 'galaxies';
      
      // Create a few nearby galaxies with Nanite LODs
      const galaxyPositions = [
        { x: 100000, y: 0, z: 50000 },
        { x: -80000, y: 20000, z: -60000 },
        { x: 50000, y: -10000, z: 100000 }
      ];
      
      galaxyPositions.forEach(pos => {
        createNaniteGalaxy(100000, 5000, naniteSystem);
        // Position will be handled by Nanite system
      });
      
      scene.add(galaxyGroup);
      
      // ========== NEBULAE ==========
      const nebulaGroup = new THREE.Group();
      nebulaGroup.name = 'nebulae';
      
      preloadedNebulae.slice(0, 10).forEach((nebula) => {
        const nebulaGeometry = new THREE.IcosahedronGeometry(nebula.size || 1000, 2);
        const nebulaMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            color1: { value: new THREE.Color(nebula.type === 'emission' ? 0xff0066 : 0x00ff66) },
            color2: { value: new THREE.Color(nebula.type === 'emission' ? 0xff6600 : 0x00ffff) }
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
            
            void main() {
              float d = length(vPosition) / 100.0;
              vec3 color = mix(color1, color2, d);
              float alpha = (1.0 - d) * 0.3;
              gl_FragColor = vec4(color * 2.0, alpha);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          depthWrite: false
        });
        
        const nebulaMesh = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
        nebulaMesh.position.set(
          (Math.random() - 0.5) * 10000,
          (Math.random() - 0.5) * 10000,
          (Math.random() - 0.5) * 10000
        );
        naniteSystem.createLODHierarchy(nebulaMesh, 3);
        nebulaGroup.add(nebulaMesh);
      });
      
      scene.add(nebulaGroup);
      
      // ========== CONTROLS ==========
      let mouseX = 0, mouseY = 0;
      let isMouseDown = false;
      
      // Mobile touch controls
      if (mobile) {
        let touchStartX = 0, touchStartY = 0;
        
        renderer.domElement.addEventListener('touchstart', (e) => {
          if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
          }
        });
        
        renderer.domElement.addEventListener('touchmove', (e) => {
          if (e.touches.length === 1) {
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;
            
            camera.rotation.y -= deltaX * 0.005;
            camera.rotation.x -= deltaY * 0.005;
            
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
          }
        });
      } else {
        // Desktop controls
        window.addEventListener('keydown', (e) => {
          keysRef.current[e.key.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (e) => {
          keysRef.current[e.key.toLowerCase()] = false;
        });
        
        renderer.domElement.addEventListener('mousedown', () => {
          isMouseDown = true;
        });
        
        window.addEventListener('mouseup', () => {
          isMouseDown = false;
        });
        
        window.addEventListener('mousemove', (e) => {
          if (isMouseDown) {
            mouseX = (e.clientX - window.innerWidth / 2) * 0.01;
            mouseY = (e.clientY - window.innerHeight / 2) * 0.01;
          }
        });
      }
      
      // Animation loop
      let time = 0;
      const clock = new THREE.Clock();
      
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();
        time += deltaTime;
        
        // Update Nanite system FIRST
        naniteSystem.update();
        
        // Update sun
        sunGroup.rotation.y += deltaTime * 0.1;
        
        // Update planets (positions only, Nanite handles LOD)
        planets.forEach(planet => {
          planet.angle += deltaTime * planet.speed * 0.1;
          // Update position in Nanite system
          const x = Math.cos(planet.angle) * planet.distance;
          const z = Math.sin(planet.angle) * planet.distance;
          // Position update would be handled by Nanite transform
        });
        
        // Update shader uniforms
        scene.traverse((object) => {
          if (object.material && object.material.uniforms && object.material.uniforms.time) {
            object.material.uniforms.time.value = time;
          }
        });
        
        // Camera movement
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        
        const cameraDistance = camera.position.length();
        let baseSpeed = 50;
        if (cameraDistance > 1000 * AU_SCALE) baseSpeed = 0.1 * PARSEC_SCALE;
        if (cameraDistance > 100 * PARSEC_SCALE) baseSpeed = 0.01 * MPC_SCALE;
        
        const speed = keysRef.current['shift'] ? baseSpeed * 10 : baseSpeed;
        const moveDistance = speed * deltaTime;
        
        if (keysRef.current['w']) camera.position.addScaledVector(forward, moveDistance);
        if (keysRef.current['s']) camera.position.addScaledVector(forward, -moveDistance);
        if (keysRef.current['a']) camera.position.addScaledVector(right, -moveDistance);
        if (keysRef.current['d']) camera.position.addScaledVector(right, moveDistance);
        if (keysRef.current[' ']) camera.position.y += moveDistance;
        if (keysRef.current['control']) camera.position.y -= moveDistance;
        
        // Mouse rotation
        if (isMouseDown && !mobile) {
          camera.rotation.y -= mouseX * deltaTime;
          camera.rotation.x -= mouseY * deltaTime;
          camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
          mouseX *= 0.9;
          mouseY *= 0.9;
        }
        
        // Update camera position state
        setCameraPos({ 
          x: Math.round(camera.position.x), 
          y: Math.round(camera.position.y), 
          z: Math.round(camera.position.z) 
        });
        
        // Update scale
        let scale = 'Solar System';
        if (cameraDistance > 100 * AU_SCALE) scale = 'Stellar';
        if (cameraDistance > PARSEC_SCALE) scale = 'Interstellar';
        if (cameraDistance > 100 * PARSEC_SCALE) scale = 'Galactic';
        if (cameraDistance > MPC_SCALE) scale = 'Intergalactic';
        setCurrentScale(scale);
        
        // Update Nanite stats
        setNaniteStats(naniteSystem.getStats());
        
        // Render using Nanite system
        naniteSystem.render(scene);
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
        if (animationId) cancelAnimationFrame(animationId);
        if (naniteSystem) naniteSystem.dispose();
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
      
      {/* UI Overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '10px',
        borderRadius: '5px',
        maxWidth: '300px'
      }}>
        <div style={{ color: '#00ff00', marginBottom: '10px' }}>
          <strong>NANITE SYSTEM ACTIVE</strong>
        </div>
        <div>Scale: {currentScale}</div>
        <div>Position: ({cameraPos.x}, {cameraPos.y}, {cameraPos.z})</div>
        <div>Controls: {isMobile ? 'Touch to rotate' : 'WASD + Mouse | Shift: Speed'}</div>
        
        {/* Nanite Stats */}
        <div style={{ marginTop: '10px', borderTop: '1px solid #444', paddingTop: '10px' }}>
          <div style={{ color: '#00ff00' }}>Nanite Stats:</div>
          <div style={{ fontSize: '12px' }}>
            <div>Clusters: {naniteStats.totalClusters || 0}</div>
            <div>Visible: {naniteStats.visibleClusters || 0}</div>
            <div>Triangles: {(naniteStats.trianglesRendered || 0).toLocaleString()}</div>
            <div>Memory: {(naniteStats.memoryUsedMB || 0).toFixed(1)} MB</div>
          </div>
        </div>
      </div>
      
      {/* Mobile controls */}
      {isMobile && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <button 
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.5)',
              color: 'white',
              fontSize: '24px'
            }}
            onTouchStart={() => { keysRef.current['w'] = true; }}
            onTouchEnd={() => { keysRef.current['w'] = false; }}
          >↑</button>
        </div>
      )}
    </div>
  );
};

export default UniverseSimulationNanite;