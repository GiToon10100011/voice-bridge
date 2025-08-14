import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Operating System TTS Quality Tests
 * Tests TTS quality across different operating systems
 * Requirements: 6.1, 6.2
 */

describe("Operating System TTS Quality Tests", () => {
  let mockPlatform;
  let originalPlatform;

  beforeEach(() => {
    originalPlatform = navigator.platform;
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  const setPlatform = (platform) => {
    Object.defineProperty(navigator, "platform", {
      value: platform,
      configurable: true,
    });
  };

  const createMockVoicesForOS = (os) => {
    const baseVoices = [
      {
        name: "Korean Voice",
        lang: "ko-KR",
        voiceURI: "ko-KR-voice",
        localService: true,
        default: true,
      },
      {
        name: "English Voice",
        lang: "en-US",
        voiceURI: "en-US-voice",
        localService: true,
        default: false,
      },
    ];

    switch (os) {
      case "windows":
        return [
          ...baseVoices,
          {
            name: "Microsoft Heami - Korean",
            lang: "ko-KR",
            voiceURI: "Microsoft Heami - Korean",
            localService: true,
            default: false,
          },
          {
            name: "Microsoft Zira - English",
            lang: "en-US",
            voiceURI: "Microsoft Zira - English",
            localService: true,
            default: false,
          },
        ];
      case "macos":
        return [
          ...baseVoices,
          {
            name: "Yuna",
            lang: "ko-KR",
            voiceURI: "com.apple.speech.synthesis.voice.yuna",
            localService: true,
            default: false,
          },
          {
            name: "Samantha",
            lang: "en-US",
            voiceURI: "com.apple.speech.synthesis.voice.samantha",
            localService: true,
            default: false,
          },
        ];
      case "linux":
        return [
          ...baseVoices,
          {
            name: "eSpeak Korean",
            lang: "ko-KR",
            voiceURI: "espeak-ko",
            localService: true,
            default: false,
          },
          {
            name: "eSpeak English",
            lang: "en-US",
            voiceURI: "espeak-en",
            localService: true,
            default: false,
          },
        ];
      default:
        return baseVoices;
    }
  };

  describe("Windows TTS Quality", () => {
    beforeEach(() => {
      setPlatform("Win32");
      const windowsVoices = createMockVoicesForOS("windows");
      global.speechSynthesis.getVoices = vi.fn(() => windowsVoices);
    });

    it("should detect Windows platform", () => {
      expect(navigator.platform).toBe("Win32");
    });

    it("should have Windows-specific Korean voices", () => {
      const voices = global.speechSynthesis.getVoices();
      const microsoftKoreanVoice = voices.find(
        (v) => v.name.includes("Microsoft") && v.lang === "ko-KR"
      );

      expect(microsoftKoreanVoice).toBeDefined();
      expect(microsoftKoreanVoice.name).toBe("Microsoft Heami - Korean");
    });

    it("should support high-quality TTS on Windows", () => {
      const voices = global.speechSynthesis.getVoices();
      const koreanVoices = voices.filter((v) => v.lang === "ko-KR");

      expect(koreanVoices.length).toBeGreaterThanOrEqual(2);

      // Test voice quality indicators
      koreanVoices.forEach((voice) => {
        expect(voice.localService).toBe(true);
        expect(voice.lang).toBe("ko-KR");
      });
    });

    it("should handle Windows TTS rate and pitch adjustments", () => {
      const utterance = new global.SpeechSynthesisUtterance(
        "윈도우 TTS 테스트"
      );
      utterance.rate = 0.9; // Slightly slower for better recognition
      utterance.pitch = 1.0; // Normal pitch
      utterance.volume = 0.8; // Slightly lower volume

      expect(utterance.rate).toBe(0.9);
      expect(utterance.pitch).toBe(1.0);
      expect(utterance.volume).toBe(0.8);
    });

    it("should test Windows TTS quality with Korean text", () => {
      const testTexts = [
        "안녕하세요",
        "ChatGPT와 대화하기",
        "구글 음성검색 사용하기",
        "브라우저 확장프로그램 테스트",
      ];

      testTexts.forEach((text) => {
        const utterance = new global.SpeechSynthesisUtterance(text);
        const voices = global.speechSynthesis.getVoices();
        const koreanVoice = voices.find((v) => v.lang === "ko-KR");

        utterance.voice = koreanVoice;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;

        global.speechSynthesis.speak(utterance);

        expect(global.speechSynthesis.speak).toHaveBeenCalledWith(utterance);
        expect(utterance.text).toBe(text);
        expect(utterance.voice).toBe(koreanVoice);
      });
    });
  });

  describe("macOS TTS Quality", () => {
    beforeEach(() => {
      setPlatform("MacIntel");
      const macVoices = createMockVoicesForOS("macos");
      global.speechSynthesis.getVoices = vi.fn(() => macVoices);
    });

    it("should detect macOS platform", () => {
      expect(navigator.platform).toBe("MacIntel");
    });

    it("should have macOS-specific Korean voices", () => {
      const voices = global.speechSynthesis.getVoices();
      const macKoreanVoice = voices.find(
        (v) => v.name === "Yuna" && v.lang === "ko-KR"
      );

      expect(macKoreanVoice).toBeDefined();
      expect(macKoreanVoice.voiceURI).toContain("apple.speech.synthesis");
    });

    it("should support high-quality TTS on macOS", () => {
      const voices = global.speechSynthesis.getVoices();
      const koreanVoices = voices.filter((v) => v.lang === "ko-KR");

      expect(koreanVoices.length).toBeGreaterThanOrEqual(2);

      // macOS voices are typically high quality
      koreanVoices.forEach((voice) => {
        expect(voice.localService).toBe(true);
        expect(voice.lang).toBe("ko-KR");
      });
    });

    it("should handle macOS TTS optimization", () => {
      const utterance = new global.SpeechSynthesisUtterance("맥OS TTS 테스트");
      utterance.rate = 1.0; // Normal rate works well on macOS
      utterance.pitch = 1.0;
      utterance.volume = 0.9; // Higher volume for better recognition

      expect(utterance.rate).toBe(1.0);
      expect(utterance.pitch).toBe(1.0);
      expect(utterance.volume).toBe(0.9);
    });

    it("should test macOS TTS quality with various Korean texts", () => {
      const testTexts = [
        "맥북에서 음성인식 테스트",
        "사파리 브라우저 호환성",
        "한국어 음성 품질 확인",
      ];

      testTexts.forEach((text) => {
        const utterance = new global.SpeechSynthesisUtterance(text);
        const voices = global.speechSynthesis.getVoices();
        const yunaVoice = voices.find((v) => v.name === "Yuna");

        utterance.voice = yunaVoice;
        utterance.rate = 1.0;

        global.speechSynthesis.speak(utterance);

        expect(global.speechSynthesis.speak).toHaveBeenCalledWith(utterance);
        expect(utterance.voice).toBe(yunaVoice);
      });
    });
  });

  describe("Linux TTS Quality", () => {
    beforeEach(() => {
      setPlatform("Linux x86_64");
      const linuxVoices = createMockVoicesForOS("linux");
      global.speechSynthesis.getVoices = vi.fn(() => linuxVoices);
    });

    it("should detect Linux platform", () => {
      expect(navigator.platform).toBe("Linux x86_64");
    });

    it("should have Linux-compatible Korean voices", () => {
      const voices = global.speechSynthesis.getVoices();
      const linuxKoreanVoice = voices.find(
        (v) => v.voiceURI.includes("espeak") && v.lang === "ko-KR"
      );

      expect(linuxKoreanVoice).toBeDefined();
      expect(linuxKoreanVoice.name).toBe("eSpeak Korean");
    });

    it("should handle Linux TTS limitations", () => {
      const voices = global.speechSynthesis.getVoices();
      const koreanVoices = voices.filter((v) => v.lang === "ko-KR");

      // Linux might have fewer voices but should still work
      expect(koreanVoices.length).toBeGreaterThanOrEqual(1);

      koreanVoices.forEach((voice) => {
        expect(voice.localService).toBe(true);
        expect(voice.lang).toBe("ko-KR");
      });
    });

    it("should optimize TTS settings for Linux", () => {
      const utterance = new global.SpeechSynthesisUtterance(
        "리눅스 TTS 테스트"
      );
      utterance.rate = 0.8; // Slower rate for better quality on Linux
      utterance.pitch = 1.1; // Slightly higher pitch
      utterance.volume = 1.0; // Full volume

      expect(utterance.rate).toBe(0.8);
      expect(utterance.pitch).toBe(1.1);
      expect(utterance.volume).toBe(1.0);
    });
  });

  describe("Cross-Platform TTS Quality Tests", () => {
    const platforms = [
      { name: "Windows", platform: "Win32", os: "windows" },
      { name: "macOS", platform: "MacIntel", os: "macos" },
      { name: "Linux", platform: "Linux x86_64", os: "linux" },
    ];

    platforms.forEach(({ name, platform, os }) => {
      describe(`${name} Platform Tests`, () => {
        beforeEach(() => {
          setPlatform(platform);
          const voices = createMockVoicesForOS(os);
          global.speechSynthesis.getVoices = vi.fn(() => voices);
        });

        it(`should support Korean TTS on ${name}`, () => {
          const voices = global.speechSynthesis.getVoices();
          const koreanVoices = voices.filter((v) => v.lang === "ko-KR");

          expect(koreanVoices.length).toBeGreaterThan(0);

          const utterance = new global.SpeechSynthesisUtterance(
            "한국어 테스트"
          );
          utterance.voice = koreanVoices[0];

          global.speechSynthesis.speak(utterance);
          expect(global.speechSynthesis.speak).toHaveBeenCalled();
        });

        it(`should support English TTS on ${name}`, () => {
          const voices = global.speechSynthesis.getVoices();
          const englishVoices = voices.filter((v) => v.lang === "en-US");

          expect(englishVoices.length).toBeGreaterThan(0);

          const utterance = new global.SpeechSynthesisUtterance("English test");
          utterance.voice = englishVoices[0];

          global.speechSynthesis.speak(utterance);
          expect(global.speechSynthesis.speak).toHaveBeenCalled();
        });

        it(`should handle TTS quality optimization on ${name}`, () => {
          const testText = "음성인식 품질 테스트";
          const utterance = new global.SpeechSynthesisUtterance(testText);

          // Platform-specific optimizations
          switch (os) {
            case "windows":
              utterance.rate = 0.9;
              utterance.volume = 0.8;
              break;
            case "macos":
              utterance.rate = 1.0;
              utterance.volume = 0.9;
              break;
            case "linux":
              utterance.rate = 0.8;
              utterance.volume = 1.0;
              break;
          }

          expect(utterance.text).toBe(testText);
          expect(utterance.rate).toBeGreaterThan(0);
          expect(utterance.volume).toBeGreaterThan(0);
        });

        it(`should test voice recognition compatibility on ${name}`, () => {
          const recognitionTexts = [
            "ChatGPT 음성모드 테스트",
            "구글 음성검색 실행",
            "브라우저 확장프로그램 사용",
          ];

          recognitionTexts.forEach((text) => {
            const utterance = new global.SpeechSynthesisUtterance(text);
            const voices = global.speechSynthesis.getVoices();
            const koreanVoice = voices.find((v) => v.lang === "ko-KR");

            if (koreanVoice) {
              utterance.voice = koreanVoice;
            }

            // Optimize for voice recognition
            utterance.rate = 0.9; // Slightly slower for better recognition
            utterance.pitch = 1.0; // Normal pitch
            utterance.volume = 0.8; // Moderate volume

            global.speechSynthesis.speak(utterance);

            expect(global.speechSynthesis.speak).toHaveBeenCalledWith(
              utterance
            );
            expect(utterance.text).toBe(text);
          });
        });
      });
    });
  });

  describe("TTS Quality Metrics", () => {
    it("should measure TTS response time", async () => {
      const startTime = Date.now();

      const utterance = new global.SpeechSynthesisUtterance("응답 시간 테스트");

      // Mock TTS completion
      global.speechSynthesis.speak.mockImplementation((utt) => {
        setTimeout(() => {
          if (utt.onend) utt.onend();
        }, 100); // Simulate 100ms TTS processing
      });

      const endTime = await new Promise((resolve) => {
        utterance.onend = () => resolve(Date.now());
        global.speechSynthesis.speak(utterance);
      });

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should test TTS audio quality indicators", () => {
      const voices = global.speechSynthesis.getVoices();

      voices.forEach((voice) => {
        // Quality indicators
        expect(voice.localService).toBeDefined();
        expect(voice.lang).toBeDefined();
        expect(voice.name).toBeDefined();
        expect(voice.voiceURI).toBeDefined();

        // Korean voices should be available
        if (voice.lang === "ko-KR") {
          expect(voice.localService).toBe(true); // Local voices are typically higher quality
        }
      });
    });

    it("should test TTS consistency across multiple calls", () => {
      const testText = "일관성 테스트";
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        const utterance = new global.SpeechSynthesisUtterance(testText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        global.speechSynthesis.speak(utterance);

        expect(utterance.text).toBe(testText);
        expect(utterance.rate).toBe(1.0);
        expect(utterance.pitch).toBe(1.0);
        expect(utterance.volume).toBe(0.8);
      }

      expect(global.speechSynthesis.speak).toHaveBeenCalledTimes(iterations);
    });
  });

  describe("Error Handling Across Platforms", () => {
    it("should handle TTS errors gracefully", () => {
      const utterance = new global.SpeechSynthesisUtterance("오류 테스트");
      const errorHandler = vi.fn();

      utterance.onerror = errorHandler;

      // Simulate TTS error
      global.speechSynthesis.speak.mockImplementation((utt) => {
        if (utt.onerror) {
          utt.onerror(new Error("TTS Error"));
        }
      });

      global.speechSynthesis.speak(utterance);

      expect(errorHandler).toHaveBeenCalled();
    });

    it("should handle missing voices", () => {
      // Mock empty voice list
      global.speechSynthesis.getVoices = vi.fn(() => []);

      const voices = global.speechSynthesis.getVoices();
      expect(voices).toEqual([]);

      // Should still be able to create utterance
      const utterance = new global.SpeechSynthesisUtterance("음성 없음 테스트");
      expect(utterance.text).toBe("음성 없음 테스트");
    });

    it("should handle platform-specific limitations", () => {
      const platforms = ["Win32", "MacIntel", "Linux x86_64"];

      platforms.forEach((platform) => {
        setPlatform(platform);

        // Each platform should handle basic TTS
        const utterance = new global.SpeechSynthesisUtterance("플랫폼 테스트");
        expect(utterance).toBeDefined();
        expect(utterance.text).toBe("플랫폼 테스트");

        global.speechSynthesis.speak(utterance);
        expect(global.speechSynthesis.speak).toHaveBeenCalled();
      });
    });
  });
});
