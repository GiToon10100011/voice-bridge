// Content Script for Voice Recognition Detection
class ContentScript {
  constructor() {
    this.isVoiceRecognitionActive = false;
    this.currentSite = this.detectCurrentSite();
    this.siteOptimizations = this.getSiteOptimizations();
    this.lastDetectionTime = 0;
    this.detectionThrottle = 500; // ms
    this.init();
  }

  init() {
    console.log("TTS Voice Bridge content script loaded on:", this.currentSite);
    this.setupObservers();
    this.detectInitialState();
  }

  detectCurrentSite() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    if (
      hostname.includes("chat.openai.com") ||
      hostname.includes("chatgpt.com")
    ) {
      return "chatgpt";
    } else if (hostname.includes("google.com")) {
      // Differentiate between different Google services
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
        waitForElement: true,
        retryCount: 3,
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
        waitForElement: false,
        retryCount: 2,
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
        waitForElement: true,
        retryCount: 2,
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
        waitForElement: false,
        retryCount: 1,
      },
    };

    return optimizations[this.currentSite] || optimizations["generic"];
  }

  setupObservers() {
    // Set up mutation observer with site-specific optimizations
    const observer = new MutationObserver((mutations) => {
      const now = Date.now();
      if (now - this.lastDetectionTime < this.detectionThrottle) {
        return; // Throttle detection calls
      }
      this.lastDetectionTime = now;

      let shouldCheck = false;
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" || mutation.type === "attributes") {
          // Site-specific optimization: only check if relevant changes occurred
          if (this.isRelevantMutation(mutation)) {
            shouldCheck = true;
          }
        }
      });

      if (shouldCheck) {
        this.checkVoiceRecognitionStateOptimized();
      }
    });

    // Site-specific observer configuration
    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: this.getRelevantAttributes(),
    };

    observer.observe(document.body, config);

    // Set up periodic checks for sites that need it
    if (this.siteOptimizations.checkInterval) {
      setInterval(() => {
        this.checkVoiceRecognitionStateOptimized();
      }, this.siteOptimizations.checkInterval);
    }
  }

  getRelevantAttributes() {
    const baseAttributes = [
      "class",
      "aria-label",
      "aria-pressed",
      "data-listening",
    ];

    switch (this.currentSite) {
      case "chatgpt":
        return [...baseAttributes, "data-testid", "data-voice"];
      case "google-search":
      case "google-translate":
        return [...baseAttributes, "jsaction", "data-ved"];
      default:
        return [...baseAttributes, "data-*"];
    }
  }

  isRelevantMutation(mutation) {
    const target = mutation.target;

    // Check if the mutation affects voice-related elements
    if (mutation.type === "attributes") {
      const attributeName = mutation.attributeName;
      return (
        this.getRelevantAttributes().includes(attributeName) ||
        attributeName.startsWith("data-")
      );
    }

    if (mutation.type === "childList") {
      // Check if added/removed nodes contain voice-related elements
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

    return true; // Default to checking if unsure
  }

  containsVoiceElements(element) {
    const voiceKeywords = ["voice", "mic", "speech", "listen"];
    const elementText = element.textContent?.toLowerCase() || "";
    const className = element.className?.toLowerCase() || "";
    const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || "";

    return voiceKeywords.some(
      (keyword) =>
        elementText.includes(keyword) ||
        className.includes(keyword) ||
        ariaLabel.includes(keyword)
    );
  }

  detectInitialState() {
    // Check initial state after page load
    setTimeout(() => {
      this.checkVoiceRecognitionState();
    }, 1000);
  }

  checkVoiceRecognitionState() {
    this.checkVoiceRecognitionStateOptimized();
  }

  checkVoiceRecognitionStateOptimized() {
    let isActive = false;

    try {
      switch (this.currentSite) {
        case "chatgpt":
          isActive = this.detectChatGPTVoiceModeOptimized();
          break;
        case "google-search":
          isActive = this.detectGoogleVoiceSearchOptimized();
          break;
        case "google-translate":
          isActive = this.detectGoogleTranslateVoice();
          break;
        case "google":
          isActive = this.detectGoogleVoiceSearch();
          break;
        case "bing":
          isActive = this.detectBingVoiceSearch();
          break;
        case "youtube":
          isActive = this.detectYouTubeVoiceSearch();
          break;
        default:
          isActive = this.detectGenericVoiceInputOptimized();
      }
    } catch (error) {
      console.error("Error detecting voice recognition state:", error);
      // Fallback to generic detection
      isActive = this.detectGenericVoiceInput();
    }

    if (isActive !== this.isVoiceRecognitionActive) {
      this.isVoiceRecognitionActive = isActive;
      this.notifyVoiceRecognitionState(isActive);
    }
  }

  detectChatGPTVoiceModeOptimized() {
    // Optimized ChatGPT detection with priority selectors
    const prioritySelectors = this.siteOptimizations.selectors.voiceButton;
    const activeSelectors = this.siteOptimizations.selectors.activeState;

    // Check for voice button with priority order
    let voiceButton = false;
    for (const selector of prioritySelectors) {
      if (document.querySelector(selector)) {
        voiceButton = true;
        break;
      }
    }

    // Check for active listening state
    let isListening = false;
    for (const selector of activeSelectors) {
      if (document.querySelector(selector)) {
        isListening = true;
        break;
      }
    }

    // ChatGPT specific: check for conversation state
    const conversationActive = document.querySelector(
      '[data-testid="conversation-turn"]'
    );
    const voiceModeIndicator = document.body.textContent
      .toLowerCase()
      .includes("voice mode");

    return (
      voiceButton || isListening || (conversationActive && voiceModeIndicator)
    );
  }

  detectGoogleVoiceSearchOptimized() {
    // Optimized Google Search voice detection
    const voiceSelectors = this.siteOptimizations.selectors.voiceButton;
    const activeSelectors = this.siteOptimizations.selectors.activeState;

    // Priority check for voice search button
    let voiceButton = false;
    for (const selector of voiceSelectors) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        // Check if visible
        voiceButton = true;
        break;
      }
    }

    // Check for active state
    let isActive = false;
    for (const selector of activeSelectors) {
      if (document.querySelector(selector)) {
        isActive = true;
        break;
      }
    }

    return voiceButton || isActive;
  }

  detectGoogleTranslateVoice() {
    // Google Translate specific voice detection
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
  }

  detectBingVoiceSearch() {
    // Bing voice search detection
    const voiceButton = document.querySelector(
      '[aria-label*="voice search" i], .voice-icon'
    );
    const isListening = document.querySelector(
      '.listening, [aria-pressed="true"][aria-label*="voice" i]'
    );

    return !!(voiceButton || isListening);
  }

  detectYouTubeVoiceSearch() {
    // YouTube voice search detection
    const voiceSearchButton = document.querySelector(
      '[aria-label*="Search with your voice" i]'
    );
    const isActive = document.querySelector(".voice-search-active");

    return !!(voiceSearchButton || isActive);
  }

  detectGenericVoiceInputOptimized() {
    // Optimized generic detection with caching
    const selectors = this.siteOptimizations.selectors.voiceButton;
    const activeSelectors = this.siteOptimizations.selectors.activeState;

    // Quick check for common voice elements
    let hasVoiceElements = false;
    for (const selector of selectors) {
      if (document.querySelector(selector)) {
        hasVoiceElements = true;
        break;
      }
    }

    // Check for active state
    let isActive = false;
    for (const selector of activeSelectors) {
      if (document.querySelector(selector)) {
        isActive = true;
        break;
      }
    }

    return hasVoiceElements || isActive;
  }

  detectChatGPTVoiceMode() {
    // ChatGPT voice mode detection - multiple selectors for robustness
    const voiceSelectors = [
      // Voice button selectors
      '[data-testid*="voice"]',
      '[aria-label*="voice" i]',
      '[aria-label*="microphone" i]',
      '[title*="voice" i]',
      'button[class*="voice"]',
      'button[class*="mic"]',

      // ChatGPT specific selectors
      '[data-testid="voice-button"]',
      '[data-testid="microphone-button"]',
      'button[aria-label*="Start voice conversation" i]',
      'button[aria-label*="Stop voice conversation" i]',

      // Generic voice UI elements
      ".voice-mode",
      ".microphone-active",
      ".speech-input",
    ];

    // Check for voice button presence
    const voiceButton = voiceSelectors.some((selector) =>
      document.querySelector(selector)
    );

    // Check for active listening state
    const listeningSelectors = [
      ".listening",
      '[data-listening="true"]',
      '[aria-label*="listening" i]',
      '[aria-label*="recording" i]',
      ".recording",
      ".voice-active",
      '[class*="pulse"]', // Common animation class for active mic
      '[class*="recording"]',
    ];

    const isListening = listeningSelectors.some((selector) =>
      document.querySelector(selector)
    );

    // Check for voice mode indicators in text content
    const voiceIndicatorText = document.body.textContent.toLowerCase();
    const hasVoiceText =
      voiceIndicatorText.includes("voice mode") ||
      voiceIndicatorText.includes("listening") ||
      voiceIndicatorText.includes("speak now");

    return voiceButton || isListening || hasVoiceText;
  }

  detectGoogleVoiceSearch() {
    // Google voice search detection - comprehensive selectors
    const voiceSearchSelectors = [
      // Standard Google voice search selectors
      '[aria-label*="voice search" i]',
      '[title*="voice search" i]',
      '[jsaction*="voice"]',
      ".voice-search",

      // Google specific voice button selectors
      '[data-ved*="voice"]',
      'button[aria-label*="Search by voice" i]',
      'button[title*="Search by voice" i]',
      '[role="button"][aria-label*="microphone" i]',

      // Google search page specific
      ".gsri_mic", // Google search result input microphone
      ".voice-search-button",
      '[jsname*="mic"]',
      '[data-async-trigger*="voice"]',
    ];

    const voiceButton = voiceSearchSelectors.some((selector) =>
      document.querySelector(selector)
    );

    // Check for active voice search state
    const activeVoiceSelectors = [
      '[aria-label*="listening" i]',
      '[aria-label*="recording" i]',
      ".listening",
      ".recording",
      ".voice-active",
      '[data-voice-active="true"]',

      // Google specific active states
      ".gsri_mic.listening",
      '[class*="voice"][class*="active"]',
      '[aria-pressed="true"][aria-label*="voice" i]',
    ];

    const isListening = activeVoiceSelectors.some((selector) =>
      document.querySelector(selector)
    );

    // Check for voice search modal or overlay
    const voiceModal = document.querySelector(
      '.voice-search-modal, .voice-overlay, [role="dialog"][aria-label*="voice" i]'
    );

    // Check URL parameters for voice search
    const urlParams = new URLSearchParams(window.location.search);
    const hasVoiceParam = urlParams.has("voice") || urlParams.has("vsearch");

    return voiceButton || isListening || voiceModal || hasVoiceParam;
  }

  detectGenericVoiceInput() {
    // Generic voice input detection for any website
    const genericVoiceSelectors = [
      // Aria labels and titles
      '[aria-label*="voice" i]',
      '[aria-label*="microphone" i]',
      '[aria-label*="speech" i]',
      '[aria-label*="speak" i]',
      '[title*="voice" i]',
      '[title*="microphone" i]',
      '[title*="speech" i]',
      '[title*="speak" i]',

      // Common class names
      ".voice-input",
      ".microphone",
      ".speech-input",
      ".voice-button",
      ".mic-button",
      ".speech-button",
      ".voice-control",
      ".audio-input",

      // Input elements with voice attributes
      'input[type="text"][data-voice]',
      'input[type="search"][data-voice]',
      "textarea[data-voice]",

      // Button elements with voice indicators
      'button[class*="voice"]',
      'button[class*="mic"]',
      'button[class*="speech"]',
      'button[id*="voice"]',
      'button[id*="mic"]',

      // SVG icons (common for voice buttons)
      'svg[class*="mic"]',
      'svg[class*="voice"]',
      'i[class*="mic"]',
      'i[class*="voice"]',

      // Web Speech API related elements
      "[data-speech]",
      "[data-recognition]",
      ".speech-recognition",
      ".web-speech",
    ];

    const voiceElements = genericVoiceSelectors.some((selector) =>
      document.querySelector(selector)
    );

    // Check for active voice input states
    const activeVoiceSelectors = [
      ".listening",
      ".recording",
      ".voice-active",
      ".speech-active",
      '[data-listening="true"]',
      '[data-recording="true"]',
      '[aria-pressed="true"][aria-label*="voice" i]',
      '[aria-pressed="true"][aria-label*="mic" i]',
    ];

    const isActiveVoice = activeVoiceSelectors.some((selector) =>
      document.querySelector(selector)
    );

    // Check for Web Speech API usage in page scripts
    const hasWebSpeechAPI =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      window.mozSpeechRecognition ||
      window.msSpeechRecognition;

    // Check for voice-related text content
    const pageText = document.body.textContent.toLowerCase();
    const voiceKeywords = [
      "voice input",
      "speech input",
      "speak now",
      "listening",
      "voice command",
      "voice control",
      "microphone",
    ];

    const hasVoiceText = voiceKeywords.some((keyword) =>
      pageText.includes(keyword)
    );

    return voiceElements || isActiveVoice || (hasWebSpeechAPI && hasVoiceText);
  }

  notifyVoiceRecognitionState(isActive) {
    console.log("Voice recognition state changed:", isActive);

    // Send message to background script
    chrome.runtime
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

// Initialize content script when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new ContentScript();
  });
} else {
  new ContentScript();
}
