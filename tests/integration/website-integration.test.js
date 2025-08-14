import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
};

global.chrome = mockChrome;

describe("Website Integration Tests", () => {
  let dom;
  let document;
  let window;
  let contentScript;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (contentScript && contentScript.destroy) {
      contentScript.destroy();
    }
    if (dom) {
      dom.window.close();
    }
  });

  function createDOMForSite(siteConfig) {
    dom = new JSDOM(siteConfig.html, {
      url: siteConfig.url,
      pretendToBeVisual: true,
      resources: "usable",
    });

    document = dom.window.document;
    window = dom.window;

    global.document = document;
    global.window = window;
    global.HTMLElement = window.HTMLElement;
    global.Event = window.Event;
    global.MutationObserver = window.MutationObserver;

    // Mock location
    Object.defineProperty(window, "location", {
      value: {
        hostname: siteConfig.hostname,
        pathname: siteConfig.pathname || "/",
        href: siteConfig.url,
        search: siteConfig.search || "",
      },
      writable: true,
      configurable: true,
    });
  }

  function createContentScript() {
    return {
      isVoiceRecognitionActive: false,
      currentSite: null,
      siteOptimizations: null,
      lastDetectionTime: 0,
      detectionThrottle: 500,
      messagesSent: [],

      init() {
        this.currentSite = this.detectCurrentSite();
        this.siteOptimizations = this.getSiteOptimizations();
        this.setupObservers();
        this.detectInitialState();
      },

      detectCurrentSite() {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;

        if (
          hostname.includes("chat.openai.com") ||
          hostname.includes("chatgpt.com")
        ) {
          return "chatgpt";
        } else if (hostname.includes("google.com")) {
          if (pathname.includes("/search") || pathname === "/") {
            return "google-search";
          } else if (hostname.includes("translate.google.com")) {
            return "google-translate";
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
      },

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
          "google-translate": {
            checkInterval: 800,
            selectors: {
              voiceButton: [
                '[aria-label*="Listen" i]',
                '[aria-label*="Speak" i]',
                ".voice-input-button",
              ],
              activeState: [".recording", ".voice-active"],
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
      },

      setupObservers() {
        const observer = new MutationObserver((mutations) => {
          const now = Date.now();
          if (now - this.lastDetectionTime < this.detectionThrottle) {
            return;
          }
          this.lastDetectionTime = now;

          let shouldCheck = false;
          mutations.forEach((mutation) => {
            if (
              mutation.type === "childList" ||
              mutation.type === "attributes"
            ) {
              if (this.isRelevantMutation(mutation)) {
                shouldCheck = true;
              }
            }
          });

          if (shouldCheck) {
            this.checkVoiceRecognitionState();
          }
        });

        const config = {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: [
            "class",
            "aria-label",
            "aria-pressed",
            "data-listening",
          ],
        };

        observer.observe(document.body, config);
      },

      isRelevantMutation(mutation) {
        const target = mutation.target;

        if (mutation.type === "attributes") {
          const attributeName = mutation.attributeName;
          return [
            "class",
            "aria-label",
            "aria-pressed",
            "data-listening",
          ].includes(attributeName);
        }

        if (mutation.type === "childList") {
          const nodes = [
            ...(mutation.addedNodes || []),
            ...(mutation.removedNodes || []),
          ];
          return nodes.some((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              return this.containsVoiceElements(node);
            }
            return false;
          });
        }

        return true;
      },

      containsVoiceElements(element) {
        const voiceKeywords = ["voice", "mic", "speech", "listen"];
        const elementText = element.textContent?.toLowerCase() || "";
        const className = element.className?.toLowerCase() || "";
        const ariaLabel =
          element.getAttribute("aria-label")?.toLowerCase() || "";

        return voiceKeywords.some(
          (keyword) =>
            elementText.includes(keyword) ||
            className.includes(keyword) ||
            ariaLabel.includes(keyword)
        );
      },

      detectInitialState() {
        setTimeout(() => {
          this.checkVoiceRecognitionState();
        }, 100);
      },

      checkVoiceRecognitionState() {
        let isActive = false;

        try {
          switch (this.currentSite) {
            case "chatgpt":
              isActive = this.detectChatGPTVoiceMode();
              break;
            case "google-search":
              isActive = this.detectGoogleVoiceSearch();
              break;
            case "google-translate":
              isActive = this.detectGoogleTranslateVoice();
              break;
            case "bing":
              isActive = this.detectBingVoiceSearch();
              break;
            case "youtube":
              isActive = this.detectYouTubeVoiceSearch();
              break;
            default:
              isActive = this.detectGenericVoiceInput();
          }
        } catch (error) {
          console.error("Error detecting voice recognition state:", error);
          isActive = this.detectGenericVoiceInput();
        }

        if (isActive !== this.isVoiceRecognitionActive) {
          this.isVoiceRecognitionActive = isActive;
          this.notifyVoiceRecognitionState(isActive);
        }
      },

      detectChatGPTVoiceMode() {
        const selectors = this.siteOptimizations.selectors;

        // Check for voice button
        let voiceButton = false;
        for (const selector of selectors.voiceButton) {
          if (document.querySelector(selector)) {
            voiceButton = true;
            break;
          }
        }

        // Check for active listening state
        let isListening = false;
        for (const selector of selectors.activeState) {
          if (document.querySelector(selector)) {
            isListening = true;
            break;
          }
        }

        // Check for voice mode text
        const voiceModeIndicator = document.body.textContent
          .toLowerCase()
          .includes("voice mode");

        return voiceButton || isListening || voiceModeIndicator;
      },

      detectGoogleVoiceSearch() {
        const selectors = this.siteOptimizations.selectors;

        // Check for voice search button
        let voiceButton = false;
        for (const selector of selectors.voiceButton) {
          const element = document.querySelector(selector);
          if (element && element.offsetParent !== null) {
            voiceButton = true;
            break;
          }
        }

        // Check for active state
        let isActive = false;
        for (const selector of selectors.activeState) {
          if (document.querySelector(selector)) {
            isActive = true;
            break;
          }
        }

        return voiceButton || isActive;
      },

      detectGoogleTranslateVoice() {
        const voiceInputButton = document.querySelector(
          '[aria-label*="Speak" i], [aria-label*="voice input" i]'
        );
        const voiceOutputButton = document.querySelector(
          '[aria-label*="Listen" i], [aria-label*="voice output" i]'
        );
        const isRecording = document.querySelector(
          '.recording, [data-recording="true"]'
        );

        return !!(voiceInputButton || voiceOutputButton || isRecording);
      },

      detectBingVoiceSearch() {
        const voiceButton = document.querySelector(
          '[aria-label*="voice search" i], .voice-icon'
        );
        const isListening = document.querySelector(
          '.listening, [aria-pressed="true"][aria-label*="voice" i]'
        );

        return !!(voiceButton || isListening);
      },

      detectYouTubeVoiceSearch() {
        const voiceSearchButton = document.querySelector(
          '[aria-label*="Search with your voice" i]'
        );
        const isActive = document.querySelector(".voice-search-active");

        return !!(voiceSearchButton || isActive);
      },

      detectGenericVoiceInput() {
        const selectors = this.siteOptimizations.selectors;

        // Check for voice elements
        let hasVoiceElements = false;
        for (const selector of selectors.voiceButton) {
          if (document.querySelector(selector)) {
            hasVoiceElements = true;
            break;
          }
        }

        // Check for active state
        let isActive = false;
        for (const selector of selectors.activeState) {
          if (document.querySelector(selector)) {
            isActive = true;
            break;
          }
        }

        return hasVoiceElements || isActive;
      },

      notifyVoiceRecognitionState(isActive) {
        const message = {
          type: "VOICE_DETECTION",
          payload: {
            isActive,
            site: this.currentSite,
            url: window.location.href,
          },
          timestamp: Date.now(),
        };

        this.messagesSent.push(message);

        // Mock Chrome API call
        chrome.runtime.sendMessage(message).catch((error) => {
          console.error("Failed to notify voice recognition state:", error);
        });
      },

      destroy() {
        // Cleanup
      },
    };
  }

  describe("ChatGPT Voice Mode Integration", () => {
    beforeEach(() => {
      createDOMForSite({
        url: "https://chat.openai.com/",
        hostname: "chat.openai.com",
        pathname: "/",
        html: `
          <!DOCTYPE html>
          <html>
            <head><title>ChatGPT</title></head>
            <body>
              <div class="chat-container">
                <div class="conversation">
                  <p>ChatGPT conversation content</p>
                </div>
                <div class="input-area">
                  <button data-testid="voice-button" aria-label="Start voice conversation">
                    Voice Mode
                  </button>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      contentScript = createContentScript();
      contentScript.init();
    });

    it("should detect ChatGPT voice button", () => {
      expect(contentScript.currentSite).toBe("chatgpt");
      expect(contentScript.detectChatGPTVoiceMode()).toBe(true);
    });

    it("should detect voice mode activation", () => {
      // Add listening state
      const voiceButton = document.querySelector(
        '[data-testid="voice-button"]'
      );
      voiceButton.classList.add("listening");

      expect(contentScript.detectChatGPTVoiceMode()).toBe(true);
    });

    it("should detect voice mode from text content", () => {
      // Remove voice button
      const voiceButton = document.querySelector(
        '[data-testid="voice-button"]'
      );
      voiceButton.remove();

      // Add voice mode text
      document.body.innerHTML += "<div>Voice mode is active</div>";

      expect(contentScript.detectChatGPTVoiceMode()).toBe(true);
    });

    it("should handle voice mode state changes", async () => {
      // Initial detection
      contentScript.checkVoiceRecognitionState();
      expect(contentScript.isVoiceRecognitionActive).toBe(true);
      expect(contentScript.messagesSent).toHaveLength(1);

      // Remove voice button
      const voiceButton = document.querySelector(
        '[data-testid="voice-button"]'
      );
      voiceButton.remove();

      // Check again
      contentScript.checkVoiceRecognitionState();
      expect(contentScript.isVoiceRecognitionActive).toBe(false);
      expect(contentScript.messagesSent).toHaveLength(2);
    });
  });

  describe("Google Voice Search Integration", () => {
    beforeEach(() => {
      createDOMForSite({
        url: "https://www.google.com/search?q=test",
        hostname: "www.google.com",
        pathname: "/search",
        search: "?q=test",
        html: `
          <!DOCTYPE html>
          <html>
            <head><title>Google Search</title></head>
            <body>
              <div class="search-container">
                <input type="text" class="search-input" />
                <button aria-label="Search by voice" class="voice-search-button">
                  <span class="gsri_mic"></span>
                </button>
              </div>
              <div class="search-results">
                <p>Search results...</p>
              </div>
            </body>
          </html>
        `,
      });

      contentScript = createContentScript();
      contentScript.init();
    });

    it("should detect Google voice search button", () => {
      expect(contentScript.currentSite).toBe("google-search");
      expect(contentScript.detectGoogleVoiceSearch()).toBe(true);
    });

    it("should detect active voice search state", () => {
      // Add active state
      const voiceButton = document.querySelector(
        '[aria-label*="Search by voice"]'
      );
      voiceButton.setAttribute("aria-pressed", "true");

      expect(contentScript.detectGoogleVoiceSearch()).toBe(true);
    });

    it("should handle voice search activation", () => {
      contentScript.checkVoiceRecognitionState();
      expect(contentScript.isVoiceRecognitionActive).toBe(true);
      expect(contentScript.messagesSent[0].payload.site).toBe("google-search");
    });
  });

  describe("Google Translate Voice Integration", () => {
    beforeEach(() => {
      createDOMForSite({
        url: "https://translate.google.com/",
        hostname: "translate.google.com",
        pathname: "/",
        html: `
          <!DOCTYPE html>
          <html>
            <head><title>Google Translate</title></head>
            <body>
              <div class="translate-container">
                <div class="input-section">
                  <textarea class="translate-input"></textarea>
                  <button aria-label="Speak to translate" class="voice-input-button">
                    Speak
                  </button>
                </div>
                <div class="output-section">
                  <div class="translate-output"></div>
                  <button aria-label="Listen to translation" class="voice-output-button">
                    Listen
                  </button>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      contentScript = createContentScript();
      contentScript.init();
    });

    it("should detect Google Translate voice buttons", () => {
      expect(contentScript.currentSite).toBe("google-translate");
      expect(contentScript.detectGoogleTranslateVoice()).toBe(true);
    });

    it("should detect recording state", () => {
      // Add recording state
      const inputButton = document.querySelector('[aria-label*="Speak"]');
      inputButton.classList.add("recording");

      expect(contentScript.detectGoogleTranslateVoice()).toBe(true);
    });
  });

  describe("Bing Voice Search Integration", () => {
    beforeEach(() => {
      createDOMForSite({
        url: "https://www.bing.com/search?q=test",
        hostname: "www.bing.com",
        pathname: "/search",
        search: "?q=test",
        html: `
          <!DOCTYPE html>
          <html>
            <head><title>Bing Search</title></head>
            <body>
              <div class="search-container">
                <input type="text" class="search-input" />
                <button aria-label="Voice search" class="voice-icon">
                  Voice
                </button>
              </div>
            </body>
          </html>
        `,
      });

      contentScript = createContentScript();
      contentScript.init();
    });

    it("should detect Bing voice search", () => {
      expect(contentScript.currentSite).toBe("bing");
      expect(contentScript.detectBingVoiceSearch()).toBe(true);
    });
  });

  describe("YouTube Voice Search Integration", () => {
    beforeEach(() => {
      createDOMForSite({
        url: "https://www.youtube.com/",
        hostname: "www.youtube.com",
        pathname: "/",
        html: `
          <!DOCTYPE html>
          <html>
            <head><title>YouTube</title></head>
            <body>
              <div class="search-container">
                <input type="text" class="search-input" />
                <button aria-label="Search with your voice">
                  Voice Search
                </button>
              </div>
            </body>
          </html>
        `,
      });

      contentScript = createContentScript();
      contentScript.init();
    });

    it("should detect YouTube voice search", () => {
      expect(contentScript.currentSite).toBe("youtube");
      expect(contentScript.detectYouTubeVoiceSearch()).toBe(true);
    });
  });

  describe("Generic Website Voice Integration", () => {
    beforeEach(() => {
      createDOMForSite({
        url: "https://example.com/",
        hostname: "example.com",
        pathname: "/",
        html: `
          <!DOCTYPE html>
          <html>
            <head><title>Example Site</title></head>
            <body>
              <div class="app">
                <input type="text" class="voice-input" aria-label="Voice input field" />
                <button class="voice-button" aria-label="Start voice input">
                  Voice
                </button>
              </div>
            </body>
          </html>
        `,
      });

      contentScript = createContentScript();
      contentScript.init();
    });

    it("should detect generic voice input elements", () => {
      expect(contentScript.currentSite).toBe("generic");
      expect(contentScript.detectGenericVoiceInput()).toBe(true);
    });

    it("should handle generic voice activation", () => {
      // Add listening state
      const voiceButton = document.querySelector(".voice-button");
      voiceButton.classList.add("listening");

      expect(contentScript.detectGenericVoiceInput()).toBe(true);
    });
  });

  describe("Cross-Site Voice Recognition Flow", () => {
    it("should handle site navigation and re-detection", () => {
      // Start with ChatGPT
      createDOMForSite({
        url: "https://chat.openai.com/",
        hostname: "chat.openai.com",
        html: `<body><button data-testid="voice-button">Voice</button></body>`,
      });

      contentScript = createContentScript();
      contentScript.init();

      expect(contentScript.currentSite).toBe("chatgpt");
      expect(contentScript.isVoiceRecognitionActive).toBe(true);

      // Simulate navigation to Google
      Object.defineProperty(window, "location", {
        value: {
          hostname: "www.google.com",
          pathname: "/search",
          href: "https://www.google.com/search?q=test",
          search: "?q=test",
        },
        writable: true,
        configurable: true,
      });

      // Update DOM
      document.body.innerHTML = `
        <button aria-label="Search by voice" class="voice-search-button">
          Voice Search
        </button>
      `;

      // Re-initialize
      contentScript.init();

      expect(contentScript.currentSite).toBe("google-search");
      expect(contentScript.detectGoogleVoiceSearch()).toBe(true);
    });

    it("should handle dynamic content changes", async () => {
      createDOMForSite({
        url: "https://chat.openai.com/",
        hostname: "chat.openai.com",
        html: `<body><div class="container"></div></body>`,
      });

      contentScript = createContentScript();
      contentScript.init();

      expect(contentScript.isVoiceRecognitionActive).toBe(false);

      // Simulate dynamic voice button addition
      const voiceButton = document.createElement("button");
      voiceButton.setAttribute("data-testid", "voice-button");
      voiceButton.textContent = "Voice Mode";
      document.querySelector(".container").appendChild(voiceButton);

      // Trigger mutation observer
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check state change
      contentScript.checkVoiceRecognitionState();
      expect(contentScript.isVoiceRecognitionActive).toBe(true);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle malformed DOM gracefully", () => {
      createDOMForSite({
        url: "https://broken-site.com/",
        hostname: "broken-site.com",
        html: `<body><div><span></div></span></body>`, // Malformed HTML
      });

      contentScript = createContentScript();

      // Should not throw
      expect(() => contentScript.init()).not.toThrow();
      expect(contentScript.currentSite).toBe("generic");
    });

    it("should handle missing elements gracefully", () => {
      createDOMForSite({
        url: "https://empty-site.com/",
        hostname: "empty-site.com",
        html: `<body></body>`,
      });

      contentScript = createContentScript();
      contentScript.init();

      expect(contentScript.isVoiceRecognitionActive).toBe(false);
      expect(() => contentScript.checkVoiceRecognitionState()).not.toThrow();
    });

    it("should handle Chrome API failures", () => {
      createDOMForSite({
        url: "https://chat.openai.com/",
        hostname: "chat.openai.com",
        html: `<body><button data-testid="voice-button">Voice</button></body>`,
      });

      // Mock Chrome API failure
      mockChrome.runtime.sendMessage.mockRejectedValue(
        new Error("Extension context invalidated")
      );

      contentScript = createContentScript();
      contentScript.init();

      // Should handle error gracefully
      expect(() => contentScript.checkVoiceRecognitionState()).not.toThrow();
    });
  });
});
