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

    // Performance optimizations
    this.voicesCache = null;
    this.voicesCacheExpiry = 0;
    this.voicesCacheTTL = 300000; // 5분 캐시
    this.lastUsedVoice = null;
    this.preloadedVoices = new Set();
    this.utterancePool = [];
    this.maxPoolSize = 5;
    this.textCache = new Map();
    this.maxCacheSize = 50;
    this.cleanupInterval = null;

    // 메모리 정리 스케줄링
    this.scheduleCleanup();
  }

  /**
   * 브라우저의 Web Speech API 지원 여부 확인
   * @returns {boolean} 지원 여부
   */
  isSupported() {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
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
    handlers.forEach(handler => {
      try {
        handler(error, context);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
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
      if ('Notification' in window) {
        new Notification('TTS Voice Bridge', {
          body: `음성 변환: ${text}`,
          icon: '/icons/icon48.png'
        });
      }

      // 콘솔에 텍스트 출력
      console.log(`TTS Fallback: ${text}`);

      // 사용자에게 수동 입력 안내
      const fallbackError = new Error(
        'Web Speech API를 사용할 수 없습니다. 텍스트를 수동으로 입력해주세요: ' + text
      );
      fallbackError.type = 'FALLBACK_REQUIRED';
      fallbackError.text = text;

      this._handleError('unsupported_browser', fallbackError, { text });
      reject(fallbackError);
    });
  }

  /**
   * 사용 가능한 음성 목록 조회 (캐시 최적화)
   * @returns {Promise<SpeechSynthesisVoice[]>} 음성 목록
   */
  getAvailableVoices() {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        const error = new Error('Web Speech API is not supported');
        this._handleError('unsupported_browser', error);
        reject(error);
        return;
      }

      // 캐시된 음성 목록 확인
      const now = Date.now();
      if (this.voicesCache && now < this.voicesCacheExpiry) {
        resolve(this.voicesCache);
        return;
      }

      let voices = this.synthesis.getVoices();

      if (voices.length > 0) {
        this._cacheVoices(voices);
        resolve(voices);
      } else {
        // 일부 브라우저에서는 비동기적으로 음성 목록이 로드됨
        const voiceLoadTimeout = setTimeout(() => {
          const error = new Error('음성 목록 로드 시간 초과');
          this._handleError('voice_load_timeout', error);
          reject(error);
        }, 5000); // 5초 타임아웃

        this.synthesis.addEventListener(
          'voiceschanged',
          () => {
            clearTimeout(voiceLoadTimeout);
            voices = this.synthesis.getVoices();
            if (voices.length > 0) {
              this._cacheVoices(voices);
              resolve(voices);
            } else {
              const error = new Error('사용 가능한 음성이 없습니다');
              this._handleError('no_voices_available', error);
              reject(error);
            }
          },
          { once: true }
        );
      }
    });
  }

  /**
   * 음성 목록 캐싱
   * @private
   */
  _cacheVoices(voices) {
    this.voicesCache = voices;
    this.voicesCacheExpiry = Date.now() + this.voicesCacheTTL;
    this.fallbackVoices = voices.slice(0, 3); // 상위 3개 음성을 대체용으로 저장

    // 자주 사용되는 음성 미리 로드
    this._preloadCommonVoices(voices);
  }

  /**
   * 자주 사용되는 음성 미리 로드
   * @private
   */
  _preloadCommonVoices(voices) {
    const commonLanguages = ['ko-KR', 'en-US', 'ja-JP'];
    commonLanguages.forEach(lang => {
      const voice = voices.find(v => v.lang === lang);
      if (voice && !this.preloadedVoices.has(voice.name)) {
        this.preloadedVoices.add(voice.name);
        // 빈 utterance로 음성 엔진 준비
        this._warmupVoice(voice);
      }
    });
  }

  /**
   * 음성 엔진 워밍업
   * @private
   */
  _warmupVoice(voice) {
    try {
      const warmupUtterance = new SpeechSynthesisUtterance('');
      warmupUtterance.voice = voice;
      warmupUtterance.volume = 0;
      // 무음으로 실행하여 음성 엔진 준비
      this.synthesis.speak(warmupUtterance);
    } catch (error) {
      // 워밍업 실패는 무시
    }
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
        voice => voice.name === preferredVoice || voice.voiceURI === preferredVoice
      );

      if (selectedVoice) return selectedVoice;

      // 2. 같은 언어의 음성 찾기
      if (language) {
        selectedVoice = voices.find(voice => voice.lang.startsWith(language.split('-')[0]));
        if (selectedVoice) {
          this._handleError(
            'voice_fallback',
            new Error(`선호 음성을 찾을 수 없어 ${selectedVoice.name}을(를) 사용합니다`),
            { preferredVoice, selectedVoice: selectedVoice.name }
          );
          return selectedVoice;
        }
      }

      // 3. 기본 음성 사용
      selectedVoice = voices.find(voice => voice.default) || voices[0];
      if (selectedVoice) {
        this._handleError(
          'voice_fallback',
          new Error(`기본 음성 ${selectedVoice.name}을(를) 사용합니다`),
          { preferredVoice, selectedVoice: selectedVoice.name }
        );
        return selectedVoice;
      }

      return null;
    } catch (error) {
      this._handleError('voice_selection_failed', error, {
        preferredVoice,
        language
      });
      return null;
    }
  }

  /**
   * 텍스트를 음성으로 변환하여 재생 (재시도 로직 포함, 성능 최적화)
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

    if (!text || text.trim() === '') {
      const error = new Error('텍스트가 필요합니다');
      this._handleError('invalid_input', error, { text });
      throw error;
    }

    // 텍스트 길이 기반 최적화
    const trimmedText = text.trim();
    const cacheKey = this._generateCacheKey(trimmedText, options);

    // 짧은 텍스트는 캐시 확인
    if (trimmedText.length < 100 && this.textCache.has(cacheKey)) {
      const cachedResult = this.textCache.get(cacheKey);
      if (Date.now() - cachedResult.timestamp < 60000) {
        // 1분 캐시
        return this._executeCachedSpeak(cachedResult, trimmedText, options);
      }
    }

    try {
      const result = await this._attemptSpeak(trimmedText, options);

      // 성공한 짧은 텍스트는 캐시에 저장
      if (trimmedText.length < 100) {
        this._cacheTextResult(cacheKey, { options, timestamp: Date.now() });
      }

      return result;
    } catch (error) {
      if (_retryCount < this.retryAttempts) {
        this._handleError('tts_retry', error, {
          text: trimmedText,
          options,
          retryCount: _retryCount + 1,
          maxRetries: this.retryAttempts
        });

        // 재시도 전 대기 (지수 백오프)
        const backoffDelay = this.retryDelay * Math.pow(2, _retryCount);
        await new Promise(resolve => setTimeout(resolve, Math.min(backoffDelay, 5000)));
        return this.speak(trimmedText, options, _retryCount + 1);
      } else {
        this._handleError('tts_failed', error, {
          text: trimmedText,
          options,
          totalRetries: _retryCount
        });
        throw error;
      }
    }
  }

  /**
   * 캐시 키 생성
   * @private
   */
  _generateCacheKey(text, options) {
    const optionsStr = JSON.stringify({
      voice: options.voice || '',
      rate: options.rate || 1,
      pitch: options.pitch || 1,
      lang: options.lang || ''
    });
    return `${text}:${optionsStr}`;
  }

  /**
   * 텍스트 결과 캐싱
   * @private
   */
  _cacheTextResult(key, result) {
    if (this.textCache.size >= this.maxCacheSize) {
      // LRU 방식으로 가장 오래된 항목 제거
      const oldestKey = this.textCache.keys().next().value;
      this.textCache.delete(oldestKey);
    }
    this.textCache.set(key, result);
  }

  /**
   * 캐시된 음성 실행
   * @private
   */
  async _executeCachedSpeak(cachedResult, text, options) {
    // 캐시된 설정을 기반으로 빠른 실행
    const mergedOptions = { ...cachedResult.options, ...options };
    return this._attemptSpeak(text, mergedOptions);
  }

  /**
   * 실제 TTS 재생 시도 (성능 최적화)
   * @param {string} text - 변환할 텍스트
   * @param {Object} options - TTS 옵션
   * @returns {Promise<void>}
   */
  async _attemptSpeak(text, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // 현재 재생 중인 음성이 있으면 중지
        this.stop();

        // Utterance 풀에서 재사용 가능한 객체 가져오기
        const utterance = this._getUtteranceFromPool(text);

        // 옵션 설정 및 유효성 검증 (최적화된 방식)
        this._applyOptionsToUtterance(utterance, options);

        // 음성 선택 최적화 (이전에 사용한 음성 우선 사용)
        if (options.voice) {
          const selectedVoice = await this._selectOptimizedVoice(options.voice, options.lang);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            this.lastUsedVoice = selectedVoice;
          }
        } else if (this.lastUsedVoice) {
          utterance.voice = this.lastUsedVoice;
        }

        // 동적 타임아웃 설정 (텍스트 길이와 속도 기반)
        const estimatedDuration = this._estimateSpeechDuration(text, options.rate || 1);
        const timeoutDuration = Math.max(5000, estimatedDuration * 2); // 추정 시간의 2배

        const playbackTimeout = setTimeout(() => {
          this.stop();
          const error = new Error('TTS 재생 시간 초과');
          error.type = 'TIMEOUT';
          reject(error);
        }, timeoutDuration);

        // 이벤트 리스너 설정 (최적화된 방식)
        this._setupUtteranceEvents(utterance, playbackTimeout, resolve, reject);

        this.currentUtterance = utterance;

        // SpeechSynthesis 큐 최적화
        await this._optimizedSynthesisSpeak(utterance);

        // 빠른 시작 확인 (테스트 환경에서는 더 짧은 타임아웃)
        const isTestEnvironment =
          typeof global !== 'undefined' &&
          global.process &&
          global.process.env &&
          global.process.env.NODE_ENV === 'test';
        const startTimeout = isTestEnvironment ? 100 : 500;

        setTimeout(() => {
          if (!this.isPlaying && !this.synthesis.speaking) {
            const error = new Error('TTS 재생이 시작되지 않았습니다');
            error.type = 'START_FAILED';
            reject(error);
          }
        }, startTimeout);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Utterance 풀에서 객체 가져오기
   * @private
   */
  _getUtteranceFromPool(text) {
    let utterance;
    if (this.utterancePool.length > 0) {
      utterance = this.utterancePool.pop();
      utterance.text = text;
      // 이벤트 핸들러 초기화
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      utterance.onpause = null;
      utterance.onresume = null;
    } else {
      utterance = new SpeechSynthesisUtterance(text);
    }
    return utterance;
  }

  /**
   * Utterance를 풀로 반환
   * @private
   */
  _returnUtteranceToPool(utterance) {
    if (this.utterancePool.length < this.maxPoolSize) {
      // 객체 정리
      utterance.text = '';
      utterance.voice = null;
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      utterance.onpause = null;
      utterance.onresume = null;
      this.utterancePool.push(utterance);
    }
  }

  /**
   * 옵션을 Utterance에 적용 (최적화)
   * @private
   */
  _applyOptionsToUtterance(utterance, options) {
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
  }

  /**
   * 최적화된 음성 선택
   * @private
   */
  async _selectOptimizedVoice(preferredVoice, language) {
    // 이전에 사용한 음성이 요청된 음성과 같으면 바로 반환
    if (
      this.lastUsedVoice &&
      (this.lastUsedVoice.name === preferredVoice || this.lastUsedVoice.voiceURI === preferredVoice)
    ) {
      return this.lastUsedVoice;
    }

    // 기존 로직 사용
    return this._selectFallbackVoice(preferredVoice, language);
  }

  /**
   * 음성 재생 시간 추정
   * @private
   */
  _estimateSpeechDuration(text, rate = 1) {
    // 평균 분당 150단어 기준으로 추정
    const wordsPerMinute = 150 * rate;
    const wordCount = text.split(/\s+/).length;
    const estimatedMinutes = wordCount / wordsPerMinute;
    return estimatedMinutes * 60 * 1000; // 밀리초로 변환
  }

  /**
   * Utterance 이벤트 설정 (최적화)
   * @private
   */
  _setupUtteranceEvents(utterance, timeout, resolve, reject) {
    utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
    };

    utterance.onend = () => {
      clearTimeout(timeout);
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
      this._returnUtteranceToPool(utterance);
      resolve();
    };

    utterance.onerror = event => {
      clearTimeout(timeout);
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
      this._returnUtteranceToPool(utterance);

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
  }

  /**
   * 최적화된 음성 합성 실행
   * @private
   */
  async _optimizedSynthesisSpeak(utterance) {
    // 큐 상태 확인 및 최적화
    if (this.synthesis.pending || this.synthesis.speaking) {
      this.synthesis.cancel();
      // 취소 후 짧은 대기 (100ms에서 50ms로 단축)
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.synthesis.speak(utterance);
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
      this._handleError('stop_failed', error);
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

  /**
   * 메모리 정리 스케줄링
   * @private
   */
  scheduleCleanup() {
    // 5분마다 메모리 정리 실행
    this.cleanupInterval = setInterval(() => {
      this._performMemoryCleanup();
    }, 300000);
  }

  /**
   * 메모리 정리 수행
   * @private
   */
  _performMemoryCleanup() {
    // 텍스트 캐시 정리 (오래된 항목 제거)
    const now = Date.now();
    const cacheEntries = Array.from(this.textCache.entries());

    for (const [key, value] of cacheEntries) {
      if (now - value.timestamp > 300000) {
        // 5분 이상 된 캐시 제거
        this.textCache.delete(key);
      }
    }

    // 음성 캐시 만료 확인
    if (now > this.voicesCacheExpiry) {
      this.voicesCache = null;
      this.voicesCacheExpiry = 0;
    }

    // Utterance 풀 크기 조정
    if (this.utterancePool.length > this.maxPoolSize) {
      this.utterancePool.splice(this.maxPoolSize);
    }

    // 에러 핸들러 맵 정리 (사용되지 않는 핸들러 제거)
    this._cleanupErrorHandlers();
  }

  /**
   * 에러 핸들러 정리
   * @private
   */
  _cleanupErrorHandlers() {
    for (const [errorType, handlers] of this.errorHandlers.entries()) {
      if (handlers.length === 0) {
        this.errorHandlers.delete(errorType);
      }
    }
  }

  /**
   * 리소스 정리 및 해제
   */
  dispose() {
    // 현재 재생 중인 음성 중지
    this.stop();

    // 정리 인터벌 해제
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // 캐시 정리
    this.textCache.clear();
    this.voicesCache = null;
    this.voicesCacheExpiry = 0;

    // 풀 정리
    this.utterancePool.length = 0;
    this.preloadedVoices.clear();

    // 에러 핸들러 정리
    this.errorHandlers.clear();

    // 참조 해제
    this.lastUsedVoice = null;
    this.fallbackVoices.length = 0;
  }

  /**
   * 성능 통계 정보 반환
   * @returns {Object} 성능 통계
   */
  getPerformanceStats() {
    return {
      cacheSize: this.textCache.size,
      maxCacheSize: this.maxCacheSize,
      poolSize: this.utterancePool.length,
      maxPoolSize: this.maxPoolSize,
      preloadedVoicesCount: this.preloadedVoices.size,
      voicesCached: !!this.voicesCache,
      voicesCacheExpiry: this.voicesCacheExpiry,
      errorHandlerTypes: Array.from(this.errorHandlers.keys()),
      memoryUsage: {
        textCacheEntries: this.textCache.size,
        utterancePoolObjects: this.utterancePool.length,
        errorHandlerMaps: this.errorHandlers.size
      }
    };
  }

  /**
   * 캐시 강제 정리
   */
  clearCache() {
    this.textCache.clear();
    this.voicesCache = null;
    this.voicesCacheExpiry = 0;
    this.preloadedVoices.clear();
  }

  /**
   * 성능 최적화 설정 업데이트
   * @param {Object} config - 최적화 설정
   */
  updatePerformanceConfig(config) {
    if (config.maxCacheSize !== undefined) {
      this.maxCacheSize = Math.max(10, Math.min(200, config.maxCacheSize));
    }
    if (config.maxPoolSize !== undefined) {
      this.maxPoolSize = Math.max(1, Math.min(20, config.maxPoolSize));
    }
    if (config.voicesCacheTTL !== undefined) {
      this.voicesCacheTTL = Math.max(60000, Math.min(1800000, config.voicesCacheTTL)); // 1분~30분
    }
    if (config.retryAttempts !== undefined) {
      this.retryAttempts = Math.max(1, Math.min(10, config.retryAttempts));
    }
    if (config.retryDelay !== undefined) {
      this.retryDelay = Math.max(100, Math.min(5000, config.retryDelay));
    }
  }
}

// 모듈 내보내기 (브라우저 환경에서 사용)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TTSEngine;
} else {
  window.TTSEngine = TTSEngine;
}
