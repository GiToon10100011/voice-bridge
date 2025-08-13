# TTS Voice Bridge

A Chrome extension that converts text to speech for use with voice recognition systems like ChatGPT voice mode and Google voice search.

## Project Structure

```
tts-voice-bridge/
├── manifest.json          # Extension manifest file
├── popup.html             # Extension popup UI
├── popup.css              # Popup styling
├── popup.js               # Popup functionality
├── background.js          # Background service worker
├── content.js             # Content script for page interaction
├── icons/                 # Extension icons directory
│   └── README.md          # Icon requirements
└── README.md              # This file
```

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this directory
4. The extension should now appear in your extensions list

## Features

- Text-to-speech conversion using Web Speech API
- Integration with ChatGPT voice mode
- Integration with Google voice search
- Customizable voice settings
- Cross-site voice recognition detection

## Development Status

This is the initial project structure. Core functionality will be implemented in subsequent tasks.

## Requirements

- Chrome 88+ or Edge 88+ (Manifest V3 support)
- Web Speech API support
- Microphone permissions for voice recognition integration

## Usage

1. Click the extension icon in the toolbar
2. Enter text in the input field
3. Click "음성 재생" to convert text to speech
4. The generated speech can be picked up by voice recognition systems

## Technical Notes

- Uses Manifest V3 for modern Chrome extension standards
- Implements service worker for background processing
- Content scripts detect voice recognition states on supported sites
- Settings are stored using Chrome Storage API
