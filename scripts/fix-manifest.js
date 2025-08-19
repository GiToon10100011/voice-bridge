#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the manifest.json from dist directory
const manifestPath = path.join(__dirname, '../dist/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Fix the paths for dist directory
manifest.background.service_worker = 'background/background.js';

// Only process content_scripts if they exist
if (manifest.content_scripts) {
  manifest.content_scripts = manifest.content_scripts.map(script => ({
    ...script,
    js: script.js.map(jsPath => jsPath.replace('src/', ''))
  }));
}

manifest.action.default_popup = 'popup/popup.html';

manifest.web_accessible_resources = manifest.web_accessible_resources.map(resource => ({
  ...resource,
  resources: resource.resources.map(res => res.replace('src/', ''))
}));

// Write the fixed manifest back
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('✅ Manifest paths fixed for dist directory');
