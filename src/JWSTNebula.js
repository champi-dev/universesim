import * as THREE from 'three';
import { NEBULA_COLORS } from './data/astronomicalColors';

/**
 * Creates beautiful JWST-inspired nebulae with subtle, artistic rendering
 */
export function createJWSTNebula(nebula, mobile = false) {
  const nebulaGroup = new THREE.Group();
  nebulaGroup.name = `nebula-${nebula.name}`;
  
  // Use real nebula colors based on type
  const nebulaColors = NEBULA_COLORS[nebula.type] || NEBULA_COLORS['emission'];
  const baseSize = (nebula.size || 100) * 50; // Scale up for visibility
  
  // JWST color palette adjustments for more realistic appearance
  const jwstColorAdjustments = {
    emission: { saturation: 0.7, brightness: 0.8 },
    planetary: { saturation: 0.9, brightness: 0.9 },
    reflection: { saturation: 0.4, brightness: 0.7 },
    supernova: { saturation: 0.8, brightness: 0.85 },
    dark: { saturation: 0.3, brightness: 0.2 },
    'star-forming': { saturation: 1.0, brightness: 0.9 }
  };
  
  const colorAdjust = jwstColorAdjustments[nebula.type] || { saturation: 0.7, brightness: 0.7 };
  
  // Create main nebula cloud with volumetric layers
  const createVolumetricCloud = () => {
    const cloudGroup = new THREE.Group();
    const layerCount = mobile ? 3 : 6;
    
    for (let layer = 0; layer < layerCount; layer++) {
      const layerScale = 1 + layer * 0.15;
      const particleCount = mobile ? 200 : 500;
      
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      const opacities = new Float32Array(particleCount);
      
      // Generate particle distribution based on nebula type
      for (let i = 0; i < particleCount; i++) {
        let x, y, z;
        
        if (nebula.type === 'planetary') {
          // Ring/shell structure for planetary nebulae
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);
          const r = baseSize * layerScale * (0.7 + Math.random() * 0.3);
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
        } else if (nebula.type === 'supernova') {
          // Expanding shell structure
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          const r = baseSize * layerScale * (0.8 + Math.random() * 0.2);
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta) * 0.5; // Flattened
          z = r * Math.cos(phi);
        } else {
          // Default cloud structure with pillars
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * baseSize * layerScale;
          const height = (Math.random() - 0.5) * baseSize * 0.6;
          
          // Create pillar-like structures (30% chance)
          if (Math.random() < 0.3) {
            x = Math.cos(angle) * radius * 0.3;
            y = height * 2.5; // Tall pillars
            z = Math.sin(angle) * radius * 0.3;
          } else {
            // Irregular cloud distribution
            x = Math.cos(angle) * radius * (0.5 + Math.random() * 0.5);
            y = height + Math.sin(radius * 0.005) * baseSize * 0.2;
            z = Math.sin(angle) * radius * (0.5 + Math.random() * 0.5);
          }
          
          // Add turbulence
          const turbulence = baseSize * 0.1;
          x += (Math.random() - 0.5) * turbulence;
          y += (Math.random() - 0.5) * turbulence;
          z += (Math.random() - 0.5) * turbulence;
        }
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // Color mixing based on position
        const colorIndex = Math.floor(Math.random() * nebulaColors.length);
        const color = nebulaColors[colorIndex];
        const distanceFromCenter = Math.sqrt(x * x + y * y + z * z) / (baseSize * layerScale);
        
        // Apply JWST-style color adjustments
        colors[i * 3] = color.r * colorAdjust.brightness * (1 - distanceFromCenter * 0.3);
        colors[i * 3 + 1] = color.g * colorAdjust.brightness * (1 - distanceFromCenter * 0.2);
        colors[i * 3 + 2] = color.b * colorAdjust.brightness * (1 - distanceFromCenter * 0.1);
        
        // Size and opacity based on layer and distance
        sizes[i] = (20 + Math.random() * 40) * (1 + layer * 0.2);
        opacities[i] = 0.02 + Math.random() * 0.03; // Very subtle opacity
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
      
      // JWST-inspired shader
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          cameraPos: { value: new THREE.Vector3() },
          nebulaPos: { value: nebulaGroup.position }
        },
        vertexShader: `
          attribute float size;
          attribute float opacity;
          varying vec3 vColor;
          varying float vOpacity;
          varying float vDepth;
          
          void main() {
            vColor = color;
            vOpacity = opacity;
            
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vDepth = -mvPosition.z;
            
            gl_PointSize = size * (2000.0 / vDepth);
            gl_PointSize = clamp(gl_PointSize, 2.0, 80.0);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vOpacity;
          varying float vDepth;
          uniform float time;
          
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float distance = length(coord);
            
            // Soft gaussian cloud
            float strength = exp(-distance * distance * 4.0);
            
            // Add subtle noise for texture
            float noise = sin(gl_PointCoord.x * 20.0 + time * 0.1) * 
                         cos(gl_PointCoord.y * 20.0 - time * 0.15) * 0.05;
            
            // JWST-style bright core with color fringing
            vec3 coreColor = vColor * (1.0 + strength * 1.5);
            vec3 fringeColor = vec3(
              coreColor.r * (1.0 + strength * 0.2),
              coreColor.g * (1.0 + strength * 0.3),
              coreColor.b * (1.0 + strength * 0.5)
            );
            
            // Distance fade for atmospheric perspective
            float distanceFade = 1.0 / (1.0 + vDepth * 0.00001);
            
            vec3 finalColor = mix(fringeColor, coreColor, distance) * distanceFade;
            float finalAlpha = vOpacity * strength * (1.0 + noise);
            
            gl_FragColor = vec4(finalColor, finalAlpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true
      });
      
      const particles = new THREE.Points(geometry, material);
      particles.rotation.y = layer * 0.2;
      particles.userData = { layer };
      cloudGroup.add(particles);
    }
    
    return cloudGroup;
  };
  
  // Add main nebula cloud
  nebulaGroup.add(createVolumetricCloud());
  
  // Add bright stars with JWST diffraction spikes
  const starCount = mobile ? 3 : 8;
  for (let i = 0; i < starCount; i++) {
    const starGroup = new THREE.Group();
    
    // Star core
    const starGeometry = new THREE.SphereGeometry(3, 16, 16);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.5, 1.5, 1.8),
      emissive: new THREE.Color(1, 1, 1),
      emissiveIntensity: 2
    });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    starGroup.add(star);
    
    // Star glow
    const glowGeometry = new THREE.SphereGeometry(15, 16, 16);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        viewVector: { value: new THREE.Vector3() }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vPositionNormal), 2.0);
          vec3 glow = vec3(1.0, 0.95, 0.8) * intensity;
          gl_FragColor = vec4(glow, intensity * 0.4);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    starGroup.add(glow);
    
    // JWST-style diffraction spikes (6-pointed)
    const spikeLength = 60;
    const spikeGeometry = new THREE.BufferGeometry();
    const spikePositions = [];
    
    for (let j = 0; j < 6; j++) {
      const angle = (j / 6) * Math.PI * 2;
      spikePositions.push(0, 0, 0);
      spikePositions.push(
        Math.cos(angle) * spikeLength,
        Math.sin(angle) * spikeLength,
        0
      );
    }
    
    spikeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(spikePositions, 3));
    const spikeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const spikes = new THREE.LineSegments(spikeGeometry, spikeMaterial);
    starGroup.add(spikes);
    
    // Position star within nebula
    starGroup.position.set(
      (Math.random() - 0.5) * baseSize * 1.5,
      (Math.random() - 0.5) * baseSize * 0.8,
      (Math.random() - 0.5) * baseSize * 1.5
    );
    
    nebulaGroup.add(starGroup);
  }
  
  // Position nebula in space
  const distance = nebula.distance * 5000; // Convert kpc to simulation units
  nebulaGroup.position.set(
    Math.cos(nebula.ra * Math.PI / 180) * distance,
    Math.sin(nebula.dec * Math.PI / 180) * distance * 0.5, // Compress vertical
    Math.sin(nebula.ra * Math.PI / 180) * distance
  );
  
  // Store metadata
  nebulaGroup.userData = {
    name: nebula.name,
    type: nebula.type,
    distance: nebula.distance,
    originalPosition: nebulaGroup.position.clone()
  };
  
  return nebulaGroup;
}