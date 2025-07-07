import * as THREE from 'three';

export class CameraFocusManager {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    
    // Scale thresholds for different viewing modes
    this.scaleThresholds = {
      planetary: { min: 0, max: 1000, near: 0.1, far: 10000 },
      solarSystem: { min: 1000, max: 10000, near: 1, far: 100000 },
      stellar: { min: 10000, max: 100000, near: 10, far: 1e6 },
      interstellar: { min: 100000, max: 1e6, near: 100, far: 1e8 },
      galactic: { min: 1e6, max: 1e8, near: 1000, far: 1e10 },
      intergalactic: { min: 1e8, max: 1e10, near: 10000, far: 1e12 },
      cosmic: { min: 1e10, max: Infinity, near: 100000, far: 1e15 }
    };
    
    this.currentScale = 'planetary';
    this.focusTarget = null;
    this.focusTransition = {
      active: false,
      startTime: 0,
      duration: 1000,
      startFov: 45,
      targetFov: 45,
      startNear: 0.1,
      targetNear: 0.1,
      startFar: 10000,
      targetFar: 10000
    };
    
    // Auto-focus parameters
    this.autoFocusEnabled = true;
    this.lastUpdateTime = 0;
    this.updateInterval = 500; // Check for focus changes every 500ms
  }
  
  // Determine current scale based on camera distance
  determineScale() {
    const distance = this.camera.position.length();
    
    for (const [scale, bounds] of Object.entries(this.scaleThresholds)) {
      if (distance >= bounds.min && distance < bounds.max) {
        return scale;
      }
    }
    
    return 'cosmic';
  }
  
  // Find the most appropriate focus target at current scale
  findFocusTarget() {
    const cameraPos = this.camera.position;
    const viewDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const scale = this.determineScale();
    
    // Get objects from scene
    const visibleObjects = [];
    this.scene.traverse((object) => {
      if (object.name && object.position) {
        const type = this.determineObjectType(object);
        if (type) {
          visibleObjects.push({
            object: object,
            type: type,
            position: object.getWorldPosition(new THREE.Vector3()),
            importance: this.calculateObjectImportance(object, type)
          });
        }
      }
    });
    
    // Filter objects based on scale
    let candidates = [];
    
    switch (scale) {
      case 'planetary':
      case 'solarSystem':
        // Focus on planets and major bodies
        candidates = visibleObjects.filter(obj => 
          obj.type === 'planet' || obj.type === 'star' || obj.type === 'moon'
        );
        break;
        
      case 'stellar':
      case 'interstellar':
        // Focus on stars and star clusters
        candidates = visibleObjects.filter(obj => 
          obj.type === 'star' || obj.type === 'starCluster'
        );
        break;
        
      case 'galactic':
        // Focus on galaxy cores and nebulae
        candidates = visibleObjects.filter(obj => 
          obj.type === 'galaxy' || obj.type === 'nebula' || obj.type === 'galaxyCore'
        );
        break;
        
      case 'intergalactic':
      case 'cosmic':
        // Focus on galaxy clusters and superclusters
        candidates = visibleObjects.filter(obj => 
          obj.type === 'galaxy' || obj.type === 'galaxyCluster' || obj.type === 'quasar'
        );
        break;
        
      default:
        candidates = visibleObjects;
        break;
    }
    
    // Score candidates based on distance and alignment with view direction
    let bestCandidate = null;
    let bestScore = -Infinity;
    
    for (const obj of candidates) {
      if (!obj || !obj.position) continue;
      
      const toObject = new THREE.Vector3().subVectors(obj.position, cameraPos).normalize();
      const alignment = toObject.dot(viewDir);
      
      // Only consider objects in front of camera
      if (alignment < 0.5) continue;
      
      const distance = obj.position.distanceTo(cameraPos);
      const distanceScore = 1 / (1 + distance / 10000);
      const importanceScore = obj.importance || 1;
      
      const score = alignment * distanceScore * importanceScore;
      
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = obj;
      }
    }
    
    return bestCandidate;
  }
  
  // Adjust camera parameters for optimal viewing at current scale
  adjustCameraForScale(scale, focusTarget) {
    const bounds = this.scaleThresholds[scale];
    let targetFov = 45;
    let targetNear = bounds.near;
    let targetFar = bounds.far;
    
    // Adjust FOV based on scale
    switch (scale) {
      case 'planetary':
        targetFov = 50;
        break;
      case 'solarSystem':
        targetFov = 45;
        break;
      case 'stellar':
        targetFov = 40;
        break;
      case 'interstellar':
        targetFov = 35;
        break;
      case 'galactic':
        targetFov = 30;
        break;
      case 'intergalactic':
        targetFov = 25;
        break;
      case 'cosmic':
        targetFov = 20;
        break;
        
      default:
        targetFov = 45;
        break;
    }
    
    // Fine-tune near/far planes if we have a focus target
    if (focusTarget && focusTarget.position) {
      const distance = this.camera.position.distanceTo(focusTarget.position);
      targetNear = Math.max(bounds.near, distance * 0.0001);
      targetFar = Math.min(bounds.far, distance * 1000);
    }
    
    // Start transition
    this.focusTransition = {
      active: true,
      startTime: Date.now(),
      duration: 1000,
      startFov: this.camera.fov,
      targetFov: targetFov,
      startNear: this.camera.near,
      targetNear: targetNear,
      startFar: this.camera.far,
      targetFar: targetFar
    };
  }
  
  // Update camera focus
  update() {
    const now = Date.now();
    
    // Check if we need to update focus
    if (this.autoFocusEnabled && now - this.lastUpdateTime > this.updateInterval) {
      this.lastUpdateTime = now;
      
      const newScale = this.determineScale();
      
      // Scale changed or no focus target
      if (newScale !== this.currentScale || !this.focusTarget) {
        this.currentScale = newScale;
        this.focusTarget = this.findFocusTarget();
        this.adjustCameraForScale(newScale, this.focusTarget);
      }
    }
    
    // Handle smooth transitions
    if (this.focusTransition.active) {
      const elapsed = now - this.focusTransition.startTime;
      const t = Math.min(elapsed / this.focusTransition.duration, 1);
      
      // Smooth interpolation using ease-in-out
      const smoothT = t < 0.5 ? 
        2 * t * t : 
        1 - Math.pow(-2 * t + 2, 2) / 2;
      
      // Update camera parameters
      this.camera.fov = THREE.MathUtils.lerp(
        this.focusTransition.startFov,
        this.focusTransition.targetFov,
        smoothT
      );
      
      this.camera.near = THREE.MathUtils.lerp(
        this.focusTransition.startNear,
        this.focusTransition.targetNear,
        smoothT
      );
      
      this.camera.far = THREE.MathUtils.lerp(
        this.focusTransition.startFar,
        this.focusTransition.targetFar,
        smoothT
      );
      
      this.camera.updateProjectionMatrix();
      
      if (t >= 1) {
        this.focusTransition.active = false;
      }
    }
  }
  
  // Get current scale info for UI
  getScaleInfo() {
    return {
      scale: this.currentScale,
      focusTarget: this.focusTarget ? {
        type: this.focusTarget.type,
        name: this.focusTarget.data?.name || 'Unknown',
        distance: this.camera.position.distanceTo(this.focusTarget.position)
      } : null,
      cameraFov: this.camera.fov,
      nearPlane: this.camera.near,
      farPlane: this.camera.far
    };
  }
  
  // Enable/disable auto focus
  setAutoFocus(enabled) {
    this.autoFocusEnabled = enabled;
  }
  
  // Manually set focus target
  setFocusTarget(object) {
    this.focusTarget = object;
    this.adjustCameraForScale(this.currentScale, object);
  }
  
  // Determine object type from its name and properties
  determineObjectType(object) {
    const name = object.name.toLowerCase();
    
    // Planets
    if (name.includes('mercury') || name.includes('venus') || name.includes('earth') ||
        name.includes('mars') || name.includes('jupiter') || name.includes('saturn') ||
        name.includes('uranus') || name.includes('neptune')) {
      return 'planet';
    }
    
    // Sun/stars
    if (name.includes('sun') || name.includes('star')) {
      return 'star';
    }
    
    // Moons
    if (name.includes('moon') || object.parent?.name.includes('planet')) {
      return 'moon';
    }
    
    // Galaxies
    if (name.includes('galaxy') || name.includes('andromeda') || name.includes('triangulum')) {
      return 'galaxy';
    }
    
    // Nebulae
    if (name.includes('nebula')) {
      return 'nebula';
    }
    
    // Quasars
    if (name.includes('quasar')) {
      return 'quasar';
    }
    
    // Galaxy clusters
    if (name.includes('cluster') || name.includes('virgo') || name.includes('coma')) {
      return 'galaxyCluster';
    }
    
    // Milky Way components
    if (name.includes('milky-way') || name.includes('galactic-center')) {
      return 'galaxyCore';
    }
    
    return null;
  }
  
  // Calculate importance score for focusing priority
  calculateObjectImportance(object, type) {
    let importance = 1;
    
    switch (type) {
      case 'star':
        // Sun is most important
        if (object.name.toLowerCase().includes('sun')) {
          importance = 100;
        } else {
          importance = 10;
        }
        break;
        
      case 'planet':
        // Earth is most important planet
        if (object.name.toLowerCase().includes('earth')) {
          importance = 50;
        } else if (object.name.toLowerCase().includes('jupiter') || 
                   object.name.toLowerCase().includes('saturn')) {
          importance = 20;
        } else {
          importance = 15;
        }
        break;
        
      case 'galaxy':
        // Named galaxies are more important
        if (object.name.toLowerCase().includes('andromeda') ||
            object.name.toLowerCase().includes('milky')) {
          importance = 30;
        } else {
          importance = 20;
        }
        break;
        
      case 'galaxyCore':
        importance = 40;
        break;
        
      case 'nebula':
        importance = 15;
        break;
        
      case 'quasar':
        importance = 25;
        break;
        
      case 'galaxyCluster':
        importance = 35;
        break;
        
      case 'moon':
        importance = 5;
        break;
        
      default:
        importance = 1;
        break;
    }
    
    return importance;
  }
}