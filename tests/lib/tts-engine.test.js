import { describe, it, expect, vi, beforeEach } from "vitest";
import TTSEngine from "../../src/lib/tts-engine.js";

describe("TTSEngine", () => {
  let ttsEngine;

  beforeEach(() => {
    ttsEngine = new TTSEngine();
  });

  describe("Constructor", () => {
    it("should initialize with correct default values", () => {
      expect(ttsEngine.synthesis).toBe(global.speechSynthesis);
      expect(ttsEngine.currentUtterance).toBeNull();
      expect(ttsEngine.isPlaying).toBe(false);
      expect(ttsEngine.isPaused).toBe(false);
      expect(ttsEngine.fallbackVoices).toEqual([]);
      expect(ttsEngine.errorHandlers).toBeInstanceOf(Map);
      expect(ttsEngine.retryAttempts).toBe(3);
      expect(ttsEngine.retryDelay).toBe(1000);
    });
  });

  describe("isSupported", () => {
    it("should return true when Web Speech API is supported", () => {
      expect(ttsEngine.isSupported()).toBe(true);
    });

    it("should return false when speechSynthesis is not available", () => {
      const originalSpeechSynthesis = global.speechSynthesis;
      delete global.speechSynthesis;

      const engine = new TTSEngine();
      expect(engine.isSupported()).toBe(false);

      global.speechSynthesis = originalSpeechSynthesis;
    });

    it("should return false when SpeechSynthesisUtterance is not available", () => {
      const originalUtterance = global.SpeechSynthesisUtterance;
      delete global.SpeechSynthesisUtterance;

      const engine = new TTSEngine();
      expect(engine.isSupported()).toBe(false);

      global.SpeechSynthesisUtterance = originalUtterance;
    });
  });

  describe("getAvailableVoices", () => {
    it("should return voices when available immediately", async () => {
      const voices = await ttsEngine.getAvailableVoices();
      expect(voices).toHaveLength(3);
      expect(voices[0].name).toBe("Korean Voice");
      expect(voices[1].name).toBe("English Voice");
      expect(voices[2].name).toBe("Japanese Voice");
    });

    it("should wait for voiceschanged event when voices are not immediately available", async () => {
      // Mock empty voices initially
      global.speechSynthesis.getVoices.mockReturnValueOnce([]);

      // Simulate voiceschanged event
      setTimeout(() => {
        const callback =
          global.speechSynthesis.addEventListener.mock.calls.find(
            (call) => call[0] === "voiceschanged"
          )[1];
        callback();
      }, 10);

      const voices = await ttsEngine.getAvailableVoices();
      expect(voices).toHaveLength(3);
      expect(global.speechSynthesis.addEventListener).toHaveBeenCalledWith(
        "voiceschanged",
        expect.any(Function),
        { once: true }
      );
    });
  });

  describe("speak", () => {
    it("should reject when Web Speech API is not supported", async () => {
      vi.spyOn(ttsEngine, "isSupported").mockReturnValue(false);

      await expect(ttsEngine.speak("test")).rejects.toThrow(
        "Web Speech API를 사용할 수 없습니다"
      );
    });

    it("should reject when text is empty", async () => {
      await expect(ttsEngine.speak("")).rejects.toThrow("텍스트가 필요합니다");

      await expect(ttsEngine.speak("   ")).rejects.toThrow(
        "텍스트가 필요합니다"
      );
    });

    it("should create utterance with correct text", async () => {
      const text = "Hello, world!";

      // Mock successful speech
      global.speechSynthesis.speak.mockImplementation((utterance) => {
        setTimeout(() => utterance.onstart(), 0);
        setTimeout(() => utterance.onend(), 10);
      });

      await ttsEngine.speak(text);

      expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith(text);
      expect(global.speechSynthesis.speak).toHaveBeenCalled();
    });

    it("should apply TTS options correctly", async () => {
      const options = {
        rate: 1.5,
        pitch: 1.2,
        volume: 0.8,
        lang: "en-US",
      };

      global.speechSynthesis.speak.mockImplementation((utterance) => {
        expect(utterance.rate).toBe(1.5);
        expect(utterance.pitch).toBe(1.2);
        expect(utterance.volume).toBe(0.8);
        expect(utterance.lang).toBe("en-US");
        setTimeout(() => utterance.onstart(), 0);
        setTimeout(() => utterance.onend(), 10);
      });

      await ttsEngine.speak("test", options);
    });

    it("should clamp rate values to valid range", async () => {
      global.speechSynthesis.speak.mockImplementation((utterance) => {
        expect(utterance.rate).toBe(0.1); // clamped from -1
        setTimeout(() => utterance.onstart(), 0);
        setTimeout(() => utterance.onend(), 10);
      });

      await ttsEngine.speak("test", { rate: -1 });

      global.speechSynthesis.speak.mockImplementation((utterance) => {
        expect(utterance.rate).toBe(10); // clamped from 15
        setTimeout(() => utterance.onstart(), 0);
        setTimeout(() => utterance.onend(), 10);
      });

      await ttsEngine.speak("test", { rate: 15 });
    });

    it("should clamp pitch values to valid range", async () => {
      global.speechSynthesis.speak.mockImplementation((utterance) => {
        expect(utterance.pitch).toBe(0); // clamped from -1
        setTimeout(() => utterance.onstart(), 0);
        setTimeout(() => utterance.onend(), 10);
      });

      await ttsEngine.speak("test", { pitch: -1 });

      global.speechSynthesis.speak.mockImplementation((utterance) => {
        expect(utterance.pitch).toBe(2); // clamped from 5
        setTimeout(() => utterance.onstart(), 0);
        setTimeout(() => utterance.onend(), 10);
      });

      await ttsEngine.speak("test", { pitch: 5 });
    });

    it("should clamp volume values to valid range", async () => {
      global.speechSynthesis.speak.mockImplementation((utterance) => {
        expect(utterance.volume).toBe(0); // clamped from -1
        setTimeout(() => utterance.onstart(), 0);
        setTimeout(() => utterance.onend(), 10);
      });

      await ttsEngine.speak("test", { volume: -1 });

      global.speechSynthesis.speak.mockImplementation((utterance) => {
        expect(utterance.volume).toBe(1); // clamped from 2
        setTimeout(() => utterance.onstart(), 0);
        setTimeout(() => utterance.onend(), 10);
      });

      await ttsEngine.speak("test", { volume: 2 });
    });

    it("should update state correctly during speech", async () => {
      let utterance;
      global.speechSynthesis.speak.mockImplementation((utt) => {
        utterance = utt;
        setTimeout(() => {
          utterance.onstart();
          expect(ttsEngine.isPlaying).toBe(true);
          expect(ttsEngine.isPaused).toBe(false);
        }, 0);
        setTimeout(() => {
          utterance.onend();
          expect(ttsEngine.isPlaying).toBe(false);
          expect(ttsEngine.currentUtterance).toBeNull();
        }, 10);
      });

      await ttsEngine.speak("test");
    });

    it("should handle speech synthesis errors", async () => {
      global.speechSynthesis.speak.mockImplementation((utterance) => {
        setTimeout(() => utterance.onerror({ error: "synthesis-failed" }), 0);
      });

      await expect(ttsEngine.speak("test")).rejects.toThrow(
        "TTS 재생 오류: synthesis-failed"
      );

      expect(ttsEngine.isPlaying).toBe(false);
      expect(ttsEngine.currentUtterance).toBeNull();
    });

    it("should stop current speech before starting new one", async () => {
      vi.spyOn(ttsEngine, "stop");

      global.speechSynthesis.speak.mockImplementation((utterance) => {
        setTimeout(() => utterance.onstart(), 0);
        setTimeout(() => utterance.onend(), 10);
      });

      await ttsEngine.speak("test");
      expect(ttsEngine.stop).toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    it("should cancel speech synthesis when speaking", () => {
      global.speechSynthesis.speaking = true;
      ttsEngine.isPlaying = true;
      ttsEngine.currentUtterance = {};

      ttsEngine.stop();

      expect(global.speechSynthesis.cancel).toHaveBeenCalled();
      expect(ttsEngine.isPlaying).toBe(false);
      expect(ttsEngine.isPaused).toBe(false);
      expect(ttsEngine.currentUtterance).toBeNull();
    });

    it("should cancel speech synthesis when pending", () => {
      global.speechSynthesis.pending = true;

      ttsEngine.stop();

      expect(global.speechSynthesis.cancel).toHaveBeenCalled();
    });

    it("should reset state even when not speaking", () => {
      ttsEngine.isPlaying = true;
      ttsEngine.isPaused = true;
      ttsEngine.currentUtterance = {};

      ttsEngine.stop();

      expect(ttsEngine.isPlaying).toBe(false);
      expect(ttsEngine.isPaused).toBe(false);
      expect(ttsEngine.currentUtterance).toBeNull();
    });
  });

  describe("pause", () => {
    it("should pause speech when speaking and not paused", () => {
      global.speechSynthesis.speaking = true;
      global.speechSynthesis.paused = false;

      ttsEngine.pause();

      expect(global.speechSynthesis.pause).toHaveBeenCalled();
      expect(ttsEngine.isPaused).toBe(true);
    });

    it("should not pause when not speaking", () => {
      global.speechSynthesis.speaking = false;

      ttsEngine.pause();

      expect(global.speechSynthesis.pause).not.toHaveBeenCalled();
      expect(ttsEngine.isPaused).toBe(false);
    });

    it("should not pause when already paused", () => {
      global.speechSynthesis.speaking = true;
      global.speechSynthesis.paused = true;

      ttsEngine.pause();

      expect(global.speechSynthesis.pause).not.toHaveBeenCalled();
    });
  });

  describe("resume", () => {
    it("should resume speech when paused", () => {
      global.speechSynthesis.paused = true;
      ttsEngine.isPaused = true;

      ttsEngine.resume();

      expect(global.speechSynthesis.resume).toHaveBeenCalled();
      expect(ttsEngine.isPaused).toBe(false);
    });

    it("should not resume when not paused", () => {
      global.speechSynthesis.paused = false;

      ttsEngine.resume();

      expect(global.speechSynthesis.resume).not.toHaveBeenCalled();
    });
  });

  describe("State checking methods", () => {
    it("isCurrentlyPlaying should return correct state", () => {
      ttsEngine.isPlaying = true;
      ttsEngine.isPaused = false;
      expect(ttsEngine.isCurrentlyPlaying()).toBe(true);

      ttsEngine.isPlaying = true;
      ttsEngine.isPaused = true;
      expect(ttsEngine.isCurrentlyPlaying()).toBe(false);

      ttsEngine.isPlaying = false;
      ttsEngine.isPaused = false;
      expect(ttsEngine.isCurrentlyPlaying()).toBe(false);
    });

    it("isCurrentlyPaused should return correct state", () => {
      ttsEngine.isPaused = true;
      expect(ttsEngine.isCurrentlyPaused()).toBe(true);

      ttsEngine.isPaused = false;
      expect(ttsEngine.isCurrentlyPaused()).toBe(false);
    });

    it("isActive should return correct state", () => {
      global.speechSynthesis.speaking = true;
      expect(ttsEngine.isActive()).toBe(true);

      global.speechSynthesis.speaking = false;
      global.speechSynthesis.pending = true;
      expect(ttsEngine.isActive()).toBe(true);

      global.speechSynthesis.speaking = false;
      global.speechSynthesis.pending = false;
      expect(ttsEngine.isActive()).toBe(false);
    });
  });

  describe("Error Handling", () => {
    describe("Error Handler Registration", () => {
      it("should register error handlers correctly", () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        ttsEngine.onError("test_error", handler1);
        ttsEngine.onError("test_error", handler2);

        expect(ttsEngine.errorHandlers.get("test_error")).toHaveLength(2);
        expect(ttsEngine.errorHandlers.get("test_error")).toContain(handler1);
        expect(ttsEngine.errorHandlers.get("test_error")).toContain(handler2);
      });

      it("should handle errors and call registered handlers", () => {
        const handler = vi.fn();
        const error = new Error("Test error");
        const context = { test: "context" };

        ttsEngine.onError("test_error", handler);
        ttsEngine._handleError("test_error", error, context);

        expect(handler).toHaveBeenCalledWith(error, context);
      });

      it("should handle errors in error handlers gracefully", () => {
        const faultyHandler = vi.fn(() => {
          throw new Error("Handler error");
        });
        const goodHandler = vi.fn();
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {});

        ttsEngine.onError("test_error", faultyHandler);
        ttsEngine.onError("test_error", goodHandler);

        ttsEngine._handleError("test_error", new Error("Test error"));

        expect(faultyHandler).toHaveBeenCalled();
        expect(goodHandler).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error in error handler:",
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });

    describe("Fallback TTS", () => {
      it("should provide fallback when Web Speech API is not supported", async () => {
        vi.spyOn(ttsEngine, "isSupported").mockReturnValue(false);

        // Mock Notification API
        global.Notification = vi.fn();
        const consoleSpy = vi
          .spyOn(console, "log")
          .mockImplementation(() => {});

        const errorHandler = vi.fn();
        ttsEngine.onError("unsupported_browser", errorHandler);

        await expect(ttsEngine.speak("test text")).rejects.toThrow(
          "Web Speech API를 사용할 수 없습니다"
        );

        expect(global.Notification).toHaveBeenCalledWith("TTS Voice Bridge", {
          body: "음성 변환: test text",
          icon: "/icons/icon48.png",
        });
        expect(consoleSpy).toHaveBeenCalledWith("TTS Fallback: test text");
        expect(errorHandler).toHaveBeenCalled();

        consoleSpy.mockRestore();
        delete global.Notification;
      });
    });

    describe("Voice Loading Errors", () => {
      it("should handle voice loading timeout", async () => {
        vi.spyOn(ttsEngine, "isSupported").mockReturnValue(true);
        global.speechSynthesis.getVoices.mockReturnValue([]);

        const errorHandler = vi.fn();
        ttsEngine.onError("voice_load_timeout", errorHandler);

        // Don't trigger voiceschanged event to simulate timeout
        await expect(ttsEngine.getAvailableVoices()).rejects.toThrow(
          "음성 목록 로드 시간 초과"
        );
        expect(errorHandler).toHaveBeenCalled();
      });

      it("should handle no voices available", async () => {
        vi.spyOn(ttsEngine, "isSupported").mockReturnValue(true);
        global.speechSynthesis.getVoices.mockReturnValue([]);

        const errorHandler = vi.fn();
        ttsEngine.onError("no_voices_available", errorHandler);

        // Simulate voiceschanged event with empty voices
        setTimeout(() => {
          const callback =
            global.speechSynthesis.addEventListener.mock.calls.find(
              (call) => call[0] === "voiceschanged"
            )[1];
          global.speechSynthesis.getVoices.mockReturnValue([]);
          callback();
        }, 10);

        await expect(ttsEngine.getAvailableVoices()).rejects.toThrow(
          "사용 가능한 음성이 없습니다"
        );
        expect(errorHandler).toHaveBeenCalled();
      });

      it("should select fallback voice when preferred voice is not available", async () => {
        const voices = [
          { name: "Voice A", lang: "en-US", default: false },
          { name: "Voice B", lang: "ko-KR", default: true },
          { name: "Voice C", lang: "ja-JP", default: false },
        ];

        vi.spyOn(ttsEngine, "getAvailableVoices").mockResolvedValue(voices);

        const errorHandler = vi.fn();
        ttsEngine.onError("voice_fallback", errorHandler);

        // Test language fallback
        const result = await ttsEngine._selectFallbackVoice(
          "NonExistent Voice",
          "ko-KR"
        );
        expect(result.name).toBe("Voice B");
        expect(errorHandler).toHaveBeenCalled();
      });

      it("should use default voice when no language match", async () => {
        const voices = [
          { name: "Voice A", lang: "en-US", default: false },
          { name: "Voice B", lang: "fr-FR", default: true },
        ];

        vi.spyOn(ttsEngine, "getAvailableVoices").mockResolvedValue(voices);

        const errorHandler = vi.fn();
        ttsEngine.onError("voice_fallback", errorHandler);

        const result = await ttsEngine._selectFallbackVoice(
          "NonExistent Voice",
          "ko-KR"
        );
        expect(result.name).toBe("Voice B");
        expect(errorHandler).toHaveBeenCalled();
      });
    });

    describe("TTS Playback Errors", () => {
      it("should retry on TTS failure", async () => {
        let attemptCount = 0;
        global.speechSynthesis.speak.mockImplementation((utterance) => {
          attemptCount++;
          if (attemptCount < 3) {
            setTimeout(
              () => utterance.onerror({ error: "synthesis-failed" }),
              0
            );
          } else {
            setTimeout(() => utterance.onstart(), 0);
            setTimeout(() => utterance.onend(), 10);
          }
        });

        const retryHandler = vi.fn();
        ttsEngine.onError("tts_retry", retryHandler);

        await ttsEngine.speak("test text");

        expect(attemptCount).toBe(3);
        expect(retryHandler).toHaveBeenCalledTimes(2);
      });

      it("should fail after max retries", async () => {
        global.speechSynthesis.speak.mockImplementation((utterance) => {
          setTimeout(() => utterance.onerror({ error: "synthesis-failed" }), 0);
        });

        const failedHandler = vi.fn();
        ttsEngine.onError("tts_failed", failedHandler);

        await expect(ttsEngine.speak("test text")).rejects.toThrow(
          "TTS 재생 오류: synthesis-failed"
        );
        expect(failedHandler).toHaveBeenCalled();
      });

      it("should handle timeout errors", async () => {
        global.speechSynthesis.speak.mockImplementation(() => {
          // Don't trigger any events to simulate timeout
        });

        // Reduce timeout for testing
        const originalTimeout = ttsEngine.retryDelay;
        ttsEngine.retryDelay = 50;

        await expect(ttsEngine.speak("test text")).rejects.toThrow(
          "TTS 재생이 시작되지 않았습니다"
        );

        ttsEngine.retryDelay = originalTimeout;
      });

      it("should handle start failure", async () => {
        global.speechSynthesis.speak.mockImplementation(() => {
          // Don't trigger onstart to simulate start failure
        });

        await expect(ttsEngine.speak("test text")).rejects.toThrow(
          "TTS 재생이 시작되지 않았습니다"
        );
      }, 10000);

      it("should validate input text", async () => {
        const errorHandler = vi.fn();
        ttsEngine.onError("invalid_input", errorHandler);

        await expect(ttsEngine.speak("")).rejects.toThrow(
          "텍스트가 필요합니다"
        );
        expect(errorHandler).toHaveBeenCalled();

        await expect(ttsEngine.speak("   ")).rejects.toThrow(
          "텍스트가 필요합니다"
        );
        expect(errorHandler).toHaveBeenCalledTimes(2);
      });
    });

    describe("Stop Method Error Handling", () => {
      it("should handle errors in stop method gracefully", () => {
        global.speechSynthesis.cancel.mockImplementation(() => {
          throw new Error("Cancel failed");
        });
        global.speechSynthesis.speaking = true; // Make sure cancel is called

        const errorHandler = vi.fn();
        ttsEngine.onError("stop_failed", errorHandler);

        ttsEngine.isPlaying = true;
        ttsEngine.isPaused = true;
        ttsEngine.currentUtterance = {};

        // Should not throw
        expect(() => ttsEngine.stop()).not.toThrow();

        // Should reset state even if cancel fails
        expect(ttsEngine.isPlaying).toBe(false);
        expect(ttsEngine.isPaused).toBe(false);
        expect(ttsEngine.currentUtterance).toBeNull();
        expect(errorHandler).toHaveBeenCalled();
      });
    });
  });

  describe("Browser compatibility", () => {
    it("should handle different browser environments", () => {
      // Test Chrome-like environment
      expect(ttsEngine.isSupported()).toBe(true);

      // Test environment without Web Speech API
      const originalSpeech = global.speechSynthesis;
      const originalUtterance = global.SpeechSynthesisUtterance;

      delete global.speechSynthesis;
      delete global.SpeechSynthesisUtterance;

      const unsupportedEngine = new TTSEngine();
      expect(unsupportedEngine.isSupported()).toBe(false);

      // Restore
      global.speechSynthesis = originalSpeech;
      global.SpeechSynthesisUtterance = originalUtterance;
    });
  });
});
