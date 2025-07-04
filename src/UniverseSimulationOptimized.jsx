import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { preloadedAsteroids, preloadedNebulae } from "./data/preloadedData";

// Constants
const AU_SCALE = 100;
const PARSEC_SCALE = 10000;

const UniverseSimulationOptimized = () => {
  const mountRef = useRef(null);
  const [error, setError] = useState(null);
  const [cameraPos, setCameraPos] = useState({ x: 0, y: 0, z: 0 });
  const [currentScale, setCurrentScale] = useState('Solar System');

  useEffect(() => {
    if (!mountRef.current) return;
    
    let renderer = null;
    let animationId = null;
    let camera = null;
    let scene = null;
    let frustum = null;
    let cameraMatrix = null;
    
    try {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      
      // Camera
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100000);
      camera.position.set(AU_SCALE * 1.5, AU_SCALE * 0.5, AU_SCALE * 1.5);
      camera.lookAt(0, 0, 0);
      
      // Frustum for culling
      frustum = new THREE.Frustum();
      cameraMatrix = new THREE.Matrix4();
      
      // Renderer
      renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mountRef.current.appendChild(renderer.domElement);
      
      // Lights
      const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
      scene.add(ambientLight);
      
      // ========== SUN ==========
      const sunGroup = new THREE.Group();
      const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
      const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.5
      });
      const sun = new THREE.Mesh(sunGeometry, sunMaterial);
      sunGroup.add(sun);
      
      // Sun light
      const sunLight = new THREE.PointLight(0xffffff, 2, 5000);
      sun.add(sunLight);
      scene.add(sunGroup);
      
      // ========== PLANETS ==========
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
        const geometry = new THREE.SphereGeometry(data.size, 32, 32);
        const material = new THREE.MeshPhongMaterial({
          color: data.color,
          emissive: data.color,
          emissiveIntensity: 0.1
        });
        const planet = new THREE.Mesh(geometry, material);
        planet.userData = {
          distance: data.distance * AU_SCALE,
          speed: data.speed,
          angle: Math.random() * Math.PI * 2,
          name: data.name
        };
        scene.add(planet);
        planets.push(planet);
      });
      
      // ========== STARS (Only visible ones) ==========
      const starsGroup = new THREE.Group();
      const createVisibleStars = (cameraPos, viewDistance) => {
        // Clear existing stars
        while(starsGroup.children.length > 0) {
          starsGroup.remove(starsGroup.children[0]);
        }
        
        // Create stars in view
        const starsGeometry = new THREE.BufferGeometry();
        const starVertices = [];
        const starColors = [];
        
        for(let i = 0; i < 10000; i++) {
          const x = (Math.random() - 0.5) * viewDistance * 2 + cameraPos.x;
          const y = (Math.random() - 0.5) * viewDistance * 2 + cameraPos.y;
          const z = (Math.random() - 0.5) * viewDistance * 2 + cameraPos.z;
          
          starVertices.push(x, y, z);
          
          // Random star colors
          const color = new THREE.Color();
          const colorChoice = Math.random();
          if (colorChoice < 0.15) color.setHex(0xffcccc); // Red
          else if (colorChoice < 0.3) color.setHex(0xccccff); // Blue
          else if (colorChoice < 0.45) color.setHex(0xffffcc); // Yellow
          else color.setHex(0xffffff); // White
          
          starColors.push(color.r, color.g, color.b);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
        
        const starsMaterial = new THREE.PointsMaterial({
          size: 2,
          vertexColors: true,
          sizeAttenuation: false
        });
        
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        starsGroup.add(stars);
      };
      
      scene.add(starsGroup);
      createVisibleStars(camera.position, 10000);
      
      // ========== ASTEROIDS (Only nearby ones) ==========
      const asteroids = [];
      const maxAsteroids = 50; // Limit for performance
      preloadedAsteroids.slice(0, maxAsteroids).forEach((asteroid) => {
        const diameter = asteroid.phys_par?.diameter || 100;
        const geometry = new THREE.IcosahedronGeometry(diameter / 100, 0);
        const material = new THREE.MeshLambertMaterial({ 
          color: 0x888888
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.userData = {
          name: asteroid.name,
          angle: Math.random() * Math.PI * 2,
          a: (asteroid.orbit?.a || 2.5) * AU_SCALE,
          e: asteroid.orbit?.e || 0
        };
        
        const r = mesh.userData.a * (1 - mesh.userData.e);
        mesh.position.x = Math.cos(mesh.userData.angle) * r;
        mesh.position.z = Math.sin(mesh.userData.angle) * r;
        mesh.position.y = (Math.random() - 0.5) * 10;
        
        scene.add(mesh);
        asteroids.push(mesh);
      });
      
      // Camera controls
      const keys = {};
      let mouseX = 0, mouseY = 0;
      let isMouseDown = false;
      
      window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
      });
      
      window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
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
      
      // Animation loop
      let time = 0;
      let lastStarUpdate = 0;
      
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const deltaTime = 0.016;
        time += deltaTime;
        
        // Update frustum for culling
        cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(cameraMatrix);
        
        // Only render objects in view
        scene.traverse((object) => {
          if (object.isMesh || object.isPoints) {
            object.visible = frustum.intersectsObject(object);
          }
        });
        
        // Update sun rotation
        sunGroup.rotation.y += deltaTime * 0.1;
        
        // Update planets (only if visible)
        planets.forEach(planet => {
          if (planet.visible) {
            planet.userData.angle += (deltaTime * planet.userData.speed * 0.1);
            planet.position.x = Math.cos(planet.userData.angle) * planet.userData.distance;
            planet.position.z = Math.sin(planet.userData.angle) * planet.userData.distance;
            planet.rotation.y += 0.01;
          }
        });
        
        // Update asteroids (only if visible)
        asteroids.forEach(asteroid => {
          if (asteroid.visible) {
            asteroid.userData.angle += deltaTime * 0.05;
            const r = asteroid.userData.a * (1 - asteroid.userData.e * Math.cos(asteroid.userData.angle));
            asteroid.position.x = Math.cos(asteroid.userData.angle) * r;
            asteroid.position.z = Math.sin(asteroid.userData.angle) * r;
          }
        });
        
        // Camera movement
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        
        const speed = keys['shift'] ? 500 : 50;
        const moveDistance = speed * deltaTime;
        
        if (keys['w']) camera.position.addScaledVector(forward, moveDistance);
        if (keys['s']) camera.position.addScaledVector(forward, -moveDistance);
        if (keys['a']) camera.position.addScaledVector(right, -moveDistance);
        if (keys['d']) camera.position.addScaledVector(right, moveDistance);
        if (keys[' ']) camera.position.y += moveDistance;
        if (keys['control']) camera.position.y -= moveDistance;
        
        // Mouse rotation
        if (isMouseDown) {
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
        
        // Update stars periodically based on camera movement
        const cameraDist = camera.position.length();
        if (time - lastStarUpdate > 2) { // Update every 2 seconds
          createVisibleStars(camera.position, Math.max(10000, cameraDist * 2));
          lastStarUpdate = time;
        }
        
        // Update scale
        let scale = 'Solar System';
        if (cameraDist > 1000 * AU_SCALE) scale = 'Interstellar';
        if (cameraDist > 10000 * AU_SCALE) scale = 'Galaxy';
        setCurrentScale(scale);
        
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
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '10px',
        borderRadius: '5px'
      }}>
        <div>Scale: {currentScale}</div>
        <div>Position: ({cameraPos.x}, {cameraPos.y}, {cameraPos.z})</div>
        <div>Controls: WASD + Mouse | Space/Ctrl: Up/Down | Shift: Speed</div>
      </div>
    </div>
  );
};

export default UniverseSimulationOptimized;