// Settings Page Controller
class SettingsUI {
  constructor() {
    this.voiceSelect = document.getElementById("voiceSelect");
    this.rateSlider = document.getElementById("rateSlider");
    this.rateValue = document.getElementById("rateValue");
    this.pitchSlider = document.getElementById("pitchSlider");
    this.pitchValue = document.getElementById("pitchValue");
    this.volumeSlider = document.getElementById("volumeSlider");
    this.volumeValue = document.getElementById("volumeValue");
    this.languageSelect = document.getElementById("languageSelect");
    this.previewText = document.getElementById("previewText");
    this.previewButton = document.getElementById("previewButton");
    this.stopPreviewButton = document.getElementById("stopPreviewButton");
    this.autoDetection = document.getElementById("autoDetection");
    this.saveLastText = document.getElementById("saveLastText");
    this.resetButton = document.getElementById("resetButton");
    this.saveButton = document.getElementById("saveButton");
    this.statusMessage = document.getElementById("statusMessage");

    this.availableVoices = [];
    this.isPreviewPlaying = false;
    this.currentUtterance = null;

    this.defaultSettings = {
      voice: "",
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      language: "ko-KR",
      autoDetection: true,
      saveLastText: true,
    };

    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadVoices();
    await this.loadSettings();
    this.updateSliderValues();
  }

  setupEventListeners() {
    // Voice selection
    this.voiceSelect.addEventListener("change", () => {
      this.updatePreview();
    });

    // Sliders
    this.rateSlider.addEventListener("input", () => {
      this.updateSliderValues();
      this.updatePreview();
    });

    this.pitchSlider.addEventListener("input", () => {
      this.updateSliderValues();
      this.updatePreview();
    });

    this.volumeSlider.addEventListener("input", () => {
      this.updateSliderValues();
      this.updatePreview();
    });

    // Language selection
    this.languageSelect.addEventListener("change", () => {
      this.filterVoicesByLanguage();
      this.updatePreview();
    });

    // Preview controls
    this.previewButton.addEventListener("click", () => {
      this.handlePreview();
    });

    this.stopPreviewButton.addEventListener("click", () => {
      this.handleStopPreview();
    });

    // Action buttons
    this.resetButton.addEventListener("click", () => {
      this.handleReset();
    });

    this.saveButton.addEventListener("click", () => {
      this.handleSave();
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isPreviewPlaying) {
        this.handleStopPreview();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        this.handleSave();
      }
    });
  }

  async loadVoices() {
    return new Promise((resolve) => {
      const loadVoicesImpl = () => {
        this.availableVoices = speechSynthesis.getVoices();
        if (this.availableVoices.length > 0) {
          this.populateVoiceSelect();
          resolve();
        } else {
          // Voices might not be loaded yet
          setTimeout(loadVoicesImpl, 100);
        }
      };

      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoicesImpl;
      }

      loadVoicesImpl();
    });
  }

  populateVoiceSelect() {
    this.voiceSelect.innerHTML = "";

    // Group voices by language
    const voicesByLang = {};
    this.availableVoices.forEach((voice) => {
      const lang = voice.lang.split("-")[0];
      if (!voicesByLang[lang]) {
        voicesByLang[lang] = [];
      }
      voicesByLang[lang].push(voice);
    });

    // Add default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "기본 음성";
    this.voiceSelect.appendChild(defaultOption);

    // Add voices grouped by language
    Object.keys(voicesByLang)
      .sort()
      .forEach((lang) => {
        const optgroup = document.createElement("optgroup");
        optgroup.label = this.getLanguageName(lang);

        voicesByLang[lang].forEach((voice) => {
          const option = document.createElement("option");
          option.value = voice.name;
          option.textContent = `${voice.name} ${
            voice.localService ? "(로컬)" : "(온라인)"
          }`;
          optgroup.appendChild(option);
        });

        this.voiceSelect.appendChild(optgroup);
      });

    this.filterVoicesByLanguage();
  }

  filterVoicesByLanguage() {
    const selectedLang = this.languageSelect.value;
    const options = this.voiceSelect.querySelectorAll("option");
    const optgroups = this.voiceSelect.querySelectorAll("optgroup");

    // Show/hide options based on selected language
    optgroups.forEach((optgroup) => {
      const langCode = this.getLanguageCode(optgroup.label);
      optgroup.style.display = selectedLang.startsWith(langCode)
        ? "block"
        : "none";
    });

    // If current selection is not compatible with new language, reset to default
    const currentVoice = this.availableVoices.find(
      (v) => v.name === this.voiceSelect.value
    );
    if (
      currentVoice &&
      !currentVoice.lang.startsWith(selectedLang.split("-")[0])
    ) {
      this.voiceSelect.value = "";
    }
  }

  getLanguageName(langCode) {
    const names = {
      ko: "한국어",
      en: "English",
      ja: "日本語",
      zh: "中文",
      es: "Español",
      fr: "Français",
      de: "Deutsch",
      it: "Italiano",
      pt: "Português",
      ru: "Русский",
    };
    return names[langCode] || langCode.toUpperCase();
  }

  getLanguageCode(languageName) {
    const codes = {
      한국어: "ko",
      English: "en",
      日本語: "ja",
      中文: "zh",
      Español: "es",
      Français: "fr",
      Deutsch: "de",
      Italiano: "it",
      Português: "pt",
      Русский: "ru",
    };
    return codes[languageName] || "en";
  }

  updateSliderValues() {
    this.rateValue.textContent = `${parseFloat(this.rateSlider.value).toFixed(
      1
    )}x`;
    this.pitchValue.textContent = parseFloat(this.pitchSlider.value).toFixed(1);
    this.volumeValue.textContent = `${Math.round(
      parseFloat(this.volumeSlider.value) * 100
    )}%`;
  }

  updatePreview() {
    // Stop any current preview
    if (this.isPreviewPlaying) {
      this.handleStopPreview();
    }
  }

  async handlePreview() {
    if (this.isPreviewPlaying) return;

    const text = this.previewText.value.trim();
    if (!text) {
      this.showStatusMessage("미리듣기할 텍스트를 입력하세요.", "error");
      return;
    }

    try {
      this.isPreviewPlaying = true;
      this.setPreviewPlayingState(true);

      const settings = this.getCurrentSettings();
      await this.playTTS(text, settings);
    } catch (error) {
      console.error("Preview failed:", error);
      this.showStatusMessage("미리듣기 중 오류가 발생했습니다.", "error");
      this.handleStopPreview();
    }
  }

  handleStopPreview() {
    if (this.currentUtterance) {
      speechSynthesis.cancel();
      this.currentUtterance = null;
    }
    this.isPreviewPlaying = false;
    this.setPreviewPlayingState(false);
  }

  async playTTS(text, settings) {
    return new Promise((resolve, reject) => {
      if (!speechSynthesis) {
        reject(new Error("Speech synthesis not supported"));
        return;
      }

      this.currentUtterance = new SpeechSynthesisUtterance(text);

      // Apply settings
      if (settings.voice) {
        const voice = this.availableVoices.find(
          (v) => v.name === settings.voice
        );
        if (voice) {
          this.currentUtterance.voice = voice;
        }
      }

      this.currentUtterance.rate = settings.rate;
      this.currentUtterance.pitch = settings.pitch;
      this.currentUtterance.volume = settings.volume;
      this.currentUtterance.lang = settings.language;

      this.currentUtterance.onend = () => {
        this.isPreviewPlaying = false;
        this.setPreviewPlayingState(false);
        resolve();
      };

      this.currentUtterance.onerror = (event) => {
        this.isPreviewPlaying = false;
        this.setPreviewPlayingState(false);
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      speechSynthesis.speak(this.currentUtterance);
    });
  }

  setPreviewPlayingState(isPlaying) {
    const buttonText = this.previewButton.querySelector(".button-text");
    const spinner = this.previewButton.querySelector(".loading-spinner");

    if (isPlaying) {
      buttonText.style.display = "none";
      spinner.style.display = "block";
      this.previewButton.disabled = true;
      this.stopPreviewButton.style.display = "block";
    } else {
      buttonText.style.display = "block";
      spinner.style.display = "none";
      this.previewButton.disabled = false;
      this.stopPreviewButton.style.display = "none";
    }
  }

  getCurrentSettings() {
    return {
      voice: this.voiceSelect.value,
      rate: parseFloat(this.rateSlider.value),
      pitch: parseFloat(this.pitchSlider.value),
      volume: parseFloat(this.volumeSlider.value),
      language: this.languageSelect.value,
      autoDetection: this.autoDetection.checked,
      saveLastText: this.saveLastText.checked,
    };
  }

  async loadSettings() {
    try {
      // 백그라운드 스크립트와 동일한 키 사용
      const result = await chrome.storage.sync.get(["userSettings"]);
      let settings = result.userSettings;
      
      if (settings && settings.tts) {
        // 백그라운드 스크립트 형식에서 설정 추출
        const extractedSettings = {
          voice: settings.tts.voice || "",
          rate: settings.tts.rate || 1.0,
          pitch: settings.tts.pitch || 1.0,
          volume: settings.tts.volume || 1.0,
          language: settings.tts.language || "ko-KR",
          autoDetection: settings.detection?.enableAutoDetection !== false,
          saveLastText: true // 기본값
        };
        this.applySettings(extractedSettings);
      } else {
        // 기본 설정 적용
        this.applySettings(this.defaultSettings);
      }
    } catch (error) {
      console.warn("Failed to load settings:", error);
      this.applySettings(this.defaultSettings);
    }
  }

  applySettings(settings) {
    this.voiceSelect.value = settings.voice || "";
    this.rateSlider.value = settings.rate || 1.0;
    this.pitchSlider.value = settings.pitch || 1.0;
    this.volumeSlider.value = settings.volume || 1.0;
    this.languageSelect.value = settings.language || "ko-KR";
    this.autoDetection.checked = settings.autoDetection !== false;
    this.saveLastText.checked = settings.saveLastText !== false;

    this.updateSliderValues();
    this.filterVoicesByLanguage();
  }

  async handleSave() {
    console.log('💾 설정 저장 시작');
    
    try {
      const currentSettings = this.getCurrentSettings();
      console.log('📊 현재 설정:', currentSettings);

      // 백그라운드 스크립트 형식에 맞게 변환
      const formattedSettings = {
        tts: {
          voice: currentSettings.voice,
          rate: currentSettings.rate,
          pitch: currentSettings.pitch,
          volume: currentSettings.volume,
          language: currentSettings.language
        },
        ui: {
          theme: 'auto',
          shortcuts: {
            playTTS: 'Ctrl+Enter',
            openPopup: 'Alt+T'
          }
        },
        detection: {
          enableAutoDetection: currentSettings.autoDetection,
          supportedSites: ['chat.openai.com', 'www.google.com', 'google.com']
        }
      };
      
      console.log('🔄 변환된 설정:', formattedSettings);

      // 백그라운드 스크립트를 통해 설정 저장
      console.log('📡 백그라운드 스크립트에 메시지 전송 중...');
      
      const message = {
        type: "SETTINGS_UPDATE",
        payload: formattedSettings,
        timestamp: Date.now(),
      };
      
      console.log('📨 전송할 메시지:', message);
      
      const response = await chrome.runtime.sendMessage(message);
      console.log('📧 백그라운드 응답:', response);

      if (response && response.success) {
        console.log('✅ 설정 저장 성공');
        this.showStatusMessage("설정이 저장되었습니다.", "success");
      } else {
        console.error('❌ 설정 저장 실패:', response);
        throw new Error(response?.error || "Settings update failed");
      }
    } catch (error) {
      console.error("❌ 설정 저장 중 오류:", error);
      this.showStatusMessage("설정 저장 중 오류가 발생했습니다.", "error");
    }
  }

  async handleReset() {
    if (confirm("모든 설정을 기본값으로 초기화하시겠습니까?")) {
      this.applySettings(this.defaultSettings);
      await this.handleSave();
      this.showStatusMessage("설정이 기본값으로 초기화되었습니다.", "info");
    }
  }

  showStatusMessage(message, type = "info") {
    this.statusMessage.style.display = "block";
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.querySelector(".status-text").textContent = message;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.statusMessage.style.display = "none";
    }, 3000);
  }
}

// 스크립트 로드 확인
console.log('🚀 TTS Voice Bridge 설정 스크립트 로드됨');

// Initialize settings when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log('📄 설정 페이지 DOM 로드 완료');
  
  try {
    const settingsUI = new SettingsUI();
    console.log('✅ SettingsUI 초기화 완료');
    
    // Chrome 확장프로그램 API 사용 가능 여부 확인
    console.log('🔧 Chrome API 사용 가능:', {
      runtime: !!chrome?.runtime,
      storage: !!chrome?.storage
    });
    
  } catch (error) {
    console.error('❌ SettingsUI 초기화 실패:', error);
  }
});
