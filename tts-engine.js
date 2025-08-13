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
  }

  /**
   * 브라우저의 Web Speech API 지원 여부 확인
   * @returns {boolean} 지원 여부
   */
  isSupported() {
    return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  /**
   * 사용 가능한 음성 목록 조회
   * @returns {Promise<SpeechSynthesisVoice[]>} 음성 목록
   */
  getAvailableVoices() {
    return new Promise((resolve) => {
      let voices = this.synthesis.getVoices();

      if (voices.length > 0) {
        resolve(voices);
      } else {
        // 일부 브라우저에서는 비동기적으로 음성 목록이 로드됨
        this.synthesis.addEventListener(
          "voiceschanged",
          () => {
            voices = this.synthesis.getVoices();
            resolve(voices);
          },
          { once: true }
        );
      }
    });
  }

  /**
   * 텍스트를 음성으로 변환하여 재생
   * @param {string} text - 변환할 텍스트
   * @param {Object} options - TTS 옵션
   * @param {string} options.voice - 음성 이름
   * @param {number} options.rate - 재생 속도 (0.1-10)
   * @param {number} options.pitch - 음성 톤 (0-2)
   * @param {number} options.volume - 볼륨 (0-1)
   * @param {string} options.lang - 언어 코드
   * @returns {Promise<void>}
   */
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error("Web Speech API is not supported in this browser"));
        return;
      }

      if (!text || text.trim() === "") {
        reject(new Error("Text is required for speech synthesis"));
        return;
      }

      // 현재 재생 중인 음성이 있으면 중지
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);

      // 옵션 설정
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

      // 특정 음성 설정
      if (options.voice) {
        this.getAvailableVoices().then((voices) => {
          const selectedVoice = voices.find(
            (voice) =>
              voice.name === options.voice || voice.voiceURI === options.voice
          );
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        });
      }

      // 이벤트 리스너 설정
      utterance.onstart = () => {
        this.isPlaying = true;
        this.isPaused = false;
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentUtterance = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      utterance.onpause = () => {
        this.isPaused = true;
      };

      utterance.onresume = () => {
        this.isPaused = false;
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  /**
   * 현재 재생 중인 음성 중지
   */
  stop() {
    if (this.synthesis.speaking || this.synthesis.pending) {
      this.synthesis.cancel();
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
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
