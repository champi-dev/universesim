import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { CAMERA_CONSTANTS, SCENE_CONSTANTS } from '../utils/constants.js';

export const useSceneSetup = (mountRef) => {
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Create scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(
      SCENE_CONSTANTS.FOG_COLOR, 
      SCENE_CONSTANTS.FOG_DENSITY
    );
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      CAMERA_CONSTANTS.FOV,
      width / height,
      CAMERA_CONSTANTS.NEAR,
      CAMERA_CONSTANTS.FAR
    );
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [mountRef]);

  return { sceneRef, rendererRef, cameraRef };
};