// Test setup for Web Speech API mocking
import { vi, beforeEach, afterEach } from 'vitest';

// Mock window.location to prevent "Cannot redefine property" errors
const mockLocation = {
  href: 'https://example.com',
  hostname: 'example.com',
  pathname: '/',
  search: '',
  hash: '',
  origin: 'https://example.com',
  protocol: 'https:',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn()
};

Object.defineProperty(global, 'location', {
  value: mockLocation,
  writable: true,
  configurable: true
});

// Mock Chrome Extension APIs with proper error handling
global.chrome = {
  runtime: {
    sendMessage: vi.fn((message, callback) => {
      if (callback) {
        setTimeout(() => callback({ success: true }), 0);
      }
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false)
    },
    getURL: vi.fn(path => `chrome-extension://test/${path}`),
    id: 'test-extension-id',
    lastError: null
  },
  storage: {
    local: {
      get: vi.fn((keys, callback) => {
        const result = {};
        if (callback) {
          setTimeout(() => callback(result), 0);
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items, callback) => {
        if (callback) {
          setTimeout(() => callback(), 0);
        }
        return Promise.resolve();
      }),
      remove: vi.fn((keys, callback) => {
        if (callback) {
          setTimeout(() => callback(), 0);
        }
        return Promise.resolve();
      }),
      clear: vi.fn(callback => {
        if (callback) {
          setTimeout(() => callback(), 0);
        }
        return Promise.resolve();
      })
    },
    sync: {
      get: vi.fn((keys, callback) => {
        const result = {};
        if (callback) {
          setTimeout(() => callback(result), 0);
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items, callback) => {
        if (callback) {
          setTimeout(() => callback(), 0);
        }
        return Promise.resolve();
      }),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  tabs: {
    query: vi.fn((queryInfo, callback) => {
      const tabs = [{ id: 1, url: 'https://example.com', active: true }];
      if (callback) {
        setTimeout(() => callback(tabs), 0);
      }
      return Promise.resolve(tabs);
    }),
    sendMessage: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  permissions: {
    request: vi.fn((permissions, callback) => {
      if (callback) {
        setTimeout(() => callback(true), 0);
      }
      return Promise.resolve(true);
    }),
    contains: vi.fn((permissions, callback) => {
      if (callback) {
        setTimeout(() => callback(true), 0);
      }
      return Promise.resolve(true);
    })
  }
};

// Mock SpeechSynthesisUtterance with proper event handlers
const createMockUtterance = text => {
  const utterance = {
    text: text || '',
    voice: null,
    volume: 1,
    rate: 1,
    pitch: 1,
    lang: '',
    onstart: null,
    onend: null,
    onerror: null,
    onpause: null,
    onresume: null,
    onmark: null,
    onboundary: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  };
  return utterance;
};

global.SpeechSynthesisUtterance = vi.fn().mockImplementation(createMockUtterance);

// Mock speechSynthesis with better implementation
const mockVoices = [
  {
    name: 'Korean Voice',
    lang: 'ko-KR',
    voiceURI: 'ko-KR-voice',
    localService: true,
    default: true
  },
  {
    name: 'English Voice',
    lang: 'en-US',
    voiceURI: 'en-US-voice',
    localService: true,
    default: false
  },
  {
    name: 'Japanese Voice',
    lang: 'ja-JP',
    voiceURI: 'ja-JP-voice',
    localService: true,
    default: false
  }
];

global.speechSynthesis = {
  speaking: false,
  pending: false,
  paused: false,
  getVoices: vi.fn(() => mockVoices),
  speak: vi.fn(utterance => {
    // Set speaking state immediately
    global.speechSynthesis.speaking = true;

    // Simulate async speech with proper null checks
    setTimeout(() => {
      if (utterance && typeof utterance.onstart === 'function') {
        utterance.onstart();
      } else if (utterance && utterance.onstart === null) {
        // Event handler exists but is null, that's fine
      }

      setTimeout(() => {
        global.speechSynthesis.speaking = false;
        if (utterance && typeof utterance.onend === 'function') {
          utterance.onend();
        } else if (utterance && utterance.onend === null) {
          // Event handler exists but is null, that's fine
        }
      }, 10); // Reduced from 50ms to 10ms for faster tests
    }, 1); // Reduced from 5ms to 1ms for faster tests
  }),
  cancel: vi.fn(() => {
    global.speechSynthesis.speaking = false;
  }),
  pause: vi.fn(),
  resume: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Mock other Web APIs
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
);

global.URL = {
  createObjectURL: vi.fn(() => 'blob:test'),
  revokeObjectURL: vi.fn()
};

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  warn: vi.fn(),
  error: vi.fn(),
  log: originalConsole.log // Keep log for debugging
};

// Setup and cleanup hooks
beforeEach(() => {
  // Reset DOM state
  if (typeof document !== 'undefined' && document && document.body) {
    document.body.innerHTML = '';
  }
  if (typeof document !== 'undefined' && document && document.head) {
    document.head.innerHTML = '';
  }

  // Reset location properties safely
  if (global.location) {
    global.location.href = 'https://example.com';
    global.location.hostname = 'example.com';
    global.location.pathname = '/';
    global.location.search = '';
    global.location.hash = '';
  }

  // Reset window.location if it exists
  if (typeof window !== 'undefined' && window) {
    try {
      if (window.location && typeof window.location === 'object') {
        window.location.href = 'https://example.com';
        window.location.hostname = 'example.com';
      }
    } catch (e) {
      // Ignore errors when setting location properties
    }
  }

  // Reset speech synthesis state
  global.speechSynthesis.speaking = false;
  global.speechSynthesis.pending = false;
  global.speechSynthesis.paused = false;
});

afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks();

  // Reset chrome.runtime.lastError
  if (global.chrome && global.chrome.runtime) {
    global.chrome.runtime.lastError = null;
  }

  // Clean up any timers
  vi.clearAllTimers();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  // Ignore test-related rejections
  if (reason && reason.message && reason.message.includes('test')) {
    return;
  }
  console.warn('Unhandled promise rejection in test:', reason);
});
