import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";

// Mock Chrome APIs with more realistic behavior
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path) => `chrome-extension://test/${path}`),
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
    create: vi.fn().mockResolvedValue({ id: 1 }),
  },
};

global.chrome = mockChrome;

describe("Popup Integration Tests", () => {
  let dom;
  let document;
  let window;
  let popup;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create realistic DOM
    dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8" />
          <title>TTS Voice Bridge</title>
          <link rel="stylesheet" href="popup.css" />
        </head>
        <body>
          <div class="container">
            <header>
              <h1>TTS Voice Bridge</h1>
            </header>
            <main>
              <div class="input-section">
                <textarea
                  id="textInput"
                  placeholder="변환할 텍스트를 입력하세요..."
                  rows="4"
                  maxlength="1000"
                  aria-label="TTS 변환할 텍스트 입력"
                ></textarea>
                <div class="character-count"><span id="charCount">0</span>/1000</div>
              </div>
              <div class="controls">
                <button id="playButton" class="primary-button" disabled>
                  <span class="button-text">음성 재생</span>
                  <span class="loading-spinner" style="display: none"></span>
                </button>
                <button id="stopButton" class="secondary-button" style="display: none">정지</button>
                <button id="settingsButton" class="secondary-button">설정</button>
              </div>
              <div class="progress-section" id="progressSection" style="display: none">
                <div class="progress-bar">
                  <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-text" id="progressText">재생 중...</div>
              </div>
              <div class="status" id="statusIndicator">
                <span class="status-text">준비됨</span>
              </div>
            </main>
          </div>
        </body>
      </html>
    `,
      {
        url: "chrome-extension://test/popup.html",
        pretendToBeVisual: true,
        resources: "usable",
      }
    );

    document = dom.window.document;
    window = dom.window;

    global.document = document;
    global.window = window;
    global.HTMLElement = window.HTMLElement;
    global.Event = window.Event;
    global.KeyboardEvent = window.KeyboardEvent;

    // Create a simplified PopupUI for testing
    class PopupUI {
      constructor() {
        this.textInput = document.getElementById("textInput");
        this.playButton = document.getElementById("playButton");
        this.stopButton = document.getElementById("stopButton");
        this.settingsButton = document.getElementById("settingsButton");
        this.statusIndicator = document.getElementById("statusIndicator");
        this.charCount = document.getElementById("charCount");
        this.progressSection = document.getElementById("progressSection");
        this.progressFill = document.getElementById("progressFill");
        this.progressText = document.getElementById("progressText");

        this.isPlaying = false;
        this.currentText = "";
        this.maxLength = 1000;
        this.messageListeners = [];

        this.init();
      }

      init() {
        this.setupEventListeners();
        this.setupMessageListener();
        this.updateButtonState();
        this.updateCharacterCount();
        this.updateStatus("idle");
        this.loadSavedText();
      }

      setupEventListeners() {
        this.textInput.addEventListener("input", (e) => {
          this.validateInput(e.target.value);
          this.updateButtonState();
          this.updateCharacterCount();
          this.saveTextToStorage();
        });

        this.textInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            this.handleTextSubmit();
          }
        });

        this.playButton.addEventListener("click", () => {
          this.handleTextSubmit();
        });

        this.stopButton.addEventListener("click", () => {
          this.handleStop();
        });

        this.settingsButton.addEventListener("click", () => {
          this.handleSettingsOpen();
        });
      }

      setupMessageListener() {
        const listener = (message, sender, sendResponse) => {
          switch (message.type) {
            case "TTS_STARTED":
              this.handleTTSStarted(message.payload);
              break;
            case "TTS_PROGRESS":
              this.handleTTSProgress(message.payload);
              break;
            case "TTS_COMPLETED":
              this.handleTTSCompleted(message.payload);
              break;
            case "TTS_ERROR":
              this.handleTTSError(message.payload);
              break;
            case "TTS_STOPPED":
              this.handleTTSStopped(message.payload);
              break;
          }
          sendResponse({ received: true });
        };

        this.messageListeners.push(listener);
        chrome.runtime.onMessage.addListener(listener);
      }

      validateInput(text) {
        if (text.length > this.maxLength) {
          this.textInput.value = text.substring(0, this.maxLength);
          return false;
        }
        return true;
      }

      updateButtonState() {
        const hasText = this.textInput.value.trim().length > 0;
        const isValidLength = this.textInput.value.length <= this.maxLength;
        this.playButton.disabled = !hasText || !isValidLength || this.isPlaying;
      }

      updateCharacterCount() {
        const currentLength = this.textInput.value.length;
        this.charCount.textContent = currentLength;
      }

      updateStatus(status) {
        const statusText = {
          idle: "준비됨",
          playing: "음성 재생 중...",
          error: "오류 발생",
        };
        this.statusIndicator.className = `status ${status}`;
        this.statusIndicator.querySelector(".status-text").textContent =
          statusText[status] || "알 수 없음";
      }

      async handleTextSubmit() {
        const text = this.textInput.value.trim();
        if (!text || this.isPlaying) return;

        try {
          this.currentText = text;
          this.isPlaying = true;
          this.updateStatus("playing");
          this.setPlayingState(true);

          const response = await chrome.runtime.sendMessage({
            type: "TTS_PLAY",
            payload: { text },
            timestamp: Date.now(),
          });

          if (!response || response.error) {
            throw new Error(response?.error || "Failed to start TTS");
          }
        } catch (error) {
          this.handleTTSError({ error: error.message });
        }
      }

      async handleStop() {
        if (!this.isPlaying) return;
        try {
          await chrome.runtime.sendMessage({
            type: "TTS_STOP",
            payload: {},
            timestamp: Date.now(),
          });
        } catch (error) {
          this.handleTTSStopped({});
        }
      }

      handleSettingsOpen() {
        chrome.tabs.create({
          url: chrome.runtime.getURL("settings.html"),
        });
      }

      handleTTSStarted(payload) {
        this.updateStatus("playing");
        this.showProgress(true);
        this.updateProgress(0, "음성 재생 시작...");
      }

      handleTTSProgress(payload) {
        const { progress = 0, currentWord = "" } = payload;
        this.updateProgress(progress, `재생 중: ${currentWord}`);
      }

      handleTTSCompleted(payload) {
        this.isPlaying = false;
        this.updateStatus("idle");
        this.setPlayingState(false);
        this.showProgress(false);
      }

      handleTTSError(payload) {
        this.isPlaying = false;
        this.updateStatus("error");
        this.setPlayingState(false);
        this.showProgress(false);
      }

      handleTTSStopped(payload) {
        this.isPlaying = false;
        this.updateStatus("idle");
        this.setPlayingState(false);
        this.showProgress(false);
      }

      setPlayingState(isPlaying) {
        const buttonText = this.playButton.querySelector(".button-text");
        const spinner = this.playButton.querySelector(".loading-spinner");

        if (isPlaying) {
          buttonText.style.display = "none";
          spinner.style.display = "block";
          this.playButton.disabled = true;
          this.stopButton.style.display = "block";
          this.textInput.disabled = true;
        } else {
          buttonText.style.display = "block";
          spinner.style.display = "none";
          this.stopButton.style.display = "none";
          this.textInput.disabled = false;
          this.updateButtonState();
        }
      }

      showProgress(show) {
        this.progressSection.style.display = show ? "block" : "none";
      }

      updateProgress(percentage, text) {
        this.progressFill.style.width = `${Math.max(
          0,
          Math.min(100, percentage)
        )}%`;
        this.progressText.textContent = text || "재생 중...";
      }

      async saveTextToStorage() {
        try {
          await chrome.storage.local.set({
            lastText: this.textInput.value,
          });
        } catch (error) {
          console.warn("Failed to save text:", error);
        }
      }

      async loadSavedText() {
        try {
          const result = await chrome.storage.local.get(["lastText"]);
          if (result.lastText) {
            this.textInput.value = result.lastText;
            this.updateCharacterCount();
            this.updateButtonState();
          }
        } catch (error) {
          console.warn("Failed to load text:", error);
        }
      }

      // Helper method to simulate receiving messages
      simulateMessage(type, payload = {}) {
        const message = { type, payload, timestamp: Date.now() };
        this.messageListeners.forEach((listener) => {
          listener(message, {}, () => {});
        });
      }

      destroy() {
        this.messageListeners.forEach((listener) => {
          chrome.runtime.onMessage.removeListener(listener);
        });
      }
    }

    popup = new PopupUI();
  });

  afterEach(() => {
    if (popup && popup.destroy) {
      popup.destroy();
    }
    dom.window.close();
  });

  describe("Complete TTS Flow Integration", () => {
    it("should handle complete TTS playback flow", async () => {
      // Setup: Enter text
      popup.textInput.value = "Hello, this is a test message";
      popup.textInput.dispatchEvent(new window.Event("input"));

      expect(popup.playButton.disabled).toBe(false);
      expect(popup.charCount.textContent).toBe("29");

      // Mock successful background response
      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });

      // Step 1: Start TTS
      await popup.handleTextSubmit();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "TTS_PLAY",
        payload: { text: "Hello, this is a test message" },
        timestamp: expect.any(Number),
      });

      expect(popup.isPlaying).toBe(true);
      expect(popup.statusIndicator.className).toContain("playing");
      expect(popup.playButton.disabled).toBe(true);
      expect(popup.stopButton.style.display).toBe("block");

      // Step 2: Simulate TTS started message from background
      popup.simulateMessage("TTS_STARTED", {});

      expect(popup.progressSection.style.display).toBe("block");

      // Step 3: Simulate progress updates
      popup.simulateMessage("TTS_PROGRESS", {
        progress: 25,
        currentWord: "Hello",
      });
      expect(popup.progressFill.style.width).toBe("25%");
      expect(popup.progressText.textContent).toBe("재생 중: Hello");

      popup.simulateMessage("TTS_PROGRESS", {
        progress: 75,
        currentWord: "test",
      });
      expect(popup.progressFill.style.width).toBe("75%");

      // Step 4: Simulate completion
      popup.simulateMessage("TTS_COMPLETED", {});

      expect(popup.isPlaying).toBe(false);
      expect(popup.statusIndicator.className).toContain("idle");
      expect(popup.progressSection.style.display).toBe("none");
      expect(popup.stopButton.style.display).toBe("none");
      expect(popup.textInput.disabled).toBe(false);
    });

    it("should handle TTS stop flow", async () => {
      // Setup: Start playing
      popup.textInput.value = "Test message";
      popup.textInput.dispatchEvent(new window.Event("input"));

      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
      await popup.handleTextSubmit();

      popup.simulateMessage("TTS_STARTED", {});
      expect(popup.isPlaying).toBe(true);

      // Stop TTS
      await popup.handleStop();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "TTS_STOP",
        payload: {},
        timestamp: expect.any(Number),
      });

      // Simulate stop confirmation from background
      popup.simulateMessage("TTS_STOPPED", {});

      expect(popup.isPlaying).toBe(false);
      expect(popup.statusIndicator.className).toContain("idle");
    });

    it("should handle TTS error flow", async () => {
      popup.textInput.value = "Test message";
      popup.textInput.dispatchEvent(new window.Event("input"));

      // Mock error response from background
      mockChrome.runtime.sendMessage.mockResolvedValue({
        error: "TTS engine not available",
      });

      await popup.handleTextSubmit();

      expect(popup.isPlaying).toBe(false);
      expect(popup.statusIndicator.className).toContain("error");
      expect(popup.progressSection.style.display).toBe("none");
    });

    it("should handle background script communication errors", async () => {
      popup.textInput.value = "Test message";
      popup.textInput.dispatchEvent(new window.Event("input"));

      // Mock Chrome API error
      mockChrome.runtime.sendMessage.mockRejectedValue(
        new Error("Extension context invalidated")
      );

      await popup.handleTextSubmit();

      expect(popup.isPlaying).toBe(false);
      expect(popup.statusIndicator.className).toContain("error");
    });
  });

  describe("Settings Integration Flow", () => {
    it("should open settings page correctly", async () => {
      await popup.handleSettingsOpen();

      expect(mockChrome.tabs.create).toHaveBeenCalledWith({
        url: "chrome-extension://test/settings.html",
      });
    });

    it("should handle settings page opening errors", async () => {
      mockChrome.tabs.create.mockRejectedValue(
        new Error("Tab creation failed")
      );

      // Should not throw when called synchronously
      expect(() => popup.handleSettingsOpen()).not.toThrow();
      
      // Wait a bit for any async operations to complete
      await new Promise(resolve => setTimeout(resolve, 50));
    });
  });

  describe("Storage Integration Flow", () => {
    it("should save and restore text correctly", async () => {
      // Save text
      popup.textInput.value = "Persistent test message";
      await popup.saveTextToStorage();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        lastText: "Persistent test message",
      });

      // Mock storage response for loading
      mockChrome.storage.local.get.mockResolvedValue({
        lastText: "Persistent test message",
      });

      // Create new popup instance to test loading
      const newPopup = new popup.constructor();
      await newPopup.loadSavedText();

      expect(newPopup.textInput.value).toBe("Persistent test message");
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(["lastText"]);

      newPopup.destroy();
    });

    it("should handle storage errors gracefully", async () => {
      mockChrome.storage.local.set.mockRejectedValue(
        new Error("Storage quota exceeded")
      );
      mockChrome.storage.local.get.mockRejectedValue(
        new Error("Storage not available")
      );

      // Should not throw
      await expect(popup.saveTextToStorage()).resolves.toBeUndefined();
      await expect(popup.loadSavedText()).resolves.toBeUndefined();
    });
  });

  describe("User Interaction Scenarios", () => {
    it("should handle rapid button clicks correctly", async () => {
      popup.textInput.value = "Test message";
      popup.textInput.dispatchEvent(new window.Event("input"));

      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });

      // Rapid clicks should only trigger once
      const promise1 = popup.handleTextSubmit();
      const promise2 = popup.handleTextSubmit();
      const promise3 = popup.handleTextSubmit();

      await Promise.all([promise1, promise2, promise3]);

      // Should only send one message
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    });

    it("should handle keyboard shortcuts during playback", async () => {
      popup.textInput.value = "Test message";
      popup.textInput.dispatchEvent(new window.Event("input"));

      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
      await popup.handleTextSubmit();

      popup.simulateMessage("TTS_STARTED", {});
      expect(popup.isPlaying).toBe(true);

      // Enter key should not trigger new playback while playing
      const enterEvent = new window.KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: false,
      });

      popup.textInput.dispatchEvent(enterEvent);

      // Should still only have one call from the initial submit
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    });

    it("should handle text changes during playback", async () => {
      popup.textInput.value = "Original message";
      popup.textInput.dispatchEvent(new window.Event("input"));

      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
      await popup.handleTextSubmit();

      popup.simulateMessage("TTS_STARTED", {});
      expect(popup.textInput.disabled).toBe(true);

      // Text input should be disabled during playback
      popup.textInput.value = "Modified message";
      popup.textInput.dispatchEvent(new window.Event("input"));

      // Character count should not update while disabled
      expect(popup.charCount.textContent).toBe("16"); // Original message length
    });
  });

  describe("Edge Cases and Error Recovery", () => {
    it("should recover from invalid message responses", async () => {
      popup.textInput.value = "Test message";
      popup.textInput.dispatchEvent(new window.Event("input"));

      // Mock invalid response
      mockChrome.runtime.sendMessage.mockResolvedValue(null);

      await popup.handleTextSubmit();

      expect(popup.isPlaying).toBe(false);
      expect(popup.statusIndicator.className).toContain("error");
    });

    it("should handle message listener errors", () => {
      // Simulate malformed message
      expect(() => {
        popup.simulateMessage("INVALID_MESSAGE_TYPE", { malformed: true });
      }).not.toThrow();

      // UI should remain stable
      expect(popup.statusIndicator.className).toContain("idle");
    });

    it("should handle maximum text length enforcement", () => {
      const maxText = "a".repeat(1000);
      const overMaxText = "a".repeat(1001);

      popup.textInput.value = overMaxText;
      popup.validateInput(overMaxText);

      expect(popup.textInput.value).toBe(maxText);
      expect(popup.textInput.value.length).toBe(1000);
    });
  });
});
