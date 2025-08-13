// Content Script for Voice Recognition Detection
class ContentScript {
  constructor() {
    this.isVoiceRecognitionActive = false;
    this.currentSite = this.detectCurrentSite();
    this.init();
  }

  init() {
    console.log("TTS Voice Bridge content script loaded on:", this.currentSite);
    this.setupObservers();
    this.detectInitialState();
  }

  detectCurrentSite() {
    const hostname = window.location.hostname;

    if (hostname.includes("chat.openai.com")) {
      return "chatgpt";
    } else if (hostname.includes("google.com")) {
      return "google";
    } else {
      return "generic";
    }
  }

  setupObservers() {
    // Set up mutation observer to detect DOM changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" || mutation.type === "attributes") {
          this.checkVoiceRecognitionState();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-label", "data-*"],
    });
  }

  detectInitialState() {
    // Check initial state after page load
    setTimeout(() => {
      this.checkVoiceRecognitionState();
    }, 1000);
  }

  checkVoiceRecognitionState() {
    let isActive = false;

    switch (this.currentSite) {
      case "chatgpt":
        isActive = this.detectChatGPTVoiceMode();
        break;
      case "google":
        isActive = this.detectGoogleVoiceSearch();
        break;
      default:
        isActive = this.detectGenericVoiceInput();
    }

    if (isActive !== this.isVoiceRecognitionActive) {
      this.isVoiceRecognitionActive = isActive;
      this.notifyVoiceRecognitionState(isActive);
    }
  }

  detectChatGPTVoiceMode() {
    // TODO: Implement ChatGPT voice mode detection
    // Look for voice mode indicators in the DOM
    const voiceButton = document.querySelector('[data-testid*="voice"]');
    const microphoneIcon = document.querySelector(
      '[aria-label*="voice" i], [aria-label*="microphone" i]'
    );

    // Check if voice mode is active
    const isListening = document.querySelector(
      '.listening, [data-listening="true"], [aria-label*="listening" i]'
    );

    return !!(voiceButton || microphoneIcon || isListening);
  }

  detectGoogleVoiceSearch() {
    // TODO: Implement Google voice search detection
    // Look for voice search button and active state
    const voiceSearchButton = document.querySelector(
      '[aria-label*="voice search" i], [title*="voice search" i]'
    );
    const micButton = document.querySelector(
      '[jsaction*="voice"], .voice-search'
    );

    // Check if voice search is active
    const isListening = document.querySelector(
      '[aria-label*="listening" i], .listening'
    );

    return !!(voiceSearchButton || micButton || isListening);
  }

  detectGenericVoiceInput() {
    // TODO: Implement generic voice input detection
    // Look for common voice input patterns
    const voiceInputs = document.querySelectorAll(
      '[aria-label*="voice" i], [aria-label*="microphone" i], ' +
        '[title*="voice" i], [title*="microphone" i], ' +
        ".voice-input, .microphone, .speech-input"
    );

    return voiceInputs.length > 0;
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
