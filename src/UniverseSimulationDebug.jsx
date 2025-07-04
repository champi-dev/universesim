import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const UniverseSimulationDebug = () => {
  const mountRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  const addLog = (message) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog('Component mounted');
    
    if (!mountRef.current) {
      addLog('ERROR: mountRef.current is null');
      return;
    }
    
    addLog('Starting simple universe...');
    
    let renderer = null;
    let animationId = null;
    
    try {
      const width = window.innerWidth;
      const height = window.innerHeight;
      addLog(`Window size: ${width}x${height}`);
      
      // Scene
      addLog('Creating scene...');
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000111);
      
      // Camera  
      addLog('Creating camera...');
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
      camera.position.set(0, 0, 500);
      
      // Renderer
      addLog('Creating renderer...');
      renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
      });
      renderer.setSize(width, height);
      
      addLog('Attaching to DOM...');
      mountRef.current.appendChild(renderer.domElement);
      
      // Add stars
      addLog('Creating stars...');
      const starsGeometry = new THREE.BufferGeometry();
      const starVertices = [];
      for(let i = 0; i < 5000; i++) {
        starVertices.push(
          (Math.random() - 0.5) * 2000,
          (Math.random() - 0.5) * 2000,
          (Math.random() - 0.5) * 2000
        );
      }
      starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
      const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2 });
      const stars = new THREE.Points(starsGeometry, starsMaterial);
      scene.add(stars);
      
      // Add a planet
      addLog('Creating planet...');
      const planetGeometry = new THREE.SphereGeometry(50, 32, 32);
      const planetMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x4444ff,
        wireframe: false
      });
      const planet = new THREE.Mesh(planetGeometry, planetMaterial);
      scene.add(planet);
      
      // Add sun
      addLog('Creating sun...');
      const sunGeometry = new THREE.SphereGeometry(100, 32, 32);
      const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.5
      });
      const sun = new THREE.Mesh(sunGeometry, sunMaterial);
      sun.position.x = -300;
      scene.add(sun);
      
      // Animation
      addLog('Starting animation...');
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        
        planet.rotation.y += 0.01;
        sun.rotation.y += 0.005;
        stars.rotation.y += 0.0002;
        
        renderer.render(scene, camera);
      };
      
      animate();
      addLog('SUCCESS: Universe initialized!');
      
    } catch (error) {
      addLog(`ERROR: ${error.message}`);
      console.error(error);
      setError(error.message);
    }
    
    return () => {
      addLog('Cleaning up...');
      if (animationId) cancelAnimationFrame(animationId);
      if (renderer) {
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: 'black', position: 'relative' }}>
      {/* Debug panel */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        width: '400px',
        maxHeight: '80vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'lime',
        padding: '10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        overflowY: 'auto',
        zIndex: 1000,
        border: '1px solid lime'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Debug Log</h3>
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: '2px' }}>{log}</div>
        ))}
        {error && (
          <div style={{ color: 'red', marginTop: '10px' }}>
            ERROR: {error}
          </div>
        )}
      </div>
      
      {/* Three.js mount point */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default UniverseSimulationDebug;