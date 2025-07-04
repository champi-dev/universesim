import React, { useRef, useEffect } from "react";
import * as THREE from "three";

const UniverseSimulationUltraFast = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100000);
    camera.position.set(0, 0, 5000);

    // Renderer - maximum performance settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      powerPreference: "high-performance",
      precision: "lowp",
      alpha: false,
      stencil: false,
      depth: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1); // Force pixel ratio to 1
    mountRef.current.appendChild(renderer.domElement);

    // Single merged geometry for all stars
    const starVertices = [];
    const starColors = [];
    const starSizes = [];
    
    // Bright stars with spikes (JWST style)
    for(let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * 20000;
      const y = (Math.random() - 0.5) * 20000;
      const z = (Math.random() - 0.5) * 20000;
      
      starVertices.push(x, y, z);
      starColors.push(1, 1, 0.9);
      starSizes.push(20 + Math.random() * 40);
    }
    
    // Background stars
    for(let i = 0; i < 10000; i++) {
      const radius = 10000 + Math.random() * 50000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      starVertices.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      
      const warmth = 0.7 + Math.random() * 0.3;
      starColors.push(1, warmth, warmth * 0.8);
      starSizes.push(Math.random() * 3 + 1);
    }
    
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    
    // Ultra simple star material
    const starsMaterial = new THREE.PointsMaterial({
      size: 5,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
    
    // Simple nebula clouds
    const nebulaGroup = new THREE.Group();
    
    // Create simple nebula using sprites
    for(let i = 0; i < 5; i++) {
      const map = new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      const material = new THREE.SpriteMaterial({
        map: map,
        color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
        blending: THREE.AdditiveBlending,
        opacity: 0.3
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(3000 + Math.random() * 2000, 3000 + Math.random() * 2000, 1);
      sprite.position.set(
        (Math.random() - 0.5) * 10000,
        (Math.random() - 0.5) * 10000,
        (Math.random() - 0.5) * 10000
      );
      nebulaGroup.add(sprite);
    }
    scene.add(nebulaGroup);
    
    // Simple distant galaxies
    const galaxyVertices = [];
    const galaxyColors = [];
    
    for(let i = 0; i < 100; i++) {
      const distance = 30000 + Math.random() * 50000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      galaxyVertices.push(
        distance * Math.sin(phi) * Math.cos(theta),
        distance * Math.sin(phi) * Math.sin(theta),
        distance * Math.cos(phi)
      );
      
      galaxyColors.push(1, 0.9, 0.8);
    }
    
    const galaxyGeometry = new THREE.BufferGeometry();
    galaxyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(galaxyVertices, 3));
    galaxyGeometry.setAttribute('color', new THREE.Float32BufferAttribute(galaxyColors, 3));
    
    const galaxyMaterial = new THREE.PointsMaterial({
      size: 100,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    
    const galaxies = new THREE.Points(galaxyGeometry, galaxyMaterial);
    scene.add(galaxies);

    // Controls
    let isPointerLocked = false;
    const keys = {};
    const moveSpeed = 100;

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
    const animate = () => {
      requestAnimationFrame(animate);

      // Simple rotation for visual interest
      stars.rotation.y += 0.00002;
      nebulaGroup.rotation.y += 0.0001;
      galaxies.rotation.y += 0.00005;

      // Camera movement
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      
      const speed = keys['shift'] ? moveSpeed * 3 : moveSpeed;
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

export default UniverseSimulationUltraFast;