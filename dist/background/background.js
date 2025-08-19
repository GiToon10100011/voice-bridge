// Message Types
const MESSAGE_TYPES = {
  TTS_PLAY: 'TTS_PLAY',
  TTS_STOP: 'TTS_STOP',
  TTS_PAUSE: 'TTS_PAUSE',
  TTS_RESUME: 'TTS_RESUME',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  SETTINGS_GET: 'SETTINGS_GET',
  SETTINGS_RESET: 'SETTINGS_RESET',
  SETTINGS_PARTIAL_UPDATE: 'SETTINGS_PARTIAL_UPDATE',
  SETTINGS_VALIDATE: 'SETTINGS_VALIDATE',
  PERMISSIONS_CHECK: 'PERMISSIONS_CHECK',
  PERMISSIONS_REQUEST: 'PERMISSIONS_REQUEST',
  PERMISSIONS_STATUS: 'PERMISSIONS_STATUS',
  ERROR: 'ERROR'
};

// Message Interface Implementation
class Message {
  constructor(type, payload = null, timestamp = Date.now()) {
    this.type = type;
    this.payload = payload;
    this.timestamp = timestamp;
  }

  static create(type, payload = null) {
    return new Message(type, payload);
  }

  static isValid(message) {
    return (
      message &&
      typeof message.type === 'string' &&
      Object.values(MESSAGE_TYPES).includes(message.type) &&
      typeof message.timestamp === 'number'
    );
  }
}

// Import Permissions Manager and Error Handler (for service worker context)
// Note: TTS Engine is not imported here as it requires DOM APIs not available in service workers
try {
  importScripts('permissions-manager.js');
  importScripts('error-handler.js');
  console.log('Background scripts imported successfully');
} catch (error) {
  console.error('Failed to import background scripts:', error);
}

// Background Service Worker
class BackgroundService {
  constructor() {
    this.messageHandlers = new Map();
    this.ttsEngine = null;
    this.permissionsManager = new PermissionsManager();
    this.errorHandler = globalErrorHandler;

    // Performance optimizations
    this.messageQueue = [];
    this.isProcessingQueue = false;
    this.settingsCache = null;
    this.settingsCacheExpiry = 0;
    this.settingsCacheTTL = 60000; // 1분 캐시
    this.recentMessages = new Map();
    this.messageDeduplicationWindow = 1000; // 1초
    this.performanceMetrics = {
      messageCount: 0,
      settingsLoads: 0,
      settingsSaves: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    this.init();
  }

  async init() {
    this.initializeErrorHandler();
    this.setupMessageHandlers();
    this.setupMessageListeners();
    this.setupInstallListener();
    await this.initializePermissions();
    await this.initializeTTSEngine();
  }

  initializeErrorHandler() {
    try {
      // Initialize global error handler
      this.errorHandler.initialize();
      this.errorHandler.setLogLevel('INFO'); // Set appropriate log level

      // Set up error handlers for background service
      this.errorHandler.onError('background_service_error', errorData => {
        console.error('Background service error:', errorData);
      });

      this.errorHandler.onError('message_routing_error', errorData => {
        console.error('Message routing error:', errorData);
      });

      this.errorHandler.info('Background service error handler initialized');
    } catch (error) {
      console.error('Failed to initialize error handler:', error);
    }
  }

  async initializePermissions() {
    try {
      // Set up error handlers for permissions
      this.permissionsManager.onError('extension_api_unavailable', (error, context) => {
        console.error('Chrome Extensions API unavailable:', error.message);
      });

      this.permissionsManager.onError('missing_required_permissions', (error, context) => {
        console.warn('Missing required permissions:', context.missingPermissions);
        this.notifyPermissionIssue(context.missingPermissions);
      });

      this.permissionsManager.onError('required_permissions_denied', (error, context) => {
        console.error('Required permissions denied by user:', context.permissions);
        this.showPermissionDeniedNotification();
      });

      // Initialize permissions
      const initResult = await this.permissionsManager.initialize();

      if (!initResult.success) {
        console.error('Permissions initialization failed:', initResult.error);
        return;
      }

      if (!initResult.hasAllRequired) {
        console.warn('Missing required permissions:', initResult.missingPermissions);
        // Attempt to request missing permissions
        const granted = await this.permissionsManager.requestRequiredPermissions();
        if (!granted) {
          console.error('Failed to obtain required permissions');
        }
      }

      // Set up permission change listeners
      this.permissionsManager.onPermissionChanged(event => {
        console.log('Permission changed:', event);
        this.handlePermissionChange(event);
      });

      console.log('Permissions manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize permissions manager:', error);
    }
  }

  async initializeTTSEngine() {
    try {
      // TTS Engine은 DOM API를 사용하므로 service worker에서 직접 사용할 수 없음
      // 대신 popup이나 content script에서 TTS를 실행하도록 메시지를 전달
      console.log('TTS Engine initialization deferred to popup/content script');
    } catch (error) {
      console.error('Failed to initialize TTS Engine:', error);
    }
  }

  setupMessageHandlers() {
    // Register message handlers
    this.messageHandlers.set(MESSAGE_TYPES.TTS_PLAY, this.handleTTSPlay.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.TTS_STOP, this.handleTTSStop.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.TTS_PAUSE, this.handleTTSPause.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.TTS_RESUME, this.handleTTSResume.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.SETTINGS_UPDATE, this.handleSettingsUpdate.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.SETTINGS_GET, this.handleSettingsGet.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.SETTINGS_RESET, this.handleSettingsReset.bind(this));
    this.messageHandlers.set(
      MESSAGE_TYPES.SETTINGS_PARTIAL_UPDATE,
      this.handleSettingsPartialUpdate.bind(this)
    );
    this.messageHandlers.set(
      MESSAGE_TYPES.SETTINGS_VALIDATE,
      this.handleSettingsValidate.bind(this)
    );
    this.messageHandlers.set(
      MESSAGE_TYPES.PERMISSIONS_CHECK,
      this.handlePermissionsCheck.bind(this)
    );
    this.messageHandlers.set(
      MESSAGE_TYPES.PERMISSIONS_REQUEST,
      this.handlePermissionsRequest.bind(this)
    );
    this.messageHandlers.set(
      MESSAGE_TYPES.PERMISSIONS_STATUS,
      this.handlePermissionsStatus.bind(this)
    );
  }

  setupMessageListeners() {
    // Listen for messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.routeMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

  }

  setupInstallListener() {
    chrome.runtime.onInstalled.addListener(details => {
      console.log('TTS Voice Bridge installed:', details.reason);
      this.initializeDefaultSettings();
    });
  }

  async routeMessage(message, sender, sendResponse) {
    try {
      // Performance metrics
      this.performanceMetrics.messageCount++;

      // Validate message format
      if (!Message.isValid(message)) {
        this.errorHandler.warn('Invalid message format received', {
          message,
          sender
        });
        sendResponse({ success: false, error: 'Invalid message format' });
        return;
      }

      // Message deduplication (중복 메시지 방지)
      const messageKey = this._generateMessageKey(message, sender);
      if (this._isDuplicateMessage(messageKey)) {
        sendResponse({ success: true, data: 'duplicate_ignored' });
        return;
      }

      // 큐에 메시지 추가 (우선순위 기반)
      const messageItem = {
        message,
        sender,
        sendResponse,
        timestamp: Date.now(),
        priority: this._getMessagePriority(message.type)
      };

      this.messageQueue.push(messageItem);
      this._sortMessageQueue();

      // 큐 처리 시작
      if (!this.isProcessingQueue) {
        this._processMessageQueue();
      }
    } catch (error) {
      this.errorHandler.error('Message routing failed', error, {
        messageType: message?.type,
        sender,
        payload: message?.payload
      });

      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * 메시지 키 생성 (중복 방지용)
   * @private
   */
  _generateMessageKey(message, sender) {
    const senderKey = sender.tab ? `tab-${sender.tab.id}` : 'popup';
    return `${message.type}-${senderKey}-${JSON.stringify(message.payload)}`;
  }

  /**
   * 중복 메시지 확인
   * @private
   */
  _isDuplicateMessage(messageKey) {
    const now = Date.now();
    const lastSeen = this.recentMessages.get(messageKey);

    if (lastSeen && now - lastSeen < this.messageDeduplicationWindow) {
      return true;
    }

    this.recentMessages.set(messageKey, now);

    // 오래된 메시지 키 정리
    if (this.recentMessages.size > 100) {
      for (const [key, timestamp] of this.recentMessages.entries()) {
        if (now - timestamp > this.messageDeduplicationWindow * 2) {
          this.recentMessages.delete(key);
        }
      }
    }

    return false;
  }

  /**
   * 메시지 우선순위 결정
   * @private
   */
  _getMessagePriority(messageType) {
    const priorities = {
      [MESSAGE_TYPES.TTS_STOP]: 1, // 최고 우선순위
      [MESSAGE_TYPES.TTS_PAUSE]: 1,
      [MESSAGE_TYPES.TTS_RESUME]: 1,
      [MESSAGE_TYPES.TTS_PLAY]: 2, // 높은 우선순위
      [MESSAGE_TYPES.SETTINGS_GET]: 3,
      [MESSAGE_TYPES.SETTINGS_UPDATE]: 3,
      [MESSAGE_TYPES.PERMISSIONS_CHECK]: 4,
      [MESSAGE_TYPES.PERMISSIONS_REQUEST]: 4
    };
    return priorities[messageType] || 6; // 기본 우선순위
  }

  /**
   * 메시지 큐 정렬 (우선순위 기반)
   * @private
   */
  _sortMessageQueue() {
    this.messageQueue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 메시지 큐 처리
   * @private
   */
  async _processMessageQueue() {
    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const messageItem = this.messageQueue.shift();
      await this._handleSingleMessage(messageItem);
    }

    this.isProcessingQueue = false;
  }

  /**
   * 단일 메시지 처리
   * @private
   */
  async _handleSingleMessage({ message, sender, sendResponse, timestamp }) {
    try {
      // 메시지가 너무 오래되었으면 무시
      if (Date.now() - timestamp > 30000) {
        // 30초
        sendResponse({ success: false, error: 'Message timeout' });
        return;
      }

      // Log message routing for debugging
      this.errorHandler.debug(
        `Processing message: ${message.type} from ${sender.tab ? 'content script' : 'popup'}`,
        { messageType: message.type, sender, payload: message.payload }
      );

      // Get handler for message type
      const handler = this.messageHandlers.get(message.type);
      if (!handler) {
        this.errorHandler.warn('No handler for message type', {
          messageType: message.type,
          availableHandlers: Array.from(this.messageHandlers.keys())
        });
        sendResponse({
          success: false,
          error: `No handler for message type: ${message.type}`
        });
        return;
      }

      // Execute handler
      const result = await handler(message.payload, sender);
      this.errorHandler.debug(`Message handled successfully: ${message.type}`, {
        result
      });
      sendResponse({ success: true, data: result });
    } catch (error) {
      this.errorHandler.error('Message handling failed', error, {
        messageType: message?.type,
        sender,
        payload: message?.payload
      });

      // Notify error listeners
      this.errorHandler.notifyErrorListeners('message_routing_error', {
        message: error.message,
        error,
        messageType: message?.type,
        sender
      });

      sendResponse({ success: false, error: error.message });
    }
  }


  async handleTTSPlay(payload, sender) {
    const { text, options } = payload;
    this.errorHandler.info('TTS Play requested', { text, options, sender });

    try {
      // Validate input
      if (!text || typeof text !== 'string' || text.trim() === '') {
        throw new Error('Valid text is required for TTS playback');
      }

      // Load current settings to merge with options
      const settings = await this.loadSettings();
      const ttsOptions = {
        voice: options?.voice || settings.tts.voice,
        rate: options?.rate || settings.tts.rate,
        pitch: options?.pitch || settings.tts.pitch,
        volume: options?.volume || settings.tts.volume,
        lang: options?.lang || settings.tts.language
      };

      // Service workers can't access Web Speech API directly
      // Return success immediately and let popup handle TTS directly
      this.errorHandler.info('TTS Play request processed', {
        text,
        ttsOptions
      });

      return {
        success: true,
        status: 'ready',
        text,
        options: ttsOptions
      };
    } catch (error) {
      this.errorHandler.error('TTS Play failed', error, {
        text,
        options,
        sender
      });
      this.errorHandler.showUserFriendlyError('tts_playback_failed', {
        text,
        options,
        error
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  async handleTTSStop(payload, sender) {
    console.log('TTS Stop requested');
    // TTS stopping is handled directly in popup
    return { status: 'stopped' };
  }

  async handleTTSPause(payload, sender) {
    console.log('TTS Pause requested');
    // TTS pausing is handled directly in popup
    return { status: 'paused' };
  }

  async handleTTSResume(payload, sender) {
    console.log('TTS Resume requested');
    // TTS resuming is handled directly in popup
    return { status: 'resumed' };
  }

  async handleSettingsUpdate(payload, sender) {
    console.log('Settings update requested:', payload);
    await this.saveSettings(payload);
    return { updated: true };
  }

  async handleSettingsGet(payload, sender) {
    console.log('Settings get requested');
    const settings = await this.loadSettings();
    return settings;
  }

  async handleSettingsReset(payload, sender) {
    console.log('Settings reset requested');
    const defaultSettings = await this.resetSettings();
    return defaultSettings;
  }

  async handleSettingsPartialUpdate(payload, sender) {
    console.log('Partial settings update requested:', payload);
    const updatedSettings = await this.updatePartialSettings(payload);
    return updatedSettings;
  }

  async handleSettingsValidate(payload, sender) {
    console.log('Settings validation requested:', payload);
    const validationErrors = this.validateSettings(payload);
    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors
    };
  }


  getDefaultSettings() {
    return {
      tts: {
        voice: '',
        rate: 0.9,  // 음성 인식에 최적화된 속도 (명확성 향상)
        pitch: 1.1, // 약간 높은 음조 (인식률 향상)
        volume: 1.0, // 최대 볼륨 (마이크 입력 최적화)
        language: 'ko-KR'
      },
      ui: {
        theme: 'auto',
        shortcuts: {
          playTTS: 'Ctrl+Enter',
          openPopup: 'Alt+T'
        }
      },
      audio: {
        enableSystemCapture: false,
        optimizeForVoiceInput: true
      }
    };
  }

  validateSettings(settings) {
    const errors = [];

    if (!settings || typeof settings !== 'object') {
      errors.push('Settings must be an object');
      return errors;
    }

    // Validate TTS settings
    if (settings.tts) {
      const { rate, pitch, volume } = settings.tts;

      if (rate !== undefined && (typeof rate !== 'number' || rate < 0.1 || rate > 10)) {
        errors.push('TTS rate must be a number between 0.1 and 10');
      }

      if (pitch !== undefined && (typeof pitch !== 'number' || pitch < 0 || pitch > 2)) {
        errors.push('TTS pitch must be a number between 0 and 2');
      }

      if (volume !== undefined && (typeof volume !== 'number' || volume < 0 || volume > 1)) {
        errors.push('TTS volume must be a number between 0 and 1');
      }
    }

    // Validate UI settings
    if (settings.ui && settings.ui.theme) {
      const validThemes = ['light', 'dark', 'auto'];
      if (!validThemes.includes(settings.ui.theme)) {
        errors.push('UI theme must be one of: light, dark, auto');
      }
    }

    return errors;
  }

  mergeWithDefaults(userSettings) {
    const defaultSettings = this.getDefaultSettings();

    // Deep merge user settings with defaults
    const merged = JSON.parse(JSON.stringify(defaultSettings));

    if (userSettings) {
      // Merge TTS settings
      if (userSettings.tts) {
        Object.assign(merged.tts, userSettings.tts);
      }

      // Merge UI settings
      if (userSettings.ui) {
        Object.assign(merged.ui, userSettings.ui);
        if (userSettings.ui.shortcuts) {
          Object.assign(merged.ui.shortcuts, userSettings.ui.shortcuts);
        }
      }

      // Merge audio settings
      if (userSettings.audio) {
        Object.assign(merged.audio, userSettings.audio);
      }
    }

    return merged;
  }

  async initializeDefaultSettings() {
    try {
      const existingSettings = await this.loadSettings();
      if (!existingSettings) {
        const defaultSettings = this.getDefaultSettings();
        await this.saveSettings(defaultSettings);
        console.log('Default settings initialized');
      } else {
        // Ensure existing settings have all required fields
        const mergedSettings = this.mergeWithDefaults(existingSettings);
        await this.saveSettings(mergedSettings);
        console.log('Settings updated with new defaults');
      }
    } catch (error) {
      console.error('Failed to initialize settings:', error);
      // Fallback to default settings
      const defaultSettings = this.getDefaultSettings();
      await this.saveSettings(defaultSettings);
    }
  }

  async saveSettings(settings) {
    try {
      this.performanceMetrics.settingsSaves++;
      this.errorHandler.debug('Saving settings', { settings });

      // Validate settings before saving
      const validationErrors = this.validateSettings(settings);
      if (validationErrors.length > 0) {
        const error = new Error(`Settings validation failed: ${validationErrors.join(', ')}`);
        this.errorHandler.error('Settings validation failed', error, {
          settings,
          validationErrors
        });
        throw error;
      }

      // Merge with defaults to ensure completeness
      const completeSettings = this.mergeWithDefaults(settings);

      return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ userSettings: completeSettings }, () => {
          if (chrome.runtime.lastError) {
            const error = new Error(chrome.runtime.lastError.message);
            this.errorHandler.error('Chrome storage error while saving settings', error, {
              settings: completeSettings
            });
            this.errorHandler.showUserFriendlyError('settings_save_failed', {
              settings,
              error
            });
            reject(error);
          } else {
            // 캐시 업데이트
            this.settingsCache = completeSettings;
            this.settingsCacheExpiry = Date.now() + this.settingsCacheTTL;

            this.errorHandler.info('Settings saved successfully', {
              settings: completeSettings
            });
            resolve(completeSettings);
          }
        });
      });
    } catch (error) {
      this.errorHandler.error('Failed to save settings', error, { settings });
      this.errorHandler.showUserFriendlyError('settings_save_failed', {
        settings,
        error
      });
      throw error;
    }
  }

  async loadSettings() {
    try {
      this.performanceMetrics.settingsLoads++;

      // 캐시된 설정 확인
      const now = Date.now();
      if (this.settingsCache && now < this.settingsCacheExpiry) {
        this.performanceMetrics.cacheHits++;
        return this.settingsCache;
      }

      this.performanceMetrics.cacheMisses++;

      return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['userSettings'], result => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            const settings = result.userSettings;
            let completeSettings;

            if (settings) {
              // Ensure loaded settings are complete
              completeSettings = this.mergeWithDefaults(settings);
            } else {
              completeSettings = this.getDefaultSettings();
            }

            // 캐시 업데이트
            this.settingsCache = completeSettings;
            this.settingsCacheExpiry = now + this.settingsCacheTTL;

            resolve(completeSettings);
          }
        });
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Return default settings as fallback
      return this.getDefaultSettings();
    }
  }

  async resetSettings() {
    try {
      const defaultSettings = this.getDefaultSettings();
      await this.saveSettings(defaultSettings);
      console.log('Settings reset to defaults');
      return defaultSettings;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  }

  async updatePartialSettings(partialSettings) {
    try {
      const currentSettings = await this.loadSettings();
      const updatedSettings = this.mergeWithDefaults({
        ...currentSettings,
        ...partialSettings
      });

      await this.saveSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error('Failed to update partial settings:', error);
      throw error;
    }
  }

  async storeTTSRequest(request) {
    try {
      await chrome.storage.local.set({
        currentTTSRequest: {
          ...request,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Failed to store TTS request:', error);
    }
  }

  async getTTSRequest() {
    try {
      const result = await chrome.storage.local.get(['currentTTSRequest']);
      return result.currentTTSRequest;
    } catch (error) {
      console.error('Failed to get TTS request:', error);
      return null;
    }
  }

  async clearTTSRequest() {
    try {
      await chrome.storage.local.remove(['currentTTSRequest']);
    } catch (error) {
      console.error('Failed to clear TTS request:', error);
    }
  }

  // BackgroundService interface implementation
  async synthesizeText(text, options) {
    return await this.handleTTSPlay({ text, options });
  }

  async saveUserSettings(settings) {
    return await this.saveSettings(settings);
  }

  async loadUserSettings() {
    return await this.loadSettings();
  }


  // Permission Management Methods
  async handlePermissionsCheck(payload, sender) {
    console.log('Permissions check requested:', payload);

    try {
      if (payload && payload.permission) {
        // Check specific permission
        const hasPermission = await this.permissionsManager.checkPermission(payload.permission);
        return {
          permission: payload.permission,
          hasPermission,
          status: this.permissionsManager.getPermissionStatus(payload.permission)
        };
      } else {
        // Check all required permissions
        const hasAllRequired = await this.permissionsManager.checkAllRequiredPermissions();
        const allStatus = this.permissionsManager.getAllPermissionStatus();
        return {
          hasAllRequired,
          permissions: allStatus,
          missingRequired: this.permissionsManager.requiredPermissions.filter(
            p => !this.permissionsManager.getPermissionStatus(p)
          )
        };
      }
    } catch (error) {
      console.error('Permissions check error:', error);
      throw error;
    }
  }

  async handlePermissionsRequest(payload, sender) {
    console.log('Permissions request:', payload);

    try {
      if (payload && payload.permission) {
        // Request specific permission
        const granted = await this.permissionsManager.requestPermission(payload.permission);
        return {
          permission: payload.permission,
          granted,
          status: this.permissionsManager.getPermissionStatus(payload.permission)
        };
      } else {
        // Request all required permissions
        const granted = await this.permissionsManager.requestRequiredPermissions();
        const allStatus = this.permissionsManager.getAllPermissionStatus();
        return {
          granted,
          permissions: allStatus,
          guide: granted
            ? null
            : this.permissionsManager.generatePermissionGuideMessage(
                this.permissionsManager.requiredPermissions.filter(
                  p => !this.permissionsManager.getPermissionStatus(p)
                )
              )
        };
      }
    } catch (error) {
      console.error('Permissions request error:', error);
      throw error;
    }
  }

  async handlePermissionsStatus(payload, sender) {
    console.log('Permissions status requested');

    try {
      const allStatus = this.permissionsManager.getAllPermissionStatus();
      const hasAllRequired = this.permissionsManager.requiredPermissions.every(p =>
        this.permissionsManager.getPermissionStatus(p)
      );

      return {
        permissions: allStatus,
        hasAllRequired,
        requiredPermissions: this.permissionsManager.requiredPermissions,
        optionalPermissions: this.permissionsManager.optionalPermissions,
        missingRequired: this.permissionsManager.requiredPermissions.filter(
          p => !this.permissionsManager.getPermissionStatus(p)
        )
      };
    } catch (error) {
      console.error('Permissions status error:', error);
      throw error;
    }
  }

  async notifyPermissionIssue(missingPermissions) {
    try {
      // Check if we have notification permission
      const hasNotificationPermission = await this.permissionsManager.checkPermission(
        'notifications'
      );

      if (hasNotificationPermission) {
        const guide = this.permissionsManager.generatePermissionGuideMessage(missingPermissions);

        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icons/icon48.png',
          title: guide.title,
          message: guide.description + '\n필요한 권한: ' + missingPermissions.join(', ')
        });
      } else {
        console.warn('Cannot show notification - notification permission missing');
      }
    } catch (error) {
      console.error('Failed to show permission notification:', error);
    }
  }

  async showPermissionDeniedNotification() {
    try {
      const hasNotificationPermission = await this.permissionsManager.checkPermission(
        'notifications'
      );

      if (hasNotificationPermission) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icons/icon48.png',
          title: 'TTS Voice Bridge 권한 필요',
          message:
            '확장프로그램이 정상적으로 작동하려면 권한이 필요합니다. 확장프로그램 설정에서 권한을 활성화해주세요.'
        });
      }
    } catch (error) {
      console.error('Failed to show permission denied notification:', error);
    }
  }

  handlePermissionChange(event) {
    console.log('Permission change detected:', event);
    // Permission changes are handled when popup requests permission status
  }

  /**
   * 성능 통계 반환
   */
  getPerformanceStats() {
    return {
      ...this.performanceMetrics,
      messageQueueSize: this.messageQueue.length,
      isProcessingQueue: this.isProcessingQueue,
      recentMessagesCount: this.recentMessages.size,
      settingsCached: !!this.settingsCache,
      settingsCacheExpiry: this.settingsCacheExpiry,
      cacheHitRate:
        this.performanceMetrics.settingsLoads > 0
          ? (
              (this.performanceMetrics.cacheHits / this.performanceMetrics.settingsLoads) *
              100
            ).toFixed(2) + '%'
          : '0%'
    };
  }

  /**
   * 성능 최적화 설정 업데이트
   */
  updatePerformanceConfig(config) {
    if (config.settingsCacheTTL !== undefined) {
      this.settingsCacheTTL = Math.max(10000, Math.min(300000, config.settingsCacheTTL)); // 10초~5분
    }
    if (config.messageDeduplicationWindow !== undefined) {
      this.messageDeduplicationWindow = Math.max(
        100,
        Math.min(5000, config.messageDeduplicationWindow)
      ); // 100ms~5초
    }
  }

  /**
   * 메모리 정리
   */
  performMemoryCleanup() {
    // 설정 캐시 만료 확인
    const now = Date.now();
    if (now > this.settingsCacheExpiry) {
      this.settingsCache = null;
      this.settingsCacheExpiry = 0;
    }

    // 오래된 메시지 키 정리
    for (const [key, timestamp] of this.recentMessages.entries()) {
      if (now - timestamp > this.messageDeduplicationWindow * 5) {
        this.recentMessages.delete(key);
      }
    }

    // 오래된 메시지 큐 항목 정리
    this.messageQueue = this.messageQueue.filter(
      item => now - item.timestamp < 30000 // 30초 이상 된 메시지 제거
    );
  }

  /**
   * 리소스 해제
   */
  dispose() {
    // 메시지 큐 정리
    this.messageQueue.length = 0;
    this.recentMessages.clear();

    // 캐시 정리
    this.settingsCache = null;
    this.settingsCacheExpiry = 0;

    // 핸들러 정리
    this.messageHandlers.clear();
  }
}

// Initialize background service
const backgroundService = new BackgroundService();

// 주기적 메모리 정리 (5분마다)
setInterval(() => {
  backgroundService.performMemoryCleanup();
}, 300000);
