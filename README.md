# TTS Voice Bridge

A Chrome extension that converts text to speech for use with voice recognition systems like ChatGPT voice mode and Google voice search.

## Project Structure

```
tts-voice-bridge/
├── manifest.json                    # Extension manifest file
├── src/                            # Source code directory
│   ├── background/                 # Background service worker
│   │   ├── background.js          # Main background service
│   │   ├── permissions-manager.js # Permission management system
│   │   └── error-handler.js       # Global error handling & logging
│   ├── content/                   # Content scripts
│   │   └── content.js             # Page interaction script
│   ├── popup/                     # Extension popup
│   │   ├── popup.html             # Popup UI
│   │   ├── popup.css              # Popup styling
│   │   └── popup.js               # Popup functionality
│   ├── settings/                  # Settings page
│   │   ├── settings.html          # Settings UI
│   │   ├── settings.css           # Settings styling
│   │   └── settings.js            # Settings functionality
│   └── lib/                       # Shared libraries
│       ├── tts-engine.js          # TTS engine with error handling
│       └── tts-settings.js        # Settings management
├── tests/                         # Test files
│   ├── background/                # Background service tests
│   ├── content/                   # Content script tests
│   ├── popup/                     # Popup tests
│   ├── lib/                       # Library tests
│   └── settings/                  # Settings tests
├── icons/                         # Extension icons
└── README.md                      # This file
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

✅ **Completed Features:**

- Project structure organized with proper separation of concerns
- TTS Engine with comprehensive error handling and fallback mechanisms
- Permissions management system with user-friendly guidance
- Global error handling and logging system
- Background service worker with message routing
- Content script for voice recognition detection
- Popup interface for text-to-speech conversion
- Settings page for TTS customization
- Comprehensive test coverage for all components

🚧 **In Progress:**

- Integration testing and bug fixes
- Performance optimizations
- Additional voice recognition site support

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
