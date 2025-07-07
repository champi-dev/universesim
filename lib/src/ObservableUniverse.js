import * as THREE from 'three';

/**
 * Creates a more complete representation of the observable universe
 * with proper scaling and all major components
 */

// Convert real distances to simulation units
const LIGHT_YEAR_TO_UNITS = 10; // 1 light-year = 10 simulation units
const PARSEC_TO_UNITS = LIGHT_YEAR_TO_UNITS * 3.26;
const MPC_TO_UNITS = PARSEC_TO_UNITS * 1000000; // Megaparsec

export function createObservableUniverse(scene, mobile = false) {
  const universeGroup = new THREE.Group();
  universeGroup.name = 'observable-universe';
  
  // 1. Create the Milky Way around us
  const createMilkyWay = () => {
    const milkyWayGroup = new THREE.Group();
    milkyWayGroup.name = 'milky-way';
    
    // Galactic center (Sagittarius A*)
    const centerGlow = new THREE.PointLight(0xffffaa, 2, 50000);
    centerGlow.position.set(26000 * LIGHT_YEAR_TO_UNITS, 0, 0); // 26,000 ly away
    milkyWayGroup.add(centerGlow);
    
    // Spiral arms (simplified)
    const armCount = 4;
    const starsPerArm = mobile ? 5000 : 20000;
    
    for (let arm = 0; arm < armCount; arm++) {
      const armAngle = (arm / armCount) * Math.PI * 2;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(starsPerArm * 3);
      const colors = new Float32Array(starsPerArm * 3);
      
      for (let i = 0; i < starsPerArm; i++) {
        const distance = Math.random() * 50000 * LIGHT_YEAR_TO_UNITS;
        const angle = armAngle + (distance / 10000) + (Math.random() - 0.5) * 0.5;
        const spread = Math.random() * 5000 * LIGHT_YEAR_TO_UNITS;
        
        positions[i * 3] = Math.cos(angle) * distance + (Math.random() - 0.5) * spread;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 1000 * LIGHT_YEAR_TO_UNITS; // Thin disk
        positions[i * 3 + 2] = Math.sin(angle) * distance + (Math.random() - 0.5) * spread;
        
        // Bluer stars in arms (star formation)
        colors[i * 3] = 0.7 + Math.random() * 0.3;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 2] = 1.0;
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const material = new THREE.PointsMaterial({
        size: 10,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      });
      
      const armPoints = new THREE.Points(geometry, material);
      milkyWayGroup.add(armPoints);
    }
    
    // Add galactic halo (old stars)
    const haloStars = mobile ? 2000 : 10000;
    const haloGeometry = new THREE.BufferGeometry();
    const haloPositions = new Float32Array(haloStars * 3);
    const haloColors = new Float32Array(haloStars * 3);
    
    for (let i = 0; i < haloStars; i++) {
      const radius = Math.random() * 100000 * LIGHT_YEAR_TO_UNITS;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      haloPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      haloPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      haloPositions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Redder halo stars (old)
      haloColors[i * 3] = 1.0;
      haloColors[i * 3 + 1] = 0.7 + Math.random() * 0.2;
      haloColors[i * 3 + 2] = 0.5 + Math.random() * 0.2;
    }
    
    haloGeometry.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
    haloGeometry.setAttribute('color', new THREE.BufferAttribute(haloColors, 3));
    
    const haloMaterial = new THREE.PointsMaterial({
      size: 5,
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    
    const halo = new THREE.Points(haloGeometry, haloMaterial);
    milkyWayGroup.add(halo);
    
    return milkyWayGroup;
  };
  
  // 2. Local Group galaxies
  const createLocalGroup = () => {
    const localGroup = new THREE.Group();
    localGroup.name = 'local-group';
    
    // Andromeda Galaxy (M31)
    const andromedaDistance = 2.537e6 * LIGHT_YEAR_TO_UNITS;
    const andromeda = createDistantGalaxy('spiral', 1.5);
    andromeda.position.set(andromedaDistance * 0.8, andromedaDistance * 0.3, andromedaDistance * 0.5);
    localGroup.add(andromeda);
    
    // Triangulum Galaxy (M33)
    const triangulumDistance = 2.73e6 * LIGHT_YEAR_TO_UNITS;
    const triangulum = createDistantGalaxy('spiral', 0.6);
    triangulum.position.set(-triangulumDistance * 0.6, triangulumDistance * 0.2, triangulumDistance * 0.7);
    localGroup.add(triangulum);
    
    // Large Magellanic Cloud
    const lmcDistance = 163000 * LIGHT_YEAR_TO_UNITS;
    const lmc = createDistantGalaxy('irregular', 0.3);
    lmc.position.set(lmcDistance * 0.2, -lmcDistance * 0.8, -lmcDistance * 0.5);
    localGroup.add(lmc);
    
    // Small Magellanic Cloud
    const smcDistance = 200000 * LIGHT_YEAR_TO_UNITS;
    const smc = createDistantGalaxy('irregular', 0.2);
    smc.position.set(smcDistance * 0.3, -smcDistance * 0.7, -smcDistance * 0.6);
    localGroup.add(smc);
    
    return localGroup;
  };
  
  // 3. Distant galaxy clusters and cosmic web
  const createCosmicWeb = () => {
    const cosmicWeb = new THREE.Group();
    cosmicWeb.name = 'cosmic-web';
    
    // Create filaments connecting galaxy clusters
    const clusterCount = mobile ? 20 : 50;
    const clusters = [];
    
    // Generate cluster positions
    for (let i = 0; i < clusterCount; i++) {
      const distance = (50 + Math.random() * 450) * MPC_TO_UNITS; // 50-500 Mpc
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      const cluster = {
        position: new THREE.Vector3(
          distance * Math.sin(phi) * Math.cos(theta),
          distance * Math.sin(phi) * Math.sin(theta),
          distance * Math.cos(phi)
        ),
        size: Math.random() * 0.5 + 0.5
      };
      clusters.push(cluster);
      
      // Add galaxies to cluster
      const galaxyCount = mobile ? 5 : 20;
      for (let j = 0; j < galaxyCount; j++) {
        const galaxy = createDistantGalaxy(['elliptical', 'spiral', 'lenticular'][Math.floor(Math.random() * 3)], 0.1);
        const spread = 5 * MPC_TO_UNITS;
        galaxy.position.copy(cluster.position);
        galaxy.position.add(new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread
        ));
        cosmicWeb.add(galaxy);
      }
    }
    
    // Create filaments between nearby clusters
    const filamentGeometry = new THREE.BufferGeometry();
    const filamentPositions = [];
    
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const distance = clusters[i].position.distanceTo(clusters[j].position);
        if (distance < 100 * MPC_TO_UNITS) { // Connect if within 100 Mpc
          // Create filament particles
          const particleCount = mobile ? 20 : 50;
          for (let k = 0; k < particleCount; k++) {
            const t = k / particleCount;
            const pos = new THREE.Vector3().lerpVectors(clusters[i].position, clusters[j].position, t);
            pos.add(new THREE.Vector3(
              (Math.random() - 0.5) * 2 * MPC_TO_UNITS,
              (Math.random() - 0.5) * 2 * MPC_TO_UNITS,
              (Math.random() - 0.5) * 2 * MPC_TO_UNITS
            ));
            filamentPositions.push(pos.x, pos.y, pos.z);
          }
        }
      }
    }
    
    if (filamentPositions.length > 0) {
      filamentGeometry.setAttribute('position', new THREE.Float32BufferAttribute(filamentPositions, 3));
      const filamentMaterial = new THREE.PointsMaterial({
        size: 50,
        color: 0x4444ff,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      });
      const filaments = new THREE.Points(filamentGeometry, filamentMaterial);
      cosmicWeb.add(filaments);
    }
    
    return cosmicWeb;
  };
  
  // 4. Quasars and distant active galaxies
  const createQuasars = () => {
    const quasarGroup = new THREE.Group();
    quasarGroup.name = 'quasars';
    
    const quasarCount = mobile ? 10 : 30;
    
    for (let i = 0; i < quasarCount; i++) {
      const distance = (1000 + Math.random() * 3000) * MPC_TO_UNITS; // 1-4 Gpc
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      // Quasar core
      const quasarGeometry = new THREE.SphereGeometry(MPC_TO_UNITS * 0.5, 8, 8);
      const quasarMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 5
      });
      const quasar = new THREE.Mesh(quasarGeometry, quasarMaterial);
      
      quasar.position.set(
        distance * Math.sin(phi) * Math.cos(theta),
        distance * Math.sin(phi) * Math.sin(theta),
        distance * Math.cos(phi)
      );
      
      // Quasar jets
      const jetGeometry = new THREE.CylinderGeometry(MPC_TO_UNITS * 0.1, MPC_TO_UNITS * 0.3, MPC_TO_UNITS * 10, 8);
      const jetMaterial = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
      });
      
      const jet1 = new THREE.Mesh(jetGeometry, jetMaterial);
      const jet2 = new THREE.Mesh(jetGeometry, jetMaterial);
      jet2.rotation.x = Math.PI;
      
      quasar.add(jet1);
      quasar.add(jet2);
      
      // Random orientation
      quasar.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      
      quasarGroup.add(quasar);
    }
    
    return quasarGroup;
  };
  
  // 5. Cosmic Microwave Background (visual representation)
  const createCMB = () => {
    const cmbRadius = 13.8e9 * LIGHT_YEAR_TO_UNITS; // Edge of observable universe
    const cmbGeometry = new THREE.SphereGeometry(cmbRadius, 32, 32);
    
    // Create temperature fluctuation texture
    const cmbMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        
        // Simple noise function
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
          // CMB temperature fluctuations (very subtle)
          float fluctuation = noise(vUv * 100.0) * 0.0001; // ~0.01% variations
          vec3 cmbColor = vec3(1.0, 0.9, 0.8) * (1.0 + fluctuation);
          
          // Very faint glow
          gl_FragColor = vec4(cmbColor, 0.02);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const cmb = new THREE.Mesh(cmbGeometry, cmbMaterial);
    cmb.name = 'cosmic-microwave-background';
    
    return cmb;
  };
  
  // Helper function to create distant galaxies
  function createDistantGalaxy(type, scale = 1.0) {
    const galaxyGroup = new THREE.Group();
    
    const geometry = new THREE.BufferGeometry();
    const starCount = mobile ? 100 : 500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      let x, y, z;
      
      if (type === 'spiral') {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * MPC_TO_UNITS * scale;
        x = Math.cos(angle) * radius;
        y = (Math.random() - 0.5) * MPC_TO_UNITS * 0.1 * scale;
        z = Math.sin(angle) * radius;
      } else if (type === 'elliptical') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const radius = Math.random() * MPC_TO_UNITS * scale;
        x = radius * Math.sin(phi) * Math.cos(theta);
        y = radius * Math.sin(phi) * Math.sin(theta) * 0.7;
        z = radius * Math.cos(phi) * 0.7;
      } else { // irregular
        x = (Math.random() - 0.5) * MPC_TO_UNITS * scale;
        y = (Math.random() - 0.5) * MPC_TO_UNITS * scale;
        z = (Math.random() - 0.5) * MPC_TO_UNITS * scale;
      }
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Galaxy colors
      if (type === 'spiral') {
        colors[i * 3] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.6 + Math.random() * 0.2;
      }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 20 * scale,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    
    const stars = new THREE.Points(geometry, material);
    galaxyGroup.add(stars);
    
    return galaxyGroup;
  }
  
  // Add all components
  universeGroup.add(createMilkyWay());
  universeGroup.add(createLocalGroup());
  universeGroup.add(createCosmicWeb());
  universeGroup.add(createQuasars());
  if (!mobile) {
    universeGroup.add(createCMB());
  }
  
  scene.add(universeGroup);
  
  return universeGroup;
}