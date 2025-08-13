// Background Service Worker
class BackgroundService {
  constructor() {
    this.init();
  }

  init() {
    this.setupMessageListeners();
    this.setupInstallListener();
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  setupInstallListener() {
    chrome.runtime.onInstalled.addListener((details) => {
      console.log("TTS Voice Bridge installed:", details.reason);
      this.initializeDefaultSettings();
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case "TTS_PLAY":
          await this.handleTTSPlay(message.payload);
          sendResponse({ success: true });
          break;

        case "TTS_STOP":
          await this.handleTTSStop();
          sendResponse({ success: true });
          break;

        case "SETTINGS_UPDATE":
          await this.handleSettingsUpdate(message.payload);
          sendResponse({ success: true });
          break;

        case "VOICE_DETECTION":
          const isActive = await this.detectVoiceRecognition();
          sendResponse({ isActive });
          break;

        default:
          console.warn("Unknown message type:", message.type);
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Message handling error:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleTTSPlay(payload) {
    const { text } = payload;
    console.log("TTS Play requested:", text);

    // TODO: Implement actual TTS functionality
    // This is a placeholder for the TTS engine implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("TTS playback simulated");
        resolve();
      }, 1000);
    });
  }

  async handleTTSStop() {
    console.log("TTS Stop requested");
    // TODO: Implement TTS stop functionality
  }

  async handleSettingsUpdate(settings) {
    console.log("Settings update requested:", settings);
    await this.saveSettings(settings);
  }

  async detectVoiceRecognition() {
    // TODO: Implement voice recognition detection
    return false;
  }

  async initializeDefaultSettings() {
    const defaultSettings = {
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

    try {
      const existingSettings = await this.loadSettings();
      if (!existingSettings) {
        await this.saveSettings(defaultSettings);
        console.log("Default settings initialized");
      }
    } catch (error) {
      console.error("Failed to initialize settings:", error);
    }
  }

  async saveSettings(settings) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ userSettings: settings }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
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
          resolve(result.userSettings);
        }
      });
    });
  }
}

// Initialize background service
new BackgroundService();
