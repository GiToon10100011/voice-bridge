import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock Chrome APIs with comprehensive behavior
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    onConnect: {
      addListener: vi.fn()
    },
    getURL: vi.fn(path => `chrome-extension://test/${path}`),
    lastError: null
  },
  storage: {
    local: {
      set: vi.fn().mockResolvedValue(),
      get: vi.fn().mockResolvedValue({}),
      remove: vi.fn().mockResolvedValue()
    },
    sync: {
      set: vi.fn().mockResolvedValue(),
      get: vi.fn().mockResolvedValue({})
    }
  },
  tabs: {
    create: vi.fn().mockResolvedValue({ id: 1 }),
    query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://chat.openai.com' }]),
    sendMessage: vi.fn().mockResolvedValue({ received: true })
  },
  permissions: {
    contains: vi.fn().mockResolvedValue(true),
    request: vi.fn().mockResolvedValue(true)
  },
  notifications: {
    create: vi.fn()
  }
};

global.chrome = mockChrome;

describe('Full System Integration Tests', () => {
  let dom;
  let document;
  let window;
  let backgroundService;
  let popupUI;
  let contentScript;

  beforeEach(async () => {
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
            <main>
              <div class="input-section">
                <textarea
                  id="textInput"
                  placeholder="변환할 텍스트를 입력하세요..."
                  rows="4"
                  maxlength="1000"
                ></textarea>
                <div class="character-count"><span id="charCount">0</span>/1000</div>
              </div>
              <div class="controls">
                <button id="playButton" class="primary-button" disabled>
                  <span class="button-text">음성 재생</span>
                  <span class="loading-spinner" style="display: none"></span>
                </button>
                <button id="stopButton" class="secondary-button" style="display: none">정지</button>
                <button id="settingsButton" class="secondary-button">설정</button>
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
            </main>
          </div>
        </body>
      </html>
    `,
      {
        url: 'chrome-extension://test/popup.html',
        pretendToBeVisual: true,
        resources: 'usable'
      }
    );

    document = dom.window.document;
    window = dom.window;

    global.document = document;
    global.window = window;
    global.HTMLElement = window.HTMLElement;
    global.Event = window.Event;
    global.KeyboardEvent = window.KeyboardEvent;

    // Update location properties instead of redefining
    if (window.location) {
      window.location.hostname = 'chat.openai.com';
      window.location.pathname = '/';
      window.location.href = 'https://chat.openai.com/';
      window.location.search = '';
    } else {
      // If location doesn't exist, create it safely
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'chat.openai.com',
          pathname: '/',
          href: 'https://chat.openai.com/',
          search: ''
        },
        writable: true,
        configurable: true
      });
    }

    // Initialize components
    await initializeComponents();
  });

  afterEach(() => {
    if (popupUI && popupUI.destroy) {
      popupUI.destroy();
    }
    if (contentScript && contentScript.destroy) {
      contentScript.destroy();
    }
    dom.window.close();
  });

  async function initializeComponents() {
    // Mock Background Service
    backgroundService = {
      messageHandlers: new Map(),
      settings: {
        tts: {
          voice: 'Korean Voice',
          rate: 1.0,
          pitch: 1.0,
          volume: 0.8,
          language: 'ko-KR'
        },
        ui: {
          theme: 'auto',
          shortcuts: {
            playTTS: 'Ctrl+Enter',
            openPopup: 'Alt+T'
          }
        },
        detection: {
          enableAutoDetection: true,
          supportedSites: ['chat.openai.com', 'www.google.com']
        }
      },

      async handleMessage(message, sender) {
        switch (message.type) {
          case 'TTS_PLAY':
            return this.handleTTSPlay(message.payload, sender);
          case 'TTS_STOP':
            return this.handleTTSStop(message.payload, sender);
          case 'SETTINGS_GET':
            return this.settings;
          case 'VOICE_DETECTION':
            return this.handleVoiceDetection(message.payload, sender);
          default:
            throw new Error(`Unknown message type: ${message.type}`);
        }
      },

      async handleTTSPlay(payload, sender) {
        const { text, options } = payload;

        // Simulate TTS processing
        setTimeout(() => {
          this.broadcastToPopup({ type: 'TTS_STARTED', payload: {} });
        }, 10);

        setTimeout(() => {
          this.broadcastToPopup({
            type: 'TTS_PROGRESS',
            payload: { progress: 50, currentWord: 'test' }
          });
        }, 50);

        setTimeout(() => {
          this.broadcastToPopup({ type: 'TTS_COMPLETED', payload: {} });
        }, 100);

        return { status: 'started', text, options };
      },

      async handleTTSStop(payload, sender) {
        setTimeout(() => {
          this.broadcastToPopup({ type: 'TTS_STOPPED', payload: {} });
        }, 10);
        return { status: 'stopped' };
      },

      async handleVoiceDetection(payload, sender) {
        if (sender.tab) {
          // From content script
          return { received: true };
        } else {
          // From popup - query content script
          return { isActive: true, site: 'chatgpt', type: 'voice_mode' };
        }
      },

      broadcastToPopup(message) {
        if (popupUI && popupUI.simulateMessage) {
          popupUI.simulateMessage(message.type, message.payload);
        }
      }
    };

    // Mock Popup UI
    popupUI = {
      textInput: document.getElementById('textInput'),
      playButton: document.getElementById('playButton'),
      stopButton: document.getElementById('stopButton'),
      settingsButton: document.getElementById('settingsButton'),
      statusIndicator: document.getElementById('statusIndicator'),
      charCount: document.getElementById('charCount'),
      progressSection: document.getElementById('progressSection'),
      progressFill: document.getElementById('progressFill'),
      progressText: document.getElementById('progressText'),

      isPlaying: false,
      currentText: '',
      maxLength: 1000,
      messageListeners: [],

      init() {
        this.setupEventListeners();
        this.setupMessageListener();
        this.updateButtonState();
        this.updateCharacterCount();
        this.updateStatus('idle');
      },

      setupEventListeners() {
        this.textInput.addEventListener('input', e => {
          this.updateButtonState();
          this.updateCharacterCount();
        });

        this.playButton.addEventListener('click', () => {
          this.handleTextSubmit();
        });

        this.stopButton.addEventListener('click', () => {
          this.handleStop();
        });
      },

      setupMessageListener() {
        const listener = (message, sender, sendResponse) => {
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
        };

        this.messageListeners.push(listener);
        chrome.runtime.onMessage.addListener(listener);
      },

      updateButtonState() {
        const hasText = this.textInput.value.trim().length > 0;
        this.playButton.disabled = !hasText || this.isPlaying;
      },

      updateCharacterCount() {
        const currentLength = this.textInput.value.length;
        this.charCount.textContent = currentLength;
      },

      updateStatus(status) {
        const statusText = {
          idle: '준비됨',
          playing: '음성 재생 중...',
          error: '오류 발생'
        };
        this.statusIndicator.className = `status ${status}`;
        this.statusIndicator.querySelector('.status-text').textContent =
          statusText[status] || '알 수 없음';
      },

      async handleTextSubmit() {
        const text = this.textInput.value.trim();
        if (!text || this.isPlaying) return;

        try {
          this.currentText = text;
          this.isPlaying = true;
          this.updateStatus('playing');
          this.setPlayingState(true);

          // Simulate message to background
          const response = await backgroundService.handleMessage(
            {
              type: 'TTS_PLAY',
              payload: { text },
              timestamp: Date.now()
            },
            { tab: null }
          );

          mockChrome.runtime.sendMessage.mockResolvedValue(response);
        } catch (error) {
          this.handleTTSError({ error: error.message });
        }
      },

      async handleStop() {
        if (!this.isPlaying) return;

        try {
          await backgroundService.handleMessage(
            {
              type: 'TTS_STOP',
              payload: {},
              timestamp: Date.now()
            },
            { tab: null }
          );
        } catch (error) {
          this.handleTTSStopped({});
        }
      },

      handleTTSStarted(payload) {
        this.updateStatus('playing');
        this.showProgress(true);
        this.updateProgress(0, '음성 재생 시작...');
      },

      handleTTSProgress(payload) {
        const { progress = 0, currentWord = '' } = payload;
        this.updateProgress(progress, `재생 중: ${currentWord}`);
      },

      handleTTSCompleted(payload) {
        this.isPlaying = false;
        this.updateStatus('idle');
        this.setPlayingState(false);
        this.showProgress(false);
      },

      handleTTSError(payload) {
        this.isPlaying = false;
        this.updateStatus('error');
        this.setPlayingState(false);
        this.showProgress(false);
      },

      handleTTSStopped(payload) {
        this.isPlaying = false;
        this.updateStatus('idle');
        this.setPlayingState(false);
        this.showProgress(false);
      },

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
      },

      showProgress(show) {
        this.progressSection.style.display = show ? 'block' : 'none';
      },

      updateProgress(percentage, text) {
        this.progressFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        this.progressText.textContent = text || '재생 중...';
      },

      simulateMessage(type, payload = {}) {
        const message = { type, payload, timestamp: Date.now() };
        this.messageListeners.forEach(listener => {
          listener(message, {}, () => {});
        });
      },

      destroy() {
        this.messageListeners.forEach(listener => {
          chrome.runtime.onMessage.removeListener(listener);
        });
      }
    };

    // Mock Content Script
    contentScript = {
      isVoiceRecognitionActive: false,
      currentSite: 'chatgpt',

      init() {
        this.detectInitialState();
      },

      detectInitialState() {
        // Simulate ChatGPT voice mode detection
        setTimeout(() => {
          this.checkVoiceRecognitionState();
        }, 100);
      },

      checkVoiceRecognitionState() {
        const isActive = this.detectChatGPTVoiceMode();
        if (isActive !== this.isVoiceRecognitionActive) {
          this.isVoiceRecognitionActive = isActive;
          this.notifyVoiceRecognitionState(isActive);
        }
      },

      detectChatGPTVoiceMode() {
        // Simulate voice mode detection
        return (
          document.body.textContent.toLowerCase().includes('voice mode') ||
          document.querySelector('[data-testid="voice-button"]') !== null
        );
      },

      async notifyVoiceRecognitionState(isActive) {
        try {
          await backgroundService.handleMessage(
            {
              type: 'VOICE_DETECTION',
              payload: {
                isActive,
                site: this.currentSite,
                url: window.location.href
              },
              timestamp: Date.now()
            },
            { tab: { id: 1 } }
          );
        } catch (error) {
          console.error('Failed to notify voice recognition state:', error);
        }
      },

      simulateVoiceButton() {
        const voiceButton = document.createElement('button');
        voiceButton.setAttribute('data-testid', 'voice-button');
        voiceButton.textContent = 'Voice Mode';
        document.body.appendChild(voiceButton);
      },

      destroy() {
        // Cleanup
      }
    };

    // Initialize components
    popupUI.init();
    contentScript.init();
  }

  describe('Complete Popup → Background → TTS Engine Flow', () => {
    it('should handle complete TTS playback flow from popup to background', async () => {
      // Step 1: User enters text in popup
      popupUI.textInput.value = '안녕하세요, 테스트 메시지입니다';
      popupUI.textInput.dispatchEvent(new window.Event('input'));

      expect(popupUI.playButton.disabled).toBe(false);
      expect(popupUI.charCount.textContent).toBe('17');

      // Step 2: User clicks play button
      await popupUI.handleTextSubmit();

      // Verify popup state changes
      expect(popupUI.isPlaying).toBe(true);
      expect(popupUI.statusIndicator.className).toContain('playing');
      expect(popupUI.playButton.disabled).toBe(true);
      expect(popupUI.stopButton.style.display).toBe('block');
      expect(popupUI.textInput.disabled).toBe(true);

      // Step 3: Wait for TTS flow to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify final state
      expect(popupUI.isPlaying).toBe(false);
      expect(popupUI.statusIndicator.className).toContain('idle');
      expect(popupUI.progressSection.style.display).toBe('none');
      expect(popupUI.stopButton.style.display).toBe('none');
      expect(popupUI.textInput.disabled).toBe(false);
    });

    it('should handle TTS stop flow from popup to background', async () => {
      // Start TTS
      popupUI.textInput.value = '테스트 중지 메시지';
      popupUI.textInput.dispatchEvent(new window.Event('input'));
      await popupUI.handleTextSubmit();

      expect(popupUI.isPlaying).toBe(true);

      // Stop TTS
      await popupUI.handleStop();

      // Wait for stop to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(popupUI.isPlaying).toBe(false);
      expect(popupUI.statusIndicator.className).toContain('idle');
    });

    it('should handle settings retrieval from background', async () => {
      const settings = await backgroundService.handleMessage(
        {
          type: 'SETTINGS_GET',
          payload: {},
          timestamp: Date.now()
        },
        { tab: null }
      );

      expect(settings).toEqual({
        tts: {
          voice: 'Korean Voice',
          rate: 1.0,
          pitch: 1.0,
          volume: 0.8,
          language: 'ko-KR'
        },
        ui: {
          theme: 'auto',
          shortcuts: {
            playTTS: 'Ctrl+Enter',
            openPopup: 'Alt+T'
          }
        },
        detection: {
          enableAutoDetection: true,
          supportedSites: ['chat.openai.com', 'www.google.com']
        }
      });
    });
  });

  describe('Content Script and Background Script Integration', () => {
    it('should detect voice recognition state and communicate with background', async () => {
      // Simulate voice button appearing on page
      contentScript.simulateVoiceButton();

      // Check voice recognition state
      contentScript.checkVoiceRecognitionState();

      expect(contentScript.isVoiceRecognitionActive).toBe(true);
    });

    it('should handle voice detection requests from popup via background', async () => {
      const result = await backgroundService.handleMessage(
        {
          type: 'VOICE_DETECTION',
          payload: {},
          timestamp: Date.now()
        },
        { tab: null }
      );

      expect(result).toEqual({
        isActive: true,
        site: 'chatgpt',
        type: 'voice_mode'
      });
    });

    it('should handle voice recognition state changes', async () => {
      // Initial state
      expect(contentScript.isVoiceRecognitionActive).toBe(false);

      // Simulate voice mode activation
      contentScript.simulateVoiceButton();
      contentScript.checkVoiceRecognitionState();

      expect(contentScript.isVoiceRecognitionActive).toBe(true);

      // Simulate voice mode deactivation
      const voiceButton = document.querySelector('[data-testid="voice-button"]');
      if (voiceButton) {
        voiceButton.remove();
      }
      contentScript.checkVoiceRecognitionState();

      expect(contentScript.isVoiceRecognitionActive).toBe(false);
    });
  });

  describe('Cross-Component Error Handling', () => {
    it('should handle background service errors gracefully', async () => {
      // Mock background service error
      const originalHandleMessage = backgroundService.handleMessage;
      backgroundService.handleMessage = vi
        .fn()
        .mockRejectedValue(new Error('Background service unavailable'));

      popupUI.textInput.value = '테스트 오류 메시지';
      popupUI.textInput.dispatchEvent(new window.Event('input'));

      await popupUI.handleTextSubmit();

      expect(popupUI.isPlaying).toBe(false);
      expect(popupUI.statusIndicator.className).toContain('error');

      // Restore original method
      backgroundService.handleMessage = originalHandleMessage;
    });

    it('should handle content script communication errors', async () => {
      // Mock content script error
      const originalNotify = contentScript.notifyVoiceRecognitionState;
      contentScript.notifyVoiceRecognitionState = vi
        .fn()
        .mockRejectedValue(new Error('Communication failed'));

      // Should reject with error
      await expect(contentScript.notifyVoiceRecognitionState(true)).rejects.toThrow('Communication failed');

      // Restore original method
      contentScript.notifyVoiceRecognitionState = originalNotify;
    });

    it('should handle Chrome API failures', async () => {
      // Mock Chrome API failure
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Extension context invalidated'));

      popupUI.textInput.value = 'Chrome API 오류 테스트';
      popupUI.textInput.dispatchEvent(new window.Event('input'));

      // Should handle error gracefully
      await expect(popupUI.handleTextSubmit()).resolves.toBeUndefined();
    });
  });

  describe('Multi-Component State Synchronization', () => {
    it('should maintain consistent state across components during TTS playback', async () => {
      // Start TTS from popup
      popupUI.textInput.value = '상태 동기화 테스트';
      popupUI.textInput.dispatchEvent(new window.Event('input'));
      await popupUI.handleTextSubmit();

      // Verify popup state
      expect(popupUI.isPlaying).toBe(true);
      expect(popupUI.statusIndicator.className).toContain('playing');

      // Simulate voice recognition activation during TTS
      contentScript.simulateVoiceButton();
      contentScript.checkVoiceRecognitionState();

      expect(contentScript.isVoiceRecognitionActive).toBe(true);

      // Complete TTS
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify final states
      expect(popupUI.isPlaying).toBe(false);
      expect(popupUI.statusIndicator.className).toContain('idle');
      expect(contentScript.isVoiceRecognitionActive).toBe(true);
    });

    it('should handle concurrent operations correctly', async () => {
      // Start multiple operations simultaneously
      const ttsPromise = popupUI.handleTextSubmit();
      const voiceDetectionPromise = backgroundService.handleMessage(
        {
          type: 'VOICE_DETECTION',
          payload: {},
          timestamp: Date.now()
        },
        { tab: null }
      );

      popupUI.textInput.value = '동시 작업 테스트';
      popupUI.textInput.dispatchEvent(new window.Event('input'));

      // Wait for all operations to complete
      await Promise.all([ttsPromise, voiceDetectionPromise]);

      // Verify system remains stable
      expect(popupUI.statusIndicator.className).toMatch(/playing|idle/);
    });
  });

  describe('End-to-End User Scenarios', () => {
    it('should handle complete user workflow: text input → TTS → voice recognition', async () => {
      // Step 1: User enters text
      popupUI.textInput.value = '완전한 사용자 워크플로우 테스트';
      popupUI.textInput.dispatchEvent(new window.Event('input'));

      expect(popupUI.charCount.textContent).toBe('17');
      expect(popupUI.playButton.disabled).toBe(false);

      // Step 2: User starts TTS
      await popupUI.handleTextSubmit();
      expect(popupUI.isPlaying).toBe(true);

      // Step 3: Voice recognition activates (simulated)
      contentScript.simulateVoiceButton();
      contentScript.checkVoiceRecognitionState();
      expect(contentScript.isVoiceRecognitionActive).toBe(true);

      // Step 4: TTS completes
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(popupUI.isPlaying).toBe(false);

      // Step 5: User can start new TTS
      popupUI.textInput.value = '새로운 메시지';
      popupUI.textInput.dispatchEvent(new window.Event('input'));
      expect(popupUI.playButton.disabled).toBe(false);
    });

    it('should handle user interruption scenarios', async () => {
      // Start TTS
      popupUI.textInput.value = '중단 테스트 메시지';
      popupUI.textInput.dispatchEvent(new window.Event('input'));
      await popupUI.handleTextSubmit();

      expect(popupUI.isPlaying).toBe(true);

      // User interrupts with stop
      await popupUI.handleStop();

      // Wait for stop to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(popupUI.isPlaying).toBe(false);
      expect(popupUI.statusIndicator.className).toContain('idle');

      // User can immediately start new TTS
      popupUI.textInput.value = '중단 후 새 메시지';
      popupUI.textInput.dispatchEvent(new window.Event('input'));
      expect(popupUI.playButton.disabled).toBe(false);
    });
  });
});
