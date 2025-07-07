import * as THREE from 'three';
import { ParallelNaniteSystem, createParallelNanitePlanet, createParallelNaniteGalaxy } from './src/NaniteSystemParallel';
import { createObservableUniverse } from './src/ObservableUniverse';
import { createJWSTNebula } from './src/JWSTNebula';
import { SmoothNavigation } from './src/SmoothNavigation';
import { CameraFocusManager } from './src/CameraFocusManager';
import { STAR_COLORS, NEBULA_COLORS } from './src/data/astronomicalColors';
import { preloadedAsteroids, preloadedNebulae } from './src/data/preloadedData';

// Constants
export const AU_SCALE = 100;
export const TIME_SCALE = 1440; // 1 day = 1 minute
export const LIGHT_YEAR_TO_UNITS = 10;
export const PARSEC_TO_UNITS = LIGHT_YEAR_TO_UNITS * 3.26;
export const MPC_TO_UNITS = PARSEC_TO_UNITS * 1000000;

/**
 * Main UniverseSimulation class providing full control over the simulation
 */
export class UniverseSimulation {
  constructor(options = {}) {
    this.options = {
      container: options.container || document.body,
      width: options.width || window.innerWidth,
      height: options.height || window.innerHeight,
      mobile: options.mobile || this._detectMobile(),
      renderOptions: options.renderOptions || {},
      ...options
    };

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.naniteSystem = null;
    this.smoothNavigation = null;
    this.cameraFocusManager = null;
    this.animationId = null;
    this.celestialBodies = new Map();
    this.time = 0;
    this.isPaused = false;
  }

  _detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth < 768;
  }

  /**
   * Initialize the simulation
   */
  async init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.00000001);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      this.options.mobile ? 60 : 45,
      this.options.width / this.options.height,
      0.1,
      1e15
    );
    
    const startPos = new THREE.Vector3(AU_SCALE * 0.8, AU_SCALE * 0.5, AU_SCALE * 0.8);
    this.camera.position.copy(startPos);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.options.mobile,
      powerPreference: "high-performance",
      logarithmicDepthBuffer: true,
      alpha: false,
      stencil: false,
      depth: true,
      precision: 'highp',
      ...this.options.renderOptions
    });

    this.renderer.setSize(this.options.width, this.options.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.options.mobile ? 1.5 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !this.options.mobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Append to container
    this.options.container.appendChild(this.renderer.domElement);

    // Initialize systems
    this.smoothNavigation = new SmoothNavigation(this.camera);
    this.cameraFocusManager = new CameraFocusManager(this.camera, this.smoothNavigation);

    // Initialize Nanite system
    try {
      const workerCount = this.options.mobile ? 2 : navigator.hardwareConcurrency || 4;
      this.naniteSystem = new ParallelNaniteSystem(this.renderer, this.camera, workerCount);
    } catch (error) {
      console.warn('Failed to initialize Nanite system:', error);
    }

    // Add basic lighting
    this._setupLighting();

    return this;
  }

  _setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x040408, 0.3);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(1, 1, 0.5);
    if (!this.options.mobile) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
    }
    this.scene.add(dirLight);
  }

  /**
   * Add a sun to the simulation
   */
  async addSun(options = {}) {
    const config = {
      position: new THREE.Vector3(0, 0, 0),
      radius: 10,
      color: STAR_COLORS['G'],
      intensity: 3,
      ...options
    };

    const sunGroup = new THREE.Group();
    sunGroup.name = options.name || 'sun';

    // Create sun material
    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        viewVector: { value: new THREE.Vector3() },
        sunColor: { value: new THREE.Color(config.color.r, config.color.g, config.color.b) },
        coronaColor: { value: new THREE.Color(1.0, 0.5, 0.1) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 viewVector;
        uniform vec3 sunColor;
        uniform vec3 coronaColor;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float intensity = pow(0.5 + 0.5 * dot(vNormal, normalize(viewVector)), 2.0);
          vec3 color = mix(coronaColor, sunColor, intensity);
          
          float noise = sin(vPosition.x * 10.0 + time) * 
                       sin(vPosition.y * 10.0 + time * 0.8) * 
                       sin(vPosition.z * 10.0 + time * 1.2) * 0.1 + 0.9;
          
          color *= noise;
          gl_FragColor = vec4(color * 3.0, 1.0);
        }
      `
    });

    // Create sun mesh
    let sun;
    if (this.naniteSystem) {
      try {
        sun = await createParallelNanitePlanet(config.radius, 64, sunMaterial, this.naniteSystem);
      } catch (err) {
        sun = new THREE.Mesh(new THREE.SphereGeometry(config.radius, 64, 64), sunMaterial);
      }
    } else {
      sun = new THREE.Mesh(new THREE.SphereGeometry(config.radius, 64, 64), sunMaterial);
    }
    
    sunGroup.add(sun);

    // Add sun light
    const sunLight = new THREE.PointLight(0xffffff, config.intensity, 20000);
    sunLight.castShadow = !this.options.mobile;
    sunGroup.add(sunLight);

    sunGroup.position.copy(config.position);
    this.scene.add(sunGroup);
    this.celestialBodies.set(sunGroup.name, { group: sunGroup, material: sunMaterial, type: 'sun' });

    return sunGroup;
  }

  /**
   * Add a planet to the simulation
   */
  async addPlanet(options = {}) {
    const config = {
      name: 'planet',
      radius: 1,
      distance: 50,
      speed: 0.001,
      texture: null,
      color: 0x4444ff,
      ...options
    };

    const planetGroup = new THREE.Group();
    planetGroup.name = config.name;

    // Create planet material
    const material = config.texture ? 
      new THREE.MeshStandardMaterial({ map: config.texture }) :
      new THREE.MeshStandardMaterial({ color: config.color });

    // Create planet mesh
    let planet;
    if (this.naniteSystem) {
      try {
        planet = await createParallelNanitePlanet(config.radius, 32, material, this.naniteSystem);
      } catch (err) {
        planet = new THREE.Mesh(new THREE.SphereGeometry(config.radius, 32, 32), material);
      }
    } else {
      planet = new THREE.Mesh(new THREE.SphereGeometry(config.radius, 32, 32), material);
    }

    planet.castShadow = true;
    planet.receiveShadow = true;
    planetGroup.add(planet);

    this.scene.add(planetGroup);
    this.celestialBodies.set(config.name, {
      group: planetGroup,
      config: config,
      type: 'planet'
    });

    return planetGroup;
  }

  /**
   * Add a galaxy to the simulation
   */
  async addGalaxy(options = {}) {
    const config = {
      name: 'galaxy',
      position: new THREE.Vector3(0, 0, 0),
      type: 'spiral',
      scale: 1,
      starCount: this.options.mobile ? 10000 : 50000,
      ...options
    };

    let galaxy;
    if (this.naniteSystem) {
      try {
        galaxy = await createParallelNaniteGalaxy(config, this.naniteSystem);
      } catch (err) {
        galaxy = this._createSimpleGalaxy(config);
      }
    } else {
      galaxy = this._createSimpleGalaxy(config);
    }

    galaxy.position.copy(config.position);
    this.scene.add(galaxy);
    this.celestialBodies.set(config.name, { group: galaxy, type: 'galaxy' });

    return galaxy;
  }

  _createSimpleGalaxy(config) {
    const galaxyGroup = new THREE.Group();
    galaxyGroup.name = config.name;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.starCount * 3);
    const colors = new Float32Array(config.starCount * 3);

    for (let i = 0; i < config.starCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 100 * config.scale;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10 * config.scale;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      colors[i * 3] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
      colors[i * 3 + 2] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const stars = new THREE.Points(geometry, material);
    galaxyGroup.add(stars);

    return galaxyGroup;
  }

  /**
   * Add a nebula to the simulation
   */
  addNebula(options = {}) {
    const config = {
      name: 'nebula',
      position: new THREE.Vector3(0, 0, 0),
      scale: 100,
      type: 'emission',
      ...options
    };

    const nebula = createJWSTNebula(config);
    nebula.position.copy(config.position);
    this.scene.add(nebula);
    this.celestialBodies.set(config.name, { group: nebula, type: 'nebula' });

    return nebula;
  }

  /**
   * Create the entire observable universe
   */
  createObservableUniverse() {
    const universe = createObservableUniverse(this.scene, this.options.mobile);
    this.celestialBodies.set('observable-universe', { group: universe, type: 'universe' });
    return universe;
  }

  /**
   * Focus camera on a celestial body
   */
  focusOn(name, options = {}) {
    const body = this.celestialBodies.get(name);
    if (!body) {
      console.warn(`Celestial body '${name}' not found`);
      return;
    }

    if (this.cameraFocusManager) {
      this.cameraFocusManager.focusOnObject(body.group, options);
    }
  }

  /**
   * Start the simulation
   */
  start() {
    if (this.animationId) return;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      if (!this.isPaused) {
        this.time += TIME_SCALE / 60;
        this._updateCelestialBodies();
      }

      // Update systems
      if (this.smoothNavigation) {
        this.smoothNavigation.update();
      }

      if (this.naniteSystem) {
        this.naniteSystem.update(this.camera);
      }

      // Update sun shader
      this.celestialBodies.forEach((body) => {
        if (body.type === 'sun' && body.material) {
          body.material.uniforms.time.value = this.time * 0.001;
          body.material.uniforms.viewVector.value = this.camera.position.clone().normalize();
        }
      });

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  _updateCelestialBodies() {
    this.celestialBodies.forEach((body) => {
      if (body.type === 'planet' && body.config) {
        const angle = this.time * body.config.speed;
        body.group.position.x = Math.cos(angle) * body.config.distance;
        body.group.position.z = Math.sin(angle) * body.config.distance;
        body.group.rotation.y += 0.01;
      }
    });
  }

  /**
   * Stop the simulation
   */
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Pause/unpause the simulation
   */
  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  /**
   * Set time scale
   */
  setTimeScale(scale) {
    this.timeScale = scale;
  }

  /**
   * Handle window resize
   */
  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stop();
    
    if (this.naniteSystem) {
      this.naniteSystem.dispose();
    }

    this.celestialBodies.forEach((body) => {
      this.scene.remove(body.group);
    });

    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  /**
   * Get THREE.js internals for advanced usage
   */
  getInternals() {
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      THREE: THREE
    };
  }
}

// Export all utility functions and classes
export {
  THREE,
  ParallelNaniteSystem,
  createParallelNanitePlanet,
  createParallelNaniteGalaxy,
  createObservableUniverse,
  createJWSTNebula,
  SmoothNavigation,
  CameraFocusManager,
  STAR_COLORS,
  NEBULA_COLORS,
  preloadedAsteroids,
  preloadedNebulae
};

// Default export
export default UniverseSimulation;