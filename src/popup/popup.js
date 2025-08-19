// Popup UI Controller
class PopupUI {
  constructor() {
    console.log('🔨 PopupUI 생성자 시작');
    
    // DOM 요소 가져오기
    this.textInput = document.getElementById('textInput');
    this.playButton = document.getElementById('playButton');
    this.stopButton = document.getElementById('stopButton');
    this.settingsButton = document.getElementById('settingsButton');
    this.statusIndicator = document.getElementById('statusIndicator');
    this.charCount = document.getElementById('charCount');
    this.progressSection = document.getElementById('progressSection');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    
    // Voice detection elements
    this.voiceDetectionSection = document.getElementById('voiceDetectionSection');
    this.voiceIndicator = document.getElementById('voiceIndicator');
    this.voiceText = document.getElementById('voiceText');

    // DOM 요소 확인
    const elements = {
      textInput: this.textInput,
      playButton: this.playButton,
      stopButton: this.stopButton,
      settingsButton: this.settingsButton,
      statusIndicator: this.statusIndicator
    };
    
    console.log('🎯 DOM 요소들:', elements);
    
    // 필수 요소 확인
    const missingElements = Object.entries(elements)
      .filter(([name, element]) => !element)
      .map(([name]) => name);
    
    if (missingElements.length > 0) {
      console.error('❌ 누락된 DOM 요소들:', missingElements);
      throw new Error(`필수 DOM 요소가 누락됨: ${missingElements.join(', ')}`);
    }

    this.isPlaying = false;
    this.currentText = '';
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
      cacheMisses: 0
    };

    this.init();
  }

  init() {
    console.log('⚙️ PopupUI 초기화 시작');
    
    try {
      console.log('🎧 이벤트 리스너 설정 중...');
      this.setupEventListeners();
      
      console.log('📡 메시지 리스너 설정 중...');
      this.setupMessageListener();
      
      console.log('🔘 버튼 상태 업데이트 중...');
      this.updateButtonState();
      
      console.log('🔢 문자 수 업데이트 중...');
      this.updateCharacterCount();
      
      console.log('📊 상태 업데이트 중...');
      this.updateStatus('idle');
      
      console.log('💾 저장된 텍스트 로드 중...');
      this.loadSavedText();
      
      console.log('🎤 TTS 시스템 준비됨');
      this.initializeTTSSystem();
      
      console.log('📖 오디오 가이드 설정 중...');
      this.setupAudioGuide();
      
      console.log('✅ PopupUI 초기화 완료');
    } catch (error) {
      console.error('❌ PopupUI 초기화 중 오류:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Text input events (디바운스 적용)
    this.textInput.addEventListener('input', e => {
      this.performanceMetrics.inputEvents++;
      this.lastInputTime = Date.now();

      // 즉시 UI 업데이트 (사용자 경험)
      this.updateCharacterCount();
      this.updateButtonState();

      // 디바운스된 검증 및 저장
      this.debounce(
        'input',
        () => {
          this.validateInput(e.target.value);
          this.debouncedSaveTextToStorage();
        },
        this.inputDebounceDelay
      );
    });

    this.textInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleTextSubmit();
      }
    });

    this.textInput.addEventListener('paste', e => {
      // Handle paste event to validate length (디바운스 적용)
      this.debounce(
        'paste',
        () => {
          this.validateInput(this.textInput.value);
          this.updateCharacterCount();
          this.updateButtonState();
        },
        50
      );
    });

    // Button events (중복 클릭 방지)
    this.playButton.addEventListener('click', e => {
      if (!this.playButton.disabled) {
        this.handleTextSubmit();
      }
    });

    this.stopButton.addEventListener('click', e => {
      if (!this.stopButton.disabled) {
        this.handleStop();
      }
    });

    this.settingsButton.addEventListener('click', e => {
      if (!this.settingsButton.disabled) {
        this.handleSettingsOpen();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isPlaying) {
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
      'save',
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
        case 'TTS_STARTED':
          this.handleTTSStarted(message.payload);
          break;
        case 'TTS_PROGRESS':
          this.handleTTSProgress(message.payload);
          break;
        case 'TTS_COMPLETED':
          this.handleTTSCompleted(message.payload);
          break;
        case 'TTS_ERROR':
          this.handleTTSError(message.payload);
          break;
        case 'TTS_STOPPED':
          this.handleTTSStopped(message.payload);
          break;
      }
      sendResponse({ received: true });
    });
  }

  validateInput(text) {
    if (text.length > this.maxLength) {
      this.textInput.value = text.substring(0, this.maxLength);
      this.showTemporaryMessage('텍스트가 최대 길이를 초과했습니다.');
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
      this.charCount.style.color = '#ea4335';
    } else if (currentLength > this.maxLength * 0.8) {
      this.charCount.style.color = '#f57c00';
    } else {
      this.charCount.style.color = '';
    }
  }

  updateStatus(status) {
    const statusText = {
      idle: '준비됨',
      playing: '음성 재생 중...',
      error: '오류 발생'
    };

    this.statusIndicator.className = `status ${status}`;
    this.statusIndicator.querySelector('.status-text').textContent =
      statusText[status] || '알 수 없음';
  }

  async handleTextSubmit() {
    const text = this.textInput.value.trim();
    console.log('handleTextSubmit 호출됨:', { text: text.substring(0, 50), isPlaying: this.isPlaying });
    
    if (!text || this.isPlaying) {
      console.log('조건 불충족으로 종료');
      return;
    }

    if (!this.validateInput(text)) {
      console.log('입력 검증 실패');
      return;
    }

    try {
      this.currentText = text;
      this.isPlaying = true;
      this.updateStatus('playing');
      this.setPlayingState(true);

      console.log('백그라운드 스크립트에 설정 요청');
      
      // 백그라운드 스크립트에서 설정 가져오기
      const response = await chrome.runtime.sendMessage({
        type: 'TTS_PLAY',
        payload: { text },
        timestamp: Date.now()
      });

      console.log('백그라운드 응답:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || '백그라운드 스크립트 응답 오류');
      }

      // TTS 직접 실행
      console.log('TTS 직접 실행 시작');
      await this.executeTTSDirectly(text, response.options || {});
      
    } catch (error) {
      console.error('TTS playback failed:', error);
      this.handleTTSError({ error: error.message });
    }
  }

  /**
   * TTS 직접 실행 (Web Speech API 사용)
   * @private
   */
  async executeTTSDirectly(text, options) {
    console.log('TTS 실행 시작:', { text: text.substring(0, 50), options });
    
    if (!window.speechSynthesis) {
      throw new Error('Web Speech API가 지원되지 않습니다');
    }

    // 기존 음성 정지
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      await new Promise(r => setTimeout(r, 100));
    }

    // 음성 목록 로드
    const voices = await this.loadVoices();
    console.log('로드된 음성 개수:', voices.length);
    
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // 음성 인식 최적화된 옵션 설정
      utterance.rate = Math.max(0.1, Math.min(10, options.rate || 0.9)); // 약간 느리게 (명확성 향상)
      utterance.pitch = Math.max(0, Math.min(2, options.pitch || 1.1)); // 약간 높게 (인식률 향상)
      utterance.volume = Math.max(0, Math.min(1, options.volume || 1.0)); // 최대 볼륨 (마이크 입력 최적화)
      utterance.lang = options.lang || 'ko-KR';

      // 음성 선택
      if (options.voice && voices.length > 0) {
        const selectedVoice = voices.find(voice => 
          voice.name === options.voice || voice.voiceURI === options.voice
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log('선택된 음성:', selectedVoice.name);
        } else {
          console.log('지정된 음성을 찾을 수 없음, 기본 음성 사용');
        }
      }

      let hasStarted = false;
      let hasEnded = false;
      let progressInterval = null;
      let currentProgress = 0;

      // 타임아웃 설정
      const timeout = setTimeout(() => {
        if (!hasEnded) {
          console.log('TTS 타임아웃');
          hasEnded = true;
          window.speechSynthesis.cancel();
          if (progressInterval) clearInterval(progressInterval);
          this.handleTTSError({ error: '음성 재생 시간이 초과되었습니다' });
          reject(new Error('TTS timeout'));
        }
      }, 30000); // 30초 타임아웃

      // 이벤트 핸들러
      utterance.onstart = () => {
        console.log('TTS 시작됨');
        hasStarted = true;
        this.handleTTSStarted({});
        
        // 진행률 업데이트
        progressInterval = setInterval(() => {
          if (!hasEnded && window.speechSynthesis.speaking) {
            currentProgress = Math.min(currentProgress + 10, 90);
            this.handleTTSProgress({ progress: currentProgress });
          }
        }, 300);
      };

      utterance.onend = () => {
        console.log('TTS 완료됨');
        if (!hasEnded) {
          hasEnded = true;
          clearTimeout(timeout);
          if (progressInterval) clearInterval(progressInterval);
          this.handleTTSProgress({ progress: 100 });
          this.handleTTSCompleted({});
          resolve();
        }
      };

      utterance.onerror = (event) => {
        console.error('TTS 오류:', event.error);
        if (!hasEnded) {
          hasEnded = true;
          clearTimeout(timeout);
          if (progressInterval) clearInterval(progressInterval);
          this.handleTTSError({ error: event.error || '음성 재생 오류' });
          reject(new Error(event.error || 'TTS error'));
        }
      };

      // 음성 재생 시작
      console.log('SpeechSynthesis.speak() 호출');
      window.speechSynthesis.speak(utterance);

      // 시작 확인
      setTimeout(() => {
        if (!hasStarted && !hasEnded) {
          console.log('TTS가 시작되지 않음, 다시 시도');
          // 한 번 더 시도
          window.speechSynthesis.cancel();
          setTimeout(() => {
            if (!hasEnded) {
              window.speechSynthesis.speak(utterance);
            }
          }, 100);
        }
      }, 1500);

      // 최종 확인
      setTimeout(() => {
        if (!hasStarted && !hasEnded) {
          console.error('TTS 시작 실패');
          hasEnded = true;
          clearTimeout(timeout);
          this.handleTTSError({ error: '음성 재생을 시작할 수 없습니다' });
          reject(new Error('Failed to start TTS'));
        }
      }, 3000);
    });
  }

  /**
   * 음성 목록 로드 (브라우저별 차이점 고려)
   * @private
   */
  async loadVoices() {
    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        resolve(voices);
        return;
      }

      // voiceschanged 이벤트 대기 (최대 3초)
      const timeout = setTimeout(() => {
        voices = window.speechSynthesis.getVoices();
        resolve(voices);
      }, 3000);

      const handleVoicesChanged = () => {
        voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          clearTimeout(timeout);
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          resolve(voices);
        }
      };

      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    });
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
        timestamp: Date.now()
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
      // 직접 Web Speech API로 정지
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      
      // Background script에도 알림 (비동기로 처리, 실패해도 UI는 정상 동작)
      chrome.runtime.sendMessage({
        type: 'TTS_STOP',
        payload: {},
        timestamp: Date.now()
      }).catch(error => {
        console.warn('Failed to notify background script:', error);
      });
      
      // 즉시 UI 상태 초기화
      this.handleTTSStopped({});
    } catch (error) {
      console.error('Failed to stop TTS:', error);
      // 오류가 발생해도 UI 상태는 초기화
      this.handleTTSStopped({});
    }
  }

  handleSettingsOpen() {
    // Open settings in a new tab or popup
    chrome.tabs
      .create({
        url: chrome.runtime.getURL('settings/settings.html')
      })
      .catch(() => {
        // Fallback: show inline settings (to be implemented in task 4.3)
        this.showTemporaryMessage('설정 페이지를 열 수 없습니다. 다시 시도해주세요.');
      });
  }

  // TTS Event Handlers
  handleTTSStarted(payload) {
    this.updateStatus('playing');
    this.showProgress(true);
    this.updateProgress(0, '음성 재생 시작...');
  }

  handleTTSProgress(payload) {
    const { progress = 0, currentWord = '' } = payload;
    this.updateProgress(progress, `재생 중: ${currentWord}`);
  }

  handleTTSCompleted(payload) {
    console.log('TTS 완료 처리');
    this.isPlaying = false;
    this.updateStatus('idle');
    this.setPlayingState(false);
    this.showProgress(false);
    this.showTemporaryMessage('음성 재생이 완료되었습니다.');
  }

  handleTTSError(payload) {
    console.log('TTS 오류 처리:', payload);
    this.isPlaying = false;
    this.updateStatus('error');
    this.setPlayingState(false);
    this.showProgress(false);

    const errorMessage = payload.error || '음성 재생 중 오류가 발생했습니다.';
    this.showTemporaryMessage(errorMessage);

    // Auto-reset to idle after error
    setTimeout(() => {
      this.updateStatus('idle');
    }, 3000);
  }

  handleTTSStopped(payload) {
    console.log('TTS 정지 처리');
    this.isPlaying = false;
    this.updateStatus('idle');
    this.setPlayingState(false);
    this.showProgress(false);
    this.showTemporaryMessage('음성 재생이 중지되었습니다.');
  }

  setPlayingState(isPlaying) {
    const buttonText = this.playButton.querySelector('.button-text');
    const spinner = this.playButton.querySelector('.loading-spinner');

    if (isPlaying) {
      buttonText.style.display = 'none';
      spinner.style.display = 'block';
      this.playButton.disabled = true;
      this.stopButton.style.display = 'block';
      this.textInput.disabled = true;
    } else {
      buttonText.style.display = 'block';
      spinner.style.display = 'none';
      this.stopButton.style.display = 'none';
      this.textInput.disabled = false;
      this.updateButtonState();
    }
  }

  showProgress(show) {
    this.progressSection.style.display = show ? 'block' : 'none';
    if (!show) {
      this.updateProgress(0, '');
    }
  }

  updateProgress(percentage, text) {
    this.progressFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    this.progressText.textContent = text || '재생 중...';
  }

  showTemporaryMessage(message, duration = 2000) {
    const originalText = this.statusIndicator.querySelector('.status-text').textContent;
    const originalClass = this.statusIndicator.className;

    this.statusIndicator.querySelector('.status-text').textContent = message;

    setTimeout(() => {
      this.statusIndicator.className = originalClass;
      this.statusIndicator.querySelector('.status-text').textContent = originalText;
    }, duration);
  }

  async saveTextToStorage() {
    try {
      await chrome.storage.local.set({
        lastText: this.textInput.value
      });
    } catch (error) {
      console.warn('Failed to save text to storage:', error);
    }
  }

  async loadSavedText() {
    try {
      const result = await chrome.storage.local.get(['lastText']);
      if (result.lastText) {
        this.textInput.value = result.lastText;
        this.updateCharacterCount();
        this.updateButtonState();
      }
    } catch (error) {
      console.warn('Failed to load saved text:', error);
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
                (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses)) *
              100
            ).toFixed(2) + '%'
          : '0%'
    };
  }

  /**
   * 성능 설정 업데이트
   */
  updatePerformanceConfig(config) {
    if (config.inputDebounceDelay !== undefined) {
      this.inputDebounceDelay = Math.max(100, Math.min(1000, config.inputDebounceDelay));
    }
    if (config.saveDebounceDelay !== undefined) {
      this.saveDebounceDelay = Math.max(500, Math.min(5000, config.saveDebounceDelay));
    }
    if (config.messageCacheTTL !== undefined) {
      this.messageCacheTTL = Math.max(10000, Math.min(300000, config.messageCacheTTL));
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
   * 백그라운드 스크립트에 메시지 전송
   */
  async sendMessage(type, payload = {}) {
    const message = {
      type,
      payload,
      timestamp: Date.now()
    };

    try {
      const response = await chrome.runtime.sendMessage(message);
      this.performanceMetrics.messagesSent++;
      return response;
    } catch (error) {
      console.error('Failed to send message to background:', error);
      throw error;
    }
  }

  /**
   * TTS 시스템 초기화
   */
  async initializeTTSSystem() {
    try {
      console.log('[TTS Voice Bridge] Initializing TTS system...');
      
      // TTS 상시 가용 상태로 설정
      this.updateTTSStatus(true);
      
      // 음성 목록 미리 로드
      await this.loadVoices();
      
      console.log('[TTS Voice Bridge] TTS system ready');
    } catch (error) {
      console.error('[TTS Voice Bridge] Failed to initialize TTS system:', error);
      this.updateTTSStatus(false);
    }
  }

  /**
   * TTS 시스템 상태 업데이트
   */
  updateTTSStatus(isReady) {
    if (!this.voiceText || !this.voiceIndicator) return;

    console.log('[TTS Voice Bridge] Updating TTS status:', { isReady });

    if (isReady) {
      this.voiceIndicator.textContent = '🔊';
      this.voiceText.textContent = 'TTS 준비완료 - 언제든 사용 가능';
      this.voiceDetectionSection.classList.add('voice-active');
    } else {
      this.voiceIndicator.textContent = '🔇';
      this.voiceText.textContent = 'TTS 시스템 오류';
      this.voiceDetectionSection.classList.remove('voice-active');
    }
  }

  /**
   * 오디오 가이드 탭 기능 설정
   */
  setupAudioGuide() {
    try {
      const tabButtons = document.querySelectorAll('.tab-btn');
      const tabContents = document.querySelectorAll('.tab-content');
      
      if (tabButtons.length === 0) {
        console.log('오디오 가이드 탭 버튼을 찾을 수 없음');
        return;
      }

      // 운영체제 자동 감지
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const defaultOS = isMac ? 'mac' : 'windows';
      
      // 기본 탭 설정
      this.switchAudioGuideTab(defaultOS);
      
      // 탭 버튼 클릭 이벤트
      tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const targetOS = e.target.getAttribute('data-os');
          this.switchAudioGuideTab(targetOS);
        });
      });

      console.log(`오디오 가이드 설정 완료 (기본: ${defaultOS})`);
    } catch (error) {
      console.error('오디오 가이드 설정 중 오류:', error);
    }
  }

  /**
   * 오디오 가이드 탭 전환
   */
  switchAudioGuideTab(targetOS) {
    try {
      // 모든 탭 버튼 비활성화
      const tabButtons = document.querySelectorAll('.tab-btn');
      tabButtons.forEach(btn => btn.classList.remove('active'));
      
      // 모든 탭 콘텐츠 숨기기
      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach(content => content.classList.add('hidden'));
      
      // 선택된 탭 활성화
      const targetButton = document.querySelector(`[data-os="${targetOS}"]`);
      const targetContent = document.getElementById(`${targetOS}-guide`);
      
      if (targetButton && targetContent) {
        targetButton.classList.add('active');
        targetContent.classList.remove('hidden');
      }
    } catch (error) {
      console.error('탭 전환 중 오류:', error);
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

// 스크립트 로드 확인
console.log('🚀 TTS Voice Bridge 팝업 스크립트 로드됨');

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM 로드 완료, PopupUI 초기화 시작');
  
  try {
    const popupUI = new PopupUI();
    console.log('✅ PopupUI 초기화 완료');

    // 주기적 메모리 정리 (2분마다)
    setInterval(() => {
      popupUI.performMemoryCleanup();
    }, 120000);

    // 페이지 언로드 시 리소스 정리
    window.addEventListener('beforeunload', () => {
      popupUI.dispose();
    });

    // 글로벌 에러 캐처
    window.addEventListener('error', (event) => {
      console.error('🚨 팝업 에러:', event.error);
    });

    // Chrome 확장프로그램 API 사용 가능 여부 확인
    console.log('🔧 Chrome API 사용 가능:', {
      runtime: !!chrome?.runtime,
      storage: !!chrome?.storage,
      tabs: !!chrome?.tabs
    });

  } catch (error) {
    console.error('❌ PopupUI 초기화 실패:', error);
  }
});
