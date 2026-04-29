#!/usr/bin/env node
/**
 * Build Verification Script
 * Checks if the frontend build has proper API configuration
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('Edwardian Academy ERP - Build Verification');
console.log('========================================\n');

const distPath = path.join(__dirname, 'frontend', 'dist');
const indexPath = path.join(distPath, 'index.html');

// Check if dist folder exists
if (!fs.existsSync(distPath)) {
  console.error('❌ Error: dist folder not found at', distPath);
  console.error('Please run "npm run build" in the frontend directory first.\n');
  process.exit(1);
}

console.log('✓ Build folder found:', distPath);

// Check if index.html exists
if (!fs.existsSync(indexPath)) {
  console.error('❌ Error: index.html not found in dist folder');
  process.exit(1);
}

console.log('✓ index.html found');

// Read index.html
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Check for hardcoded localhost references (should NOT exist)
const localhostMatches = indexContent.match(/localhost:5001/g);
if (localhostMatches) {
  console.warn('⚠️  WARNING: Found', localhostMatches.length, 'hardcoded localhost:5001 references');
  console.warn('This might cause issues in production.');
} else {
  console.log('✓ No hardcoded localhost:5001 references found');
}

// Find the main JS bundle
const jsFiles = fs.readdirSync(path.join(distPath, 'assets'))
  .filter(f => f.endsWith('.js') && f.includes('index'));

if (jsFiles.length === 0) {
  console.error('❌ Error: No JavaScript bundle found');
  process.exit(1);
}

console.log('✓ JavaScript bundle found:', jsFiles[0]);

// Read the main JS bundle
const mainJsPath = path.join(distPath, 'assets', jsFiles[0]);
const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

// Check for API configuration logic
const hasWindowCheck = mainJsContent.includes('window.location.hostname');
const hasEdwardiansCheck = mainJsContent.includes('edwardiansacademy.com');
const hasApiDomain = mainJsContent.includes('api.edwardiansacademy.com');

console.log('\nAPI Configuration Check:');
console.log(hasWindowCheck ? '✓' : '❌', 'Runtime hostname detection:', hasWindowCheck);
console.log(hasEdwardiansCheck ? '✓' : '❌', 'Domain check (edwardiansacademy.com):', hasEdwardiansCheck);
console.log(hasApiDomain ? '✓' : '❌', 'API domain (api.edwardiansacademy.com):', hasApiDomain);

// Get build stats
const stats = fs.statSync(distPath);
const files = getAllFiles(distPath);
const totalSize = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);

console.log('\nBuild Statistics:');
console.log('  Total files:', files.length);
console.log('  Total size:', (totalSize / 1024 / 1024).toFixed(2), 'MB');
console.log('  Build date:', stats.mtime.toLocaleString());

// Final verdict
console.log('\n========================================');
if (hasWindowCheck && hasEdwardiansCheck && hasApiDomain) {
  console.log('✅ Build is READY for production deployment!');
  console.log('========================================\n');
  console.log('To deploy, run:');
  console.log('  ./quick-deploy.sh YOUR_VPS_IP');
  console.log('\nOr follow the manual steps in DEPLOYMENT_INSTRUCTIONS.md\n');
  process.exit(0);
} else {
  console.log('⚠️  Build may have issues');
  console.log('========================================\n');
  console.log('Please rebuild the frontend:');
  console.log('  cd frontend');
  console.log('  npm run build\n');
  process.exit(1);
}

// Helper function to get all files recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });
  
  return arrayOfFiles;
}
