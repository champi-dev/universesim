import React, { useRef, useState } from "react";
import { useSceneSetup } from '../../hooks/useSceneSetup.js';
import { useCameraMovement } from '../../hooks/useCameraMovement.js';
import { calculateLODLevel, getScaleString } from '../../utils/lodCalculations.js';
import { createAtmosphereLayers } from '../atmospheric/AtmosphereLayers.jsx';
import { IS_MOBILE } from '../../utils/constants.js';

const UniverseSimulationRefactored = () => {
  const mountRef = useRef(null);
  const frameRef = useRef(0);
  
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [currentScale, setCurrentScale] = useState("stellar");
  const [lodLevel, setLodLevel] = useState(3);
  const [isMobile] = useState(IS_MOBILE);

  const { sceneRef, rendererRef, cameraRef } = useSceneSetup(mountRef);
  const { cameraState, updateCameraMovement } = useCameraMovement();

  // Simple test to verify our extractions work
  React.useEffect(() => {
    if (cameraRef.current) {
      const level = calculateLODLevel(cameraState.current.position);
      setLodLevel(level);
      setCurrentScale(getScaleString(level));
      
      // Add atmosphere layers to scene for testing
      if (sceneRef.current && !sceneRef.current.getObjectByName('atmosphere')) {
        const atmosphere = createAtmosphereLayers();
        atmosphere.name = 'atmosphere';
        sceneRef.current.add(atmosphere);
      }
    }
  }, [sceneRef, cameraRef]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ 
        position: 'absolute', top: 20, left: 20, color: 'white',
        background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px'
      }}>
        <div>Scale: {currentScale}</div>
        <div>LOD Level: {lodLevel}</div>
        <div>Time Speed: {timeSpeed}x</div>
        <div>Device: {isMobile ? 'Mobile' : 'Desktop'}</div>
      </div>
    </div>
  );
};

export default UniverseSimulationRefactored;