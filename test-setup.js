// Test setup for Web Speech API mocking
import { vi } from "vitest";

// Mock SpeechSynthesisUtterance
global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  lang: "",
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onmark: null,
  onboundary: null,
}));

// Mock speechSynthesis
const mockVoices = [
  {
    name: "Korean Voice",
    lang: "ko-KR",
    voiceURI: "ko-KR-voice",
    localService: true,
    default: true,
  },
  {
    name: "English Voice",
    lang: "en-US",
    voiceURI: "en-US-voice",
    localService: true,
    default: false,
  },
  {
    name: "Japanese Voice",
    lang: "ja-JP",
    voiceURI: "ja-JP-voice",
    localService: true,
    default: false,
  },
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
  addEventListener: vi.fn(),
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  global.speechSynthesis.speaking = false;
  global.speechSynthesis.pending = false;
  global.speechSynthesis.paused = false;
});
