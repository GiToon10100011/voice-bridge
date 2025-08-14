// Test setup for Web Speech API mocking
import { vi } from 'vitest';

// Mock window.location to prevent "Cannot redefine property" errors
Object.defineProperty(window, 'location', {
  value: {
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
  },
  writable: true,
  configurable: true
});

// Mock Chrome Extension APIs
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    getURL: vi.fn(path => `chrome-extension://test/${path}`),
    id: 'test-extension-id'
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn()
  }
};

// Mock SpeechSynthesisUtterance
global.SpeechSynthesisUtterance = vi.fn().mockImplementation(text => ({
  text,
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
  onboundary: null
}));

// Mock speechSynthesis
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
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  addEventListener: vi.fn()
};

// Mock console methods to reduce test noise
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn()
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  global.speechSynthesis.speaking = false;
  global.speechSynthesis.pending = false;
  global.speechSynthesis.paused = false;

  // Reset Chrome API mocks
  global.chrome.runtime.sendMessage.mockClear();
  global.chrome.storage.local.get.mockClear();
  global.chrome.storage.local.set.mockClear();

  // Reset location mock
  window.location.href = 'https://example.com';
  window.location.hostname = 'example.com';
});
