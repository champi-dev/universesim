const fs = require('fs');
const path = require('path');

// Ensure lib directory exists
const libDir = path.join(__dirname, '..', 'lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

// Copy necessary files to lib directory
const filesToCopy = [
  'src/NaniteSystemParallel.js',
  'src/ObservableUniverse.js',
  'src/JWSTNebula.js',
  'src/SmoothNavigation.js',
  'src/CameraFocusManager.js',
  'src/data/astronomicalColors.js',
  'src/data/preloadedData.js',
  'src/workers/naniteWorker.js'
];

// Create lib structure
const libStructure = {
  'src': {},
  'src/data': {},
  'src/workers': {}
};

// Create directories
Object.keys(libStructure).forEach(dir => {
  const fullPath = path.join(libDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Copy files
filesToCopy.forEach(file => {
  const srcPath = path.join(__dirname, '..', file);
  const destPath = path.join(libDir, file);
  
  if (fs.existsSync(srcPath)) {
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file}`);
  } else {
    console.warn(`Warning: ${file} not found`);
  }
});

// Update imports in the main index.js to use relative paths
const indexPath = path.join(libDir, 'index.js');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Replace ../src/ with ./src/
indexContent = indexContent.replace(/from '\.\.\/src\//g, "from './src/");

fs.writeFileSync(indexPath, indexContent);

console.log('\nBuild completed successfully!');
console.log('Package is ready to be published.');