// Popup UI Controller
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
    // Text input events
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

    this.textInput.addEventListener("paste", (e) => {
      // Handle paste event to validate length
      setTimeout(() => {
        this.validateInput(this.textInput.value);
        this.updateCharacterCount();
      }, 0);
    });

    // Button events
    this.playButton.addEventListener("click", () => {
      this.handleTextSubmit();
    });

    this.stopButton.addEventListener("click", () => {
      this.handleStop();
    });

    this.settingsButton.addEventListener("click", () => {
      this.handleSettingsOpen();
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isPlaying) {
        this.handleStop();
      }
    });
  }

  setupMessageListener() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    });
  }

  validateInput(text) {
    if (text.length > this.maxLength) {
      this.textInput.value = text.substring(0, this.maxLength);
      this.showTemporaryMessage("텍스트가 최대 길이를 초과했습니다.");
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

    // Change color if approaching limit
    if (currentLength > this.maxLength * 0.9) {
      this.charCount.style.color = "#ea4335";
    } else if (currentLength > this.maxLength * 0.8) {
      this.charCount.style.color = "#f57c00";
    } else {
      this.charCount.style.color = "";
    }
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

    if (!this.validateInput(text)) return;

    try {
      this.currentText = text;
      this.isPlaying = true;
      this.updateStatus("playing");
      this.setPlayingState(true);

      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        type: "TTS_PLAY",
        payload: { text },
        timestamp: Date.now(),
      });

      if (!response || response.error) {
        throw new Error(response?.error || "Failed to start TTS");
      }
    } catch (error) {
      console.error("TTS playback failed:", error);
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
      console.error("Failed to stop TTS:", error);
      // Force stop UI even if message fails
      this.handleTTSStopped({});
    }
  }

  handleSettingsOpen() {
    // Open settings in a new tab or popup
    chrome.tabs
      .create({
        url: chrome.runtime.getURL("settings.html"),
      })
      .catch(() => {
        // Fallback: show inline settings (to be implemented in task 4.3)
        this.showTemporaryMessage("설정 페이지를 준비 중입니다...");
      });
  }

  // TTS Event Handlers
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
    this.showTemporaryMessage("음성 재생이 완료되었습니다.");
  }

  handleTTSError(payload) {
    this.isPlaying = false;
    this.updateStatus("error");
    this.setPlayingState(false);
    this.showProgress(false);

    const errorMessage = payload.error || "음성 재생 중 오류가 발생했습니다.";
    this.showTemporaryMessage(errorMessage);

    // Auto-reset to idle after error
    setTimeout(() => {
      this.updateStatus("idle");
    }, 3000);
  }

  handleTTSStopped(payload) {
    this.isPlaying = false;
    this.updateStatus("idle");
    this.setPlayingState(false);
    this.showProgress(false);
    this.showTemporaryMessage("음성 재생이 중지되었습니다.");
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
    if (!show) {
      this.updateProgress(0, "");
    }
  }

  updateProgress(percentage, text) {
    this.progressFill.style.width = `${Math.max(
      0,
      Math.min(100, percentage)
    )}%`;
    this.progressText.textContent = text || "재생 중...";
  }

  showTemporaryMessage(message, duration = 2000) {
    const originalText =
      this.statusIndicator.querySelector(".status-text").textContent;
    const originalClass = this.statusIndicator.className;

    this.statusIndicator.querySelector(".status-text").textContent = message;

    setTimeout(() => {
      this.statusIndicator.className = originalClass;
      this.statusIndicator.querySelector(".status-text").textContent =
        originalText;
    }, duration);
  }

  async saveTextToStorage() {
    try {
      await chrome.storage.local.set({
        lastText: this.textInput.value,
      });
    } catch (error) {
      console.warn("Failed to save text to storage:", error);
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
      console.warn("Failed to load saved text:", error);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PopupUI();
});
