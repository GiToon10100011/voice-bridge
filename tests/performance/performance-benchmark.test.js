/**
 * Performance Benchmark Tests
 * 성능 최적화 효과 측정
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import TTSEngine from "../../src/lib/tts-engine.js";

describe("Performance Benchmarks", () => {
  let ttsEngine;

  beforeEach(() => {
    ttsEngine = new TTSEngine();

    // Mock successful speech for benchmarks
    global.speechSynthesis.speak.mockImplementation((utterance) => {
      setTimeout(() => {
        if (typeof utterance.onstart === 'function') {
          utterance.onstart();
        }
      }, 0);
      setTimeout(() => {
        if (typeof utterance.onend === 'function') {
          utterance.onend();
        }
      }, 10);
    });
  });

  afterEach(() => {
    if (ttsEngine) {
      ttsEngine.dispose();
    }
  });

  it("should demonstrate voice caching performance improvement", async () => {
    const iterations = 10;

    // 첫 번째 실행 (캐시 없음)
    const startTime1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      // 캐시 초기화
      ttsEngine.voicesCache = null;
      ttsEngine.voicesCacheExpiry = 0;
      await ttsEngine.getAvailableVoices();
    }
    const uncachedTime = performance.now() - startTime1;

    // 두 번째 실행 (캐시 사용)
    const startTime2 = performance.now();
    for (let i = 0; i < iterations; i++) {
      await ttsEngine.getAvailableVoices();
    }
    const cachedTime = performance.now() - startTime2;

    console.log(
      `Voice loading - Uncached: ${uncachedTime.toFixed(
        2
      )}ms, Cached: ${cachedTime.toFixed(2)}ms`
    );
    console.log(
      `Performance improvement: ${(
        ((uncachedTime - cachedTime) / uncachedTime) *
        100
      ).toFixed(1)}%`
    );

    // 캐시된 버전이 더 빨라야 함
    expect(cachedTime).toBeLessThan(uncachedTime);
  });

  it("should demonstrate text caching performance for repeated texts", async () => {
    const text = "Hello world";
    const options = { rate: 1.0, pitch: 1.0 };
    const iterations = 5;

    // 첫 번째 실행 (캐시 없음)
    ttsEngine.textCache.clear();
    const startTime1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      await ttsEngine.speak(text, options);
    }
    const uncachedTime = performance.now() - startTime1;

    // 두 번째 실행 (캐시 사용)
    const startTime2 = performance.now();
    for (let i = 0; i < iterations; i++) {
      await ttsEngine.speak(text, options);
    }
    const cachedTime = performance.now() - startTime2;

    console.log(
      `Text processing - Uncached: ${uncachedTime.toFixed(
        2
      )}ms, Cached: ${cachedTime.toFixed(2)}ms`
    );

    // 캐시 효과 확인
    expect(ttsEngine.textCache.size).toBeGreaterThan(0);
  });

  it("should demonstrate utterance pooling efficiency", async () => {
    const texts = ["Text 1", "Text 2", "Text 3", "Text 4", "Text 5"];

    // 풀 없이 실행
    const originalMaxPoolSize = ttsEngine.maxPoolSize;
    ttsEngine.maxPoolSize = 0; // 풀 비활성화

    const startTime1 = performance.now();
    for (const text of texts) {
      await ttsEngine.speak(text);
    }
    const withoutPoolTime = performance.now() - startTime1;

    // 풀 사용하여 실행
    ttsEngine.maxPoolSize = originalMaxPoolSize;
    ttsEngine.utterancePool.length = 0; // 풀 초기화

    const startTime2 = performance.now();
    for (const text of texts) {
      await ttsEngine.speak(text);
    }
    const withPoolTime = performance.now() - startTime2;

    console.log(
      `Utterance creation - Without pool: ${withoutPoolTime.toFixed(
        2
      )}ms, With pool: ${withPoolTime.toFixed(2)}ms`
    );

    // 풀이 생성되었는지 확인
    expect(ttsEngine.utterancePool.length).toBeGreaterThan(0);
  });

  it("should measure memory usage efficiency", () => {
    const initialStats = ttsEngine.getPerformanceStats();

    // 여러 작업 수행
    for (let i = 0; i < 20; i++) {
      const key = `test-${i}`;
      ttsEngine.textCache.set(key, { options: {}, timestamp: Date.now() });
    }

    // 캐시 크기 제한 확인
    expect(ttsEngine.textCache.size).toBeLessThanOrEqual(
      ttsEngine.maxCacheSize
    );

    const finalStats = ttsEngine.getPerformanceStats();
    console.log("Memory usage stats:", finalStats.memoryUsage);

    // 메모리 사용량이 제한 내에 있는지 확인
    expect(finalStats.memoryUsage.textCacheEntries).toBeLessThanOrEqual(
      ttsEngine.maxCacheSize
    );
  });

  it("should demonstrate cleanup efficiency", () => {
    // 많은 캐시 항목 생성
    for (let i = 0; i < 100; i++) {
      ttsEngine.textCache.set(`test-${i}`, {
        options: {},
        timestamp: Date.now() - (i < 50 ? 400000 : 0), // 절반은 만료
      });
    }

    const beforeCleanup = ttsEngine.textCache.size;

    const startTime = performance.now();
    ttsEngine._performMemoryCleanup();
    const cleanupTime = performance.now() - startTime;

    const afterCleanup = ttsEngine.textCache.size;

    console.log(
      `Cleanup - Before: ${beforeCleanup} items, After: ${afterCleanup} items, Time: ${cleanupTime.toFixed(
        2
      )}ms`
    );

    // 만료된 항목이 정리되었는지 확인
    expect(afterCleanup).toBeLessThan(beforeCleanup);
    expect(cleanupTime).toBeLessThan(100); // 100ms 이내에 완료
  });
});

describe("Background Service Performance Benchmarks", () => {
  let BackgroundService;
  let service;

  beforeEach(() => {
    // Mock Chrome APIs
    global.chrome = {
      runtime: { onMessage: { addListener: vi.fn() } },
      storage: {
        sync: {
          set: vi.fn((data, callback) => setTimeout(callback, 10)),
          get: vi.fn((keys, callback) => setTimeout(() => callback({}), 10)),
        },
      },
    };

    // Simplified BackgroundService for benchmarking
    BackgroundService = class {
      constructor() {
        this.settingsCache = null;
        this.settingsCacheExpiry = 0;
        this.settingsCacheTTL = 60000;
        this.performanceMetrics = {
          settingsLoads: 0,
          cacheHits: 0,
          cacheMisses: 0,
        };
      }

      async loadSettings() {
        this.performanceMetrics.settingsLoads++;

        const now = Date.now();
        if (this.settingsCache && now < this.settingsCacheExpiry) {
          this.performanceMetrics.cacheHits++;
          return this.settingsCache;
        }

        this.performanceMetrics.cacheMisses++;

        return new Promise((resolve) => {
          chrome.storage.sync.get(["userSettings"], (result) => {
            const settings = { tts: { rate: 1.0 } };
            this.settingsCache = settings;
            this.settingsCacheExpiry = now + this.settingsCacheTTL;
            resolve(settings);
          });
        });
      }
    };

    service = new BackgroundService();
  });

  it("should demonstrate settings caching performance", async () => {
    const iterations = 10;

    // 첫 번째 실행 (캐시 없음)
    service.settingsCache = null;
    const startTime1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      service.settingsCache = null; // 캐시 무효화
      service.settingsCacheExpiry = 0;
      await service.loadSettings();
    }
    const uncachedTime = performance.now() - startTime1;

    // 두 번째 실행 (캐시 사용)
    const startTime2 = performance.now();
    for (let i = 0; i < iterations; i++) {
      await service.loadSettings();
    }
    const cachedTime = performance.now() - startTime2;

    console.log(
      `Settings loading - Uncached: ${uncachedTime.toFixed(
        2
      )}ms, Cached: ${cachedTime.toFixed(2)}ms`
    );
    console.log(
      `Cache hit rate: ${(
        (service.performanceMetrics.cacheHits /
          service.performanceMetrics.settingsLoads) *
        100
      ).toFixed(1)}%`
    );

    // 캐시된 버전이 더 빨라야 함
    expect(cachedTime).toBeLessThan(uncachedTime);
    expect(service.performanceMetrics.cacheHits).toBeGreaterThan(0);
  });
});
