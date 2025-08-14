/**
 * Global Error Handler and Logging System
 * 전역 오류 처리 및 디버깅을 위한 로깅 시스템
 */
class ErrorHandler {
  constructor() {
    this.logLevel = "INFO"; // DEBUG, INFO, WARN, ERROR
    this.maxLogEntries = 1000;
    this.logEntries = [];
    this.errorListeners = new Map();
    this.userFriendlyMessages = new Map();
    this.isInitialized = false;

    this.setupUserFriendlyMessages();
  }

  /**
   * 오류 핸들러 초기화
   */
  initialize() {
    if (this.isInitialized) return;

    this.setupGlobalErrorHandlers();
    this.setupUnhandledRejectionHandler();
    this.isInitialized = true;

    this.info("ErrorHandler initialized");
  }

  /**
   * 전역 오류 핸들러 설정
   */
  setupGlobalErrorHandlers() {
    // 브라우저 환경에서의 전역 오류 처리
    if (typeof window !== "undefined") {
      window.addEventListener("error", (event) => {
        this.handleGlobalError({
          type: "javascript_error",
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
          stack: event.error?.stack,
        });
      });

      window.addEventListener("unhandledrejection", (event) => {
        this.handleUnhandledRejection({
          type: "unhandled_promise_rejection",
          reason: event.reason,
          promise: event.promise,
        });
      });
    }

    // Chrome Extension 환경에서의 오류 처리
    if (typeof chrome !== "undefined" && chrome.runtime) {
      // Service Worker에서의 오류 처리
      if (typeof self !== "undefined" && self.addEventListener) {
        self.addEventListener("error", (event) => {
          this.handleGlobalError({
            type: "service_worker_error",
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error,
            stack: event.error?.stack,
          });
        });

        self.addEventListener("unhandledrejection", (event) => {
          this.handleUnhandledRejection({
            type: "service_worker_promise_rejection",
            reason: event.reason,
            promise: event.promise,
          });
        });
      }
    }
  }

  /**
   * 처리되지 않은 Promise 거부 핸들러 설정
   */
  setupUnhandledRejectionHandler() {
    if (typeof process !== "undefined" && process.on) {
      // Node.js 환경 (테스트 환경)
      process.on("unhandledRejection", (reason, promise) => {
        this.handleUnhandledRejection({
          type: "node_unhandled_rejection",
          reason,
          promise,
        });
      });
    }
  }

  /**
   * 사용자 친화적 오류 메시지 설정
   */
  setupUserFriendlyMessages() {
    this.userFriendlyMessages.set("tts_not_supported", {
      title: "TTS 기능을 사용할 수 없습니다",
      message:
        "브라우저에서 음성 합성 기능을 지원하지 않습니다. Chrome 또는 Edge 브라우저를 사용해주세요.",
      action: "브라우저 업데이트 또는 변경",
    });

    this.userFriendlyMessages.set("permission_denied", {
      title: "권한이 필요합니다",
      message: "확장프로그램이 정상적으로 작동하려면 권한이 필요합니다.",
      action: "확장프로그램 설정에서 권한 활성화",
    });

    this.userFriendlyMessages.set("voice_load_failed", {
      title: "음성을 불러올 수 없습니다",
      message:
        "음성 목록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      action: "페이지 새로고침 후 재시도",
    });

    this.userFriendlyMessages.set("tts_playback_failed", {
      title: "음성 재생 실패",
      message: "텍스트를 음성으로 변환하는 중 오류가 발생했습니다.",
      action: "다른 음성 선택 또는 텍스트 수정",
    });

    this.userFriendlyMessages.set("settings_save_failed", {
      title: "설정 저장 실패",
      message: "설정을 저장하는 중 오류가 발생했습니다.",
      action: "브라우저 저장소 확인 또는 재시도",
    });

    this.userFriendlyMessages.set("network_error", {
      title: "네트워크 오류",
      message: "인터넷 연결을 확인해주세요.",
      action: "네트워크 연결 상태 확인",
    });

    this.userFriendlyMessages.set("unknown_error", {
      title: "알 수 없는 오류",
      message: "예상치 못한 오류가 발생했습니다.",
      action: "페이지 새로고침 또는 확장프로그램 재시작",
    });
  }

  /**
   * 로그 레벨 설정
   * @param {string} level - DEBUG, INFO, WARN, ERROR
   */
  setLogLevel(level) {
    const validLevels = ["DEBUG", "INFO", "WARN", "ERROR"];
    if (validLevels.includes(level)) {
      this.logLevel = level;
      this.info(`Log level set to ${level}`);
    } else {
      this.warn(
        `Invalid log level: ${level}. Valid levels: ${validLevels.join(", ")}`
      );
    }
  }

  /**
   * 로그 레벨 우선순위 확인
   * @param {string} level - 확인할 로그 레벨
   * @returns {boolean} 로그 출력 여부
   */
  shouldLog(level) {
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  /**
   * 로그 엔트리 생성
   * @param {string} level - 로그 레벨
   * @param {string} message - 로그 메시지
   * @param {Object} data - 추가 데이터
   * @returns {Object} 로그 엔트리
   */
  createLogEntry(level, message, data = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      stack: new Error().stack,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
      url: typeof window !== "undefined" ? window.location?.href : "Unknown",
    };
  }

  /**
   * 로그 저장
   * @param {Object} entry - 로그 엔트리
   */
  storeLogEntry(entry) {
    this.logEntries.push(entry);

    // 최대 로그 엔트리 수 제한
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.maxLogEntries);
    }

    // Chrome Extension 환경에서 로그 저장
    if (typeof chrome !== "undefined" && chrome.storage) {
      try {
        chrome.storage.local.set({
          errorLogs: this.logEntries.slice(-100), // 최근 100개만 저장
        });
      } catch (error) {
        console.error("Failed to store log entry:", error);
      }
    }
  }

  /**
   * 디버그 로그
   * @param {string} message - 로그 메시지
   * @param {Object} data - 추가 데이터
   */
  debug(message, data = {}) {
    if (!this.shouldLog("DEBUG")) return;

    const entry = this.createLogEntry("DEBUG", message, data);
    this.storeLogEntry(entry);
    console.debug(`[TTS-DEBUG] ${message}`, data);
  }

  /**
   * 정보 로그
   * @param {string} message - 로그 메시지
   * @param {Object} data - 추가 데이터
   */
  info(message, data = {}) {
    if (!this.shouldLog("INFO")) return;

    const entry = this.createLogEntry("INFO", message, data);
    this.storeLogEntry(entry);
    console.info(`[TTS-INFO] ${message}`, data);
  }

  /**
   * 경고 로그
   * @param {string} message - 로그 메시지
   * @param {Object} data - 추가 데이터
   */
  warn(message, data = {}) {
    if (!this.shouldLog("WARN")) return;

    const entry = this.createLogEntry("WARN", message, data);
    this.storeLogEntry(entry);
    console.warn(`[TTS-WARN] ${message}`, data);
  }

  /**
   * 오류 로그
   * @param {string} message - 로그 메시지
   * @param {Error|Object} error - 오류 객체
   * @param {Object} data - 추가 데이터
   */
  error(message, error = null, data = {}) {
    if (!this.shouldLog("ERROR")) return;

    const errorData = {
      ...data,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...error,
          }
        : null,
    };

    const entry = this.createLogEntry("ERROR", message, errorData);
    this.storeLogEntry(entry);
    console.error(`[TTS-ERROR] ${message}`, error, data);

    // 오류 리스너에게 알림
    this.notifyErrorListeners("error", { message, error, data: errorData });
  }

  /**
   * 전역 오류 처리
   * @param {Object} errorInfo - 오류 정보
   */
  handleGlobalError(errorInfo) {
    this.error("Global error caught", errorInfo.error, {
      type: errorInfo.type,
      filename: errorInfo.filename,
      lineno: errorInfo.lineno,
      colno: errorInfo.colno,
      message: errorInfo.message,
    });

    // 사용자에게 친화적인 오류 메시지 표시
    this.showUserFriendlyError("unknown_error", errorInfo);
  }

  /**
   * 처리되지 않은 Promise 거부 처리
   * @param {Object} rejectionInfo - 거부 정보
   */
  handleUnhandledRejection(rejectionInfo) {
    this.error("Unhandled promise rejection", rejectionInfo.reason, {
      type: rejectionInfo.type,
      promise: rejectionInfo.promise,
    });

    // 사용자에게 친화적인 오류 메시지 표시
    this.showUserFriendlyError("unknown_error", rejectionInfo);
  }

  /**
   * 오류 리스너 등록
   * @param {string} errorType - 오류 타입
   * @param {Function} listener - 리스너 함수
   */
  onError(errorType, listener) {
    if (!this.errorListeners.has(errorType)) {
      this.errorListeners.set(errorType, []);
    }
    this.errorListeners.get(errorType).push(listener);
  }

  /**
   * 오류 리스너에게 알림
   * @param {string} errorType - 오류 타입
   * @param {Object} errorData - 오류 데이터
   */
  notifyErrorListeners(errorType, errorData) {
    const listeners = this.errorListeners.get(errorType) || [];
    listeners.forEach((listener) => {
      try {
        listener(errorData);
      } catch (error) {
        console.error("Error in error listener:", error);
      }
    });
  }

  /**
   * 사용자 친화적 오류 메시지 표시
   * @param {string} errorType - 오류 타입
   * @param {Object} errorData - 오류 데이터
   */
  showUserFriendlyError(errorType, errorData = {}) {
    const messageInfo =
      this.userFriendlyMessages.get(errorType) ||
      this.userFriendlyMessages.get("unknown_error");

    // Chrome Extension 환경에서 알림 표시
    if (typeof chrome !== "undefined" && chrome.notifications) {
      try {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "/icons/icon48.png",
          title: messageInfo.title,
          message: messageInfo.message,
        });
      } catch (error) {
        console.error("Failed to show notification:", error);
      }
    }

    // 브라우저 환경에서 알림 표시
    if (typeof window !== "undefined" && window.Notification) {
      try {
        if (Notification.permission === "granted") {
          new Notification(messageInfo.title, {
            body: messageInfo.message,
            icon: "/icons/icon48.png",
          });
        }
      } catch (error) {
        console.error("Failed to show browser notification:", error);
      }
    }

    // 콘솔에 사용자 친화적 메시지 출력
    console.group(`🚨 ${messageInfo.title}`);
    console.log(`📝 ${messageInfo.message}`);
    console.log(`💡 권장 조치: ${messageInfo.action}`);
    if (errorData.error) {
      console.log("🔍 기술적 세부사항:", errorData.error);
    }
    console.groupEnd();

    // 오류 리스너에게 알림
    this.notifyErrorListeners("user_friendly_error", {
      errorType,
      messageInfo,
      errorData,
    });
  }

  /**
   * 로그 내보내기
   * @param {string} level - 필터링할 로그 레벨 (선택사항)
   * @returns {Array} 로그 엔트리 배열
   */
  exportLogs(level = null) {
    if (level) {
      return this.logEntries.filter((entry) => entry.level === level);
    }
    return [...this.logEntries];
  }

  /**
   * 로그 지우기
   */
  clearLogs(silent = false) {
    this.logEntries = [];

    // Chrome Extension 저장소에서도 삭제
    if (typeof chrome !== "undefined" && chrome.storage) {
      try {
        chrome.storage.local.remove(["errorLogs"]);
      } catch (error) {
        console.error("Failed to clear stored logs:", error);
      }
    }

    if (!silent) {
      this.info("Logs cleared");
    }
  }

  /**
   * 저장된 로그 불러오기
   * @returns {Promise<Array>} 저장된 로그 엔트리
   */
  async loadStoredLogs() {
    if (typeof chrome !== "undefined" && chrome.storage) {
      try {
        return new Promise((resolve) => {
          try {
            chrome.storage.local.get(["errorLogs"], (result) => {
              resolve(result.errorLogs || []);
            });
          } catch (innerError) {
            this.error("Failed to load stored logs", innerError);
            resolve([]);
          }
        });
      } catch (error) {
        this.error("Failed to load stored logs", error);
        return [];
      }
    }
    return [];
  }

  /**
   * 오류 통계 생성
   * @returns {Object} 오류 통계
   */
  generateErrorStats() {
    const stats = {
      total: this.logEntries.length,
      byLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0 },
      byType: {},
      recent: this.logEntries.slice(-10),
      timeRange: {
        oldest: this.logEntries[0]?.timestamp,
        newest: this.logEntries[this.logEntries.length - 1]?.timestamp,
      },
    };

    this.logEntries.forEach((entry) => {
      stats.byLevel[entry.level]++;

      const errorType = entry.data?.type || "unknown";
      stats.byType[errorType] = (stats.byType[errorType] || 0) + 1;
    });

    return stats;
  }
}

// 전역 인스턴스 생성
const globalErrorHandler = new ErrorHandler();

// 모듈 내보내기 (브라우저 환경에서 사용)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ErrorHandler, globalErrorHandler };
} else {
  window.ErrorHandler = ErrorHandler;
  window.globalErrorHandler = globalErrorHandler;
}
