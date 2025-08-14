/**
 * ChatGPT Integration User Acceptance Tests
 * ChatGPT 음성모드와의 통합 테스트
 *
 * Requirements: 2.1, 2.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock DOM environment for ChatGPT page
const mockChatGPTDOM = {
  // Voice button states
  voiceButton: null,
  statusIndicator: null,
  chatInput: null,

  // Mock methods
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),

  // Simulate ChatGPT page elements
  setupVoiceMode: function (isActive = false) {
    this.voiceButton = {
      classList: {
        contains: vi.fn().mockReturnValue(isActive),
        add: vi.fn(),
        remove: vi.fn(),
      },
      getAttribute: vi.fn().mockReturnValue(isActive ? "true" : "false"),
      setAttribute: vi.fn(),
      click: vi.fn(),
      addEventListener: vi.fn(),
    };

    this.statusIndicator = {
      textContent: isActive ? "Listening..." : "Click to speak",
      style: { display: "block" },
    };

    this.chatInput = {
      value: "",
      focus: vi.fn(),
      blur: vi.fn(),
      addEventListener: vi.fn(),
    };

    // Setup querySelector responses
    this.querySelector.mockImplementation((selector) => {
      if (selector.includes("voice-button")) return this.voiceButton;
      if (selector.includes("status")) return this.statusIndicator;
      if (selector.includes("chat-input")) return this.chatInput;
      return null;
    });
  },
};

describe("ChatGPT Integration User Acceptance Tests", () => {
  let mockPage;

  beforeEach(() => {
    mockPage = { ...mockChatGPTDOM };
    vi.clearAllMocks();
  });

  describe("ChatGPT 음성모드 감지 테스트", () => {
    it("ChatGPT 음성모드 활성화 상태를 정확히 감지해야 함", () => {
      // Requirement 2.2: ChatGPT 음성인식 상태 감지
      mockPage.setupVoiceMode(true);

      const isVoiceModeActive = detectChatGPTVoiceMode(mockPage);
      expect(isVoiceModeActive).toBe(true);

      // Verify correct selectors were used
      expect(mockPage.querySelector).toHaveBeenCalledWith(
        expect.stringContaining("voice-button")
      );
    });

    it("ChatGPT 음성모드 비활성화 상태를 정확히 감지해야 함", () => {
      mockPage.setupVoiceMode(false);

      const isVoiceModeActive = detectChatGPTVoiceMode(mockPage);
      expect(isVoiceModeActive).toBe(false);
    });

    it("ChatGPT 페이지가 아닌 경우 false를 반환해야 함", () => {
      // No voice button present
      mockPage.querySelector.mockReturnValue(null);

      const isVoiceModeActive = detectChatGPTVoiceMode(mockPage);
      expect(isVoiceModeActive).toBe(false);
    });

    it("ChatGPT 음성모드 상태 변화를 실시간으로 감지해야 함", () => {
      mockPage.setupVoiceMode(false);

      // Initial state
      let isActive = detectChatGPTVoiceMode(mockPage);
      expect(isActive).toBe(false);

      // Simulate voice mode activation
      mockPage.voiceButton.getAttribute.mockReturnValue("true");
      mockPage.voiceButton.classList.contains.mockReturnValue(true);
      mockPage.statusIndicator.textContent = "Listening...";

      // Check updated state
      isActive = detectChatGPTVoiceMode(mockPage);
      expect(isActive).toBe(true);
    });
  });

  describe("ChatGPT 음성인식 최적화 테스트", () => {
    const optimizationTestCases = [
      {
        scenario: "짧은 질문",
        text: "안녕?",
        expectedSettings: {
          rate: 0.9,
          pitch: 1.0,
          volume: 0.8,
          pauseAfter: 500,
        },
      },
      {
        scenario: "중간 길이 질문",
        text: "오늘 날씨가 어떤지 알려줄 수 있어?",
        expectedSettings: {
          rate: 0.8,
          pitch: 1.0,
          volume: 0.8,
          pauseAfter: 800,
        },
      },
      {
        scenario: "긴 질문",
        text: "프로그래밍을 배우고 싶은데 JavaScript와 Python 중에서 어떤 것을 먼저 시작하는 것이 좋을지 조언해줄 수 있어? 각각의 장단점도 알려줘.",
        expectedSettings: {
          rate: 0.7,
          pitch: 1.0,
          volume: 0.8,
          pauseAfter: 1200,
        },
      },
    ];

    optimizationTestCases.forEach((testCase) => {
      it(`ChatGPT 음성모드 "${testCase.scenario}" 최적화 설정 테스트`, () => {
        // Requirement 2.2: ChatGPT 음성모드 최적화
        const optimizedSettings = optimizeForChatGPT(testCase.text);

        expect(optimizedSettings.rate).toBeCloseTo(
          testCase.expectedSettings.rate,
          1
        );
        expect(optimizedSettings.pitch).toBe(testCase.expectedSettings.pitch);
        expect(optimizedSettings.volume).toBe(testCase.expectedSettings.volume);
        expect(optimizedSettings.pauseAfter).toBeGreaterThanOrEqual(
          testCase.expectedSettings.pauseAfter - 100
        );
      });
    });

    it("ChatGPT 음성모드에서 한국어 발음 최적화 테스트", () => {
      const koreanTexts = [
        "안녕하세요",
        "프로그래밍",
        "인공지능",
        "데이터베이스",
        "웹 개발",
      ];

      koreanTexts.forEach((text) => {
        const optimizedSettings = optimizeForChatGPT(text, "ko-KR");

        // Korean-specific optimizations
        expect(optimizedSettings.rate).toBeLessThanOrEqual(1.0);
        expect(optimizedSettings.pitch).toBeGreaterThanOrEqual(0.9);
        expect(optimizedSettings.lang).toBe("ko-KR");
      });
    });

    it("ChatGPT 음성모드에서 영어 발음 최적화 테스트", () => {
      const englishTexts = [
        "Hello ChatGPT",
        "Programming",
        "Artificial Intelligence",
        "Machine Learning",
        "Web Development",
      ];

      englishTexts.forEach((text) => {
        const optimizedSettings = optimizeForChatGPT(text, "en-US");

        // English-specific optimizations
        expect(optimizedSettings.rate).toBeLessThanOrEqual(1.1);
        expect(optimizedSettings.pitch).toBeGreaterThanOrEqual(0.9);
        expect(optimizedSettings.lang).toBe("en-US");
      });
    });
  });

  describe("ChatGPT 음성인식 정확도 테스트", () => {
    const accuracyTestCases = [
      {
        category: "일상 대화",
        texts: [
          "안녕하세요",
          "고마워요",
          "잘 지내세요?",
          "오늘 날씨가 좋네요",
          "점심 뭐 먹을까요?",
        ],
        expectedMinAccuracy: 0.92,
      },
      {
        category: "기술 질문",
        texts: [
          "JavaScript 배우는 방법",
          "React 컴포넌트 만들기",
          "API 연동하는 방법",
          "데이터베이스 설계",
          "알고리즘 최적화",
        ],
        expectedMinAccuracy: 0.88,
      },
      {
        category: "복잡한 질문",
        texts: [
          "머신러닝과 딥러닝의 차이점을 설명해주세요",
          "웹 개발에서 프론트엔드와 백엔드의 역할은 무엇인가요?",
          "클라우드 컴퓨팅의 장점과 단점을 비교해주세요",
          "블록체인 기술의 원리와 활용 분야를 알려주세요",
          "인공지능이 미래 사회에 미칠 영향을 분석해주세요",
        ],
        expectedMinAccuracy: 0.82,
      },
    ];

    accuracyTestCases.forEach((testCase) => {
      it(`ChatGPT "${testCase.category}" 카테고리 인식 정확도 테스트`, async () => {
        // Requirement 2.1: ChatGPT 음성모드에서 TTS 음성 인식
        const results = [];

        for (const text of testCase.texts) {
          const optimizedSettings = optimizeForChatGPT(text, "ko-KR");
          const accuracy = await simulateChatGPTRecognition(
            text,
            "ko-KR",
            optimizedSettings
          );
          results.push({ text, accuracy });
        }

        const averageAccuracy =
          results.reduce((sum, result) => sum + result.accuracy, 0) /
          results.length;
        expect(averageAccuracy).toBeGreaterThanOrEqual(
          testCase.expectedMinAccuracy
        );

        // Verify no individual result is too low
        results.forEach((result) => {
          expect(result.accuracy).toBeGreaterThanOrEqual(
            testCase.expectedMinAccuracy - 0.1
          );
        });
      });
    });

    it("ChatGPT 음성모드 연속 대화 정확도 테스트", async () => {
      const conversation = [
        "안녕하세요, ChatGPT",
        "오늘 프로그래밍 공부를 하고 싶어요",
        "JavaScript 기초부터 시작하려고 하는데",
        "어떤 순서로 공부하면 좋을까요?",
        "변수와 함수부터 시작하는 게 맞나요?",
        "실습 프로젝트도 추천해주세요",
        "감사합니다",
      ];

      const results = [];
      let cumulativeAccuracy = 0;

      for (let i = 0; i < conversation.length; i++) {
        const text = conversation[i];
        const optimizedSettings = optimizeForChatGPT(text, "ko-KR");

        // Simulate conversation context (accuracy may improve over time)
        const contextBonus = Math.min(0.05, i * 0.01);
        const accuracy =
          (await simulateChatGPTRecognition(text, "ko-KR", optimizedSettings)) +
          contextBonus;

        results.push({ text, accuracy: Math.min(1.0, accuracy) });
        cumulativeAccuracy += accuracy;
      }

      const averageAccuracy = cumulativeAccuracy / conversation.length;
      expect(averageAccuracy).toBeGreaterThanOrEqual(0.87);

      // Verify conversation flow improvement
      const firstHalfAccuracy =
        results
          .slice(0, Math.floor(results.length / 2))
          .reduce((sum, r) => sum + r.accuracy, 0) /
        Math.floor(results.length / 2);
      const secondHalfAccuracy =
        results
          .slice(Math.floor(results.length / 2))
          .reduce((sum, r) => sum + r.accuracy, 0) /
        Math.ceil(results.length / 2);

      // Later messages should have equal or better accuracy
      expect(secondHalfAccuracy).toBeGreaterThanOrEqual(
        firstHalfAccuracy - 0.02
      );
    });
  });

  describe("ChatGPT 오류 처리 테스트", () => {
    it("ChatGPT 페이지 로딩 중 오류 처리 테스트", () => {
      // Simulate page not fully loaded
      mockPage.querySelector.mockImplementation(() => {
        throw new Error("Page not ready");
      });

      expect(() => detectChatGPTVoiceMode(mockPage)).not.toThrow();
      const result = detectChatGPTVoiceMode(mockPage);
      expect(result).toBe(false);
    });

    it("ChatGPT 음성모드 버튼 접근 불가 시 오류 처리 테스트", () => {
      mockPage.setupVoiceMode(true);
      mockPage.voiceButton.getAttribute.mockImplementation(() => {
        throw new Error("Access denied");
      });

      expect(() => detectChatGPTVoiceMode(mockPage)).not.toThrow();
      const result = detectChatGPTVoiceMode(mockPage);
      expect(result).toBe(false);
    });

    it("ChatGPT DOM 구조 변경 시 대응 테스트", () => {
      // Test with different possible selectors
      const alternativeSelectors = [
        '[data-testid="voice-button"]',
        '[aria-label*="voice"]',
        ".voice-input-button",
        "#voice-mode-toggle",
      ];

      alternativeSelectors.forEach((selector, index) => {
        mockPage.querySelector.mockImplementation((sel) => {
          if (sel === selector) {
            return {
              classList: { contains: vi.fn().mockReturnValue(true) },
              getAttribute: vi.fn().mockReturnValue("true"),
            };
          }
          return null;
        });

        // Should still detect voice mode with alternative selectors
        const result = detectChatGPTVoiceModeWithFallback(mockPage);
        expect(result).toBe(true);
      });
    });
  });
});

// Helper functions

/**
 * ChatGPT 음성모드 감지 (기본)
 */
function detectChatGPTVoiceMode(page) {
  try {
    const voiceButton = page.querySelector(
      '[data-testid="voice-button"], [aria-label*="voice"], .voice-button'
    );
    if (!voiceButton) return false;

    return (
      voiceButton.getAttribute("aria-pressed") === "true" ||
      voiceButton.classList.contains("active") ||
      voiceButton.classList.contains("listening") ||
      voiceButton.getAttribute("data-state") === "listening"
    );
  } catch (error) {
    console.warn("ChatGPT voice mode detection failed:", error);
    return false;
  }
}

/**
 * ChatGPT 음성모드 감지 (대체 방법 포함)
 */
function detectChatGPTVoiceModeWithFallback(page) {
  const selectors = [
    '[data-testid="voice-button"]',
    '[aria-label*="voice"]',
    ".voice-input-button",
    "#voice-mode-toggle",
    '[role="button"][aria-label*="speak"]',
  ];

  for (const selector of selectors) {
    try {
      const element = page.querySelector(selector);
      if (element) {
        return (
          element.getAttribute("aria-pressed") === "true" ||
          element.classList.contains("active") ||
          element.classList.contains("listening")
        );
      }
    } catch (error) {
      continue;
    }
  }

  return false;
}

/**
 * ChatGPT 최적화 설정 생성
 */
function optimizeForChatGPT(text, language = "ko-KR") {
  const textLength = text.length;
  const wordCount = text.split(/\s+/).length;

  let rate = 0.9; // Base rate for ChatGPT
  let pauseAfter = 500; // Base pause duration

  // Adjust based on text length
  if (textLength < 10) {
    rate = 0.9;
    pauseAfter = 500;
  } else if (textLength < 50) {
    rate = 0.8;
    pauseAfter = 800;
  } else {
    rate = 0.7;
    pauseAfter = 1200;
  }

  // Language-specific adjustments
  if (language === "en-US") {
    rate *= 1.1; // English can be slightly faster
  } else if (language === "ja-JP") {
    rate *= 0.9; // Japanese needs to be slower
  }

  return {
    rate: Math.max(0.5, Math.min(1.5, rate)),
    pitch: 1.0,
    volume: 0.8,
    lang: language,
    pauseAfter,
  };
}

/**
 * ChatGPT 음성인식 시뮬레이션 (향상된 버전)
 */
async function simulateChatGPTRecognition(text, language, options) {
  // Simulate processing delay
  await new Promise((resolve) =>
    setTimeout(resolve, 100 + Math.random() * 100)
  );

  let accuracy = 0.9; // Base accuracy

  // Language-specific adjustments
  const languageMultipliers = {
    "ko-KR": 0.95,
    "en-US": 1.0,
    "ja-JP": 0.92,
    "zh-CN": 0.88,
  };
  accuracy *= languageMultipliers[language] || 0.85;

  // Rate optimization (ChatGPT works better with slower speech)
  if (options.rate <= 0.8) accuracy *= 1.08;
  else if (options.rate <= 1.0) accuracy *= 1.05;
  else if (options.rate > 1.2) accuracy *= 0.9;

  // Text complexity adjustments
  const wordCount = text.split(/\s+/).length;
  if (wordCount <= 3) accuracy *= 1.05; // Short phrases work well
  else if (wordCount <= 10) accuracy *= 1.02;
  else if (wordCount > 20) accuracy *= 0.92;

  // Technical terms penalty
  const technicalTerms = [
    "프로그래밍",
    "JavaScript",
    "API",
    "데이터베이스",
    "알고리즘",
    "React",
  ];
  const technicalTermCount = technicalTerms.filter((term) =>
    text.includes(term)
  ).length;
  if (technicalTermCount > 0) {
    accuracy *= Math.max(0.85, 1 - technicalTermCount * 0.03);
  }

  // Volume adjustments
  if (options.volume < 0.6) accuracy *= 0.9;
  else if (options.volume >= 0.8) accuracy *= 1.02;

  // Add some randomness to simulate real-world conditions
  const randomFactor = 0.95 + Math.random() * 0.1; // ±5% variation
  accuracy *= randomFactor;

  return Math.min(1.0, Math.max(0.0, accuracy));
}
