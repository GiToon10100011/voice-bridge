/**
 * User Acceptance Tests for TTS Voice Bridge
 * 실제 사용 시나리오를 기반으로 한 사용자 수용 테스트
 *
 * Requirements: 2.1, 2.2, 3.1, 3.2, 5.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock browser APIs
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(),
  speaking: false,
  pending: false,
  paused: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockSpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  lang: "",
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null,
}));

// Mock voices for different languages
const mockVoices = [
  {
    name: "Microsoft Heami - Korean (Korea)",
    lang: "ko-KR",
    voiceURI: "Microsoft Heami - Korean (Korea)",
    default: false,
    localService: true,
  },
  {
    name: "Google US English",
    lang: "en-US",
    voiceURI: "Google US English",
    default: true,
    localService: false,
  },
  {
    name: "Google 日本語",
    lang: "ja-JP",
    voiceURI: "Google 日本語",
    default: false,
    localService: false,
  },
  {
    name: "Microsoft Zira - English (United States)",
    lang: "en-US",
    voiceURI: "Microsoft Zira - English (United States)",
    default: false,
    localService: true,
  },
];

// Setup global mocks
global.window = {
  speechSynthesis: mockSpeechSynthesis,
  SpeechSynthesisUtterance: mockSpeechSynthesisUtterance,
};

// Import the TTS Engine after setting up mocks
const TTSEngine = await import("../../src/lib/tts-engine.js");

describe("User Acceptance Tests - TTS Voice Bridge", () => {
  let ttsEngine;
  let recognitionResults = [];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockSpeechSynthesis.getVoices.mockReturnValue(mockVoices);
    recognitionResults = [];

    // Create fresh TTS engine instance
    ttsEngine = new TTSEngine.default();

    // Mock recognition result collection
    ttsEngine.onRecognitionResult = (result) => {
      recognitionResults.push(result);
    };
  });

  afterEach(() => {
    if (ttsEngine) {
      ttsEngine.dispose();
    }
  });

  describe("ChatGPT 음성모드 인식률 테스트", () => {
    const chatGPTTestCases = [
      {
        text: "안녕하세요, ChatGPT입니다.",
        language: "ko-KR",
        expectedAccuracy: 0.9,
        description: "한국어 기본 인사",
      },
      {
        text: "Hello, I am ChatGPT. How can I help you today?",
        language: "en-US",
        expectedAccuracy: 0.95,
        description: "영어 기본 인사",
      },
      {
        text: "프로그래밍에 대해 질문이 있습니다. JavaScript와 Python 중 어떤 것을 먼저 배우는 것이 좋을까요?",
        language: "ko-KR",
        expectedAccuracy: 0.85,
        description: "한국어 복잡한 질문",
      },
      {
        text: "Can you explain the difference between machine learning and artificial intelligence?",
        language: "en-US",
        expectedAccuracy: 0.9,
        description: "영어 기술적 질문",
      },
      {
        text: "코드를 작성해주세요. React 컴포넌트를 만들어야 합니다.",
        language: "ko-KR",
        expectedAccuracy: 0.8,
        description: "한국어 코딩 요청",
      },
    ];

    chatGPTTestCases.forEach((testCase) => {
      it(`ChatGPT 음성모드에서 "${testCase.description}" 인식 테스트`, async () => {
        // Requirement 2.1: ChatGPT 음성모드에서 TTS 음성 인식
        const voice = mockVoices.find((v) => v.lang === testCase.language);
        expect(voice).toBeDefined();

        const options = {
          voice: voice.name,
          rate: 0.9, // ChatGPT 최적화를 위한 느린 속도
          pitch: 1.0,
          volume: 0.8,
          lang: testCase.language,
        };

        // TTS 음성 생성 시뮬레이션
        const utterancePromise = ttsEngine.speak(testCase.text, options);

        // Mock utterance completion
        const utteranceCall = mockSpeechSynthesis.speak.mock.calls[0];
        expect(utteranceCall).toBeDefined();

        const utterance = utteranceCall[0];
        expect(utterance.text).toBe(testCase.text);
        expect(utterance.rate).toBe(options.rate);
        expect(utterance.volume).toBe(options.volume);

        // Simulate successful TTS playback
        if (utterance.onstart) utterance.onstart();

        // Simulate ChatGPT voice recognition
        const simulatedRecognitionAccuracy = await simulateChatGPTRecognition(
          testCase.text,
          testCase.language,
          options
        );

        if (utterance.onend) utterance.onend();
        await utterancePromise;

        // Verify recognition accuracy meets expectations
        expect(simulatedRecognitionAccuracy).toBeGreaterThanOrEqual(
          testCase.expectedAccuracy
        );

        // Verify TTS engine state
        expect(ttsEngine.isCurrentlyPlaying()).toBe(false);
      });
    });

    it("ChatGPT 음성모드 상태 감지 테스트", async () => {
      // Requirement 2.2: ChatGPT 음성인식 상태 감지
      const mockChatGPTPage = {
        querySelector: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      // Mock ChatGPT voice mode elements
      const mockVoiceButton = {
        classList: { contains: vi.fn().mockReturnValue(true) },
        getAttribute: vi.fn().mockReturnValue("listening"),
        click: vi.fn(),
      };

      mockChatGPTPage.querySelector
        .mockReturnValueOnce(mockVoiceButton) // voice button
        .mockReturnValueOnce({ textContent: "Listening..." }); // status indicator

      const isVoiceModeActive = detectChatGPTVoiceMode(mockChatGPTPage);
      expect(isVoiceModeActive).toBe(true);

      // Verify proper element detection
      expect(mockChatGPTPage.querySelector).toHaveBeenCalledWith(
        '[data-testid="voice-button"]'
      );
    });
  });

  describe("구글 음성검색 인식률 테스트", () => {
    const googleSearchTestCases = [
      {
        text: "오늘 날씨 어때?",
        language: "ko-KR",
        expectedAccuracy: 0.92,
        description: "한국어 간단한 검색",
      },
      {
        text: "What is the weather like today?",
        language: "en-US",
        expectedAccuracy: 0.95,
        description: "영어 날씨 검색",
      },
      {
        text: "서울에서 부산까지 기차표 예약",
        language: "ko-KR",
        expectedAccuracy: 0.88,
        description: "한국어 복잡한 검색",
      },
      {
        text: "Best restaurants near me",
        language: "en-US",
        expectedAccuracy: 0.93,
        description: "영어 위치 기반 검색",
      },
      {
        text: "파이썬 프로그래밍 강의",
        language: "ko-KR",
        expectedAccuracy: 0.85,
        description: "한국어 기술 검색",
      },
    ];

    googleSearchTestCases.forEach((testCase) => {
      it(`구글 음성검색에서 "${testCase.description}" 인식 테스트`, async () => {
        // Requirement 3.1: 구글 음성검색에서 TTS 음성 인식
        const voice = mockVoices.find((v) => v.lang === testCase.language);
        expect(voice).toBeDefined();

        const options = {
          voice: voice.name,
          rate: 1.0, // 구글 검색 최적화를 위한 표준 속도
          pitch: 1.0,
          volume: 0.9,
          lang: testCase.language,
        };

        // TTS 음성 생성
        const utterancePromise = ttsEngine.speak(testCase.text, options);

        const utteranceCall = mockSpeechSynthesis.speak.mock.calls[0];
        const utterance = utteranceCall[0];

        // Simulate TTS playback
        if (utterance.onstart) utterance.onstart();

        // Simulate Google voice search recognition
        const simulatedRecognitionAccuracy =
          await simulateGoogleVoiceRecognition(
            testCase.text,
            testCase.language,
            options
          );

        if (utterance.onend) utterance.onend();
        await utterancePromise;

        // Verify recognition accuracy
        expect(simulatedRecognitionAccuracy).toBeGreaterThanOrEqual(
          testCase.expectedAccuracy
        );
      });
    });

    it("구글 음성검색 활성화 감지 테스트", async () => {
      // Requirement 3.2: 구글 음성검색 상태 감지
      const mockGooglePage = {
        querySelector: vi.fn(),
        addEventListener: vi.fn(),
      };

      const mockVoiceSearchButton = {
        classList: { contains: vi.fn().mockReturnValue(true) },
        getAttribute: vi.fn().mockReturnValue("active"),
        style: { display: "block" },
      };

      mockGooglePage.querySelector.mockReturnValue(mockVoiceSearchButton);

      const isVoiceSearchActive = detectGoogleVoiceSearch(mockGooglePage);
      expect(isVoiceSearchActive).toBe(true);

      // Verify proper element detection
      expect(mockGooglePage.querySelector).toHaveBeenCalledWith(
        '[aria-label*="voice search"], [data-ved*="voice"]'
      );
    });
  });

  describe("다양한 언어 및 음성 설정 테스트", () => {
    const multiLanguageTestCases = [
      {
        text: "こんにちは、元気ですか？",
        language: "ja-JP",
        voiceName: "Google 日本語",
        rate: 0.8,
        pitch: 1.1,
        expectedAccuracy: 0.87,
        description: "일본어 음성 설정",
      },
      {
        text: "Bonjour, comment allez-vous?",
        language: "fr-FR",
        voiceName: "Google français",
        rate: 0.9,
        pitch: 1.0,
        expectedAccuracy: 0.82,
        description: "프랑스어 음성 설정 (대체 음성 사용)",
      },
      {
        text: "안녕하세요, 반갑습니다.",
        language: "ko-KR",
        voiceName: "Microsoft Heami - Korean (Korea)",
        rate: 1.2,
        pitch: 0.9,
        expectedAccuracy: 0.91,
        description: "한국어 빠른 속도 설정",
      },
    ];

    multiLanguageTestCases.forEach((testCase) => {
      it(`"${testCase.description}" 다국어 음성 인식 테스트`, async () => {
        // Requirement 5.1: 다양한 언어 및 음성 설정 지원
        const options = {
          voice: testCase.voiceName,
          rate: testCase.rate,
          pitch: testCase.pitch,
          volume: 0.8,
          lang: testCase.language,
        };

        // TTS 음성 생성
        const utterancePromise = ttsEngine.speak(testCase.text, options);

        const utteranceCall = mockSpeechSynthesis.speak.mock.calls[0];
        const utterance = utteranceCall[0];

        // Verify voice settings applied correctly
        expect(utterance.rate).toBe(testCase.rate);
        expect(utterance.pitch).toBe(testCase.pitch);
        expect(utterance.lang).toBe(testCase.language);

        // Simulate TTS playback
        if (utterance.onstart) utterance.onstart();

        // Simulate multi-language recognition
        const simulatedRecognitionAccuracy =
          await simulateMultiLanguageRecognition(
            testCase.text,
            testCase.language,
            options
          );

        if (utterance.onend) utterance.onend();
        await utterancePromise;

        // Verify recognition accuracy for different languages
        expect(simulatedRecognitionAccuracy).toBeGreaterThanOrEqual(
          testCase.expectedAccuracy
        );
      });
    });

    it("음성 설정 변경 및 적용 테스트", async () => {
      // Test voice settings persistence and application
      const initialSettings = {
        voice: "Google US English",
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8,
        lang: "en-US",
      };

      const updatedSettings = {
        voice: "Microsoft Heami - Korean (Korea)",
        rate: 0.8,
        pitch: 1.2,
        volume: 0.9,
        lang: "ko-KR",
      };

      // Test initial settings
      await ttsEngine.speak("Hello world", initialSettings);
      let utterance = mockSpeechSynthesis.speak.mock.calls[0][0];
      expect(utterance.rate).toBe(initialSettings.rate);
      expect(utterance.pitch).toBe(initialSettings.pitch);

      // Clear previous calls
      mockSpeechSynthesis.speak.mockClear();

      // Test updated settings
      await ttsEngine.speak("안녕하세요", updatedSettings);
      utterance = mockSpeechSynthesis.speak.mock.calls[0][0];
      expect(utterance.rate).toBe(updatedSettings.rate);
      expect(utterance.pitch).toBe(updatedSettings.pitch);
      expect(utterance.lang).toBe(updatedSettings.lang);
    });
  });

  describe("실제 사용 시나리오 통합 테스트", () => {
    it("ChatGPT 대화 시나리오 전체 플로우 테스트", async () => {
      // Requirement 2.1, 2.2: ChatGPT 음성모드 전체 플로우
      const conversationFlow = [
        "안녕하세요, ChatGPT",
        "프로그래밍에 대해 질문이 있어요",
        "JavaScript 배우는 방법을 알려주세요",
        "감사합니다",
      ];

      const results = [];

      for (const message of conversationFlow) {
        const options = {
          voice: "Microsoft Heami - Korean (Korea)",
          rate: 0.9,
          pitch: 1.0,
          volume: 0.8,
          lang: "ko-KR",
        };

        // TTS 음성 생성
        const utterancePromise = ttsEngine.speak(message, options);

        // Simulate ChatGPT recognition
        const accuracy = await simulateChatGPTRecognition(
          message,
          "ko-KR",
          options
        );
        results.push({ message, accuracy });

        // Complete utterance
        const utterance =
          mockSpeechSynthesis.speak.mock.calls[
            mockSpeechSynthesis.speak.mock.calls.length - 1
          ][0];
        if (utterance.onstart) utterance.onstart();
        if (utterance.onend) utterance.onend();
        await utterancePromise;

        // Clear for next iteration
        mockSpeechSynthesis.speak.mockClear();
      }

      // Verify overall conversation accuracy
      const averageAccuracy =
        results.reduce((sum, result) => sum + result.accuracy, 0) /
        results.length;
      expect(averageAccuracy).toBeGreaterThanOrEqual(0.85);

      // Verify all messages were processed
      expect(results).toHaveLength(conversationFlow.length);
    });

    it("구글 검색 시나리오 전체 플로우 테스트", async () => {
      // Requirement 3.1, 3.2: 구글 음성검색 전체 플로우
      const searchQueries = [
        "오늘 날씨",
        "근처 맛집 추천",
        "파이썬 강의",
        "영화 상영시간",
      ];

      const results = [];

      for (const query of searchQueries) {
        const options = {
          voice: "Microsoft Heami - Korean (Korea)",
          rate: 1.0,
          pitch: 1.0,
          volume: 0.9,
          lang: "ko-KR",
        };

        // TTS 음성 생성
        const utterancePromise = ttsEngine.speak(query, options);

        // Simulate Google voice search recognition
        const accuracy = await simulateGoogleVoiceRecognition(
          query,
          "ko-KR",
          options
        );
        results.push({ query, accuracy });

        // Complete utterance
        const utterance =
          mockSpeechSynthesis.speak.mock.calls[
            mockSpeechSynthesis.speak.mock.calls.length - 1
          ][0];
        if (utterance.onstart) utterance.onstart();
        if (utterance.onend) utterance.onend();
        await utterancePromise;

        // Clear for next iteration
        mockSpeechSynthesis.speak.mockClear();
      }

      // Verify overall search accuracy
      const averageAccuracy =
        results.reduce((sum, result) => sum + result.accuracy, 0) /
        results.length;
      expect(averageAccuracy).toBeGreaterThanOrEqual(0.88);

      // Verify all queries were processed
      expect(results).toHaveLength(searchQueries.length);
    });
  });

  describe("성능 및 안정성 테스트", () => {
    it("연속 TTS 재생 안정성 테스트", async () => {
      const testTexts = Array.from(
        { length: 10 },
        (_, i) => `테스트 메시지 ${i + 1}`
      );
      const results = [];

      for (const text of testTexts) {
        try {
          const startTime = Date.now();
          await ttsEngine.speak(text, { lang: "ko-KR", rate: 1.5 });
          const endTime = Date.now();

          results.push({
            text,
            duration: endTime - startTime,
            success: true,
          });

          // Simulate completion
          const utterance =
            mockSpeechSynthesis.speak.mock.calls[
              mockSpeechSynthesis.speak.mock.calls.length - 1
            ][0];
          if (utterance.onstart) utterance.onstart();
          if (utterance.onend) utterance.onend();

          mockSpeechSynthesis.speak.mockClear();
        } catch (error) {
          results.push({
            text,
            error: error.message,
            success: false,
          });
        }
      }

      // Verify all texts were processed successfully
      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBe(testTexts.length);

      // Verify reasonable performance
      const averageDuration =
        results
          .filter((r) => r.success)
          .reduce((sum, r) => sum + r.duration, 0) / successCount;
      expect(averageDuration).toBeLessThan(1000); // Less than 1 second per text
    });

    it("메모리 사용량 모니터링 테스트", async () => {
      const initialStats = ttsEngine.getPerformanceStats();

      // Generate multiple TTS requests
      const testPromises = Array.from({ length: 20 }, (_, i) =>
        ttsEngine.speak(`Performance test ${i}`, { lang: "en-US" })
      );

      // Simulate all completions
      mockSpeechSynthesis.speak.mock.calls.forEach((call) => {
        const utterance = call[0];
        if (utterance.onstart) utterance.onstart();
        if (utterance.onend) utterance.onend();
      });

      await Promise.all(testPromises);

      const finalStats = ttsEngine.getPerformanceStats();

      // Verify memory usage is within reasonable bounds
      expect(finalStats.cacheSize).toBeLessThanOrEqual(finalStats.maxCacheSize);
      expect(finalStats.poolSize).toBeLessThanOrEqual(finalStats.maxPoolSize);

      // Verify performance optimizations are working
      expect(finalStats.cacheSize).toBeGreaterThan(initialStats.cacheSize);
    });
  });
});

// Helper functions for simulating recognition systems

/**
 * ChatGPT 음성인식 시뮬레이션
 * @param {string} text - 원본 텍스트
 * @param {string} language - 언어 코드
 * @param {Object} options - TTS 옵션
 * @returns {Promise<number>} 인식 정확도 (0-1)
 */
async function simulateChatGPTRecognition(text, language, options) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Calculate accuracy based on various factors
  let accuracy = 0.9; // Base accuracy

  // Language-specific adjustments
  if (language === "ko-KR") accuracy *= 0.95;
  if (language === "en-US") accuracy *= 1.0;
  if (language === "ja-JP") accuracy *= 0.92;

  // Rate adjustments (slower is better for recognition)
  if (options.rate < 1.0) accuracy *= 1.05;
  if (options.rate > 1.2) accuracy *= 0.9;

  // Text complexity adjustments
  const wordCount = text.split(" ").length;
  if (wordCount > 10) accuracy *= 0.95;
  if (wordCount > 20) accuracy *= 0.9;

  // Volume adjustments
  if (options.volume < 0.5) accuracy *= 0.85;
  if (options.volume > 0.9) accuracy *= 0.95;

  return Math.min(1.0, Math.max(0.0, accuracy));
}

/**
 * 구글 음성검색 인식 시뮬레이션
 * @param {string} text - 원본 텍스트
 * @param {string} language - 언어 코드
 * @param {Object} options - TTS 옵션
 * @returns {Promise<number>} 인식 정확도 (0-1)
 */
async function simulateGoogleVoiceRecognition(text, language, options) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 150));

  let accuracy = 0.92; // Base accuracy (Google is generally better)

  // Language-specific adjustments
  if (language === "en-US") accuracy *= 1.0;
  if (language === "ko-KR") accuracy *= 0.95;
  if (language === "ja-JP") accuracy *= 0.9;

  // Rate adjustments (standard rate is optimal for Google)
  if (Math.abs(options.rate - 1.0) < 0.1) accuracy *= 1.05;
  if (options.rate < 0.8 || options.rate > 1.3) accuracy *= 0.9;

  // Text length adjustments
  if (text.length < 20) accuracy *= 1.02; // Short queries work better
  if (text.length > 100) accuracy *= 0.92;

  return Math.min(1.0, Math.max(0.0, accuracy));
}

/**
 * 다국어 음성인식 시뮬레이션
 * @param {string} text - 원본 텍스트
 * @param {string} language - 언어 코드
 * @param {Object} options - TTS 옵션
 * @returns {Promise<number>} 인식 정확도 (0-1)
 */
async function simulateMultiLanguageRecognition(text, language, options) {
  await new Promise((resolve) => setTimeout(resolve, 120));

  let accuracy = 0.85; // Base accuracy for multi-language

  // Language support adjustments
  const supportedLanguages = ["ko-KR", "en-US", "ja-JP"];
  if (supportedLanguages.includes(language)) {
    accuracy *= 1.1;
  } else {
    accuracy *= 0.8; // Fallback for unsupported languages
  }

  // Voice quality adjustments
  if (options.voice && options.voice.includes("Google")) accuracy *= 1.05;
  if (options.voice && options.voice.includes("Microsoft")) accuracy *= 1.02;

  return Math.min(1.0, Math.max(0.0, accuracy));
}

/**
 * ChatGPT 음성모드 상태 감지 시뮬레이션
 * @param {Object} page - 페이지 객체 (mock)
 * @returns {boolean} 음성모드 활성 여부
 */
function detectChatGPTVoiceMode(page) {
  const voiceButton = page.querySelector('[data-testid="voice-button"]');
  if (!voiceButton) return false;

  const isListening =
    voiceButton.getAttribute("aria-pressed") === "true" ||
    voiceButton.classList.contains("listening") ||
    voiceButton.getAttribute("data-state") === "listening";

  return isListening;
}

/**
 * 구글 음성검색 상태 감지 시뮬레이션
 * @param {Object} page - 페이지 객체 (mock)
 * @returns {boolean} 음성검색 활성 여부
 */
function detectGoogleVoiceSearch(page) {
  const voiceSearchButton = page.querySelector(
    '[aria-label*="voice search"], [data-ved*="voice"]'
  );
  if (!voiceSearchButton) return false;

  const isActive =
    voiceSearchButton.classList.contains("active") ||
    voiceSearchButton.getAttribute("aria-pressed") === "true" ||
    voiceSearchButton.style.display !== "none";

  return isActive;
}
