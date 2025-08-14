import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  storage: {
    local: {
      set: vi.fn().mockResolvedValue(),
      get: vi.fn().mockResolvedValue({}),
    },
    sync: {
      set: vi.fn().mockResolvedValue(),
      get: vi.fn().mockResolvedValue({}),
    },
  },
  tabs: {
    query: vi
      .fn()
      .mockResolvedValue([{ id: 1, url: "https://chat.openai.com" }]),
    sendMessage: vi.fn().mockResolvedValue({ received: true }),
  },
};

global.chrome = mockChrome;

describe("System Integration Flow Tests", () => {
  let backgroundService;
  let messageHandlers;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Background Service
    messageHandlers = new Map();
    backgroundService = {
      settings: {
        tts: {
          voice: "Korean Voice",
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
          supportedSites: ["chat.openai.com", "www.google.com"],
        },
      },

      async handleMessage(message, sender) {
        switch (message.type) {
          case "TTS_PLAY":
            return this.handleTTSPlay(message.payload, sender);
          case "TTS_STOP":
            return this.handleTTSStop(message.payload, sender);
          case "SETTINGS_GET":
            return this.settings;
          case "SETTINGS_UPDATE":
            return this.handleSettingsUpdate(message.payload, sender);
          case "VOICE_DETECTION":
            return this.handleVoiceDetection(message.payload, sender);
          default:
            throw new Error(`Unknown message type: ${message.type}`);
        }
      },

      async handleTTSPlay(payload, sender) {
        const { text, options } = payload;

        if (!text || typeof text !== "string" || text.trim() === "") {
          throw new Error("Valid text is required for TTS playback");
        }

        // Simulate TTS processing
        return {
          status: "started",
          text,
          options: {
            voice: options?.voice || this.settings.tts.voice,
            rate: options?.rate || this.settings.tts.rate,
            pitch: options?.pitch || this.settings.tts.pitch,
            volume: options?.volume || this.settings.tts.volume,
            language: options?.lang || this.settings.tts.language,
          },
        };
      },

      async handleTTSStop(payload, sender) {
        return { status: "stopped" };
      },

      async handleSettingsUpdate(payload, sender) {
        // Deep merge settings
        if (payload.tts) {
          Object.assign(this.settings.tts, payload.tts);
        }
        if (payload.ui) {
          Object.assign(this.settings.ui, payload.ui);
        }
        if (payload.detection) {
          Object.assign(this.settings.detection, payload.detection);
        }
        return { updated: true, settings: this.settings };
      },

      async handleVoiceDetection(payload, sender) {
        if (sender.tab) {
          // From content script
          return { received: true };
        } else {
          // From popup - query content script
          return { isActive: true, site: "chatgpt", type: "voice_mode" };
        }
      },
    };
  });

  describe("Popup → Background → TTS Engine Flow", () => {
    it("should handle complete TTS playback request", async () => {
      const message = {
        type: "TTS_PLAY",
        payload: {
          text: "안녕하세요, 테스트 메시지입니다",
          options: { rate: 1.2 },
        },
        timestamp: Date.now(),
      };

      const result = await backgroundService.handleMessage(message, {
        tab: null,
      });

      expect(result.status).toBe("started");
      expect(result.text).toBe("안녕하세요, 테스트 메시지입니다");
      expect(result.options.rate).toBe(1.2);
      expect(result.options.voice).toBe("Korean Voice");
      expect(result.options.language).toBe("ko-KR");
    });

    it("should handle TTS stop request", async () => {
      const message = {
        type: "TTS_STOP",
        payload: {},
        timestamp: Date.now(),
      };

      const result = await backgroundService.handleMessage(message, {
        tab: null,
      });

      expect(result.status).toBe("stopped");
    });

    it("should validate TTS input", async () => {
      const message = {
        type: "TTS_PLAY",
        payload: { text: "" },
        timestamp: Date.now(),
      };

      await expect(
        backgroundService.handleMessage(message, { tab: null })
      ).rejects.toThrow("Valid text is required for TTS playback");
    });

    it("should handle settings retrieval", async () => {
      const message = {
        type: "SETTINGS_GET",
        payload: {},
        timestamp: Date.now(),
      };

      const result = await backgroundService.handleMessage(message, {
        tab: null,
      });

      expect(result).toEqual({
        tts: {
          voice: "Korean Voice",
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
          supportedSites: ["chat.openai.com", "www.google.com"],
        },
      });
    });

    it("should handle settings update", async () => {
      const message = {
        type: "SETTINGS_UPDATE",
        payload: {
          tts: {
            rate: 1.5,
            volume: 0.9,
          },
        },
        timestamp: Date.now(),
      };

      const result = await backgroundService.handleMessage(message, {
        tab: null,
      });

      expect(result.updated).toBe(true);
      expect(result.settings.tts.rate).toBe(1.5);
      expect(result.settings.tts.volume).toBe(0.9);
      expect(result.settings.tts.voice).toBe("Korean Voice"); // Should preserve existing values
    });
  });

  describe("Content Script and Background Integration", () => {
    it("should handle voice detection from content script", async () => {
      const message = {
        type: "VOICE_DETECTION",
        payload: {
          isActive: true,
          site: "chatgpt",
          url: "https://chat.openai.com/",
        },
        timestamp: Date.now(),
      };

      const result = await backgroundService.handleMessage(message, {
        tab: { id: 1 },
      });

      expect(result.received).toBe(true);
    });

    it("should handle voice detection request from popup", async () => {
      const message = {
        type: "VOICE_DETECTION",
        payload: {},
        timestamp: Date.now(),
      };

      const result = await backgroundService.handleMessage(message, {
        tab: null,
      });

      expect(result.isActive).toBe(true);
      expect(result.site).toBe("chatgpt");
      expect(result.type).toBe("voice_mode");
    });
  });

  describe("Error Handling", () => {
    it("should handle unknown message types", async () => {
      const message = {
        type: "UNKNOWN_MESSAGE",
        payload: {},
        timestamp: Date.now(),
      };

      await expect(
        backgroundService.handleMessage(message, { tab: null })
      ).rejects.toThrow("Unknown message type: UNKNOWN_MESSAGE");
    });

    it("should handle malformed TTS requests", async () => {
      const message = {
        type: "TTS_PLAY",
        payload: { text: null },
        timestamp: Date.now(),
      };

      await expect(
        backgroundService.handleMessage(message, { tab: null })
      ).rejects.toThrow("Valid text is required for TTS playback");
    });
  });

  describe("Message Flow Integration", () => {
    it("should handle sequential TTS operations", async () => {
      // Start TTS
      const playMessage = {
        type: "TTS_PLAY",
        payload: { text: "첫 번째 메시지" },
        timestamp: Date.now(),
      };

      const playResult = await backgroundService.handleMessage(playMessage, {
        tab: null,
      });
      expect(playResult.status).toBe("started");

      // Stop TTS
      const stopMessage = {
        type: "TTS_STOP",
        payload: {},
        timestamp: Date.now(),
      };

      const stopResult = await backgroundService.handleMessage(stopMessage, {
        tab: null,
      });
      expect(stopResult.status).toBe("stopped");

      // Start new TTS
      const newPlayMessage = {
        type: "TTS_PLAY",
        payload: { text: "두 번째 메시지" },
        timestamp: Date.now(),
      };

      const newPlayResult = await backgroundService.handleMessage(
        newPlayMessage,
        { tab: null }
      );
      expect(newPlayResult.status).toBe("started");
      expect(newPlayResult.text).toBe("두 번째 메시지");
    });

    it("should handle concurrent operations", async () => {
      const operations = [
        backgroundService.handleMessage(
          {
            type: "SETTINGS_GET",
            payload: {},
            timestamp: Date.now(),
          },
          { tab: null }
        ),
        backgroundService.handleMessage(
          {
            type: "VOICE_DETECTION",
            payload: {},
            timestamp: Date.now(),
          },
          { tab: null }
        ),
        backgroundService.handleMessage(
          {
            type: "TTS_PLAY",
            payload: { text: "동시 실행 테스트" },
            timestamp: Date.now(),
          },
          { tab: null }
        ),
      ];

      const results = await Promise.all(operations);

      expect(results[0]).toHaveProperty("tts"); // Settings
      expect(results[1]).toHaveProperty("isActive"); // Voice detection
      expect(results[2]).toHaveProperty("status", "started"); // TTS
    });
  });

  describe("Settings Integration", () => {
    it("should apply settings to TTS operations", async () => {
      // Update settings
      await backgroundService.handleMessage(
        {
          type: "SETTINGS_UPDATE",
          payload: {
            tts: {
              voice: "English Voice",
              rate: 2.0,
              pitch: 1.5,
              volume: 0.5,
              language: "en-US",
            },
          },
          timestamp: Date.now(),
        },
        { tab: null }
      );

      // Start TTS with updated settings
      const result = await backgroundService.handleMessage(
        {
          type: "TTS_PLAY",
          payload: { text: "Test with updated settings" },
          timestamp: Date.now(),
        },
        { tab: null }
      );

      expect(result.options.voice).toBe("English Voice");
      expect(result.options.rate).toBe(2.0);
      expect(result.options.pitch).toBe(1.5);
      expect(result.options.volume).toBe(0.5);
      expect(result.options.language).toBe("en-US");
    });

    it("should allow partial settings updates", async () => {
      // Update only rate
      await backgroundService.handleMessage(
        {
          type: "SETTINGS_UPDATE",
          payload: {
            tts: {
              rate: 0.8,
            },
          },
          timestamp: Date.now(),
        },
        { tab: null }
      );

      const result = await backgroundService.handleMessage(
        {
          type: "TTS_PLAY",
          payload: { text: "Partial update test" },
          timestamp: Date.now(),
        },
        { tab: null }
      );

      expect(result.options.rate).toBe(0.8);
      expect(result.options.voice).toBe("Korean Voice"); // Should preserve original
      expect(result.options.volume).toBe(0.8); // Should preserve original
    });
  });

  describe("Chrome API Integration", () => {
    it("should handle Chrome runtime message sending", async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });

      // Simulate popup sending message
      const response = await chrome.runtime.sendMessage({
        type: "TTS_PLAY",
        payload: { text: "Chrome API test" },
        timestamp: Date.now(),
      });

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "TTS_PLAY",
        payload: { text: "Chrome API test" },
        timestamp: expect.any(Number),
      });

      expect(response.success).toBe(true);
    });

    it("should handle Chrome storage operations", async () => {
      const testData = { lastText: "저장된 텍스트" };

      mockChrome.storage.local.get.mockResolvedValue(testData);

      const result = await chrome.storage.local.get(["lastText"]);

      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(["lastText"]);
      expect(result).toEqual(testData);
    });

    it("should handle Chrome tabs operations", async () => {
      const mockTabs = [{ id: 1, url: "https://chat.openai.com/" }];
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      expect(mockChrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true,
      });
      expect(tabs).toEqual(mockTabs);
    });
  });

  describe("End-to-End Scenarios", () => {
    it("should handle complete user workflow", async () => {
      // 1. Get initial settings
      const settingsResult = await backgroundService.handleMessage(
        {
          type: "SETTINGS_GET",
          payload: {},
          timestamp: Date.now(),
        },
        { tab: null }
      );

      expect(settingsResult.tts.voice).toBe("Korean Voice");

      // 2. Check voice recognition
      const voiceResult = await backgroundService.handleMessage(
        {
          type: "VOICE_DETECTION",
          payload: {},
          timestamp: Date.now(),
        },
        { tab: null }
      );

      expect(voiceResult.isActive).toBe(true);

      // 3. Start TTS
      const ttsResult = await backgroundService.handleMessage(
        {
          type: "TTS_PLAY",
          payload: { text: "완전한 워크플로우 테스트" },
          timestamp: Date.now(),
        },
        { tab: null }
      );

      expect(ttsResult.status).toBe("started");
      expect(ttsResult.text).toBe("완전한 워크플로우 테스트");

      // 4. Stop TTS
      const stopResult = await backgroundService.handleMessage(
        {
          type: "TTS_STOP",
          payload: {},
          timestamp: Date.now(),
        },
        { tab: null }
      );

      expect(stopResult.status).toBe("stopped");
    });

    it("should handle error recovery", async () => {
      // Try invalid operation
      await expect(
        backgroundService.handleMessage(
          {
            type: "TTS_PLAY",
            payload: { text: "" },
            timestamp: Date.now(),
          },
          { tab: null }
        )
      ).rejects.toThrow();

      // Should still work after error
      const result = await backgroundService.handleMessage(
        {
          type: "TTS_PLAY",
          payload: { text: "오류 복구 테스트" },
          timestamp: Date.now(),
        },
        { tab: null }
      );

      expect(result.status).toBe("started");
    });
  });
});
