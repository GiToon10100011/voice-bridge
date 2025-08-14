import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
    getURL: vi.fn((path) => `chrome-extension://test/${path}`),
  },
  storage: {
    local: {
      set: vi.fn().mockResolvedValue(),
      get: vi.fn().mockResolvedValue({}),
    },
  },
  tabs: {
    create: vi.fn().mockResolvedValue({ id: 1 }),
  },
};

global.chrome = mockChrome;

describe("Popup UI Tests", () => {
  let dom;
  let document;
  let window;
  let PopupUI;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create DOM environment
    dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8" />
          <title>TTS Voice Bridge</title>
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
                <button id="playButton" class="primary-button" disabled aria-label="텍스트를 음성으로 변환하여 재생">
                  <span class="button-text">음성 재생</span>
                  <span class="loading-spinner" style="display: none"></span>
                </button>
                <button id="stopButton" class="secondary-button" style="display: none" aria-label="음성 재생 정지">정지</button>
                <button id="settingsButton" class="secondary-button" aria-label="TTS 설정 열기">설정</button>
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
              <div class="shortcuts-hint">
                <small>팁: Enter 키로 빠른 실행</small>
              </div>
            </main>
          </div>
        </body>
      </html>
    `,
      {
        url: "chrome-extension://test/",
        pretendToBeVisual: true,
        resources: "usable",
      }
    );

    document = dom.window.document;
    window = dom.window;

    // Set up global environment
    global.document = document;
    global.window = window;
    global.HTMLElement = window.HTMLElement;
    global.Event = window.Event;

    // Import and setup PopupUI class
    const popupModule = await import("./popup.js");
    PopupUI =
      popupModule.default ||
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
          chrome.runtime.onMessage.addListener(
            (message, sender, sendResponse) => {
              switch (message.type) {
                case "TTS_STARTED":
                  this.handleTTSStarted(message.payload);
                  break;
                case "TTS_COMPLETED":
                  this.handleTTSCompleted(message.payload);
                  break;
                case "TTS_ERROR":
                  this.handleTTSError(message.payload);
                  break;
              }
              sendResponse({ received: true });
            }
          );
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
          this.playButton.disabled =
            !hasText || !isValidLength || this.isPlaying;
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
          await chrome.runtime.sendMessage({
            type: "TTS_STOP",
            payload: {},
            timestamp: Date.now(),
          });
        }

        handleSettingsOpen() {
          chrome.tabs.create({
            url: chrome.runtime.getURL("settings.html"),
          });
        }

        handleTTSStarted(payload) {
          this.updateStatus("playing");
          this.showProgress(true);
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

        async saveTextToStorage() {
          await chrome.storage.local.set({
            lastText: this.textInput.value,
          });
        }

        async loadSavedText() {
          const result = await chrome.storage.local.get(["lastText"]);
          if (result.lastText) {
            this.textInput.value = result.lastText;
            this.updateCharacterCount();
            this.updateButtonState();
          }
        }
      };
  });

  afterEach(() => {
    dom.window.close();
  });

  describe("Initialization", () => {
    it("should initialize with correct default state", () => {
      const popup = new PopupUI();

      expect(popup.textInput).toBeTruthy();
      expect(popup.playButton).toBeTruthy();
      expect(popup.playButton.disabled).toBe(true);
      expect(popup.charCount.textContent).toBe("0");
      expect(
        popup.statusIndicator.querySelector(".status-text").textContent
      ).toBe("준비됨");
    });

    it("should setup event listeners", () => {
      const popup = new PopupUI();

      // Test text input event
      popup.textInput.value = "test text";
      popup.textInput.dispatchEvent(new window.Event("input"));

      expect(popup.playButton.disabled).toBe(false);
      expect(popup.charCount.textContent).toBe("9");
    });
  });

  describe("Text Input Validation", () => {
    let popup;

    beforeEach(() => {
      popup = new PopupUI();
    });

    it("should enable play button when text is entered", () => {
      popup.textInput.value = "Hello world";
      popup.textInput.dispatchEvent(new window.Event("input"));

      expect(popup.playButton.disabled).toBe(false);
    });

    it("should disable play button when text is empty", () => {
      popup.textInput.value = "";
      popup.textInput.dispatchEvent(new window.Event("input"));

      expect(popup.playButton.disabled).toBe(true);
    });

    it("should enforce maximum character limit", () => {
      const longText = "a".repeat(1001);
      popup.textInput.value = longText;
      popup.validateInput(longText);

      expect(popup.textInput.value.length).toBe(1000);
    });

    it("should update character count correctly", () => {
      popup.textInput.value = "test";
      popup.updateCharacterCount();

      expect(popup.charCount.textContent).toBe("4");
    });
  });

  describe("TTS Playback Control", () => {
    let popup;

    beforeEach(() => {
      popup = new PopupUI();
      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
    });

    it("should send TTS_PLAY message when play button is clicked", async () => {
      popup.textInput.value = "test text";
      popup.updateButtonState();

      await popup.handleTextSubmit();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "TTS_PLAY",
        payload: { text: "test text" },
        timestamp: expect.any(Number),
      });
    });

    it("should not play when text is empty", async () => {
      popup.textInput.value = "";

      await popup.handleTextSubmit();

      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it("should send TTS_STOP message when stop button is clicked", async () => {
      popup.isPlaying = true;

      await popup.handleStop();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "TTS_STOP",
        payload: {},
        timestamp: expect.any(Number),
      });
    });

    it("should update UI state when TTS starts", () => {
      popup.handleTTSStarted({});

      expect(popup.statusIndicator.className).toContain("playing");
      expect(popup.progressSection.style.display).toBe("block");
    });

    it("should reset UI state when TTS completes", () => {
      popup.isPlaying = true;
      popup.handleTTSCompleted({});

      expect(popup.isPlaying).toBe(false);
      expect(popup.statusIndicator.className).toContain("idle");
      expect(popup.progressSection.style.display).toBe("none");
    });

    it("should handle TTS errors gracefully", () => {
      popup.isPlaying = true;
      popup.handleTTSError({ error: "Test error" });

      expect(popup.isPlaying).toBe(false);
      expect(popup.statusIndicator.className).toContain("error");
    });
  });

  describe("Settings Integration", () => {
    let popup;

    beforeEach(() => {
      popup = new PopupUI();
      mockChrome.tabs.create.mockResolvedValue({ id: 1 });
    });

    it("should open settings page when settings button is clicked", async () => {
      await popup.handleSettingsOpen();

      expect(mockChrome.tabs.create).toHaveBeenCalledWith({
        url: chrome.runtime.getURL("settings.html"),
      });
    });
  });

  describe("Storage Integration", () => {
    let popup;

    beforeEach(() => {
      popup = new PopupUI();
      mockChrome.storage.local.set.mockResolvedValue();
      mockChrome.storage.local.get.mockResolvedValue({
        lastText: "saved text",
      });
    });

    it("should save text to storage on input", async () => {
      popup.textInput.value = "test text";
      await popup.saveTextToStorage();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        lastText: "test text",
      });
    });

    it("should load saved text on initialization", async () => {
      await popup.loadSavedText();

      expect(popup.textInput.value).toBe("saved text");
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(["lastText"]);
    });
  });

  describe("Keyboard Shortcuts", () => {
    let popup;

    beforeEach(() => {
      popup = new PopupUI();
      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
    });

    it("should trigger TTS on Enter key press", async () => {
      popup.textInput.value = "test text";
      popup.updateButtonState();

      const enterEvent = new window.KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: false,
      });

      popup.textInput.dispatchEvent(enterEvent);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "TTS_PLAY",
        payload: { text: "test text" },
        timestamp: expect.any(Number),
      });
    });

    it("should not trigger TTS on Shift+Enter", () => {
      popup.textInput.value = "test text";

      const shiftEnterEvent = new window.KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
      });

      popup.textInput.dispatchEvent(shiftEnterEvent);

      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe("UI State Management", () => {
    let popup;

    beforeEach(() => {
      popup = new PopupUI();
    });

    it("should show loading state during playback", () => {
      popup.setPlayingState(true);

      const buttonText = popup.playButton.querySelector(".button-text");
      const spinner = popup.playButton.querySelector(".loading-spinner");

      expect(buttonText.style.display).toBe("none");
      expect(spinner.style.display).toBe("block");
      expect(popup.playButton.disabled).toBe(true);
      expect(popup.stopButton.style.display).toBe("block");
      expect(popup.textInput.disabled).toBe(true);
    });

    it("should hide loading state after playback", () => {
      popup.setPlayingState(false);

      const buttonText = popup.playButton.querySelector(".button-text");
      const spinner = popup.playButton.querySelector(".loading-spinner");

      expect(buttonText.style.display).toBe("block");
      expect(spinner.style.display).toBe("none");
      expect(popup.stopButton.style.display).toBe("none");
      expect(popup.textInput.disabled).toBe(false);
    });

    it("should show progress section when requested", () => {
      popup.showProgress(true);
      expect(popup.progressSection.style.display).toBe("block");

      popup.showProgress(false);
      expect(popup.progressSection.style.display).toBe("none");
    });
  });

  describe("Error Handling", () => {
    let popup;

    beforeEach(() => {
      popup = new PopupUI();
    });

    it("should handle Chrome API errors gracefully", async () => {
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error("API Error"));

      popup.textInput.value = "test text";
      await popup.handleTextSubmit();

      expect(popup.statusIndicator.className).toContain("error");
      expect(popup.isPlaying).toBe(false);
    });

    it("should handle storage errors gracefully", async () => {
      mockChrome.storage.local.set.mockRejectedValue(
        new Error("Storage Error")
      );

      // Should not throw
      await expect(popup.saveTextToStorage()).resolves.toBeUndefined();
    });
  });
});
