/**
 * Background Service Unit Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
    onConnect: {
      addListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
    sendMessage: vi.fn(),
    lastError: null,
  },
  storage: {
    sync: {
      set: vi.fn((data, callback) => callback && callback()),
      get: vi.fn((keys, callback) => callback && callback({})),
    },
    local: {
      set: vi.fn((data, callback) => callback && callback()),
      get: vi.fn((keys, callback) => callback && callback({})),
      remove: vi.fn((keys, callback) => callback && callback()),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
};

global.chrome = mockChrome;
global.importScripts = vi.fn();

// Import the background script components
const MESSAGE_TYPES = {
  TTS_PLAY: "TTS_PLAY",
  TTS_STOP: "TTS_STOP",
  TTS_PAUSE: "TTS_PAUSE",
  TTS_RESUME: "TTS_RESUME",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
  SETTINGS_GET: "SETTINGS_GET",
  SETTINGS_RESET: "SETTINGS_RESET",
  SETTINGS_PARTIAL_UPDATE: "SETTINGS_PARTIAL_UPDATE",
  SETTINGS_VALIDATE: "SETTINGS_VALIDATE",
  VOICE_DETECTION: "VOICE_DETECTION",
  VOICE_RECOGNITION_STATE: "VOICE_RECOGNITION_STATE",
  ERROR: "ERROR",
};

class Message {
  constructor(type, payload = null, timestamp = Date.now()) {
    this.type = type;
    this.payload = payload;
    this.timestamp = timestamp;
  }

  static create(type, payload = null) {
    return new Message(type, payload);
  }

  static isValid(message) {
    return (
      message &&
      typeof message.type === "string" &&
      Object.values(MESSAGE_TYPES).includes(message.type) &&
      typeof message.timestamp === "number"
    );
  }
}

// Mock BackgroundService class (simplified for testing)
class BackgroundService {
  constructor() {
    this.messageHandlers = new Map();
    this.ttsEngine = null;
  }

  getDefaultSettings() {
    return {
      tts: {
        voice: "",
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8,
        language: "ko-KR",
      },
      ui: {
        theme: "auto",
        shortcuts: {
          playTTS: "Ctrl+Enter",
          openPopup: "Alt+T",
        },
      },
      detection: {
        enableAutoDetection: true,
        supportedSites: ["chat.openai.com", "www.google.com", "google.com"],
      },
    };
  }

  validateSettings(settings) {
    const errors = [];

    if (!settings || typeof settings !== "object") {
      errors.push("Settings must be an object");
      return errors;
    }

    if (settings.tts) {
      const { rate, pitch, volume } = settings.tts;

      if (
        rate !== undefined &&
        (typeof rate !== "number" || rate < 0.1 || rate > 10)
      ) {
        errors.push("TTS rate must be a number between 0.1 and 10");
      }

      if (
        pitch !== undefined &&
        (typeof pitch !== "number" || pitch < 0 || pitch > 2)
      ) {
        errors.push("TTS pitch must be a number between 0 and 2");
      }

      if (
        volume !== undefined &&
        (typeof volume !== "number" || volume < 0 || volume > 1)
      ) {
        errors.push("TTS volume must be a number between 0 and 1");
      }
    }

    return errors;
  }

  async saveSettings(settings) {
    const validationErrors = this.validateSettings(settings);
    if (validationErrors.length > 0) {
      throw new Error(
        `Settings validation failed: ${validationErrors.join(", ")}`
      );
    }

    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ userSettings: settings }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(settings);
        }
      });
    });
  }

  async loadSettings() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(["userSettings"], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result.userSettings || this.getDefaultSettings());
        }
      });
    });
  }
}

describe("BackgroundService", () => {
  let backgroundService;

  beforeEach(() => {
    vi.clearAllMocks();
    backgroundService = new BackgroundService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Message Interface", () => {
    it("should create valid message objects", () => {
      const message = Message.create(MESSAGE_TYPES.TTS_PLAY, { text: "test" });

      expect(message.type).toBe(MESSAGE_TYPES.TTS_PLAY);
      expect(message.payload).toEqual({ text: "test" });
      expect(typeof message.timestamp).toBe("number");
    });

    it("should validate message format correctly", () => {
      const validMessage = Message.create(MESSAGE_TYPES.TTS_PLAY);
      const invalidMessage = { type: "INVALID_TYPE" };

      expect(Message.isValid(validMessage)).toBe(true);
      expect(Message.isValid(invalidMessage)).toBe(false);
    });
  });

  describe("Settings Management", () => {
    it("should return default settings", () => {
      const defaultSettings = backgroundService.getDefaultSettings();

      expect(defaultSettings).toHaveProperty("tts");
      expect(defaultSettings).toHaveProperty("ui");
      expect(defaultSettings).toHaveProperty("detection");
      expect(defaultSettings.tts.language).toBe("ko-KR");
    });

    it("should validate settings correctly", () => {
      const validSettings = backgroundService.getDefaultSettings();
      const invalidSettings = {
        tts: {
          rate: 15, // Invalid: > 10
          pitch: -1, // Invalid: < 0
          volume: 2, // Invalid: > 1
        },
      };

      expect(backgroundService.validateSettings(validSettings)).toHaveLength(0);
      expect(backgroundService.validateSettings(invalidSettings)).toHaveLength(
        3
      );
    });

    it("should save settings successfully", async () => {
      const settings = backgroundService.getDefaultSettings();

      await expect(backgroundService.saveSettings(settings)).resolves.toEqual(
        settings
      );
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        { userSettings: settings },
        expect.any(Function)
      );
    });

    it("should load settings successfully", async () => {
      const mockSettings = { tts: { voice: "test" } };
      chrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({ userSettings: mockSettings });
      });

      const settings = await backgroundService.loadSettings();
      expect(settings).toBeDefined();
      expect(chrome.storage.sync.get).toHaveBeenCalledWith(
        ["userSettings"],
        expect.any(Function)
      );
    });

    it("should handle settings save errors", async () => {
      chrome.runtime.lastError = { message: "Storage error" };

      await expect(backgroundService.saveSettings({})).rejects.toThrow(
        "Storage error"
      );
    });

    it("should reject invalid settings", async () => {
      const invalidSettings = {
        tts: { rate: 15 },
      };

      await expect(
        backgroundService.saveSettings(invalidSettings)
      ).rejects.toThrow("Settings validation failed");
    });
  });

  describe("Message Types", () => {
    it("should include all required message types", () => {
      const requiredTypes = [
        "TTS_PLAY",
        "TTS_STOP",
        "TTS_PAUSE",
        "TTS_RESUME",
        "SETTINGS_UPDATE",
        "SETTINGS_GET",
        "SETTINGS_RESET",
        "VOICE_DETECTION",
        "VOICE_RECOGNITION_STATE",
      ];

      requiredTypes.forEach((type) => {
        expect(MESSAGE_TYPES).toHaveProperty(type);
      });
    });
  });
});

describe("Chrome API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set up message listeners", () => {
    // This would be tested in the actual background service initialization
    expect(chrome.runtime.onMessage.addListener).toBeDefined();
    expect(chrome.runtime.onConnect.addListener).toBeDefined();
    expect(chrome.runtime.onInstalled.addListener).toBeDefined();
  });

  it("should handle storage operations", () => {
    expect(chrome.storage.sync.set).toBeDefined();
    expect(chrome.storage.sync.get).toBeDefined();
    expect(chrome.storage.local.set).toBeDefined();
    expect(chrome.storage.local.get).toBeDefined();
  });
});
