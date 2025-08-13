// Popup UI Controller
class PopupUI {
  constructor() {
    this.textInput = document.getElementById("textInput");
    this.playButton = document.getElementById("playButton");
    this.settingsButton = document.getElementById("settingsButton");
    this.statusIndicator = document.getElementById("statusIndicator");

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateButtonState();
    this.updateStatus("idle");
  }

  setupEventListeners() {
    // Text input events
    this.textInput.addEventListener("input", () => {
      this.updateButtonState();
    });

    this.textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.handleTextSubmit();
      }
    });

    // Button events
    this.playButton.addEventListener("click", () => {
      this.handleTextSubmit();
    });

    this.settingsButton.addEventListener("click", () => {
      this.handleSettingsOpen();
    });
  }

  updateButtonState() {
    const hasText = this.textInput.value.trim().length > 0;
    this.playButton.disabled = !hasText;
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
    if (!text) return;

    try {
      this.updateStatus("playing");
      this.setLoading(true);

      // Send message to background script
      await chrome.runtime.sendMessage({
        type: "TTS_PLAY",
        payload: { text },
        timestamp: Date.now(),
      });

      // Reset UI after a delay
      setTimeout(() => {
        this.updateStatus("idle");
        this.setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("TTS playback failed:", error);
      this.updateStatus("error");
      this.setLoading(false);
    }
  }

  handleSettingsOpen() {
    // TODO: Implement settings page
    console.log("Settings clicked - to be implemented");
  }

  setLoading(isLoading) {
    const buttonText = this.playButton.querySelector(".button-text");
    const spinner = this.playButton.querySelector(".loading-spinner");

    if (isLoading) {
      buttonText.style.display = "none";
      spinner.style.display = "block";
      this.playButton.disabled = true;
    } else {
      buttonText.style.display = "block";
      spinner.style.display = "none";
      this.updateButtonState();
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PopupUI();
});
