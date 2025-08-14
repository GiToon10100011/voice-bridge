# Integration Tests

This directory contains comprehensive integration tests for the TTS Voice Bridge extension.

## Test Files

### system-flow.test.js

Core system integration tests that verify the complete flow between components:

- **Popup → Background → TTS Engine Flow**: Tests the complete TTS playback workflow
- **Content Script and Background Integration**: Tests voice recognition detection and communication
- **Error Handling**: Tests error scenarios and recovery
- **Message Flow Integration**: Tests sequential and concurrent operations
- **Settings Integration**: Tests settings management and application
- **Chrome API Integration**: Tests Chrome extension API interactions
- **End-to-End Scenarios**: Tests complete user workflows

### full-system-integration.test.js

Advanced integration tests with DOM simulation (currently disabled due to JSDOM limitations):

- Full popup UI integration with background service
- Content script integration with various websites
- Cross-component state synchronization
- Multi-component error handling

### website-integration.test.js

Website-specific integration tests (currently disabled due to JSDOM limitations):

- ChatGPT voice mode detection
- Google voice search integration
- Google Translate voice features
- Bing voice search
- YouTube voice search
- Generic website voice input detection

## Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npx vitest --run tests/integration/system-flow.test.js

# Run with watch mode
npm run test:integration:watch
```

## Test Coverage

The integration tests cover:

### 1. Complete TTS Flow

- Text input validation
- TTS engine initialization
- Audio playback simulation
- Progress tracking
- Error handling

### 2. Background Service Integration

- Message routing between components
- Settings management
- Storage operations
- Permission handling

### 3. Content Script Integration

- Voice recognition detection
- Website-specific optimizations
- Dynamic content monitoring
- Cross-site compatibility

### 4. Chrome API Integration

- Runtime messaging
- Storage operations
- Tab management
- Permission requests

### 5. Error Scenarios

- Invalid input handling
- Chrome API failures
- Component communication errors
- Recovery mechanisms

## Test Architecture

The integration tests use a mock-based approach:

1. **Chrome API Mocking**: Complete Chrome extension API simulation
2. **Component Mocking**: Simplified versions of main components
3. **Message Flow Testing**: End-to-end message routing verification
4. **State Management**: Cross-component state synchronization testing

## Requirements Coverage

These tests verify the following requirements from the specification:

- **Requirement 1.1**: Popup UI functionality
- **Requirement 1.2**: Text input and TTS execution
- **Requirement 1.3**: TTS audio playback
- **Requirement 2.1**: ChatGPT voice mode integration
- **Requirement 2.2**: Voice recognition detection
- **Requirement 3.1**: Google voice search integration
- **Requirement 3.2**: Multi-platform voice recognition
- **Requirement 5.1**: TTS settings management
- **Requirement 5.2**: Settings persistence
- **Requirement 6.1**: Browser compatibility
- **Requirement 6.2**: Error handling

## Future Improvements

1. **Real DOM Testing**: Implement proper DOM testing for UI components
2. **Performance Testing**: Add performance benchmarks for TTS operations
3. **Browser Compatibility**: Test across different browser environments
4. **Network Testing**: Add tests for offline scenarios
5. **Accessibility Testing**: Verify accessibility compliance
