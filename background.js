// Message Types
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

// Message Interface Implementation
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

// Import TTS Engine (for service worker context)
importScripts("tts-engine.js");

// Background Service Worker
class BackgroundService {
  constructor() {
    this.messageHandlers = new Map();
    this.ttsEngine = null;
    this.init();
  }

  async init() {
    this.setupMessageHandlers();
    this.setupMessageListeners();
    this.setupInstallListener();
    await this.initializeTTSEngine();
  }

  async initializeTTSEngine() {
    try {
      // TTS Engine은 DOM API를 사용하므로 service worker에서 직접 사용할 수 없음
      // 대신 popup이나 content script에서 TTS를 실행하도록 메시지를 전달
      console.log("TTS Engine initialization deferred to popup/content script");
    } catch (error) {
      console.error("Failed to initialize TTS Engine:", error);
    }
  }

  setupMessageHandlers() {
    // Register message handlers
    this.messageHandlers.set(
      MESSAGE_TYPES.TTS_PLAY,
      this.handleTTSPlay.bind(this)
    );
    this.messageHandlers.set(
      MESSAGE_TYPES.TTS_STOP,
      this.handleTTSStop.bind(this)
    );
    this.messageHandlers.set(
      MESSAGE_TYPES.TTS_PAUSE,
      this.handleTTSPause.bind(this)
    );
    this.messageHandlers.set(
      MESSAGE_TYPES.TTS_RESUME,
      this.handleTTSResume.bind(this)
    );
    this.messageHandlers.set(
      MESSAGE_TYPES.SETTINGS_UPDATE,
      this.handleSettingsUpdate.bind(this)
    );
    this.messageHandlers.set(
      MESSAGE_TYPES.SETTINGS_GET,
      this.handleSettingsGet.bind(this)
    );
    this.messageHandlers.set(
      MESSAGE_TYPES.VOICE_DETECTION,
      this.handleVoiceDetection.bind(this)
    );
    this.messageHandlers.set(
      MESSAGE_TYPES.SETTINGS_RESET,
      this.handleSettingsReset.bind(this)
    );
    this.messageHandlers.set(
      MESSAGE_TYPES.SETTINGS_PARTIAL_UPDATE,
      this.handleSettingsPartialUpdate.bind(this)
    );
    this.messageHandlers.set(
      MESSAGE_TYPES.SETTINGS_VALIDATE,
      this.handleSettingsValidate.bind(this)
    );
  }

  setupMessageListeners() {
    // Listen for messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.routeMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Listen for messages from content scripts specifically
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === "content-script") {
        port.onMessage.addListener((message) => {
          this.handleContentScriptMessage(message, port);
        });
      }
    });
  }

  setupInstallListener() {
    chrome.runtime.onInstalled.addListener((details) => {
      console.log("TTS Voice Bridge installed:", details.reason);
      this.initializeDefaultSettings();
    });
  }

  async routeMessage(message, sender, sendResponse) {
    try {
      // Validate message format
      if (!Message.isValid(message)) {
        console.warn("Invalid message format:", message);
        sendResponse({ success: false, error: "Invalid message format" });
        return;
      }

      // Log message routing for debugging
      console.log(
        `Routing message: ${message.type} from ${
          sender.tab ? "content script" : "popup"
        }`,
        message
      );

      // Get handler for message type
      const handler = this.messageHandlers.get(message.type);
      if (!handler) {
        console.warn("No handler for message type:", message.type);
        sendResponse({
          success: false,
          error: `No handler for message type: ${message.type}`,
        });
        return;
      }

      // Execute handler
      const result = await handler(message.payload, sender);
      sendResponse({ success: true, data: result });
    } catch (error) {
      console.error("Message routing error:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleContentScriptMessage(message, port) {
    try {
      console.log("Content script message received:", message);

      // Handle voice recognition state updates from content scripts
      if (message.type === MESSAGE_TYPES.VOICE_RECOGNITION_STATE) {
        await this.broadcastToPopup(message);
      }
    } catch (error) {
      console.error("Content script message handling error:", error);
    }
  }

  async broadcastToPopup(message) {
    // Send message to popup if it's open
    try {
      await chrome.runtime.sendMessage(message);
    } catch (error) {
      // Popup might not be open, which is fine
      console.log(
        "Could not broadcast to popup (popup may be closed):",
        error.message
      );
    }
  }

  async sendMessageToContentScript(tabId, message) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      console.error("Failed to send message to content script:", error);
      throw error;
    }
  }

  async handleTTSPlay(payload, sender) {
    const { text, options } = payload;
    console.log("TTS Play requested:", text, options);

    try {
      // Load current settings to merge with options
      const settings = await this.loadSettings();
      const ttsOptions = {
        voice: options?.voice || settings.tts.voice,
        rate: options?.rate || settings.tts.rate,
        pitch: options?.pitch || settings.tts.pitch,
        volume: options?.volume || settings.tts.volume,
        lang: options?.lang || settings.tts.language,
      };

      // Since service workers can't access DOM APIs, delegate TTS to popup
      // Store the TTS request for popup to execute
      await this.storeTTSRequest({ text, options: ttsOptions });

      // Notify popup to execute TTS
      await this.broadcastToPopup(
        Message.create("TTS_EXECUTE", { text, options: ttsOptions })
      );

      return { status: "delegated", text, options: ttsOptions };
    } catch (error) {
      console.error("TTS Play error:", error);
      throw error;
    }
  }

  async handleTTSStop(payload, sender) {
    console.log("TTS Stop requested");

    try {
      // Notify popup to stop TTS
      await this.broadcastToPopup(Message.create("TTS_STOP_EXECUTE"));
      return { status: "stop_delegated" };
    } catch (error) {
      console.error("TTS Stop error:", error);
      return { status: "stopped" };
    }
  }

  async handleTTSPause(payload, sender) {
    console.log("TTS Pause requested");

    try {
      // Notify popup to pause TTS
      await this.broadcastToPopup(Message.create("TTS_PAUSE_EXECUTE"));
      return { status: "pause_delegated" };
    } catch (error) {
      console.error("TTS Pause error:", error);
      return { status: "paused" };
    }
  }

  async handleTTSResume(payload, sender) {
    console.log("TTS Resume requested");

    try {
      // Notify popup to resume TTS
      await this.broadcastToPopup(Message.create("TTS_RESUME_EXECUTE"));
      return { status: "resume_delegated" };
    } catch (error) {
      console.error("TTS Resume error:", error);
      return { status: "resumed" };
    }
  }

  async handleSettingsUpdate(payload, sender) {
    console.log("Settings update requested:", payload);
    await this.saveSettings(payload);
    return { updated: true };
  }

  async handleSettingsGet(payload, sender) {
    console.log("Settings get requested");
    const settings = await this.loadSettings();
    return settings;
  }

  async handleSettingsReset(payload, sender) {
    console.log("Settings reset requested");
    const defaultSettings = await this.resetSettings();
    return defaultSettings;
  }

  async handleSettingsPartialUpdate(payload, sender) {
    console.log("Partial settings update requested:", payload);
    const updatedSettings = await this.updatePartialSettings(payload);
    return updatedSettings;
  }

  async handleSettingsValidate(payload, sender) {
    console.log("Settings validation requested:", payload);
    const validationErrors = this.validateSettings(payload);
    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
    };
  }

  async handleVoiceDetection(payload, sender) {
    console.log("Voice detection requested");

    // If request comes from content script, it includes detection data
    if (sender.tab && payload) {
      const { isActive, site, type } = payload;
      console.log(
        `Voice recognition ${
          isActive ? "activated" : "deactivated"
        } on ${site} (${type})`
      );

      // Broadcast to popup
      await this.broadcastToPopup(
        Message.create(MESSAGE_TYPES.VOICE_RECOGNITION_STATE, {
          isActive,
          site,
          type,
          tabId: sender.tab.id,
        })
      );

      return { received: true };
    }

    // If request comes from popup, query active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      try {
        const response = await this.sendMessageToContentScript(
          tabs[0].id,
          Message.create(MESSAGE_TYPES.VOICE_DETECTION)
        );
        return response;
      } catch (error) {
        return { isActive: false, error: "Could not detect voice recognition" };
      }
    }

    return { isActive: false };
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

    // Validate TTS settings
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

    // Validate UI settings
    if (settings.ui && settings.ui.theme) {
      const validThemes = ["light", "dark", "auto"];
      if (!validThemes.includes(settings.ui.theme)) {
        errors.push("UI theme must be one of: light, dark, auto");
      }
    }

    return errors;
  }

  mergeWithDefaults(userSettings) {
    const defaultSettings = this.getDefaultSettings();

    // Deep merge user settings with defaults
    const merged = JSON.parse(JSON.stringify(defaultSettings));

    if (userSettings) {
      // Merge TTS settings
      if (userSettings.tts) {
        Object.assign(merged.tts, userSettings.tts);
      }

      // Merge UI settings
      if (userSettings.ui) {
        Object.assign(merged.ui, userSettings.ui);
        if (userSettings.ui.shortcuts) {
          Object.assign(merged.ui.shortcuts, userSettings.ui.shortcuts);
        }
      }

      // Merge detection settings
      if (userSettings.detection) {
        Object.assign(merged.detection, userSettings.detection);
      }
    }

    return merged;
  }

  async initializeDefaultSettings() {
    try {
      const existingSettings = await this.loadSettings();
      if (!existingSettings) {
        const defaultSettings = this.getDefaultSettings();
        await this.saveSettings(defaultSettings);
        console.log("Default settings initialized");
      } else {
        // Ensure existing settings have all required fields
        const mergedSettings = this.mergeWithDefaults(existingSettings);
        await this.saveSettings(mergedSettings);
        console.log("Settings updated with new defaults");
      }
    } catch (error) {
      console.error("Failed to initialize settings:", error);
      // Fallback to default settings
      const defaultSettings = this.getDefaultSettings();
      await this.saveSettings(defaultSettings);
    }
  }

  async saveSettings(settings) {
    try {
      // Validate settings before saving
      const validationErrors = this.validateSettings(settings);
      if (validationErrors.length > 0) {
        throw new Error(
          `Settings validation failed: ${validationErrors.join(", ")}`
        );
      }

      // Merge with defaults to ensure completeness
      const completeSettings = this.mergeWithDefaults(settings);

      return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ userSettings: completeSettings }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log("Settings saved successfully");
            resolve(completeSettings);
          }
        });
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      throw error;
    }
  }

  async loadSettings() {
    try {
      return new Promise((resolve, reject) => {
        chrome.storage.sync.get(["userSettings"], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            const settings = result.userSettings;
            if (settings) {
              // Ensure loaded settings are complete
              const completeSettings = this.mergeWithDefaults(settings);
              resolve(completeSettings);
            } else {
              resolve(null);
            }
          }
        });
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
      // Return default settings as fallback
      return this.getDefaultSettings();
    }
  }

  async resetSettings() {
    try {
      const defaultSettings = this.getDefaultSettings();
      await this.saveSettings(defaultSettings);
      console.log("Settings reset to defaults");
      return defaultSettings;
    } catch (error) {
      console.error("Failed to reset settings:", error);
      throw error;
    }
  }

  async updatePartialSettings(partialSettings) {
    try {
      const currentSettings = await this.loadSettings();
      const updatedSettings = this.mergeWithDefaults({
        ...currentSettings,
        ...partialSettings,
      });

      await this.saveSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error("Failed to update partial settings:", error);
      throw error;
    }
  }

  async storeTTSRequest(request) {
    try {
      await chrome.storage.local.set({
        currentTTSRequest: {
          ...request,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error("Failed to store TTS request:", error);
    }
  }

  async getTTSRequest() {
    try {
      const result = await chrome.storage.local.get(["currentTTSRequest"]);
      return result.currentTTSRequest;
    } catch (error) {
      console.error("Failed to get TTS request:", error);
      return null;
    }
  }

  async clearTTSRequest() {
    try {
      await chrome.storage.local.remove(["currentTTSRequest"]);
    } catch (error) {
      console.error("Failed to clear TTS request:", error);
    }
  }

  // BackgroundService interface implementation
  async synthesizeText(text, options) {
    return await this.handleTTSPlay({ text, options });
  }

  async saveUserSettings(settings) {
    return await this.saveSettings(settings);
  }

  async loadUserSettings() {
    return await this.loadSettings();
  }

  async detectVoiceRecognition() {
    const result = await this.handleVoiceDetection(null, { tab: null });
    return result.isActive || false;
  }
}

// Initialize background service
new BackgroundService();
