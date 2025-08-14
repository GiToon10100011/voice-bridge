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

    // Performance optimizations
    this.debounceTimers = new Map();
    this.lastInputTime = 0;
    this.inputDebounceDelay = 300; // 300ms
    this.saveDebounceDelay = 1000; // 1초
    this.messageCache = new Map();
    this.messageCacheTTL = 30000; // 30초
    this.performanceMetrics = {
      inputEvents: 0,
      messagesSent: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };

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
    // Text input events (디바운스 적용)
    this.textInput.addEventListener("input", (e) => {
      this.performanceMetrics.inputEvents++;
      this.lastInputTime = Date.now();

      // 즉시 UI 업데이트 (사용자 경험)
      this.updateCharacterCount();
      this.updateButtonState();

      // 디바운스된 검증 및 저장
      this.debounce(
        "input",
        () => {
          this.validateInput(e.target.value);
          this.debouncedSaveTextToStorage();
        },
        this.inputDebounceDelay
      );
    });

    this.textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleTextSubmit();
      }
    });

    this.textInput.addEventListener("paste", (e) => {
      // Handle paste event to validate length (디바운스 적용)
      this.debounce(
        "paste",
        () => {
          this.validateInput(this.textInput.value);
          this.updateCharacterCount();
          this.updateButtonState();
        },
        50
      );
    });

    // Button events (중복 클릭 방지)
    this.playButton.addEventListener("click", (e) => {
      if (!this.playButton.disabled) {
        this.handleTextSubmit();
      }
    });

    this.stopButton.addEventListener("click", (e) => {
      if (!this.stopButton.disabled) {
        this.handleStop();
      }
    });

    this.settingsButton.addEventListener("click", (e) => {
      if (!this.settingsButton.disabled) {
        this.handleSettingsOpen();
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isPlaying) {
        this.handleStop();
      }
    });
  }

  /**
   * 디바운스 유틸리티
   * @private
   */
  debounce(key, func, delay) {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    const timer = setTimeout(() => {
      func();
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * 디바운스된 텍스트 저장
   * @private
   */
  debouncedSaveTextToStorage() {
    this.debounce(
      "save",
      () => {
        this.saveTextToStorage();
      },
      this.saveDebounceDelay
    );
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

      // 캐시된 메시지 확인
      const messageKey = `TTS_PLAY:${text}`;
      const cachedResponse = this.getCachedMessage(messageKey);

      if (cachedResponse) {
        this.performanceMetrics.cacheHits++;
        // 캐시된 응답 사용 (즉시 처리)
        if (cachedResponse.error) {
          throw new Error(cachedResponse.error);
        }
      } else {
        this.performanceMetrics.cacheMisses++;
        this.performanceMetrics.messagesSent++;

        // Send message to background script
        const response = await chrome.runtime.sendMessage({
          type: "TTS_PLAY",
          payload: { text },
          timestamp: Date.now(),
        });

        // 응답 캐싱
        this.cacheMessage(messageKey, response);

        if (!response || response.error) {
          throw new Error(response?.error || "Failed to start TTS");
        }
      }
    } catch (error) {
      console.error("TTS playback failed:", error);
      this.handleTTSError({ error: error.message });
    }
  }

  /**
   * 메시지 캐싱
   * @private
   */
  cacheMessage(key, response) {
    // 성공한 응답만 캐싱
    if (response && response.success) {
      this.messageCache.set(key, {
        response,
        timestamp: Date.now(),
      });

      // 캐시 크기 제한
      if (this.messageCache.size > 20) {
        const oldestKey = this.messageCache.keys().next().value;
        this.messageCache.delete(oldestKey);
      }
    }
  }

  /**
   * 캐시된 메시지 조회
   * @private
   */
  getCachedMessage(key) {
    const cached = this.messageCache.get(key);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < this.messageCacheTTL) {
        return cached.response;
      } else {
        this.messageCache.delete(key);
      }
    }
    return null;
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

  /**
   * 성능 통계 반환
   */
  getPerformanceStats() {
    return {
      ...this.performanceMetrics,
      messageCacheSize: this.messageCache.size,
      debounceTimersActive: this.debounceTimers.size,
      lastInputTime: this.lastInputTime,
      cacheHitRate:
        this.performanceMetrics.messagesSent > 0
          ? (
              (this.performanceMetrics.cacheHits /
                (this.performanceMetrics.cacheHits +
                  this.performanceMetrics.cacheMisses)) *
              100
            ).toFixed(2) + "%"
          : "0%",
    };
  }

  /**
   * 성능 설정 업데이트
   */
  updatePerformanceConfig(config) {
    if (config.inputDebounceDelay !== undefined) {
      this.inputDebounceDelay = Math.max(
        100,
        Math.min(1000, config.inputDebounceDelay)
      );
    }
    if (config.saveDebounceDelay !== undefined) {
      this.saveDebounceDelay = Math.max(
        500,
        Math.min(5000, config.saveDebounceDelay)
      );
    }
    if (config.messageCacheTTL !== undefined) {
      this.messageCacheTTL = Math.max(
        10000,
        Math.min(300000, config.messageCacheTTL)
      );
    }
  }

  /**
   * 메모리 정리
   */
  performMemoryCleanup() {
    // 만료된 캐시 정리
    const now = Date.now();
    for (const [key, cached] of this.messageCache.entries()) {
      if (now - cached.timestamp > this.messageCacheTTL) {
        this.messageCache.delete(key);
      }
    }

    // 완료된 디바운스 타이머 정리
    for (const [key, timer] of this.debounceTimers.entries()) {
      if (!timer) {
        this.debounceTimers.delete(key);
      }
    }
  }

  /**
   * 리소스 해제
   */
  dispose() {
    // 모든 디바운스 타이머 정리
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // 캐시 정리
    this.messageCache.clear();

    // 이벤트 리스너 제거는 브라우저가 자동으로 처리
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const popupUI = new PopupUI();

  // 주기적 메모리 정리 (2분마다)
  setInterval(() => {
    popupUI.performMemoryCleanup();
  }, 120000);

  // 페이지 언로드 시 리소스 정리
  window.addEventListener("beforeunload", () => {
    popupUI.dispose();
  });
});
