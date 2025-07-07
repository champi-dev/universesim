import * as THREE from 'three';

/**
 * Smooth navigation system with natural movement and acceleration
 */
export class SmoothNavigation {
  constructor(camera) {
    this.camera = camera;
    
    // Movement states
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.targetVelocity = new THREE.Vector3(0, 0, 0);
    this.rotationVelocity = { x: 0, y: 0 };
    
    // Movement parameters
    this.acceleration = 0.5;
    this.deceleration = 0.9;
    this.rotationDamping = 0.85;
    this.maxSpeedMultiplier = 100;
    
    // Speed levels for different scales
    this.speedLevels = [
      { distance: 0, speed: 10, name: "Planetary" },           // Near planets
      { distance: 1000, speed: 100, name: "Solar System" },    // Solar system scale
      { distance: 10000, speed: 1000, name: "Stellar" },       // Between stars
      { distance: 100000, speed: 10000, name: "Interstellar" }, // Star field
      { distance: 1e6, speed: 100000, name: "Galactic" },      // Galaxy scale
      { distance: 1e8, speed: 1e6, name: "Intergalactic" },    // Between galaxies
      { distance: 1e10, speed: 1e8, name: "Cosmic" },          // Universe scale
    ];
    
    this.currentSpeedLevel = 0;
  }
  
  // Get appropriate speed based on distance from origin
  getBaseSpeed() {
    const distance = this.camera.position.length();
    
    // Find appropriate speed level
    for (let i = this.speedLevels.length - 1; i >= 0; i--) {
      if (distance >= this.speedLevels[i].distance) {
        this.currentSpeedLevel = i;
        
        // Interpolate between speed levels for smooth transition
        if (i < this.speedLevels.length - 1) {
          const nextLevel = this.speedLevels[i + 1];
          const t = (distance - this.speedLevels[i].distance) / 
                   (nextLevel.distance - this.speedLevels[i].distance);
          const smoothT = t * t * (3 - 2 * t); // Smooth step function
          
          return THREE.MathUtils.lerp(
            this.speedLevels[i].speed,
            nextLevel.speed,
            smoothT
          );
        }
        
        return this.speedLevels[i].speed;
      }
    }
    
    return this.speedLevels[0].speed;
  }
  
  // Update movement based on input
  update(keys, deltaTime, pitch, yaw) {
    // Get movement vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const worldUp = new THREE.Vector3(0, 1, 0);
    
    // Calculate right vector using cross product to ensure it's always perpendicular
    const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
    
    // If looking straight up or down, forward and worldUp are parallel, so use camera's right
    if (right.lengthSq() < 0.001) {
      right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    }
    
    // Calculate target velocity based on input
    this.targetVelocity.set(0, 0, 0);
    
    const baseSpeed = this.getBaseSpeed();
    const speed = keys['shift'] ? baseSpeed * 10 : baseSpeed;
    
    if (keys['w']) this.targetVelocity.addScaledVector(forward, speed);
    if (keys['s']) this.targetVelocity.addScaledVector(forward, -speed);
    if (keys['a']) this.targetVelocity.addScaledVector(right, -speed);
    if (keys['d']) this.targetVelocity.addScaledVector(right, speed);
    if (keys[' ']) this.targetVelocity.addScaledVector(worldUp, speed);
    if (keys['control']) this.targetVelocity.addScaledVector(worldUp, -speed);
    
    // Smooth acceleration/deceleration
    if (this.targetVelocity.length() > 0) {
      // Accelerate towards target velocity
      this.velocity.lerp(this.targetVelocity, this.acceleration * deltaTime);
    } else {
      // Decelerate when no input
      this.velocity.multiplyScalar(Math.pow(this.deceleration, deltaTime * 60));
    }
    
    // Apply velocity to position
    const moveDistance = deltaTime;
    this.camera.position.addScaledVector(this.velocity, moveDistance);
    
    // Handle rotation with damping
    if (this.rotationVelocity.x !== 0 || this.rotationVelocity.y !== 0) {
      const newYaw = yaw - this.rotationVelocity.x;  // Negative for natural mouse movement
      const newPitch = pitch - this.rotationVelocity.y;
      
      // Clamp pitch to prevent flipping
      const clampedPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, newPitch));
      
      // Apply rotation
      const quaternion = new THREE.Quaternion();
      const euler = new THREE.Euler(clampedPitch, newYaw, 0, 'YXZ');
      quaternion.setFromEuler(euler);
      this.camera.quaternion.copy(quaternion);
      
      // Damping
      this.rotationVelocity.x *= this.rotationDamping;
      this.rotationVelocity.y *= this.rotationDamping;
      
      return { pitch: clampedPitch, yaw: newYaw };
    }
    
    return { pitch, yaw };
  }
  
  // Add rotation input
  addRotation(x, y) {
    this.rotationVelocity.x += x;
    this.rotationVelocity.y += y;
  }
  
  // Get current speed info for UI
  getSpeedInfo() {
    return {
      currentSpeed: this.velocity.length(),
      baseSpeed: this.getBaseSpeed(),
      speedLevel: this.speedLevels[this.currentSpeedLevel].name,
      position: this.camera.position.clone()
    };
  }
  
  // Reset velocity (used after teleport)
  reset() {
    this.velocity.set(0, 0, 0);
    this.targetVelocity.set(0, 0, 0);
    this.rotationVelocity.x = 0;
    this.rotationVelocity.y = 0;
  }
}