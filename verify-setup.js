#!/usr/bin/env node

/**
 * V-Care Mobile App - Pre-Build Verification Script
 * This script checks all configurations before building APK
 * Run: node verify-setup.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
};

console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}  V-Care Mobile App - Setup Verification${colors.reset}`);
console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);

let checksPass = true;

// Check 1: Node.js version
console.log(`${colors.blue}1. Checking Node.js version...${colors.reset}`);
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion >= 18) {
  log.success(`Node.js ${nodeVersion} is compatible`);
} else {
  log.error(`Node.js ${nodeVersion} is too old. Require 18+`);
  checksPass = false;
}

// Check 2: Mobile package.json
console.log(`\n${colors.blue}2. Checking mobile/package.json...${colors.reset}`);
const mobilePackageJson = path.join(__dirname, 'mobile', 'package.json');
if (fs.existsSync(mobilePackageJson)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(mobilePackageJson, 'utf8'));
    if (pkg.dependencies && pkg.dependencies.expo && pkg.dependencies['react-native']) {
      log.success('package.json found with required dependencies');
    } else {
      log.error('Missing required dependencies in package.json');
      checksPass = false;
    }
  } catch (e) {
    log.error(`Error reading package.json: ${e.message}`);
    checksPass = false;
  }
} else {
  log.error('mobile/package.json not found');
  checksPass = false;
}

// Check 3: App.json
console.log(`\n${colors.blue}3. Checking mobile/app.json...${colors.reset}`);
const appJsonPath = path.join(__dirname, 'mobile', 'app.json');
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const requiredFields = ['name', 'slug', 'version', 'icon', 'android'];
    const missingFields = requiredFields.filter(field => !appJson.expo[field]);
    
    if (missingFields.length === 0) {
      log.success('app.json is properly configured');
      log.info(`Package: ${appJson.expo.android.package}`);
      log.info(`Version: ${appJson.expo.version}`);
    } else {
      log.error(`Missing fields in app.json: ${missingFields.join(', ')}`);
      checksPass = false;
    }
  } catch (e) {
    log.error(`Error reading app.json: ${e.message}`);
    checksPass = false;
  }
} else {
  log.error('mobile/app.json not found');
  checksPass = false;
}

// Check 4: Firebase config
console.log(`\n${colors.blue}4. Checking Firebase configuration...${colors.reset}`);
const firebaseConfigPath = path.join(__dirname, 'mobile', 'firebase', 'config.js');
if (fs.existsSync(firebaseConfigPath)) {
  try {
    const configContent = fs.readFileSync(firebaseConfigPath, 'utf8');
    const hasProjectId = configContent.includes('vcare-app-82fed');
    const hasApiKey = configContent.includes('AIzaSyCD0XhDr1djCOQsSOa1irzpGNlNJlUcl2k');
    
    if (hasProjectId && hasApiKey) {
      log.success('Firebase credentials configured');
      log.info('Project: vcare-app-82fed');
    } else {
      log.warn('Firebase credentials may be incomplete');
      if (!hasProjectId) log.error('  - Missing project ID');
      if (!hasApiKey) log.error('  - Missing API key');
    }
  } catch (e) {
    log.error(`Error reading Firebase config: ${e.message}`);
    checksPass = false;
  }
} else {
  log.error('mobile/firebase/config.js not found');
  checksPass = false;
}

// Check 5: API service
console.log(`\n${colors.blue}5. Checking API configuration...${colors.reset}`);
const apiPath = path.join(__dirname, 'mobile', 'services', 'api.js');
if (fs.existsSync(apiPath)) {
  try {
    const apiContent = fs.readFileSync(apiPath, 'utf8');
    if (apiContent.includes('FIREBASE_FUNCTIONS_BASE_URL')) {
      log.success('API is configured to use Firebase Functions');
    } else {
      log.warn('API configuration may need updating');
    }
  } catch (e) {
    log.error(`Error reading API config: ${e.message}`);
    checksPass = false;
  }
} else {
  log.error('mobile/services/api.js not found');
  checksPass = false;
}

// Check 6: node_modules
console.log(`\n${colors.blue}6. Checking dependencies installation...${colors.reset}`);
const nodeModulesPath = path.join(__dirname, 'mobile', 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  const exposePath = path.join(nodeModulesPath, 'expo');
  if (fs.existsSync(exposePath)) {
    log.success('Dependencies appear to be installed');
  } else {
    log.error('Expo not found in node_modules. Run: cd mobile && npm install');
    checksPass = false;
  }
} else {
  log.warn('node_modules not found. Run: cd mobile && npm install');
}

// Check 7: EAS configuration
console.log(`\n${colors.blue}7. Checking EAS configuration...${colors.reset}`);
const easJsonPath = path.join(__dirname, 'mobile', 'eas.json');
if (fs.existsSync(easJsonPath)) {
  try {
    const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
    log.success('eas.json is configured');
  } catch (e) {
    log.error(`Invalid eas.json: ${e.message}`);
    checksPass = false;
  }
} else {
  log.warn('eas.json not found. EAS build may not work. Run: cd mobile && eas init');
}

// Check 8: Backend configuration
console.log(`\n${colors.blue}8. Checking backend setup...${colors.reset}`);
const backendPackageJson = path.join(__dirname, 'backend', 'package.json');
if (fs.existsSync(backendPackageJson)) {
  log.success('Backend project found');
  log.info('Note: Ensure backend is deployed to Firebase Functions for APK');
} else {
  log.warn('Backend project not found in expected location');
}

// Check 9: Firebase Functions
console.log(`\n${colors.blue}9. Checking Firebase Functions...${colors.reset}`);
const functionsPath = path.join(__dirname, 'functions', 'index.js');
if (fs.existsSync(functionsPath)) {
  try {
    const functionsContent = fs.readFileSync(functionsPath, 'utf8');
    const exportedFunctions = (functionsContent.match(/exports\.\w+/g) || []).length;
    if (exportedFunctions > 0) {
      log.success(`Firebase Functions found (${exportedFunctions} functions)`);
      log.info('Reminder: Deploy with: firebase deploy --only functions');
    } else {
      log.error('No functions exported in functions/index.js');
      checksPass = false;
    }
  } catch (e) {
    log.error(`Error reading functions: ${e.message}`);
    checksPass = false;
  }
} else {
  log.error('functions/index.js not found');
  checksPass = false;
}

// Check 10: Required assets
console.log(`\n${colors.blue}10. Checking required assets...${colors.reset}`);
const logoPath = path.join(__dirname, 'mobile', 'assets', 'logo - Edited.png');
if (fs.existsSync(logoPath)) {
  log.success('App logo found');
} else {
  log.warn('Logo file may be missing. App may not build correctly');
}

// Summary
console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
if (checksPass) {
  console.log(`${colors.green}✓ All critical checks passed!${colors.reset}`);
  console.log(`${colors.green}You can proceed with building the APK.${colors.reset}\n`);
  
  console.log(`${colors.yellow}Next steps:${colors.reset}`);
  console.log(`1. cd mobile`);
  console.log(`2. npm install (if not already done)`);
  console.log(`3. firebase deploy --only functions (to deploy backend)`);
  console.log(`4. eas build --platform android --local`);
  console.log();
  
  process.exit(0);
} else {
  console.log(`${colors.red}✗ Some checks failed. Please fix issues above.${colors.reset}\n`);
  console.log(`${colors.yellow}Common fixes:${colors.reset}`);
  console.log(`- Run: cd mobile && npm install`);
  console.log(`- Run: firebase deploy --only functions`);
  console.log(`- Ensure Firebase CLI is installed: npm install -g firebase-tools`);
  console.log(`- Ensure Expo CLI is installed: npm install -g expo-cli`);
  console.log();
  
  process.exit(1);
}
