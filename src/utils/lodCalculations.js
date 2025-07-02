import { LOD_THRESHOLDS } from './constants.js';
import { positionToLightYears } from './mathUtils.js';

// Calculate current LOD level based on camera distance
export const calculateLODLevel = (cameraPosition) => {
  const distanceLY = positionToLightYears(cameraPosition);
  
  if (distanceLY < LOD_THRESHOLDS.ATMOSPHERE) return 0; // Atmospheric
  if (distanceLY < LOD_THRESHOLDS.SURFACE) return 1;    // Surface
  if (distanceLY < LOD_THRESHOLDS.ORBITAL) return 2;    // Orbital
  if (distanceLY < LOD_THRESHOLDS.STELLAR) return 3;    // Stellar
  if (distanceLY < LOD_THRESHOLDS.GALACTIC) return 4;   // Galactic
  if (distanceLY < LOD_THRESHOLDS.LOCAL_GROUP) return 5; // Local Group
  if (distanceLY < LOD_THRESHOLDS.COSMIC_WEB) return 6;  // Cosmic Web
  return 7; // CMB/Universe Edge
};

// Get LOD level name
export const getLODName = (level) => {
  const names = [
    'Atmospheric', 'Surface', 'Orbital', 'Stellar', 
    'Galactic', 'Local Group', 'Cosmic Web', 'CMB'
  ];
  return names[level] || 'Unknown';
};

// Check if LOD level has changed
export const hasLODChanged = (currentLevel, previousLevel) => {
  return currentLevel !== previousLevel;
};

// Calculate visibility based on distance and LOD
export const calculateVisibility = (distance, maxDistance) => {
  return Math.max(0, 1 - (distance / maxDistance));
};

// Determine scale string for UI
export const getScaleString = (lodLevel) => {
  const scales = [
    'atmosphere', 'surface', 'orbital', 'stellar',
    'galactic', 'local_group', 'cosmic_web', 'cmb'
  ];
  return scales[lodLevel] || 'unknown';
};