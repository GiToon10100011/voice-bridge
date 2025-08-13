import { describe, it, expect, beforeEach } from "vitest";
import TTSSettingsManager from "./tts-settings.js";

describe("TTSSettingsManager", () => {
  let settingsManager;

  beforeEach(() => {
    settingsManager = new TTSSettingsManager();
  });

  describe("Constructor", () => {
    it("should initialize with default settings", () => {
      const settings = settingsManager.getCurrentSettings();
      expect(settings).toEqual({
        defaultVoice: "",
        defaultRate: 1.0,
        defaultPitch: 1.0,
        defaultVolume: 1.0,
        preferredLanguage: "ko-KR",
      });
    });
  });

  describe("validateTTSOptions", () => {
    it("should validate correct TTS options", () => {
      const validOptions = {
        voice: "Korean Voice",
        rate: 1.5,
        pitch: 1.2,
        volume: 0.8,
        lang: "ko-KR",
      };

      const result = settingsManager.validateTTSOptions(validOptions);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid rate values", () => {
      const invalidOptions = [{ rate: -1 }, { rate: 15 }, { rate: "invalid" }];

      invalidOptions.forEach((options) => {
        const result = settingsManager.validateTTSOptions(options);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Rate must be a number between 0.1 and 10"
        );
      });
    });

    it("should reject invalid pitch values", () => {
      const invalidOptions = [
        { pitch: -1 },
        { pitch: 3 },
        { pitch: "invalid" },
      ];

      invalidOptions.forEach((options) => {
        const result = settingsManager.validateTTSOptions(options);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Pitch must be a number between 0 and 2"
        );
      });
    });

    it("should reject invalid volume values", () => {
      const invalidOptions = [
        { volume: -1 },
        { volume: 2 },
        { volume: "invalid" },
      ];

      invalidOptions.forEach((options) => {
        const result = settingsManager.validateTTSOptions(options);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Volume must be a number between 0 and 1"
        );
      });
    });

    it("should reject invalid voice values", () => {
      const result = settingsManager.validateTTSOptions({ voice: 123 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Voice must be a string");
    });

    it("should reject invalid language codes", () => {
      const invalidLanguages = [
        { lang: "invalid" },
        { lang: "ko" },
        { lang: "ko-kr" },
        { lang: "KO-KR" },
        { lang: 123 },
      ];

      invalidLanguages.forEach((options) => {
        const result = settingsManager.validateTTSOptions(options);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Language must be a valid language code (e.g., ko-KR, en-US)"
        );
      });
    });

    it("should accept valid language codes", () => {
      const validLanguages = ["ko-KR", "en-US", "ja-JP", "zh-CN", "fr-FR"];

      validLanguages.forEach((lang) => {
        const result = settingsManager.validateTTSOptions({ lang });
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe("validateTTSSettings", () => {
    it("should validate correct TTS settings", () => {
      const validSettings = {
        defaultVoice: "Korean Voice",
        defaultRate: 1.5,
        defaultPitch: 1.2,
        defaultVolume: 0.8,
        preferredLanguage: "ko-KR",
      };

      const result = settingsManager.validateTTSSettings(validSettings);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid default rate values", () => {
      const result = settingsManager.validateTTSSettings({ defaultRate: -1 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Default rate must be a number between 0.1 and 10"
      );
    });

    it("should reject invalid default pitch values", () => {
      const result = settingsManager.validateTTSSettings({ defaultPitch: 3 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Default pitch must be a number between 0 and 2"
      );
    });

    it("should reject invalid default volume values", () => {
      const result = settingsManager.validateTTSSettings({ defaultVolume: 2 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Default volume must be a number between 0 and 1"
      );
    });

    it("should reject invalid default voice values", () => {
      const result = settingsManager.validateTTSSettings({ defaultVoice: 123 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Default voice must be a string");
    });

    it("should reject invalid preferred language values", () => {
      const result = settingsManager.validateTTSSettings({
        preferredLanguage: "invalid",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Preferred language must be a valid language code"
      );
    });
  });

  describe("isValidLanguageCode", () => {
    it("should validate correct language codes", () => {
      const validCodes = ["ko-KR", "en-US", "ja-JP", "zh-CN", "fr-FR", "de-DE"];

      validCodes.forEach((code) => {
        expect(settingsManager.isValidLanguageCode(code)).toBe(true);
      });
    });

    it("should reject invalid language codes", () => {
      const invalidCodes = [
        "ko",
        "ko-kr",
        "KO-KR",
        "korean",
        "en-us",
        "123",
        "ko-KRR",
      ];

      invalidCodes.forEach((code) => {
        expect(settingsManager.isValidLanguageCode(code)).toBe(false);
      });
    });
  });

  describe("updateSettings", () => {
    it("should update settings with valid values", () => {
      const newSettings = {
        defaultRate: 1.5,
        preferredLanguage: "en-US",
      };

      const result = settingsManager.updateSettings(newSettings);
      expect(result.success).toBe(true);

      const currentSettings = settingsManager.getCurrentSettings();
      expect(currentSettings.defaultRate).toBe(1.5);
      expect(currentSettings.preferredLanguage).toBe("en-US");
      expect(currentSettings.defaultVoice).toBe(""); // unchanged
    });

    it("should reject invalid settings", () => {
      const invalidSettings = {
        defaultRate: -1,
        preferredLanguage: "invalid",
      };

      const result = settingsManager.updateSettings(invalidSettings);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);

      // Settings should remain unchanged
      const currentSettings = settingsManager.getCurrentSettings();
      expect(currentSettings.defaultRate).toBe(1.0);
      expect(currentSettings.preferredLanguage).toBe("ko-KR");
    });
  });

  describe("resetToDefaults", () => {
    it("should reset settings to default values", () => {
      // Change some settings
      settingsManager.updateSettings({
        defaultRate: 2.0,
        preferredLanguage: "en-US",
      });

      // Reset to defaults
      settingsManager.resetToDefaults();

      const settings = settingsManager.getCurrentSettings();
      expect(settings).toEqual({
        defaultVoice: "",
        defaultRate: 1.0,
        defaultPitch: 1.0,
        defaultVolume: 1.0,
        preferredLanguage: "ko-KR",
      });
    });
  });

  describe("toTTSOptions", () => {
    it("should convert settings to TTS options", () => {
      settingsManager.updateSettings({
        defaultVoice: "Korean Voice",
        defaultRate: 1.5,
        defaultPitch: 1.2,
        defaultVolume: 0.8,
        preferredLanguage: "ko-KR",
      });

      const options = settingsManager.toTTSOptions();
      expect(options).toEqual({
        voice: "Korean Voice",
        rate: 1.5,
        pitch: 1.2,
        volume: 0.8,
        lang: "ko-KR",
      });
    });

    it("should apply overrides to TTS options", () => {
      const overrides = {
        rate: 2.0,
        lang: "en-US",
      };

      const options = settingsManager.toTTSOptions(overrides);
      expect(options.rate).toBe(2.0);
      expect(options.lang).toBe("en-US");
      expect(options.pitch).toBe(1.0); // from default settings
    });
  });

  describe("normalizeOptions", () => {
    it("should clamp rate values to valid range", () => {
      const options = settingsManager.normalizeOptions({ rate: -1 });
      expect(options.rate).toBe(0.1);

      const options2 = settingsManager.normalizeOptions({ rate: 15 });
      expect(options2.rate).toBe(10);
    });

    it("should clamp pitch values to valid range", () => {
      const options = settingsManager.normalizeOptions({ pitch: -1 });
      expect(options.pitch).toBe(0);

      const options2 = settingsManager.normalizeOptions({ pitch: 5 });
      expect(options2.pitch).toBe(2);
    });

    it("should clamp volume values to valid range", () => {
      const options = settingsManager.normalizeOptions({ volume: -1 });
      expect(options.volume).toBe(0);

      const options2 = settingsManager.normalizeOptions({ volume: 2 });
      expect(options2.volume).toBe(1);
    });

    it("should not modify valid values", () => {
      const validOptions = {
        rate: 1.5,
        pitch: 1.2,
        volume: 0.8,
      };

      const normalized = settingsManager.normalizeOptions(validOptions);
      expect(normalized).toEqual(validOptions);
    });
  });

  describe("getSupportedLanguages", () => {
    it("should return list of supported languages", () => {
      const languages = settingsManager.getSupportedLanguages();
      expect(languages).toBeInstanceOf(Array);
      expect(languages.length).toBeGreaterThan(0);

      const korean = languages.find((lang) => lang.code === "ko-KR");
      expect(korean).toBeDefined();
      expect(korean.name).toBe("한국어");

      const english = languages.find((lang) => lang.code === "en-US");
      expect(english).toBeDefined();
      expect(english.name).toBe("English (US)");
    });
  });

  describe("serialize and deserialize", () => {
    it("should serialize settings to JSON string", () => {
      settingsManager.updateSettings({
        defaultRate: 1.5,
        preferredLanguage: "en-US",
      });

      const serialized = settingsManager.serialize();
      const parsed = JSON.parse(serialized);

      expect(parsed.defaultRate).toBe(1.5);
      expect(parsed.preferredLanguage).toBe("en-US");
    });

    it("should deserialize settings from JSON string", () => {
      const settingsJson = JSON.stringify({
        defaultVoice: "Test Voice",
        defaultRate: 2.0,
        defaultPitch: 1.5,
        defaultVolume: 0.7,
        preferredLanguage: "ja-JP",
      });

      const result = settingsManager.deserialize(settingsJson);
      expect(result.success).toBe(true);

      const settings = settingsManager.getCurrentSettings();
      expect(settings.defaultVoice).toBe("Test Voice");
      expect(settings.defaultRate).toBe(2.0);
      expect(settings.preferredLanguage).toBe("ja-JP");
    });

    it("should reject invalid JSON", () => {
      const result = settingsManager.deserialize("invalid json");
      expect(result.success).toBe(false);
      expect(result.errors).toContain("Invalid JSON format");
    });

    it("should reject invalid settings in JSON", () => {
      const invalidSettingsJson = JSON.stringify({
        defaultRate: -1,
        preferredLanguage: "invalid",
      });

      const result = settingsManager.deserialize(invalidSettingsJson);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should merge with defaults when deserializing partial settings", () => {
      const partialSettingsJson = JSON.stringify({
        defaultRate: 1.8,
      });

      const result = settingsManager.deserialize(partialSettingsJson);
      expect(result.success).toBe(true);

      const settings = settingsManager.getCurrentSettings();
      expect(settings.defaultRate).toBe(1.8);
      expect(settings.preferredLanguage).toBe("ko-KR"); // default value
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle undefined options gracefully", () => {
      const result = settingsManager.validateTTSOptions({});
      expect(result.isValid).toBe(true);
    });

    it("should handle null values in normalization", () => {
      const normalized = settingsManager.normalizeOptions({
        rate: null,
        pitch: undefined,
        volume: 0.5,
      });

      expect(normalized.rate).toBeNull();
      expect(normalized.pitch).toBeUndefined();
      expect(normalized.volume).toBe(0.5);
    });

    it("should preserve unknown properties in options", () => {
      const options = {
        rate: 1.5,
        customProperty: "test",
      };

      const normalized = settingsManager.normalizeOptions(options);
      expect(normalized.customProperty).toBe("test");
    });
  });
});
