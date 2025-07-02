import * as THREE from 'three';
import { ATMOSPHERE_LAYERS } from '../../utils/constants.js';

export const createAtmosphereLayers = () => {
  const atmGroup = new THREE.Group();

  ATMOSPHERE_LAYERS.forEach(layer => {
    const layerGeometry = new THREE.SphereGeometry(
      6.371 + layer.height, 64, 64
    );
    
    const layerMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        sunDirection: { value: new THREE.Vector3(1, 0.5, 0).normalize() },
        color: { value: new THREE.Color(layer.color) },
        opacity: { value: layer.opacity }
      },
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 sunDirection;
        uniform vec3 color;
        uniform float opacity;
        varying vec3 vNormal;
        
        void main() {
          float fresnel = 1.0 - abs(dot(vNormal, vec3(0, 0, 1)));
          float alpha = fresnel * opacity;
          gl_FragColor = vec4(color, alpha);
        }
      `
    });

    const layerMesh = new THREE.Mesh(layerGeometry, layerMaterial);
    layerMesh.name = layer.name;
    atmGroup.add(layerMesh);
  });

  return atmGroup;
};