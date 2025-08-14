/**
 * TTS Settings Manager
 * TTS 설정 및 옵션 관리 클래스
 */

/**
 * TTS 옵션 인터페이스 (TypeScript 스타일 주석)
 * @typedef {Object} TTSOptions
 * @property {string} [voice] - 음성 이름
 * @property {number} [rate] - 재생 속도 (0.1-10)
 * @property {number} [pitch] - 음성 톤 (0-2)
 * @property {number} [volume] - 볼륨 (0-1)
 * @property {string} [lang] - 언어 코드
 */

/**
 * TTS 설정 인터페이스
 * @typedef {Object} TTSSettings
 * @property {string} defaultVoice - 기본 음성
 * @property {number} defaultRate - 기본 재생 속도
 * @property {number} defaultPitch - 기본 음성 톤
 * @property {number} defaultVolume - 기본 볼륨
 * @property {string} preferredLanguage - 선호 언어
 */

class TTSSettingsManager {
  constructor() {
    this.defaultSettings = {
      defaultVoice: "",
      defaultRate: 1.0,
      defaultPitch: 1.0,
      defaultVolume: 1.0,
      preferredLanguage: "ko-KR",
    };

    this.currentSettings = { ...this.defaultSettings };
  }

  /**
   * TTSOptions 객체 유효성 검증
   * @param {TTSOptions} options - 검증할 옵션
   * @returns {Object} 검증 결과 { isValid: boolean, errors: string[] }
   */
  validateTTSOptions(options) {
    const errors = [];

    if (options.rate !== undefined) {
      if (
        typeof options.rate !== "number" ||
        options.rate < 0.1 ||
        options.rate > 10
      ) {
        errors.push("Rate must be a number between 0.1 and 10");
      }
    }

    if (options.pitch !== undefined) {
      if (
        typeof options.pitch !== "number" ||
        options.pitch < 0 ||
        options.pitch > 2
      ) {
        errors.push("Pitch must be a number between 0 and 2");
      }
    }

    if (options.volume !== undefined) {
      if (
        typeof options.volume !== "number" ||
        options.volume < 0 ||
        options.volume > 1
      ) {
        errors.push("Volume must be a number between 0 and 1");
      }
    }

    if (options.voice !== undefined) {
      if (typeof options.voice !== "string") {
        errors.push("Voice must be a string");
      }
    }

    if (options.lang !== undefined) {
      if (
        typeof options.lang !== "string" ||
        !this.isValidLanguageCode(options.lang)
      ) {
        errors.push(
          "Language must be a valid language code (e.g., ko-KR, en-US)"
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * TTSSettings 객체 유효성 검증
   * @param {TTSSettings} settings - 검증할 설정
   * @returns {Object} 검증 결과 { isValid: boolean, errors: string[] }
   */
  validateTTSSettings(settings) {
    const errors = [];

    if (settings.defaultRate !== undefined) {
      if (
        typeof settings.defaultRate !== "number" ||
        settings.defaultRate < 0.1 ||
        settings.defaultRate > 10
      ) {
        errors.push("Default rate must be a number between 0.1 and 10");
      }
    }

    if (settings.defaultPitch !== undefined) {
      if (
        typeof settings.defaultPitch !== "number" ||
        settings.defaultPitch < 0 ||
        settings.defaultPitch > 2
      ) {
        errors.push("Default pitch must be a number between 0 and 2");
      }
    }

    if (settings.defaultVolume !== undefined) {
      if (
        typeof settings.defaultVolume !== "number" ||
        settings.defaultVolume < 0 ||
        settings.defaultVolume > 1
      ) {
        errors.push("Default volume must be a number between 0 and 1");
      }
    }

    if (settings.defaultVoice !== undefined) {
      if (typeof settings.defaultVoice !== "string") {
        errors.push("Default voice must be a string");
      }
    }

    if (settings.preferredLanguage !== undefined) {
      if (
        typeof settings.preferredLanguage !== "string" ||
        !this.isValidLanguageCode(settings.preferredLanguage)
      ) {
        errors.push("Preferred language must be a valid language code");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 언어 코드 유효성 검증
   * @param {string} langCode - 언어 코드
   * @returns {boolean} 유효성 여부
   */
  isValidLanguageCode(langCode) {
    if (typeof langCode !== "string") return false;
    // 기본적인 언어 코드 패턴 검증 (예: ko-KR, en-US, ja-JP)
    // 반드시 국가 코드가 포함되어야 함
    const langPattern = /^[a-z]{2}-[A-Z]{2}$/;
    return langPattern.test(langCode);
  }

  /**
   * 현재 설정 가져오기
   * @returns {TTSSettings} 현재 설정
   */
  getCurrentSettings() {
    return { ...this.currentSettings };
  }

  /**
   * 설정 업데이트
   * @param {Partial<TTSSettings>} newSettings - 새로운 설정
   * @returns {Object} 업데이트 결과 { success: boolean, errors?: string[] }
   */
  updateSettings(newSettings) {
    const validation = this.validateTTSSettings(newSettings);

    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    this.currentSettings = {
      ...this.currentSettings,
      ...newSettings,
    };

    return { success: true };
  }

  /**
   * 설정을 기본값으로 초기화
   */
  resetToDefaults() {
    this.currentSettings = { ...this.defaultSettings };
  }

  /**
   * 현재 설정을 TTSOptions 형태로 변환
   * @param {Partial<TTSOptions>} overrides - 덮어쓸 옵션
   * @returns {TTSOptions} TTS 옵션
   */
  toTTSOptions(overrides = {}) {
    const baseOptions = {
      voice: this.currentSettings.defaultVoice,
      rate: this.currentSettings.defaultRate,
      pitch: this.currentSettings.defaultPitch,
      volume: this.currentSettings.defaultVolume,
      lang: this.currentSettings.preferredLanguage,
    };

    return {
      ...baseOptions,
      ...overrides,
    };
  }

  /**
   * 설정 값 정규화 (범위 내로 조정)
   * @param {TTSOptions} options - 정규화할 옵션
   * @returns {TTSOptions} 정규화된 옵션
   */
  normalizeOptions(options) {
    const normalized = { ...options };

    if (
      normalized.rate !== undefined &&
      normalized.rate !== null &&
      typeof normalized.rate === "number"
    ) {
      normalized.rate = Math.max(0.1, Math.min(10, normalized.rate));
    }

    if (
      normalized.pitch !== undefined &&
      normalized.pitch !== null &&
      typeof normalized.pitch === "number"
    ) {
      normalized.pitch = Math.max(0, Math.min(2, normalized.pitch));
    }

    if (
      normalized.volume !== undefined &&
      normalized.volume !== null &&
      typeof normalized.volume === "number"
    ) {
      normalized.volume = Math.max(0, Math.min(1, normalized.volume));
    }

    return normalized;
  }

  /**
   * 지원되는 언어 목록 가져오기
   * @returns {Array<{code: string, name: string}>} 언어 목록
   */
  getSupportedLanguages() {
    return [
      { code: "ko-KR", name: "한국어" },
      { code: "en-US", name: "English (US)" },
      { code: "en-GB", name: "English (UK)" },
      { code: "ja-JP", name: "日本語" },
      { code: "zh-CN", name: "中文 (简体)" },
      { code: "zh-TW", name: "中文 (繁體)" },
      { code: "es-ES", name: "Español" },
      { code: "fr-FR", name: "Français" },
      { code: "de-DE", name: "Deutsch" },
      { code: "it-IT", name: "Italiano" },
      { code: "pt-BR", name: "Português (Brasil)" },
      { code: "ru-RU", name: "Русский" },
    ];
  }

  /**
   * 설정을 JSON 문자열로 직렬화
   * @returns {string} JSON 문자열
   */
  serialize() {
    return JSON.stringify(this.currentSettings);
  }

  /**
   * JSON 문자열에서 설정 복원
   * @param {string} jsonString - JSON 문자열
   * @returns {Object} 복원 결과 { success: boolean, errors?: string[] }
   */
  deserialize(jsonString) {
    try {
      const settings = JSON.parse(jsonString);
      const validation = this.validateTTSSettings(settings);

      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      this.currentSettings = {
        ...this.defaultSettings,
        ...settings,
      };

      return { success: true };
    } catch (error) {
      return {
        success: false,
        errors: ["Invalid JSON format"],
      };
    }
  }
}

// 모듈 내보내기
if (typeof module !== "undefined" && module.exports) {
  module.exports = TTSSettingsManager;
} else {
  window.TTSSettingsManager = TTSSettingsManager;
}
