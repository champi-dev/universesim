# 🌌 Universe Simulation

> A powerful JavaScript library for creating interactive universe simulations with Three.js

> [Live Demo](https://universesim.vercel.app/) | [GitHub](https://github.com/champi-dev/universesim) | [NPM](https://www.npmjs.com/package/universe-simulation)

![NPM Version](https://img.shields.io/npm/v/universe-simulation?style=for-the-badge)
![NPM Downloads](https://img.shields.io/npm/dm/universe-simulation?style=for-the-badge)
![License](https://img.shields.io/npm/l/universe-simulation?style=for-the-badge)
![Three.js](https://img.shields.io/badge/Three.js-r178-black?style=for-the-badge&logo=three.js&logoColor=white)

## 📦 Installation

```bash
npm install universe-simulation
```

## 🚀 Quick Start

```javascript
import UniverseSimulation from 'universe-simulation';

// Create simulation instance
const universe = new UniverseSimulation({
  container: document.getElementById('canvas-container'),
  width: window.innerWidth,
  height: window.innerHeight
});

// Initialize
await universe.init();

// Add a sun
await universe.addSun({
  radius: 10,
  position: new THREE.Vector3(0, 0, 0)
});

// Add Earth
await universe.addPlanet({
  name: 'earth',
  radius: 1,
  distance: 50,
  speed: 0.001,
  color: 0x2233ff
});

// Start the simulation
universe.start();
```

## 🎯 Features

- **🌟 Full Universe Scale**: From planetary surfaces to the edge of the observable universe
- **⚡ High Performance**: Optimized with Nanite-like LOD system and Web Workers
- **🎨 Stunning Visuals**: JWST-inspired nebulae, HDR rendering, custom shaders
- **📱 Mobile Ready**: Touch controls and performance optimizations
- **🔧 Fully Customizable**: Complete API control over all simulation aspects

## 📖 API Documentation

### Core Class: `UniverseSimulation`

#### Constructor Options

```javascript
const universe = new UniverseSimulation({
  container: HTMLElement,     // DOM element to render to (default: document.body)
  width: Number,             // Canvas width (default: window.innerWidth)
  height: Number,            // Canvas height (default: window.innerHeight)
  mobile: Boolean,           // Force mobile mode (auto-detected by default)
  renderOptions: {           // Additional Three.js renderer options
    antialias: Boolean,
    logarithmicDepthBuffer: Boolean
  }
});
```

#### Methods

##### `async init()`
Initialize the simulation. Must be called before adding any objects.

```javascript
await universe.init();
```

##### `async addSun(options)`
Add a star to the simulation.

```javascript
await universe.addSun({
  name: 'sol',                          // Unique identifier
  position: new THREE.Vector3(0, 0, 0), // Position in space
  radius: 10,                           // Size of the sun
  color: STAR_COLORS['G'],              // Star color (G-type by default)
  intensity: 3                          // Light intensity
});
```

##### `async addPlanet(options)`
Add a planet to the simulation.

```javascript
await universe.addPlanet({
  name: 'earth',
  radius: 1,
  distance: 50,        // Orbital distance from center
  speed: 0.001,        // Orbital speed
  texture: null,       // THREE.Texture for planet surface
  color: 0x4444ff      // Color if no texture provided
});
```

##### `async addGalaxy(options)`
Add a galaxy to the simulation.

```javascript
await universe.addGalaxy({
  name: 'andromeda',
  position: new THREE.Vector3(1000, 0, 0),
  type: 'spiral',      // 'spiral', 'elliptical', or 'irregular'
  scale: 1,
  starCount: 50000     // Number of stars (auto-reduced on mobile)
});
```

##### `addNebula(options)`
Add a nebula with JWST-inspired visuals.

```javascript
universe.addNebula({
  name: 'orion',
  position: new THREE.Vector3(100, 50, -200),
  scale: 100,
  type: 'emission'     // Visual style preset
});
```

##### `createObservableUniverse()`
Generate the entire observable universe with galaxies, clusters, and cosmic web.

```javascript
universe.createObservableUniverse();
```

##### `focusOn(name, options)`
Smoothly focus the camera on a celestial object.

```javascript
universe.focusOn('earth', {
  distance: 10,        // Distance from object
  duration: 2000       // Animation duration in ms
});
```

##### `start()` / `stop()`
Control simulation playback.

```javascript
universe.start();  // Begin animation loop
universe.stop();   // Pause animation loop
```

##### `togglePause()`
Toggle simulation pause state.

```javascript
const isPaused = universe.togglePause();
```

##### `setTimeScale(scale)`
Control simulation speed.

```javascript
universe.setTimeScale(10);  // 10x speed
```

##### `resize(width, height)`
Handle window resizing.

```javascript
window.addEventListener('resize', () => {
  universe.resize(window.innerWidth, window.innerHeight);
});
```

##### `dispose()`
Clean up all resources.

```javascript
universe.dispose();
```

##### `getInternals()`
Access Three.js internals for advanced usage.

```javascript
const { scene, camera, renderer, THREE } = universe.getInternals();
```

## 🎨 Visual Constants

### Star Colors
```javascript
import { STAR_COLORS } from 'universe-simulation';

// Available star types
STAR_COLORS['O']  // Blue
STAR_COLORS['B']  // Blue-white
STAR_COLORS['A']  // White
STAR_COLORS['F']  // Yellow-white
STAR_COLORS['G']  // Yellow (Sun-like)
STAR_COLORS['K']  // Orange
STAR_COLORS['M']  // Red
```

### Nebula Colors
```javascript
import { NEBULA_COLORS } from 'universe-simulation';

// Emission, reflection, and other nebula color presets
```

## 📚 Examples

### Complete Solar System

```javascript
import UniverseSimulation, { AU_SCALE } from 'universe-simulation';

async function createSolarSystem() {
  const universe = new UniverseSimulation({
    container: document.getElementById('universe')
  });
  
  await universe.init();
  
  // Add Sun
  await universe.addSun({
    name: 'sun',
    radius: 10
  });
  
  // Add planets
  const planets = [
    { name: 'mercury', radius: 0.4, distance: 0.39 * AU_SCALE, speed: 0.002 },
    { name: 'venus', radius: 0.9, distance: 0.72 * AU_SCALE, speed: 0.0015 },
    { name: 'earth', radius: 1, distance: 1 * AU_SCALE, speed: 0.001 },
    { name: 'mars', radius: 0.5, distance: 1.52 * AU_SCALE, speed: 0.0008 },
    { name: 'jupiter', radius: 11, distance: 5.2 * AU_SCALE, speed: 0.0004 },
    { name: 'saturn', radius: 9, distance: 9.5 * AU_SCALE, speed: 0.0003 },
    { name: 'uranus', radius: 4, distance: 19.2 * AU_SCALE, speed: 0.0002 },
    { name: 'neptune', radius: 3.8, distance: 30 * AU_SCALE, speed: 0.0001 }
  ];
  
  for (const planet of planets) {
    await universe.addPlanet(planet);
  }
  
  universe.start();
  
  // Focus on Earth after 2 seconds
  setTimeout(() => {
    universe.focusOn('earth', { distance: 20 });
  }, 2000);
}

createSolarSystem();
```

### Galaxy Cluster Visualization

```javascript
async function createGalaxyCluster() {
  const universe = new UniverseSimulation();
  await universe.init();
  
  // Create multiple galaxies
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const distance = 5000 + Math.random() * 5000;
    
    await universe.addGalaxy({
      name: `galaxy-${i}`,
      position: new THREE.Vector3(
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * 1000,
        Math.sin(angle) * distance
      ),
      type: ['spiral', 'elliptical', 'irregular'][Math.floor(Math.random() * 3)],
      scale: 0.5 + Math.random() * 1.5
    });
  }
  
  universe.start();
}
```

### Using with React

```javascript
import React, { useEffect, useRef } from 'react';
import UniverseSimulation from 'universe-simulation';

function UniverseComponent() {
  const containerRef = useRef();
  const universeRef = useRef();
  
  useEffect(() => {
    async function init() {
      const universe = new UniverseSimulation({
        container: containerRef.current
      });
      
      await universe.init();
      await universe.addSun();
      await universe.addPlanet({ name: 'earth', distance: 50 });
      
      universe.start();
      universeRef.current = universe;
    }
    
    init();
    
    return () => {
      if (universeRef.current) {
        universeRef.current.dispose();
      }
    };
  }, []);
  
  return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />;
}
```

## 🎮 Controls

The simulation includes built-in navigation controls:

### Desktop
- **WASD** - Movement
- **Mouse** - Look around
- **Space/Shift** - Up/Down
- **Scroll** - Adjust speed

### Mobile
- **Touch** - Look around
- **Pinch** - Zoom
- **Double tap** - Move forward

## ⚡ Performance Optimization

### Nanite-like LOD System
The library includes an advanced LOD system that automatically adjusts object detail based on distance.

### Web Workers
Heavy computations are offloaded to Web Workers for smooth performance.

### Mobile Optimization
```javascript
// The library automatically detects and optimizes for mobile
const universe = new UniverseSimulation({
  mobile: true  // Force mobile optimizations
});
```

## 🛠️ Advanced Usage

### Custom Shaders
```javascript
const customMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color(0xff0000) }
  },
  vertexShader: `...`,
  fragmentShader: `...`
});

await universe.addPlanet({
  name: 'custom-planet',
  radius: 2,
  distance: 100,
  material: customMaterial  // Use custom material
});
```

### Accessing Three.js
```javascript
const { scene, camera, renderer, THREE } = universe.getInternals();

// Add custom objects directly
const customMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
scene.add(customMesh);
```

## 🛠️ Development

### Clone the repository
```bash
git clone https://github.com/champi-dev/universesim.git
cd universesim
npm install
```

### Run the demo locally
```bash
npm start
```

### Build the library
```bash
npm run build:lib
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request to the [GitHub repository](https://github.com/champi-dev/universesim).

## 🐛 Issues

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/champi-dev/universesim/issues).

## 🙏 Acknowledgments

- NASA for astronomical data
- Three.js community
- JWST team for visual inspiration

---

<div align="center">

**Build your own universe, one star at a time** ⭐

</div>