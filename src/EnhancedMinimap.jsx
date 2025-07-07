import React, { useEffect, useRef, useState } from 'react';

const EnhancedMinimap = ({ camera, scene, onTeleport, smoothNav }) => {
  const canvasRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [clickFeedback, setClickFeedback] = useState(null);
  const [mapScale, setMapScale] = useState(1000); // Dynamic scale
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  const mapSize = isMobile ? 150 : 200;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !camera || !scene) return;

    const ctx = canvas.getContext('2d');
    
    const render = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, mapSize, mapSize);
      
      // Get camera distance for dynamic scaling
      const cameraDistance = camera.position.length();
      
      // Adjust map scale based on current view
      let dynamicScale = 1000;
      if (cameraDistance > 1e9) dynamicScale = 1e12; // Universe scale
      else if (cameraDistance > 1e6) dynamicScale = 1e9; // Galaxy scale
      else if (cameraDistance > 100000) dynamicScale = 1e6; // Stellar scale
      else if (cameraDistance > 10000) dynamicScale = 100000; // Star field
      else if (cameraDistance > 1000) dynamicScale = 10000; // Solar system edge
      
      setMapScale(dynamicScale);
      
      // Draw scale indicator
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = `${isMobile ? '9px' : '10px'} monospace`;
      ctx.fillText(getScaleLabel(dynamicScale), 5, mapSize - 25);
      
      // Draw grid with scale markers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.5;
      
      // Major grid lines
      for (let i = 0; i <= 4; i++) {
        const pos = (i / 4) * mapSize;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, mapSize);
        ctx.moveTo(0, pos);
        ctx.lineTo(mapSize, pos);
        ctx.stroke();
      }
      
      // Draw universe features based on scale
      drawUniverseFeatures(ctx, camera, scene, dynamicScale, mapSize);
      
      // Draw camera position and orientation
      const camX = ((camera.position.x + dynamicScale) / (dynamicScale * 2)) * mapSize;
      const camZ = ((camera.position.z + dynamicScale) / (dynamicScale * 2)) * mapSize;
      
      // Camera view cone
      ctx.save();
      ctx.translate(camX, camZ);
      ctx.rotate(-camera.rotation.y);
      
      // View cone with gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, -25);
      gradient.addColorStop(0, 'rgba(255, 255, 100, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 255, 100, 0.1)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-20, -25);
      ctx.lineTo(20, -25);
      ctx.closePath();
      ctx.fill();
      
      // Camera dot with glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffff00';
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
      
      // Draw speed/scale indicator
      if (smoothNav) {
        const speedInfo = smoothNav.getSpeedInfo();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `${isMobile ? '8px' : '9px'} monospace`;
        ctx.fillText(speedInfo.speedLevel, 5, 15);
      }
      
      // Draw click feedback
      if (clickFeedback) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(clickFeedback.x, clickFeedback.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        
        const elapsed = Date.now() - clickFeedback.time;
        if (elapsed > 500) {
          setClickFeedback(null);
        }
      }
    };
    
    const animationId = setInterval(render, 50);
    return () => clearInterval(animationId);
  }, [camera, scene, mapScale, clickFeedback, smoothNav, mapSize, isMobile]);
  
  // Helper function to draw universe features
  const drawUniverseFeatures = (ctx, camera, scene, scale, size) => {
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Different features at different scales
    if (scale <= 10000) {
      // Solar system scale - show sun and planets
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Planet orbits
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
      ctx.lineWidth = 0.5;
      const orbitScales = [0.039, 0.072, 0.1, 0.152, 0.52]; // Inner planets
      orbitScales.forEach(orbit => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbit * size / 2, 0, Math.PI * 2);
        ctx.stroke();
      });
      
    } else if (scale <= 1e6) {
      // Stellar neighborhood - show nearby stars
      ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';
      
      // Draw some representative stars
      const starPositions = [
        { x: 0.1, y: 0.2 }, { x: -0.2, y: 0.1 }, { x: 0.3, y: -0.2 },
        { x: -0.15, y: -0.3 }, { x: 0.25, y: 0.3 }
      ];
      
      starPositions.forEach(pos => {
        ctx.beginPath();
        ctx.arc(
          centerX + pos.x * size,
          centerY + pos.y * size,
          1,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
      
    } else if (scale <= 1e9) {
      // Galaxy scale - show Milky Way spiral
      ctx.strokeStyle = 'rgba(150, 150, 255, 0.4)';
      ctx.lineWidth = 2;
      
      // Draw spiral arms
      for (let arm = 0; arm < 4; arm++) {
        ctx.beginPath();
        for (let t = 0; t < 100; t++) {
          const angle = (arm * Math.PI / 2) + (t / 100) * Math.PI * 2;
          const radius = (t / 100) * size * 0.4;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      
      // Galactic center
      ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
      ctx.fill();
      
    } else {
      // Universe scale - show galaxy clusters
      ctx.fillStyle = 'rgba(200, 150, 255, 0.5)';
      
      // Draw some galaxy clusters
      const clusterPositions = [
        { x: 0.3, y: 0.2 }, { x: -0.3, y: -0.2 }, { x: 0.2, y: -0.3 },
        { x: -0.2, y: 0.3 }, { x: 0, y: 0 }
      ];
      
      clusterPositions.forEach(pos => {
        ctx.beginPath();
        ctx.arc(
          centerX + pos.x * size,
          centerY + pos.y * size,
          3,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
      
      // Draw filaments
      ctx.strokeStyle = 'rgba(100, 100, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      clusterPositions.forEach((pos, i) => {
        if (i === 0) {
          ctx.moveTo(centerX + pos.x * size, centerY + pos.y * size);
        } else {
          ctx.lineTo(centerX + pos.x * size, centerY + pos.y * size);
        }
      });
      ctx.stroke();
    }
    
    // Always show current objects in view
    scene.traverse((object) => {
      if (object.isMesh && object.visible && object !== camera) {
        const distance = camera.position.distanceTo(object.position);
        if (distance < scale) {
          const x = ((object.position.x + scale) / (scale * 2)) * size;
          const z = ((object.position.z + scale) / (scale * 2)) * size;
          
          // Don't draw if too close to center (avoid clutter)
          const distFromCenter = Math.sqrt(
            Math.pow(x - centerX, 2) + Math.pow(z - centerY, 2)
          );
          
          if (distFromCenter > 10) {
            ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(x, z, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    });
  };
  
  const getScaleLabel = (scale) => {
    if (scale >= 1e12) return 'Universe';
    if (scale >= 1e9) return 'Galaxies';
    if (scale >= 1e6) return 'Stars';
    if (scale >= 100000) return 'Stellar';
    if (scale >= 10000) return 'Outer System';
    if (scale >= 1000) return 'Solar System';
    return 'Planetary';
  };
  
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Convert to world coordinates using current scale
    const worldX = ((x / mapSize) * (mapScale * 2)) - mapScale;
    const worldZ = ((y / mapSize) * (mapScale * 2)) - mapScale;

    // Add click feedback
    setClickFeedback({ x, y, time: Date.now() });

    // Teleport with current height maintained
    if (onTeleport) {
      onTeleport(worldX, camera.position.y, worldZ);
    }
  };
  
  const handleTouch = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length === 1) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Convert to world coordinates using current scale
      const worldX = ((x / mapSize) * (mapScale * 2)) - mapScale;
      const worldZ = ((y / mapSize) * (mapScale * 2)) - mapScale;

      // Add click feedback
      setClickFeedback({ x, y, time: Date.now() });

      // Teleport with current height maintained
      if (onTeleport) {
        onTeleport(worldX, camera.position.y, worldZ);
      }
    }
  };

  return (
    <div 
      className="enhanced-minimap-container"
      style={{
        position: 'fixed',
        bottom: isMobile ? '10px' : '20px',
        right: isMobile ? '10px' : '20px',
        width: `${mapSize}px`,
        height: `${mapSize}px`,
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        border: isHovered ? '2px solid rgba(255, 255, 255, 0.6)' : '2px solid rgba(255, 255, 255, 0.3)',
        cursor: 'crosshair',
        transition: 'all 0.2s ease',
        transform: isHovered && !isMobile ? 'scale(1.05)' : 'scale(1)',
        zIndex: 1000,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onTouchStart={(e) => { e.preventDefault(); }}
    >
      <canvas 
        ref={canvasRef} 
        width={mapSize} 
        height={mapSize}
        onClick={handleClick}
        onTouchStart={handleTouch}
        onTouchMove={(e) => { e.preventDefault(); e.stopPropagation(); }}
        style={{ display: 'block', touchAction: 'none' }}
      />
      <div 
        style={{
          position: 'absolute',
          bottom: '5px',
          left: '5px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: isMobile ? '9px' : '10px',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
        }}
      >
        Click to teleport
      </div>
    </div>
  );
};

export default EnhancedMinimap;