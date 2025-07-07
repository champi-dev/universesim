import React, { useEffect, useRef, useState } from 'react';

const Minimap = ({ camera, scene, onTeleport }) => {
  const canvasRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [clickFeedback, setClickFeedback] = useState(null);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  const mapSize = isMobile ? 150 : 200;
  const worldBounds = 10000; // Increased to show more of the universe

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !camera || !scene) return;

    const ctx = canvas.getContext('2d');
    const render = () => {
      // Clear canvas with dark background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, mapSize, mapSize);

      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const pos = (i / 4) * mapSize;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, mapSize);
        ctx.moveTo(0, pos);
        ctx.lineTo(mapSize, pos);
        ctx.stroke();
      }

      // Draw world bounds
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.strokeRect(1, 1, mapSize - 2, mapSize - 2);

      // Draw objects (simplified representation)
      scene.traverse((object) => {
        if (object.isMesh && object.visible && object !== camera) {
          const x = ((object.position.x + worldBounds) / (worldBounds * 2)) * mapSize;
          const z = ((object.position.z + worldBounds) / (worldBounds * 2)) * mapSize;
          
          ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
          ctx.beginPath();
          ctx.arc(x, z, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw camera position
      const camX = ((camera.position.x + worldBounds) / (worldBounds * 2)) * mapSize;
      const camZ = ((camera.position.z + worldBounds) / (worldBounds * 2)) * mapSize;
      
      // Camera view cone
      ctx.save();
      ctx.translate(camX, camZ);
      ctx.rotate(-camera.rotation.y);
      
      // View cone
      ctx.fillStyle = 'rgba(255, 255, 100, 0.3)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-15, -20);
      ctx.lineTo(15, -20);
      ctx.closePath();
      ctx.fill();
      
      // Camera dot
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw click feedback
      if (clickFeedback) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(clickFeedback.x, clickFeedback.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        
        if (Date.now() - clickFeedback.time > 500) {
          setClickFeedback(null);
        }
      }
    };

    const animationId = setInterval(render, 50);
    return () => clearInterval(animationId);
  }, [camera, scene, worldBounds, mapSize, clickFeedback]);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Handle both mouse and touch events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Convert to world coordinates
    const worldX = ((x / mapSize) * (worldBounds * 2)) - worldBounds;
    const worldZ = ((y / mapSize) * (worldBounds * 2)) - worldBounds;

    // Add click feedback
    setClickFeedback({ x, y, time: Date.now() });

    // Teleport with current height maintained
    if (onTeleport) {
      onTeleport(worldX, camera.position.y, worldZ);
    }
  };

  return (
    <div 
      className="minimap-container"
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
        touchAction: 'none', // Prevent default touch behaviors
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <canvas 
        ref={canvasRef} 
        width={mapSize} 
        height={mapSize}
        onClick={handleClick}
        onTouchEnd={handleClick}
        style={{ display: 'block' }}
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

export default Minimap;