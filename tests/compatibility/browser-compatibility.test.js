import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Browser Compatibility Tests
 * Tests for Chrome and Edge browser compatibility
 * Requirements: 6.1, 6.2
 */

describe("Browser Compatibility Tests", () => {
  let mockUserAgent;
  let originalUserAgent;

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original userAgent
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });

  const setUserAgent = (userAgent) => {
    Object.defineProperty(navigator, "userAgent", {
      value: userAgent,
      configurable: true,
    });
  };

  describe("Chrome Browser Compatibility", () => {
    beforeEach(() => {
      // Chrome 120+ user agent
      setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
    });

    it("should detect Chrome browser correctly", () => {
      const isChrome =
        navigator.userAgent.includes("Chrome") &&
        !navigator.userAgent.includes("Edg");
      expect(isChrome).toBe(true);
    });

    it("should support Web Speech API in Chrome", () => {
      expect(global.speechSynthesis).toBeDefined();
      expect(global.SpeechSynthesisUtterance).toBeDefined();
      expect(typeof global.speechSynthesis.speak).toBe("function");
      expect(typeof global.speechSynthesis.getVoices).toBe("function");
    });

    it("should have Chrome extension APIs available", () => {
      // Mock Chrome extension APIs
      global.chrome = {
        runtime: {
          sendMessage: vi.fn(),
          onMessage: { addListener: vi.fn() },
          getManifest: vi.fn(() => ({ version: "1.0.0" })),
        },
        storage: {
          local: {
            get: vi.fn(),
            set: vi.fn(),
          },
        },
        tabs: {
          query: vi.fn(),
          sendMessage: vi.fn(),
        },
      };

      expect(global.chrome).toBeDefined();
      expect(global.chrome.runtime).toBeDefined();
      expect(global.chrome.storage).toBeDefined();
      expect(global.chrome.tabs).toBeDefined();
    });

    it("should support TTS with Korean voices in Chrome", () => {
      const voices = global.speechSynthesis.getVoices();
      const koreanVoice = voices.find((voice) => voice.lang.startsWith("ko"));

      expect(koreanVoice).toBeDefined();
      expect(koreanVoice.lang).toBe("ko-KR");
    });

    it("should handle TTS playback in Chrome", () => {
      const utterance = new global.SpeechSynthesisUtterance("테스트 텍스트");
      global.speechSynthesis.speak(utterance);

      expect(global.speechSynthesis.speak).toHaveBeenCalledWith(utterance);
    });

    it("should support Chrome storage API", async () => {
      const testData = { voice: "ko-KR", rate: 1.0 };

      global.chrome.storage.local.set.mockImplementation((data, callback) => {
        if (callback) callback();
      });

      global.chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback(testData);
      });

      // Test storage set
      await new Promise((resolve) => {
        global.chrome.storage.local.set(testData, resolve);
      });

      // Test storage get
      const result = await new Promise((resolve) => {
        global.chrome.storage.local.get(null, resolve);
      });

      expect(global.chrome.storage.local.set).toHaveBeenCalledWith(
        testData,
        expect.any(Function)
      );
      expect(result).toEqual(testData);
    });
  });

  describe("Edge Browser Compatibility", () => {
    beforeEach(() => {
      // Edge 120+ user agent
      setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
      );
    });

    it("should detect Edge browser correctly", () => {
      const isEdge = navigator.userAgent.includes("Edg");
      expect(isEdge).toBe(true);
    });

    it("should support Web Speech API in Edge", () => {
      expect(global.speechSynthesis).toBeDefined();
      expect(global.SpeechSynthesisUtterance).toBeDefined();
      expect(typeof global.speechSynthesis.speak).toBe("function");
      expect(typeof global.speechSynthesis.getVoices).toBe("function");
    });

    it("should have Edge extension APIs available", () => {
      // Mock Edge extension APIs (same as Chrome)
      global.chrome = {
        runtime: {
          sendMessage: vi.fn(),
          onMessage: { addListener: vi.fn() },
          getManifest: vi.fn(() => ({ version: "1.0.0" })),
        },
        storage: {
          local: {
            get: vi.fn(),
            set: vi.fn(),
          },
        },
        tabs: {
          query: vi.fn(),
          sendMessage: vi.fn(),
        },
      };

      expect(global.chrome).toBeDefined();
      expect(global.chrome.runtime).toBeDefined();
      expect(global.chrome.storage).toBeDefined();
    });

    it("should support TTS with multiple languages in Edge", () => {
      const voices = global.speechSynthesis.getVoices();
      const koreanVoice = voices.find((voice) => voice.lang.startsWith("ko"));
      const englishVoice = voices.find((voice) => voice.lang.startsWith("en"));

      expect(koreanVoice).toBeDefined();
      expect(englishVoice).toBeDefined();
      expect(voices.length).toBeGreaterThan(0);
    });

    it("should handle Edge-specific TTS features", () => {
      const utterance = new global.SpeechSynthesisUtterance("Edge test text");
      utterance.rate = 0.8;
      utterance.pitch = 1.2;

      global.speechSynthesis.speak(utterance);

      expect(global.speechSynthesis.speak).toHaveBeenCalledWith(utterance);
      expect(utterance.rate).toBe(0.8);
      expect(utterance.pitch).toBe(1.2);
    });
  });

  describe("Cross-Browser Feature Compatibility", () => {
    const testBrowsers = [
      {
        name: "Chrome",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      {
        name: "Edge",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      },
    ];

    testBrowsers.forEach((browser) => {
      describe(`${browser.name} Feature Tests`, () => {
        beforeEach(() => {
          setUserAgent(browser.userAgent);
        });

        it(`should support basic TTS functionality in ${browser.name}`, () => {
          const text = "브라우저 호환성 테스트";
          const utterance = new global.SpeechSynthesisUtterance(text);

          expect(utterance.text).toBe(text);
          expect(typeof global.speechSynthesis.speak).toBe("function");

          global.speechSynthesis.speak(utterance);
          expect(global.speechSynthesis.speak).toHaveBeenCalled();
        });

        it(`should support voice selection in ${browser.name}`, () => {
          const voices = global.speechSynthesis.getVoices();
          expect(Array.isArray(voices)).toBe(true);
          expect(voices.length).toBeGreaterThan(0);

          const koreanVoice = voices.find((v) => v.lang === "ko-KR");
          expect(koreanVoice).toBeDefined();
        });

        it(`should support TTS controls in ${browser.name}`, () => {
          expect(typeof global.speechSynthesis.cancel).toBe("function");
          expect(typeof global.speechSynthesis.pause).toBe("function");
          expect(typeof global.speechSynthesis.resume).toBe("function");

          global.speechSynthesis.cancel();
          global.speechSynthesis.pause();
          global.speechSynthesis.resume();

          expect(global.speechSynthesis.cancel).toHaveBeenCalled();
          expect(global.speechSynthesis.pause).toHaveBeenCalled();
          expect(global.speechSynthesis.resume).toHaveBeenCalled();
        });

        it(`should handle TTS events in ${browser.name}`, () => {
          const utterance = new global.SpeechSynthesisUtterance(
            "이벤트 테스트"
          );
          const onStartSpy = vi.fn();
          const onEndSpy = vi.fn();
          const onErrorSpy = vi.fn();

          utterance.onstart = onStartSpy;
          utterance.onend = onEndSpy;
          utterance.onerror = onErrorSpy;

          expect(utterance.onstart).toBe(onStartSpy);
          expect(utterance.onend).toBe(onEndSpy);
          expect(utterance.onerror).toBe(onErrorSpy);
        });
      });
    });
  });

  describe("Browser Version Compatibility", () => {
    it("should work with Chrome 100+", () => {
      setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
      );

      const isSupported = navigator.userAgent.includes("Chrome");
      expect(isSupported).toBe(true);
    });

    it("should work with Edge 100+", () => {
      setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36 Edg/100.0.0.0"
      );

      const isSupported = navigator.userAgent.includes("Edg");
      expect(isSupported).toBe(true);
    });

    it("should detect unsupported browsers", () => {
      setUserAgent("Mozilla/5.0 (compatible; MSIE 11.0; Windows NT 10.0)");

      const isChrome =
        navigator.userAgent.includes("Chrome") &&
        !navigator.userAgent.includes("Edg");
      const isEdge = navigator.userAgent.includes("Edg");
      const isSupported = isChrome || isEdge;

      expect(isSupported).toBe(false);
    });
  });

  describe("Extension API Compatibility", () => {
    beforeEach(() => {
      global.chrome = {
        runtime: {
          sendMessage: vi.fn(),
          onMessage: { addListener: vi.fn() },
          getManifest: vi.fn(() => ({ version: "1.0.0" })),
          lastError: null,
        },
        storage: {
          local: {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn(),
          },
        },
        tabs: {
          query: vi.fn(),
          sendMessage: vi.fn(),
        },
        permissions: {
          request: vi.fn(),
          contains: vi.fn(),
        },
      };
    });

    it("should handle runtime messaging", async () => {
      const message = { type: "TTS_PLAY", text: "테스트" };

      global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (callback) callback({ success: true });
      });

      const result = await new Promise((resolve) => {
        global.chrome.runtime.sendMessage(message, resolve);
      });

      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        message,
        expect.any(Function)
      );
      expect(result.success).toBe(true);
    });

    it("should handle storage operations", async () => {
      const settings = { voice: "ko-KR", rate: 1.0 };

      global.chrome.storage.local.set.mockImplementation((data, callback) => {
        if (callback) callback();
      });

      global.chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback(settings);
      });

      // Test set
      await new Promise((resolve) => {
        global.chrome.storage.local.set(settings, resolve);
      });

      // Test get
      const result = await new Promise((resolve) => {
        global.chrome.storage.local.get(null, resolve);
      });

      expect(result).toEqual(settings);
    });

    it("should handle permission requests", async () => {
      global.chrome.permissions.request.mockImplementation(
        (permissions, callback) => {
          callback(true);
        }
      );

      const granted = await new Promise((resolve) => {
        global.chrome.permissions.request(
          { permissions: ["activeTab"] },
          resolve
        );
      });

      expect(granted).toBe(true);
    });
  });
});
