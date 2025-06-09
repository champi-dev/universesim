# 🌌 Universe Simulation: Your Personal Cosmos Explorer

> _"The universe is not only queerer than we suppose, but queerer than we can suppose."_ - J.B.S. Haldane

Welcome to your own interactive universe! This isn't just another space visualization - it's a fully explorable cosmos that scales from the surface of planets to the edge of the observable universe. Built with Three.js and React, this simulation puts you in the pilot seat of your own cosmic journey.

![Universe Simulation](https://img.shields.io/badge/Universe-Simulation-blueviolet?style=for-the-badge&logo=react&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js&logoColor=white)
![WebGL](https://img.shields.io/badge/WebGL-Powered-red?style=for-the-badge&logo=webgl&logoColor=white)

## 🚀 What Makes This Special?

### 🎮 Seamless Scale Transitions

Watch the UI adapt as you zoom from planetary surfaces to intergalactic space. The simulation dynamically adjusts fog, star sizes, and object visibility based on your current scale.

### 🌟 Real Astronomical Objects

- **Known Exoplanets**: Visit Proxima Centauri b, the TRAPPIST-1 system, and more
- **Famous Nebulae**: Orion, Eagle, Crab, Helix, and Rosette nebulae with custom shaders
- **Named Galaxies**: Andromeda, Triangulum, Whirlpool, and Sombrero galaxies
- **Kuiper Belt Objects**: Pluto, Eris, Makemake, and Haumea
- **Voyager Probes**: See where Voyager 1 & 2 are (approximately)

### 🎨 JWST-Inspired Visuals

Three stunning nebulae rendered with multi-layered particle systems inspired by James Webb Space Telescope imagery:

- Pillars of Creation style with browns, golds, and blues
- Carina Nebula style with pinks, oranges, and turquoise
- Supernova remnant style with vibrant blues, greens, and purples

### ⚡ Dynamic Effects

- **Lightning bolts** randomly arc through space
- **Animated sun** with custom shader effects
- **Orbiting planets** with realistic speeds
- **Comet with tail** following elliptical path
- **Saturn's rings** and Jupiter's moons
- **Black hole** with swirling accretion disk at galactic center

## 🎯 Controls

### 💻 Desktop Controls

- **Click** anywhere to capture mouse
- **WASD** - Move forward/backward/left/right
- **Mouse** - Look around
- **Space/Shift** - Move up/down
- **ESC** - Release mouse

### 📱 Mobile Controls

- **Tap** - Move forward
- **Drag** - Look around
- **Pinch** - Zoom in/out

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/champi-dev/universe-simulation.git
   cd universe-simulation
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the cosmic journey**

   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000` and prepare for liftoff! 🚀

## 📊 Scale Levels

As you explore, you'll transition through six distinct scales:

| Scale                    | Icon | Distance Range | What You'll See                       |
| ------------------------ | ---- | -------------- | ------------------------------------- |
| **Planetary**            | 🌍   | < 50 units     | Planet surfaces, detailed textures    |
| **Solar System**         | ☀️   | 50 - 1,000     | All planets, asteroid belt, comet     |
| **Stellar Neighborhood** | ⭐   | 1K - 10K       | Nearby stars, nebulae begin to appear |
| **Local Stars**          | ✨   | 10K - 100K     | Star clusters, more nebulae           |
| **Galactic View**        | 🌌   | 100K - 1M      | Milky Way band, distant galaxies      |
| **Universe Scale**       | 🌠   | > 1M           | Galaxy clusters, cosmic web hints     |

## 🎨 Technical Highlights

### Performance Optimizations

- **Dynamic LOD**: Objects hide/show based on distance
- **Adaptive fog density**: Changes with scale for better depth perception
- **Efficient particle systems**: 50,000+ stars rendered smoothly
- **Custom shaders**: For sun, nebulae, and black hole effects

### Shader Magic ✨

```glsl
// Example: Sun's animated surface
float noise = sin(position.x * 0.3 + time) * cos(position.y * 0.3 - time * 0.8) * 0.5;
pos += normal * noise;
```

### Mobile Responsiveness

- Touch gesture support with pinch-to-zoom
- Simplified UI for smaller screens
- Performance adjustments for mobile GPUs

## 🌍 Featured Locations

### Must-Visit Destinations

1. **Saturn** - Don't miss the rings!
2. **Jupiter** - Watch the four Galilean moons orbit
3. **The Black Hole** - At coordinates (0, 0, -50000)
4. **JWST Nebulae** - Three stunning nebulae at:
   - (500, 100, -300) - Pillars style
   - (-600, -100, 400) - Carina style
   - (200, -200, 600) - Supernova style

### Easter Eggs 🥚

- Lightning bolts appear randomly - catch them if you can!
- The comet follows a complex 3D path
- Voyager probes are out there... somewhere
- Named asteroids in the belt: Ceres, Vesta, Pallas, Hygiea

## ⚙️ Customization

### Time Control

Use the time speed slider (0x to 10x) to:

- Watch planets race around the sun
- See Jupiter's moons dance
- Speed up the comet's journey

### Adding Your Own Objects

```javascript
// Add a custom planet
const myPlanet = {
  name: "MyWorld",
  radius: 7,
  distance: 250,
  color: 0x00ff00,
  speed: 0.4,
  detail: 3,
};
```

## 🐛 Troubleshooting

### Common Issues

**"Black screen on load"**

- Check if WebGL is enabled in your browser
- Try updating your graphics drivers
- Check console for errors (F12)

**"Low FPS on mobile"**

- The simulation is GPU-intensive
- Try closing other apps
- Reduce browser zoom level

**"Can't move with keyboard"**

- Click on the canvas first to capture mouse
- Make sure the window has focus
- Check if another app is intercepting keys

## 📚 Learning Resources

Want to understand the code better?

- [Three.js Documentation](https://threejs.org/docs/)
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [Shader Programming](https://thebookofshaders.com/)
- [Orbital Mechanics](https://orbital-mechanics.space/)

## 🤝 Contributing

Found a bug? Want to add a feature? Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- NASA for inspiration and data on real astronomical objects
- Three.js community for the amazing framework
- JWST team for the stunning space imagery that inspired our nebulae
- You, for exploring the cosmos with us!

---

<div align="center">

**Remember: The universe is vast, but your imagination is infinite.**

_Now go forth and explore!_ 🚀✨

</div>

## 📸 Screenshots

| Feature                  | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| 🪐 **Solar System View** | All eight planets with accurate relative sizes and orbits |
| 🌟 **JWST Nebulae**      | Multi-layered particle systems with animated effects      |
| ⚫ **Black Hole**        | Complete with swirling accretion disk                     |
| 🌌 **Galaxy Clusters**   | Procedurally generated spiral galaxies                    |
| ⚡ **Dynamic Lightning** | Random electrical storms in space                         |

---

<div align="center">

Made with ❤️ and a lot of ☕ by space enthusiasts, for space enthusiasts

</div>
