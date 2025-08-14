/**
 * TTS Engine - Web Speech API 래퍼 클래스
 * SpeechSynthesis API를 활용한 텍스트 음성 변환 엔진
 */
class TTSEngine {
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.currentUtterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.fallbackVoices = [];
    this.errorHandlers = new Map();
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1초
  }

  /**
   * 브라우저의 Web Speech API 지원 여부 확인
   * @returns {boolean} 지원 여부
   */
  isSupported() {
    return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  /**
   * 오류 핸들러 등록
   * @param {string} errorType - 오류 타입
   * @param {Function} handler - 오류 처리 함수
   */
  onError(errorType, handler) {
    if (!this.errorHandlers.has(errorType)) {
      this.errorHandlers.set(errorType, []);
    }
    this.errorHandlers.get(errorType).push(handler);
  }

  /**
   * 오류 발생 시 등록된 핸들러 실행
   * @param {string} errorType - 오류 타입
   * @param {Error} error - 오류 객체
   * @param {Object} context - 추가 컨텍스트 정보
   */
  _handleError(errorType, error, context = {}) {
    const handlers = this.errorHandlers.get(errorType) || [];
    handlers.forEach((handler) => {
      try {
        handler(error, context);
      } catch (handlerError) {
        console.error("Error in error handler:", handlerError);
      }
    });
  }

  /**
   * 대체 TTS 솔루션 제공 (Web Speech API 미지원 시)
   * @param {string} text - 변환할 텍스트
   * @returns {Promise<void>}
   */
  _fallbackTTS(text) {
    return new Promise((resolve, reject) => {
      // 브라우저 알림으로 텍스트 표시
      if ("Notification" in window) {
        new Notification("TTS Voice Bridge", {
          body: `음성 변환: ${text}`,
          icon: "/icons/icon48.png",
        });
      }

      // 콘솔에 텍스트 출력
      console.log(`TTS Fallback: ${text}`);

      // 사용자에게 수동 입력 안내
      const fallbackError = new Error(
        "Web Speech API를 사용할 수 없습니다. 텍스트를 수동으로 입력해주세요: " +
          text
      );
      fallbackError.type = "FALLBACK_REQUIRED";
      fallbackError.text = text;

      this._handleError("unsupported_browser", fallbackError, { text });
      reject(fallbackError);
    });
  }

  /**
   * 사용 가능한 음성 목록 조회
   * @returns {Promise<SpeechSynthesisVoice[]>} 음성 목록
   */
  getAvailableVoices() {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        const error = new Error("Web Speech API is not supported");
        this._handleError("unsupported_browser", error);
        reject(error);
        return;
      }

      let voices = this.synthesis.getVoices();

      if (voices.length > 0) {
        this.fallbackVoices = voices.slice(0, 3); // 상위 3개 음성을 대체용으로 저장
        resolve(voices);
      } else {
        // 일부 브라우저에서는 비동기적으로 음성 목록이 로드됨
        const timeout = setTimeout(() => {
          const error = new Error("음성 목록 로드 시간 초과");
          this._handleError("voice_load_timeout", error);
          reject(error);
        }, 5000); // 5초 타임아웃

        this.synthesis.addEventListener(
          "voiceschanged",
          () => {
            clearTimeout(timeout);
            voices = this.synthesis.getVoices();
            if (voices.length > 0) {
              this.fallbackVoices = voices.slice(0, 3);
              resolve(voices);
            } else {
              const error = new Error("사용 가능한 음성이 없습니다");
              this._handleError("no_voices_available", error);
              reject(error);
            }
          },
          { once: true }
        );
      }
    });
  }

  /**
   * 대체 음성 선택
   * @param {string} preferredVoice - 선호하는 음성 이름
   * @param {string} language - 언어 코드
   * @returns {Promise<SpeechSynthesisVoice|null>} 선택된 음성
   */
  async _selectFallbackVoice(preferredVoice, language) {
    try {
      const voices = await this.getAvailableVoices();

      // 1. 선호하는 음성 찾기
      let selectedVoice = voices.find(
        (voice) =>
          voice.name === preferredVoice || voice.voiceURI === preferredVoice
      );

      if (selectedVoice) return selectedVoice;

      // 2. 같은 언어의 음성 찾기
      if (language) {
        selectedVoice = voices.find((voice) =>
          voice.lang.startsWith(language.split("-")[0])
        );
        if (selectedVoice) {
          this._handleError(
            "voice_fallback",
            new Error(
              `선호 음성을 찾을 수 없어 ${selectedVoice.name}을(를) 사용합니다`
            ),
            { preferredVoice, selectedVoice: selectedVoice.name }
          );
          return selectedVoice;
        }
      }

      // 3. 기본 음성 사용
      selectedVoice = voices.find((voice) => voice.default) || voices[0];
      if (selectedVoice) {
        this._handleError(
          "voice_fallback",
          new Error(`기본 음성 ${selectedVoice.name}을(를) 사용합니다`),
          { preferredVoice, selectedVoice: selectedVoice.name }
        );
        return selectedVoice;
      }

      return null;
    } catch (error) {
      this._handleError("voice_selection_failed", error, {
        preferredVoice,
        language,
      });
      return null;
    }
  }

  /**
   * 텍스트를 음성으로 변환하여 재생 (재시도 로직 포함)
   * @param {string} text - 변환할 텍스트
   * @param {Object} options - TTS 옵션
   * @param {string} options.voice - 음성 이름
   * @param {number} options.rate - 재생 속도 (0.1-10)
   * @param {number} options.pitch - 음성 톤 (0-2)
   * @param {number} options.volume - 볼륨 (0-1)
   * @param {string} options.lang - 언어 코드
   * @param {number} _retryCount - 내부 재시도 카운터
   * @returns {Promise<void>}
   */
  async speak(text, options = {}, _retryCount = 0) {
    if (!this.isSupported()) {
      return this._fallbackTTS(text);
    }

    if (!text || text.trim() === "") {
      const error = new Error("텍스트가 필요합니다");
      this._handleError("invalid_input", error, { text });
      throw error;
    }

    try {
      return await this._attemptSpeak(text, options);
    } catch (error) {
      if (_retryCount < this.retryAttempts) {
        this._handleError("tts_retry", error, {
          text,
          options,
          retryCount: _retryCount + 1,
          maxRetries: this.retryAttempts,
        });

        // 재시도 전 대기
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.speak(text, options, _retryCount + 1);
      } else {
        this._handleError("tts_failed", error, {
          text,
          options,
          totalRetries: _retryCount,
        });
        throw error;
      }
    }
  }

  /**
   * 실제 TTS 재생 시도
   * @param {string} text - 변환할 텍스트
   * @param {Object} options - TTS 옵션
   * @returns {Promise<void>}
   */
  async _attemptSpeak(text, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // 현재 재생 중인 음성이 있으면 중지
        this.stop();

        const utterance = new SpeechSynthesisUtterance(text);

        // 옵션 설정 및 유효성 검증
        if (options.rate !== undefined) {
          utterance.rate = Math.max(0.1, Math.min(10, options.rate));
        }
        if (options.pitch !== undefined) {
          utterance.pitch = Math.max(0, Math.min(2, options.pitch));
        }
        if (options.volume !== undefined) {
          utterance.volume = Math.max(0, Math.min(1, options.volume));
        }
        if (options.lang) {
          utterance.lang = options.lang;
        }

        // 음성 선택 (대체 음성 로직 포함)
        if (options.voice) {
          const selectedVoice = await this._selectFallbackVoice(
            options.voice,
            options.lang
          );
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }

        // 타임아웃 설정 (긴 텍스트의 경우 더 긴 타임아웃)
        const timeoutDuration = Math.max(10000, text.length * 100); // 최소 10초, 문자당 100ms
        const timeout = setTimeout(() => {
          this.stop();
          const error = new Error("TTS 재생 시간 초과");
          error.type = "TIMEOUT";
          reject(error);
        }, timeoutDuration);

        // 이벤트 리스너 설정
        utterance.onstart = () => {
          this.isPlaying = true;
          this.isPaused = false;
        };

        utterance.onend = () => {
          clearTimeout(timeout);
          this.isPlaying = false;
          this.isPaused = false;
          this.currentUtterance = null;
          resolve();
        };

        utterance.onerror = (event) => {
          clearTimeout(timeout);
          this.isPlaying = false;
          this.isPaused = false;
          this.currentUtterance = null;

          const error = new Error(`TTS 재생 오류: ${event.error}`);
          error.type = event.error;
          error.originalEvent = event;
          reject(error);
        };

        utterance.onpause = () => {
          this.isPaused = true;
        };

        utterance.onresume = () => {
          this.isPaused = false;
        };

        this.currentUtterance = utterance;

        // SpeechSynthesis 큐가 비어있는지 확인
        if (this.synthesis.pending || this.synthesis.speaking) {
          this.synthesis.cancel();
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        this.synthesis.speak(utterance);

        // 재생이 시작되지 않는 경우를 위한 추가 체크
        setTimeout(() => {
          if (!this.isPlaying && !this.synthesis.speaking) {
            const error = new Error("TTS 재생이 시작되지 않았습니다");
            error.type = "START_FAILED";
            reject(error);
          }
        }, 1000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 현재 재생 중인 음성 중지
   */
  stop() {
    try {
      if (this.synthesis.speaking || this.synthesis.pending) {
        this.synthesis.cancel();
      }
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
    } catch (error) {
      this._handleError("stop_failed", error);
      // 강제로 상태 초기화
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
    }
  }

  /**
   * 현재 재생 중인 음성 일시정지
   */
  pause() {
    if (this.synthesis.speaking && !this.synthesis.paused) {
      this.synthesis.pause();
      this.isPaused = true;
    }
  }

  /**
   * 일시정지된 음성 재개
   */
  resume() {
    if (this.synthesis.paused) {
      this.synthesis.resume();
      this.isPaused = false;
    }
  }

  /**
   * 현재 재생 상태 확인
   * @returns {boolean} 재생 중 여부
   */
  isCurrentlyPlaying() {
    return this.isPlaying && !this.isPaused;
  }

  /**
   * 현재 일시정지 상태 확인
   * @returns {boolean} 일시정지 여부
   */
  isCurrentlyPaused() {
    return this.isPaused;
  }

  /**
   * 현재 재생 중이거나 대기 중인 음성이 있는지 확인
   * @returns {boolean} 활성 상태 여부
   */
  isActive() {
    return this.synthesis.speaking || this.synthesis.pending;
  }
}

// 모듈 내보내기 (브라우저 환경에서 사용)
if (typeof module !== "undefined" && module.exports) {
  module.exports = TTSEngine;
} else {
  window.TTSEngine = TTSEngine;
}
