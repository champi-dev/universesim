import { useRef } from 'react';
import * as THREE from 'three';
import { CAMERA_CONSTANTS } from '../utils/constants.js';

export const useCameraMovement = () => {
  const cameraState = useRef({
    position: new THREE.Vector3(0, 50, 300),
    lookAt: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    lastLodLevel: -1,
    targetVelocity: new THREE.Vector3(0, 0, 0),
    smoothing: CAMERA_CONSTANTS.SMOOTHING,
  });

  const updateCameraMovement = (camera, deltaTime) => {
    const state = cameraState.current;
    
    // Apply smoothing to velocity
    state.velocity.lerp(state.targetVelocity, 1 - state.smoothing);
    
    // Update position
    state.position.add(
      state.velocity.clone().multiplyScalar(deltaTime)
    );
    
    // Update camera
    camera.position.copy(state.position);
    camera.lookAt(state.lookAt);
  };

  const setCameraTarget = (position, lookAt) => {
    cameraState.current.position.copy(position);
    cameraState.current.lookAt.copy(lookAt);
  };

  const setCameraVelocity = (velocity) => {
    cameraState.current.targetVelocity.copy(velocity);
  };

  return {
    cameraState,
    updateCameraMovement,
    setCameraTarget,
    setCameraVelocity,
  };
};