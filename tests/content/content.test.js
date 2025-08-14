import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";

// Mock Chrome API
const mockChrome = {
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({}),
  },
};

global.chrome = mockChrome;

// Content script class for testing
class ContentScript {
  constructor() {
    this.isVoiceRecognitionActive = false;
    this.currentSite = this.detectCurrentSite();
    this.siteOptimizations = this.getSiteOptimizations();
    this.lastDetectionTime = 0;
    this.detectionThrottle = 500;
  }

  detectCurrentSite() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    if (
      hostname.includes("chat.openai.com") ||
      hostname.includes("chatgpt.com")
    ) {
      return "chatgpt";
    } else if (hostname.includes("translate.google.com")) {
      return "google-translate";
    } else if (hostname.includes("google.com")) {
      if (pathname.includes("/search") || pathname === "/") {
        return "google-search";
      } else {
        return "google";
      }
    } else if (hostname.includes("bing.com")) {
      return "bing";
    } else if (hostname.includes("youtube.com")) {
      return "youtube";
    } else {
      return "generic";
    }
  }

  getSiteOptimizations() {
    const optimizations = {
      chatgpt: {
        checkInterval: 1000,
        selectors: {
          voiceButton: [
            '[data-testid="voice-button"]',
            'button[aria-label*="voice" i]',
            ".voice-mode-button",
          ],
          activeState: [
            ".listening",
            '[data-listening="true"]',
            ".voice-active",
          ],
        },
      },
      "google-search": {
        checkInterval: 500,
        selectors: {
          voiceButton: [
            '[aria-label*="Search by voice" i]',
            ".gsri_mic",
            '[jsaction*="voice"]',
          ],
          activeState: [".listening", '[aria-pressed="true"]'],
        },
      },
      generic: {
        checkInterval: 1500,
        selectors: {
          voiceButton: [
            '[aria-label*="voice" i]',
            '[aria-label*="microphone" i]',
            ".voice-input",
          ],
          activeState: [".listening", ".recording"],
        },
      },
    };

    return optimizations[this.currentSite] || optimizations["generic"];
  }

  detectChatGPTVoiceMode() {
    const voiceSelectors = [
      '[data-testid*="voice"]',
      '[aria-label*="voice" i]',
      '[aria-label*="microphone" i]',
      'button[class*="voice"]',
    ];

    const voiceButton = voiceSelectors.some((selector) =>
      document.querySelector(selector)
    );

    const listeningSelectors = [
      ".listening",
      '[data-listening="true"]',
      '[aria-label*="listening" i]',
    ];

    const isListening = listeningSelectors.some((selector) =>
      document.querySelector(selector)
    );

    return voiceButton || isListening;
  }

  detectGoogleVoiceSearch() {
    const voiceSearchSelectors = [
      '[aria-label*="voice search" i]',
      '[aria-label*="Search by voice" i]',
      '[title*="voice search" i]',
      '[jsaction*="voice"]',
      ".voice-search",
    ];

    const voiceButton = voiceSearchSelectors.some((selector) =>
      document.querySelector(selector)
    );

    const activeVoiceSelectors = [
      '[aria-label*="listening" i]',
      ".listening",
      '[aria-pressed="true"][aria-label*="voice" i]',
    ];

    const isListening = activeVoiceSelectors.some((selector) =>
      document.querySelector(selector)
    );

    return voiceButton || isListening;
  }

  detectGenericVoiceInput() {
    const genericVoiceSelectors = [
      '[aria-label*="voice" i]',
      '[aria-label*="microphone" i]',
      ".voice-input",
      ".microphone",
      'button[class*="voice"]',
    ];

    const voiceElements = genericVoiceSelectors.some((selector) =>
      document.querySelector(selector)
    );

    const activeVoiceSelectors = [
      ".listening",
      ".recording",
      '[data-listening="true"]',
    ];

    const isActiveVoice = activeVoiceSelectors.some((selector) =>
      document.querySelector(selector)
    );

    return voiceElements || isActiveVoice;
  }

  notifyVoiceRecognitionState(isActive) {
    return chrome.runtime
      .sendMessage({
        type: "VOICE_DETECTION",
        payload: {
          isActive,
          site: this.currentSite,
          url: window.location.href,
        },
        timestamp: Date.now(),
      })
      .catch((error) => {
        console.error("Failed to notify voice recognition state:", error);
      });
  }
}

describe("ContentScript", () => {
  let dom;

  const createDOMWithURL = (url) => {
    return new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      url,
      pretendToBeVisual: true,
      resources: "usable",
    });
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (dom) {
      dom.window.close();
    }
  });

  describe("Site Detection", () => {
    it("should detect ChatGPT site correctly", () => {
      dom = createDOMWithURL("https://chat.openai.com/");
      global.window = dom.window;
      global.document = dom.window.document;
      global.location = dom.window.location;

      const script = new ContentScript();
      expect(script.currentSite).toBe("chatgpt");
    });

    it("should detect Google Search site correctly", () => {
      dom = createDOMWithURL("https://www.google.com/search");
      global.window = dom.window;
      global.document = dom.window.document;
      global.location = dom.window.location;

      const script = new ContentScript();
      expect(script.currentSite).toBe("google-search");
    });

    it("should detect Google Translate site correctly", () => {
      dom = createDOMWithURL("https://translate.google.com/");
      global.window = dom.window;
      global.document = dom.window.document;
      global.location = dom.window.location;

      const script = new ContentScript();
      expect(script.currentSite).toBe("google-translate");
    });

    it("should default to generic for unknown sites", () => {
      dom = createDOMWithURL("https://example.com/");
      global.window = dom.window;
      global.document = dom.window.document;
      global.location = dom.window.location;

      const script = new ContentScript();
      expect(script.currentSite).toBe("generic");
    });
  });

  describe("ChatGPT Voice Detection", () => {
    let contentScript;

    beforeEach(() => {
      dom = createDOMWithURL("https://chat.openai.com/");
      global.window = dom.window;
      global.document = dom.window.document;
      global.location = dom.window.location;
      contentScript = new ContentScript();
    });

    it("should detect voice button presence", () => {
      document.body.innerHTML =
        '<button data-testid="voice-button">Voice</button>';

      const result = contentScript.detectChatGPTVoiceMode();
      expect(result).toBe(true);
    });

    it("should detect listening state", () => {
      document.body.innerHTML = '<div class="listening">Listening...</div>';

      const result = contentScript.detectChatGPTVoiceMode();
      expect(result).toBe(true);
    });

    it("should detect voice mode through aria-label", () => {
      document.body.innerHTML =
        '<button aria-label="Start voice conversation">Voice</button>';

      const result = contentScript.detectChatGPTVoiceMode();
      expect(result).toBe(true);
    });

    it("should return false when no voice elements present", () => {
      document.body.innerHTML = "<div>Regular content</div>";

      const result = contentScript.detectChatGPTVoiceMode();
      expect(result).toBe(false);
    });
  });

  describe("Google Voice Search Detection", () => {
    let contentScript;

    beforeEach(() => {
      dom = createDOMWithURL("https://www.google.com/search");
      global.window = dom.window;
      global.document = dom.window.document;
      global.location = dom.window.location;
      contentScript = new ContentScript();
    });

    it("should detect Google voice search button", () => {
      document.body.innerHTML =
        '<button aria-label="Search by voice">🎤</button>';

      const result = contentScript.detectGoogleVoiceSearch();
      expect(result).toBe(true);
    });

    it("should detect voice search through class name", () => {
      document.body.innerHTML = '<div class="voice-search">Voice Search</div>';

      const result = contentScript.detectGoogleVoiceSearch();
      expect(result).toBe(true);
    });

    it("should detect active listening state", () => {
      document.body.innerHTML =
        '<button aria-label="voice search" aria-pressed="true">🎤</button>';

      const result = contentScript.detectGoogleVoiceSearch();
      expect(result).toBe(true);
    });
  });

  describe("Generic Voice Input Detection", () => {
    let contentScript;

    beforeEach(() => {
      dom = createDOMWithURL("https://example.com/");
      global.window = dom.window;
      global.document = dom.window.document;
      global.location = dom.window.location;
      contentScript = new ContentScript();
    });

    it("should detect generic voice input elements", () => {
      document.body.innerHTML = '<input class="voice-input" type="text" />';

      const result = contentScript.detectGenericVoiceInput();
      expect(result).toBe(true);
    });

    it("should detect microphone button", () => {
      document.body.innerHTML = '<button aria-label="microphone">🎤</button>';

      const result = contentScript.detectGenericVoiceInput();
      expect(result).toBe(true);
    });

    it("should detect recording state", () => {
      document.body.innerHTML = '<div class="recording">Recording...</div>';

      const result = contentScript.detectGenericVoiceInput();
      expect(result).toBe(true);
    });
  });

  describe("Background Communication", () => {
    let contentScript;

    beforeEach(() => {
      dom = createDOMWithURL("https://example.com/");
      global.window = dom.window;
      global.document = dom.window.document;
      global.location = dom.window.location;
      contentScript = new ContentScript();
    });

    it("should send message to background script when voice state changes", async () => {
      await contentScript.notifyVoiceRecognitionState(true);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "VOICE_DETECTION",
        payload: {
          isActive: true,
          site: contentScript.currentSite,
          url: window.location.href,
        },
        timestamp: expect.any(Number),
      });
    });

    it("should handle communication errors gracefully", async () => {
      mockChrome.runtime.sendMessage.mockRejectedValue(
        new Error("Communication failed")
      );

      // Should not throw - error is caught and logged
      await expect(
        contentScript.notifyVoiceRecognitionState(false)
      ).resolves.toBeUndefined();
    });
  });

  describe("Site Optimizations", () => {
    it("should return ChatGPT optimizations for ChatGPT site", () => {
      dom = createDOMWithURL("https://chat.openai.com/");
      global.window = dom.window;
      global.document = dom.window.document;
      global.location = dom.window.location;

      const script = new ContentScript();
      const optimizations = script.getSiteOptimizations();

      expect(optimizations.checkInterval).toBe(1000);
      expect(optimizations.selectors.voiceButton).toContain(
        '[data-testid="voice-button"]'
      );
    });

    it("should return Google optimizations for Google Search", () => {
      dom = createDOMWithURL("https://www.google.com/search");
      global.window = dom.window;
      global.document = dom.window.document;
      global.location = dom.window.location;

      const script = new ContentScript();
      const optimizations = script.getSiteOptimizations();

      expect(optimizations.checkInterval).toBe(500);
      expect(optimizations.selectors.voiceButton).toContain(
        '[aria-label*="Search by voice" i]'
      );
    });

    it("should return generic optimizations for unknown sites", () => {
      dom = createDOMWithURL("https://example.com/");
      global.window = dom.window;
      global.document = dom.window.document;
      global.location = dom.window.location;

      const script = new ContentScript();
      const optimizations = script.getSiteOptimizations();

      expect(optimizations.checkInterval).toBe(1500);
      expect(optimizations.selectors.voiceButton).toContain(
        '[aria-label*="voice" i]'
      );
    });
  });

  describe("Edge Cases", () => {
    let contentScript;

    beforeEach(() => {
      dom = createDOMWithURL("https://example.com/");
      global.window = dom.window;
      global.document = dom.window.document;
      global.location = dom.window.location;
      contentScript = new ContentScript();
    });

    it("should handle missing DOM elements gracefully", () => {
      document.body.innerHTML = "";

      expect(() => {
        contentScript.detectChatGPTVoiceMode();
        contentScript.detectGoogleVoiceSearch();
        contentScript.detectGenericVoiceInput();
      }).not.toThrow();
    });

    it("should handle malformed HTML gracefully", () => {
      document.body.innerHTML = '<div><button aria-label="voice"><span></div>';

      expect(() => {
        contentScript.detectGenericVoiceInput();
      }).not.toThrow();
    });

    it("should handle dynamic content changes", () => {
      // Initial state - no voice elements
      document.body.innerHTML = "<div>No voice</div>";
      expect(contentScript.detectGenericVoiceInput()).toBe(false);

      // Add voice element dynamically
      const voiceButton = document.createElement("button");
      voiceButton.setAttribute("aria-label", "voice input");
      document.body.appendChild(voiceButton);

      expect(contentScript.detectGenericVoiceInput()).toBe(true);
    });
  });
});
