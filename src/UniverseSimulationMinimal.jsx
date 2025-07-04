import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const UniverseSimulationMinimal = () => {
  const mountRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('Component mounted, THREE:', !!THREE);
    console.log('mountRef.current at mount:', mountRef.current);
    
    // Check if ref exists immediately
    if (!mountRef.current) {
      console.error('Mount ref not available');
      return;
    }

    console.log('Starting Three.js setup...');
    
    let renderer = null;
    let animationId = null;
    
    try {
      // Basic Three.js setup
      const width = window.innerWidth;
      const height = window.innerHeight;
      console.log('Creating scene...');
      
      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      
      // Camera
      console.log('Creating camera...');
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.z = 5;
      
      // Renderer
      console.log('Creating renderer...');
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      
      // Attach to DOM
      console.log('Attaching to DOM...');
      mountRef.current.appendChild(renderer.domElement);
      
      // Simple cube
      console.log('Creating cube...');
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      
      // Add a light so we can see better
      const light = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(light);
      
      // Animation loop
      console.log('Starting animation...');
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
      };
      
      animate();
      console.log('Three.js initialized successfully!');
      
    } catch (error) {
      console.error('Error initializing Three.js:', error);
      setError(error.message);
    }
    
    // Cleanup
    return () => {
      console.log('Cleaning up...');
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (renderer) {
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
    };
  }, []); // Empty dependency array

  if (error) {
    return (
      <div style={{ color: 'red', padding: '20px', backgroundColor: 'black' }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  // Always render the mount div
  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: 'black', position: 'relative' }}>
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        color: 'white',
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        padding: '10px',
        zIndex: 1000
      }}>
        Three.js Test - You should see a green cube
      </div>
      <div 
        ref={mountRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }} 
      />
    </div>
  );
};

export default UniverseSimulationMinimal;