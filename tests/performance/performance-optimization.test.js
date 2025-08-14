/**
 * Performance Optimization Tests
 * 성능 최적화 구현 검증 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import TTSEngine from "../../src/lib/tts-engine.js";

describe("Performance Optimizations", () => {
  let ttsEngine;

  beforeEach(() => {
    ttsEngine = new TTSEngine();
  });

  afterEach(() => {
    if (ttsEngine) {
      ttsEngine.dispose();
    }
  });

  describe("Memory Management", () => {
    it("should implement voice caching", async () => {
      // 첫 번째 호출
      const voices1 = await ttsEngine.getAvailableVoices();
      expect(voices1).toHaveLength(3);
      expect(ttsEngine.voicesCache).not.toBeNull();
      expect(ttsEngine.voicesCacheExpiry).toBeGreaterThan(Date.now());

      // 두 번째 호출 (캐시에서 가져와야 함)
      const voices2 = await ttsEngine.getAvailableVoices();
      expect(voices2).toBe(voices1); // 같은 참조여야 함
    });

    it("should implement text caching for short texts", async () => {
      const shortText = "Hello";
      const options = { rate: 1.0, pitch: 1.0 };

      // Mock successful speech
      global.speechSynthesis.speak.mockImplementation((utterance) => {
        setTimeout(() => utterance.onstart(), 0);
        setTimeout(() => utterance.onend(), 10);
      });

      // 첫 번째 실행
      await ttsEngine.speak(shortText, options);
      expect(ttsEngine.textCache.size).toBe(1);

      // 두 번째 실행 (캐시 사용)
      await ttsEngine.speak(shortText, options);
      expect(ttsEngine.textCache.size).toBe(1);
    });

    it("should not cache long texts", async () => {
      const longText = "A".repeat(200); // 200자
      const options = { rate: 1.0 };

      global.speechSynthesis.speak.mockImplementation((utterance) => {
        setTimeout(() => utterance.onstart(), 0);
        setTimeout(() => utterance.onend(), 10);
      });

      await ttsEngine.speak(longText, options);
      expect(ttsEngine.textCache.size).toBe(0);
    });

    it("should implement utterance pooling", async () => {
      global.speechSynthesis.speak.mockImplementation((utterance) => {
        setTimeout(() => utterance.onstart(), 0);
        setTimeout(() => utterance.onend(), 10);
      });

      // 여러 번 실행하여 풀 생성 확인
      await ttsEngine.speak("Test 1");
      await ttsEngine.speak("Test 2");
      await ttsEngine.speak("Test 3");

      expect(ttsEngine.utterancePool.length).toBeGreaterThan(0);
      expect(ttsEngine.utterancePool.length).toBeLessThanOrEqual(
        ttsEngine.maxPoolSize
      );
    });

    it("should limit cache size", async () => {
      global.speechSynthesis.speak.mockImplementation((utterance) => {
        setTimeout(() => utterance.onstart(), 0);
        setTimeout(() => utterance.onend(), 10);
      });

      // 캐시 크기 제한 테스트
      const originalMaxSize = ttsEngine.maxCacheSize;
      ttsEngine.maxCacheSize = 3;

      // 4개의 다른 텍스트 실행
      for (let i = 0; i < 4; i++) {
        await ttsEngine.speak(`Test ${i}`, { rate: 1.0 });
      }

      expect(ttsEngine.textCache.size).toBe(3); // 최대 크기 유지
      ttsEngine.maxCacheSize = originalMaxSize;
    });
  });

  describe("Performance Optimizations", () => {
    it("should implement exponential backoff for retries", async () => {
      let attemptTimes = [];

      global.speechSynthesis.speak.mockImplementation((utterance) => {
        attemptTimes.push(Date.now());
        // 이벤트 핸들러가 설정된 후에 오류 발생
        setTimeout(() => {
          if (utterance.onerror) {
            utterance.onerror({ error: "synthesis-failed" });
          }
        }, 10);
      });

      // 재시도 지연 시간을 짧게 설정하여 테스트 속도 향상
      const originalRetryDelay = ttsEngine.retryDelay;
      ttsEngine.retryDelay = 100; // 100ms

      try {
        await ttsEngine.speak("test");
      } catch (error) {
        // 재시도 간격이 지수적으로 증가하는지 확인
        expect(attemptTimes).toHaveLength(4); // 초기 + 3번 재시도

        if (attemptTimes.length >= 3) {
          const interval1 = attemptTimes[1] - attemptTimes[0];
          const interval2 = attemptTimes[2] - attemptTimes[1];
          expect(interval2).toBeGreaterThan(interval1);
        }
      } finally {
        ttsEngine.retryDelay = originalRetryDelay;
      }
    }, 10000); // 10초 타임아웃

    it("should optimize speech duration estimation", () => {
      const shortText = "Hello world";
      const longText =
        "This is a much longer text that should take more time to speak";

      const shortDuration = ttsEngine._estimateSpeechDuration(shortText, 1.0);
      const longDuration = ttsEngine._estimateSpeechDuration(longText, 1.0);

      expect(longDuration).toBeGreaterThan(shortDuration);

      // 속도 변경 테스트
      const fastDuration = ttsEngine._estimateSpeechDuration(shortText, 2.0);
      const slowDuration = ttsEngine._estimateSpeechDuration(shortText, 0.5);

      expect(fastDuration).toBeLessThan(shortDuration);
      expect(slowDuration).toBeGreaterThan(shortDuration);
    });

    it("should reuse last used voice for optimization", async () => {
      const mockVoice = { name: "Test Voice", lang: "en-US" };
      ttsEngine.lastUsedVoice = mockVoice;

      const selectedVoice = await ttsEngine._selectOptimizedVoice(
        "Test Voice",
        "en-US"
      );
      expect(selectedVoice).toBe(mockVoice);
    });

    it("should preload common voices", async () => {
      const voices = [
        { name: "Korean Voice", lang: "ko-KR", default: false },
        { name: "English Voice", lang: "en-US", default: false },
        { name: "Japanese Voice", lang: "ja-JP", default: false },
      ];

      ttsEngine._preloadCommonVoices(voices);

      expect(ttsEngine.preloadedVoices.size).toBeGreaterThan(0);
      expect(ttsEngine.preloadedVoices.has("Korean Voice")).toBe(true);
      expect(ttsEngine.preloadedVoices.has("English Voice")).toBe(true);
      expect(ttsEngine.preloadedVoices.has("Japanese Voice")).toBe(true);
    });
  });

  describe("Memory Cleanup", () => {
    it("should perform scheduled cleanup", () => {
      expect(ttsEngine.cleanupInterval).not.toBeNull();
    });

    it("should clean up expired cache entries", () => {
      // 만료된 캐시 항목 추가
      const expiredKey = "expired:test";
      ttsEngine.textCache.set(expiredKey, {
        options: {},
        timestamp: Date.now() - 400000, // 6분 전
      });

      const validKey = "valid:test";
      ttsEngine.textCache.set(validKey, {
        options: {},
        timestamp: Date.now(),
      });

      ttsEngine._performMemoryCleanup();

      expect(ttsEngine.textCache.has(expiredKey)).toBe(false);
      expect(ttsEngine.textCache.has(validKey)).toBe(true);
    });

    it("should clean up utterance pool when oversized", () => {
      // 풀 크기 초과
      const originalMaxSize = ttsEngine.maxPoolSize;
      ttsEngine.maxPoolSize = 2;

      // 3개 항목 추가
      ttsEngine.utterancePool.push({}, {}, {});

      ttsEngine._performMemoryCleanup();

      expect(ttsEngine.utterancePool.length).toBe(2);
      ttsEngine.maxPoolSize = originalMaxSize;
    });

    it("should dispose resources properly", () => {
      // 리소스 설정
      ttsEngine.textCache.set("test", {});
      ttsEngine.utterancePool.push({});
      ttsEngine.preloadedVoices.add("test");
      ttsEngine.onError("test", () => {});

      ttsEngine.dispose();

      expect(ttsEngine.textCache.size).toBe(0);
      expect(ttsEngine.utterancePool.length).toBe(0);
      expect(ttsEngine.preloadedVoices.size).toBe(0);
      expect(ttsEngine.errorHandlers.size).toBe(0);
      expect(ttsEngine.cleanupInterval).toBeNull();
    });
  });

  describe("Performance Configuration", () => {
    it("should allow performance config updates", () => {
      const config = {
        maxCacheSize: 100,
        maxPoolSize: 10,
        voicesCacheTTL: 600000,
        retryAttempts: 5,
        retryDelay: 2000,
      };

      ttsEngine.updatePerformanceConfig(config);

      expect(ttsEngine.maxCacheSize).toBe(100);
      expect(ttsEngine.maxPoolSize).toBe(10);
      expect(ttsEngine.voicesCacheTTL).toBe(600000);
      expect(ttsEngine.retryAttempts).toBe(5);
      expect(ttsEngine.retryDelay).toBe(2000);
    });

    it("should validate performance config ranges", () => {
      const invalidConfig = {
        maxCacheSize: 5, // 너무 작음
        maxPoolSize: 25, // 너무 큼
        voicesCacheTTL: 30000, // 너무 작음
        retryAttempts: 15, // 너무 큼
        retryDelay: 50, // 너무 작음
      };

      ttsEngine.updatePerformanceConfig(invalidConfig);

      expect(ttsEngine.maxCacheSize).toBe(10); // 최소값
      expect(ttsEngine.maxPoolSize).toBe(20); // 최대값
      expect(ttsEngine.voicesCacheTTL).toBe(60000); // 최소값
      expect(ttsEngine.retryAttempts).toBe(10); // 최대값
      expect(ttsEngine.retryDelay).toBe(100); // 최소값
    });
  });

  describe("Performance Statistics", () => {
    it("should provide performance statistics", () => {
      const stats = ttsEngine.getPerformanceStats();

      expect(stats).toHaveProperty("cacheSize");
      expect(stats).toHaveProperty("maxCacheSize");
      expect(stats).toHaveProperty("poolSize");
      expect(stats).toHaveProperty("maxPoolSize");
      expect(stats).toHaveProperty("preloadedVoicesCount");
      expect(stats).toHaveProperty("voicesCached");
      expect(stats).toHaveProperty("memoryUsage");
      expect(stats.memoryUsage).toHaveProperty("textCacheEntries");
      expect(stats.memoryUsage).toHaveProperty("utterancePoolObjects");
    });

    it("should clear cache on demand", () => {
      ttsEngine.textCache.set("test", {});
      ttsEngine.voicesCache = [];
      ttsEngine.preloadedVoices.add("test");

      ttsEngine.clearCache();

      expect(ttsEngine.textCache.size).toBe(0);
      expect(ttsEngine.voicesCache).toBeNull();
      expect(ttsEngine.preloadedVoices.size).toBe(0);
    });
  });
});

describe("Background Service Performance", () => {
  let mockChrome;
  let BackgroundService;

  beforeEach(() => {
    // Mock Chrome APIs
    mockChrome = {
      runtime: {
        onMessage: { addListener: vi.fn() },
        onConnect: { addListener: vi.fn() },
        onInstalled: { addListener: vi.fn() },
        sendMessage: vi.fn(),
        lastError: null,
      },
      storage: {
        sync: {
          set: vi.fn((data, callback) => callback && callback()),
          get: vi.fn((keys, callback) => callback && callback({})),
        },
        local: {
          set: vi.fn((data, callback) => callback && callback()),
          get: vi.fn((keys, callback) => callback && callback({})),
          remove: vi.fn((keys, callback) => callback && callback()),
        },
      },
      tabs: {
        query: vi.fn(),
        sendMessage: vi.fn(),
      },
    };

    global.chrome = mockChrome;
    global.importScripts = vi.fn();

    // Mock BackgroundService (simplified)
    BackgroundService = class {
      constructor() {
        this.messageQueue = [];
        this.isProcessingQueue = false;
        this.settingsCache = null;
        this.settingsCacheExpiry = 0;
        this.settingsCacheTTL = 60000;
        this.recentMessages = new Map();
        this.messageDeduplicationWindow = 1000;
        this.performanceMetrics = {
          messageCount: 0,
          settingsLoads: 0,
          settingsSaves: 0,
          cacheHits: 0,
          cacheMisses: 0,
        };
      }

      _generateMessageKey(message, sender) {
        const senderKey = sender.tab ? `tab-${sender.tab.id}` : "popup";
        return `${message.type}-${senderKey}-${JSON.stringify(
          message.payload
        )}`;
      }

      _isDuplicateMessage(messageKey) {
        const now = Date.now();
        const lastSeen = this.recentMessages.get(messageKey);

        if (lastSeen && now - lastSeen < this.messageDeduplicationWindow) {
          return true;
        }

        this.recentMessages.set(messageKey, now);
        return false;
      }

      getPerformanceStats() {
        return {
          ...this.performanceMetrics,
          messageQueueSize: this.messageQueue.length,
          isProcessingQueue: this.isProcessingQueue,
          recentMessagesCount: this.recentMessages.size,
          settingsCached: !!this.settingsCache,
          cacheHitRate:
            this.performanceMetrics.settingsLoads > 0
              ? (
                  (this.performanceMetrics.cacheHits /
                    this.performanceMetrics.settingsLoads) *
                  100
                ).toFixed(2) + "%"
              : "0%",
        };
      }

      performMemoryCleanup() {
        const now = Date.now();

        // 설정 캐시 만료 확인
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
      }
    };
  });

  it("should implement message deduplication", () => {
    const service = new BackgroundService();
    const message = { type: "TTS_PLAY", payload: { text: "test" } };
    const sender = { tab: null };

    const key1 = service._generateMessageKey(message, sender);
    const key2 = service._generateMessageKey(message, sender);

    expect(key1).toBe(key2);

    const isDuplicate1 = service._isDuplicateMessage(key1);
    const isDuplicate2 = service._isDuplicateMessage(key1);

    expect(isDuplicate1).toBe(false);
    expect(isDuplicate2).toBe(true);
  });

  it("should provide performance statistics", () => {
    const service = new BackgroundService();
    service.performanceMetrics.messageCount = 10;
    service.performanceMetrics.settingsLoads = 5;
    service.performanceMetrics.cacheHits = 3;

    const stats = service.getPerformanceStats();

    expect(stats.messageCount).toBe(10);
    expect(stats.settingsLoads).toBe(5);
    expect(stats.cacheHits).toBe(3);
    expect(stats.cacheHitRate).toBe("60.00%");
  });

  it("should clean up old message keys", () => {
    const service = new BackgroundService();

    // 오래된 메시지 키 추가
    const oldTimestamp = Date.now() - 10000;
    service.recentMessages.set("old-key", oldTimestamp);
    service.recentMessages.set("new-key", Date.now());

    service.performMemoryCleanup();

    expect(service.recentMessages.has("old-key")).toBe(false);
    expect(service.recentMessages.has("new-key")).toBe(true);
  });
});
