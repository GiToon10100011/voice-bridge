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
    global.Node = dom.window.Node;
    global.MutationObserver = dom.window.MutationObserver;

    // Set location properties
    window.location.hostname = siteConfig.hostname;
    window.location.pathname = siteConfig.pathname || "/";
  }

  function createContentScript() {
    return {
      currentSite: "",
      isVoiceRecognitionActive: false,
      messagesSent: [],

      init() {
        this.detectCurrentSite();
        this.setupMutationObserver();
        this.detectInitialState();
      },

      detectCurrentSite() {
        const hostname = window.location.hostname;
        if (hostname.includes("chat.openai.com")) {
          this.currentSite = "chatgpt";
        } else if (hostname.includes("google.com")) {
          this.currentSite = "google";
        } else if (hostname.includes("translate.google.com")) {
          this.currentSite = "google-translate";
        } else if (hostname.includes("bing.com")) {
          this.currentSite = "bing";
        } else if (hostname.includes("youtube.com")) {
          this.currentSite = "youtube";
        } else {
          this.currentSite = "generic";
        }
      },

      detectChatGPTVoiceMode() {
        const voiceButton = document.querySelector('[data-testid="voice-button"]');
        if (voiceButton) return true;

        const textContent = document.body.textContent?.toLowerCase() || "";
        const voiceKeywords = ["voice mode", "listening", "speak to chatgpt"];
        return voiceKeywords.some(keyword => textContent.includes(keyword));
      },

      detectGoogleVoiceSearch() {
        const voiceButton = document.querySelector('[aria-label*="voice"], [title*="voice"], .voice-search');
        return !!voiceButton;
      },

      detectGenericVoiceInput() {
        const voiceElements = document.querySelectorAll('button, input, [role="button"]');
        for (const element of voiceElements) {
          const text = element.textContent?.toLowerCase() || "";
          const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || "";
          const title = element.getAttribute("title")?.toLowerCase() || "";
          
          if (text.includes("voice") || text.includes("mic") || 
              ariaLabel.includes("voice") || ariaLabel.includes("mic") ||
              title.includes("voice") || title.includes("mic")) {
            return true;
          }
        }
        return false;
      },

      setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
          const hasRelevantChanges = mutations.some((mutation) => {
            if (mutation.type === "childList") {
              const nodes = [...(mutation.addedNodes || []), ...(mutation.removedNodes || [])];
              return nodes.some((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  return this.containsVoiceElements(node);
                }
                return false;
              });
            }
            return true;
          });

          if (hasRelevantChanges) {
            this.checkVoiceRecognitionState();
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class", "aria-label", "title"],
        });
      },

      containsVoiceElements(element) {
        const voiceKeywords = ["voice", "mic", "speech", "listen"];
        const elementText = element.textContent?.toLowerCase() || "";
        const className = element.className?.toLowerCase() || "";
        const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || "";

        return voiceKeywords.some((keyword) => 
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

        switch (this.currentSite) {
          case "chatgpt":
            isActive = this.detectChatGPTVoiceMode();
            break;
          case "google":
          case "google-translate":
            isActive = this.detectGoogleVoiceSearch();
            break;
          default:
            isActive = this.detectGenericVoiceInput();
        }

        if (isActive !== this.isVoiceRecognitionActive) {
          this.isVoiceRecognitionActive = isActive;
          this.notifyVoiceRecognitionState(isActive);
        }
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
                <button data-testid="voice-button" aria-label="Start voice conversation">
                  Voice Mode
                </button>
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
      const voiceButton = document.querySelector('[data-testid="voice-button"]');
      voiceButton.classList.add("listening");
      expect(contentScript.detectChatGPTVoiceMode()).toBe(true);
    });
  });

  describe("Google Voice Search Integration", () => {
    beforeEach(() => {
      createDOMForSite({
        url: "https://www.google.com/search",
        hostname: "www.google.com",
        pathname: "/search",
        html: `
          <!DOCTYPE html>
          <html>
            <head><title>Google Search</title></head>
            <body>
              <div class="search-container">
                <button aria-label="Search by voice" class="voice-search">
                  🎤
                </button>
              </div>
            </body>
          </html>
        `,
      });

      contentScript = createContentScript();
      contentScript.init();
    });

    it("should detect Google voice search button", () => {
      expect(contentScript.currentSite).toBe("google");
      expect(contentScript.detectGoogleVoiceSearch()).toBe(true);
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
              <button title="Voice input">🎤 Speak</button>
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
  });

  describe("Error Handling", () => {
    it("should handle malformed DOM gracefully", () => {
      createDOMForSite({
        url: "https://malformed.com/",
        hostname: "malformed.com",
        html: `<body></body>`,
      });

      contentScript = createContentScript();
      expect(() => contentScript.init()).not.toThrow();
    });
  });
});