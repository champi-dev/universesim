import * as THREE from "three";

// Calculate distance between two 3D points
export const calculateDistance = (pos1, pos2) => {
  return pos1.distanceTo(pos2);
};

// Convert position to light-years for LOD calculations
export const positionToLightYears = (position) => {
  const AU = 149597870.7; // 1 AU in km
  const LY_IN_KM = 9.461e12; // 1 light-year in km
  const distanceKm = position.length() * AU;
  return distanceKm / LY_IN_KM;
};

// Smooth interpolation between values
export const smoothStep = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// Generate random position within sphere
export const randomSpherePosition = (radius) => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
};

// Normalize angle to 0-2π range
export const normalizeAngle = (angle) => {
  return ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
};

// Calculate orbital position
export const calculateOrbitalPosition = (radius, angle, center = new THREE.Vector3()) => {
  return new THREE.Vector3(
    center.x + radius * Math.cos(angle),
    center.y,
    center.z + radius * Math.sin(angle)
  );
};