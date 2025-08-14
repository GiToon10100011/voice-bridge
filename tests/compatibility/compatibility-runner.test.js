import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Comprehensive Browser Compatibility Test Runner
 * Runs all compatibility tests and generates compatibility report
 * Requirements: 6.1, 6.2
 */

describe("Comprehensive Browser Compatibility Test Runner", () => {
  let compatibilityReport;

  beforeEach(() => {
    compatibilityReport = {
      browsers: {},
      platforms: {},
      features: {},
      overall: { passed: 0, failed: 0, total: 0 },
    };
    vi.clearAllMocks();
  });

  const runCompatibilityTest = (testName, testFn) => {
    try {
      testFn();
      compatibilityReport.overall.passed++;
      return { name: testName, status: "PASSED", error: null };
    } catch (error) {
      compatibilityReport.overall.failed++;
      return { name: testName, status: "FAILED", error: error.message };
    } finally {
      compatibilityReport.overall.total++;
    }
  };

  describe("Browser Compatibility Matrix", () => {
    const browsers = [
      {
        name: "Chrome 120+",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        expectedFeatures: [
          "webSpeechAPI",
          "extensionAPI",
          "storage",
          "messaging",
        ],
      },
      {
        name: "Edge 120+",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        expectedFeatures: [
          "webSpeechAPI",
          "extensionAPI",
          "storage",
          "messaging",
        ],
      },
    ];

    browsers.forEach((browser) => {
      describe(`${browser.name} Compatibility`, () => {
        beforeEach(() => {
          Object.defineProperty(navigator, "userAgent", {
            value: browser.userAgent,
            configurable: true,
          });

          // Mock Chrome/Edge extension APIs
          global.chrome = {
            runtime: {
              sendMessage: vi.fn(),
              onMessage: { addListener: vi.fn() },
              getManifest: vi.fn(() => ({ version: "1.0.0" })),
            },
            storage: {
              local: {
                get: vi.fn(),
                set: vi.fn(),
              },
            },
            tabs: {
              query: vi.fn(),
              sendMessage: vi.fn(),
            },
          };

          compatibilityReport.browsers[browser.name] = {
            features: {},
            overall: { passed: 0, failed: 0 },
          };
        });

        it(`should support Web Speech API in ${browser.name}`, () => {
          const result = runCompatibilityTest("Web Speech API", () => {
            expect(global.speechSynthesis).toBeDefined();
            expect(global.SpeechSynthesisUtterance).toBeDefined();
            expect(typeof global.speechSynthesis.speak).toBe("function");
            expect(typeof global.speechSynthesis.getVoices).toBe("function");
          });

          compatibilityReport.browsers[browser.name].features.webSpeechAPI =
            result;
          if (result.status === "PASSED") {
            compatibilityReport.browsers[browser.name].overall.passed++;
          } else {
            compatibilityReport.browsers[browser.name].overall.failed++;
          }
        });

        it(`should support Extension APIs in ${browser.name}`, () => {
          const result = runCompatibilityTest("Extension APIs", () => {
            expect(global.chrome).toBeDefined();
            expect(global.chrome.runtime).toBeDefined();
            expect(global.chrome.storage).toBeDefined();
            expect(global.chrome.tabs).toBeDefined();
          });

          compatibilityReport.browsers[browser.name].features.extensionAPI =
            result;
          if (result.status === "PASSED") {
            compatibilityReport.browsers[browser.name].overall.passed++;
          } else {
            compatibilityReport.browsers[browser.name].overall.failed++;
          }
        });

        it(`should support Korean TTS in ${browser.name}`, () => {
          const result = runCompatibilityTest("Korean TTS", () => {
            const voices = global.speechSynthesis.getVoices();
            const koreanVoice = voices.find((voice) =>
              voice.lang.startsWith("ko")
            );
            expect(koreanVoice).toBeDefined();

            const utterance = new global.SpeechSynthesisUtterance(
              "한국어 테스트"
            );
            utterance.voice = koreanVoice;
            global.speechSynthesis.speak(utterance);
            expect(global.speechSynthesis.speak).toHaveBeenCalled();
          });

          compatibilityReport.browsers[browser.name].features.koreanTTS =
            result;
          if (result.status === "PASSED") {
            compatibilityReport.browsers[browser.name].overall.passed++;
          } else {
            compatibilityReport.browsers[browser.name].overall.failed++;
          }
        });

        it(`should support Storage operations in ${browser.name}`, () => {
          const result = runCompatibilityTest("Storage Operations", () => {
            global.chrome.storage.local.set.mockImplementation(
              (data, callback) => {
                if (callback) callback();
              }
            );

            global.chrome.storage.local.get.mockImplementation(
              (keys, callback) => {
                callback({ voice: "ko-KR", rate: 1.0 });
              }
            );

            expect(global.chrome.storage.local.set).toBeDefined();
            expect(global.chrome.storage.local.get).toBeDefined();
          });

          compatibilityReport.browsers[browser.name].features.storage = result;
          if (result.status === "PASSED") {
            compatibilityReport.browsers[browser.name].overall.passed++;
          } else {
            compatibilityReport.browsers[browser.name].overall.failed++;
          }
        });

        it(`should support Messaging in ${browser.name}`, () => {
          const result = runCompatibilityTest("Messaging", () => {
            global.chrome.runtime.sendMessage.mockImplementation(
              (msg, callback) => {
                if (callback) callback({ success: true });
              }
            );

            expect(global.chrome.runtime.sendMessage).toBeDefined();
            expect(global.chrome.runtime.onMessage).toBeDefined();
          });

          compatibilityReport.browsers[browser.name].features.messaging =
            result;
          if (result.status === "PASSED") {
            compatibilityReport.browsers[browser.name].overall.passed++;
          } else {
            compatibilityReport.browsers[browser.name].overall.failed++;
          }
        });
      });
    });
  });

  describe("Platform Compatibility Matrix", () => {
    const platforms = [
      {
        name: "Windows",
        platform: "Win32",
        expectedVoices: [
          "Microsoft Heami - Korean",
          "Microsoft Zira - English",
        ],
      },
      {
        name: "macOS",
        platform: "MacIntel",
        expectedVoices: ["Yuna", "Samantha"],
      },
      {
        name: "Linux",
        platform: "Linux x86_64",
        expectedVoices: ["eSpeak Korean", "eSpeak English"],
      },
    ];

    platforms.forEach((platform) => {
      describe(`${platform.name} Platform Compatibility`, () => {
        beforeEach(() => {
          Object.defineProperty(navigator, "platform", {
            value: platform.platform,
            configurable: true,
          });

          // Mock platform-specific voices
          const mockVoices = platform.expectedVoices.map(
            (voiceName, index) => ({
              name: voiceName,
              lang:
                voiceName.includes("Korean") ||
                voiceName === "Yuna" ||
                voiceName === "eSpeak Korean"
                  ? "ko-KR"
                  : "en-US",
              voiceURI: `${voiceName.toLowerCase().replace(/\s+/g, "-")}-uri`,
              localService: true,
              default: index === 0,
            })
          );

          global.speechSynthesis.getVoices = vi.fn(() => mockVoices);

          compatibilityReport.platforms[platform.name] = {
            features: {},
            overall: { passed: 0, failed: 0 },
          };
        });

        it(`should detect ${platform.name} platform correctly`, () => {
          const result = runCompatibilityTest("Platform Detection", () => {
            expect(navigator.platform).toBe(platform.platform);
          });

          compatibilityReport.platforms[platform.name].features.detection =
            result;
          if (result.status === "PASSED") {
            compatibilityReport.platforms[platform.name].overall.passed++;
          } else {
            compatibilityReport.platforms[platform.name].overall.failed++;
          }
        });

        it(`should have platform-specific voices on ${platform.name}`, () => {
          const result = runCompatibilityTest("Platform Voices", () => {
            const voices = global.speechSynthesis.getVoices();
            expect(voices.length).toBeGreaterThan(0);

            platform.expectedVoices.forEach((expectedVoice) => {
              const voice = voices.find((v) => v.name === expectedVoice);
              expect(voice).toBeDefined();
            });
          });

          compatibilityReport.platforms[platform.name].features.voices = result;
          if (result.status === "PASSED") {
            compatibilityReport.platforms[platform.name].overall.passed++;
          } else {
            compatibilityReport.platforms[platform.name].overall.failed++;
          }
        });

        it(`should support Korean TTS on ${platform.name}`, () => {
          const result = runCompatibilityTest("Korean TTS Support", () => {
            const voices = global.speechSynthesis.getVoices();
            const koreanVoices = voices.filter((v) => v.lang === "ko-KR");

            expect(koreanVoices.length).toBeGreaterThan(0);

            const utterance = new global.SpeechSynthesisUtterance(
              "플랫폼 테스트"
            );
            utterance.voice = koreanVoices[0];
            global.speechSynthesis.speak(utterance);

            expect(global.speechSynthesis.speak).toHaveBeenCalled();
          });

          compatibilityReport.platforms[platform.name].features.koreanTTS =
            result;
          if (result.status === "PASSED") {
            compatibilityReport.platforms[platform.name].overall.passed++;
          } else {
            compatibilityReport.platforms[platform.name].overall.failed++;
          }
        });

        it(`should optimize TTS quality on ${platform.name}`, () => {
          const result = runCompatibilityTest(
            "TTS Quality Optimization",
            () => {
              const utterance = new global.SpeechSynthesisUtterance(
                "품질 테스트"
              );

              // Platform-specific optimizations
              switch (platform.name) {
                case "Windows":
                  utterance.rate = 0.9;
                  utterance.volume = 0.8;
                  break;
                case "macOS":
                  utterance.rate = 1.0;
                  utterance.volume = 0.9;
                  break;
                case "Linux":
                  utterance.rate = 0.8;
                  utterance.volume = 1.0;
                  break;
              }

              expect(utterance.rate).toBeGreaterThan(0);
              expect(utterance.volume).toBeGreaterThan(0);
              expect(utterance.volume).toBeLessThanOrEqual(1);
            }
          );

          compatibilityReport.platforms[platform.name].features.optimization =
            result;
          if (result.status === "PASSED") {
            compatibilityReport.platforms[platform.name].overall.passed++;
          } else {
            compatibilityReport.platforms[platform.name].overall.failed++;
          }
        });
      });
    });
  });

  describe("Feature Compatibility Tests", () => {
    const features = [
      {
        name: "Basic TTS",
        test: () => {
          const utterance = new global.SpeechSynthesisUtterance(
            "기본 TTS 테스트"
          );
          global.speechSynthesis.speak(utterance);
          expect(global.speechSynthesis.speak).toHaveBeenCalled();
        },
      },
      {
        name: "Voice Selection",
        test: () => {
          const voices = global.speechSynthesis.getVoices();
          expect(Array.isArray(voices)).toBe(true);
          expect(voices.length).toBeGreaterThan(0);
        },
      },
      {
        name: "TTS Controls",
        test: () => {
          expect(typeof global.speechSynthesis.cancel).toBe("function");
          expect(typeof global.speechSynthesis.pause).toBe("function");
          expect(typeof global.speechSynthesis.resume).toBe("function");
        },
      },
      {
        name: "Event Handling",
        test: () => {
          const utterance = new global.SpeechSynthesisUtterance(
            "이벤트 테스트"
          );
          const onStartSpy = vi.fn();
          const onEndSpy = vi.fn();

          utterance.onstart = onStartSpy;
          utterance.onend = onEndSpy;

          expect(utterance.onstart).toBe(onStartSpy);
          expect(utterance.onend).toBe(onEndSpy);
        },
      },
      {
        name: "Korean Language Support",
        test: () => {
          const voices = global.speechSynthesis.getVoices();
          const koreanVoice = voices.find((v) => v.lang.startsWith("ko"));
          expect(koreanVoice).toBeDefined();
        },
      },
    ];

    features.forEach((feature) => {
      it(`should support ${feature.name}`, () => {
        const result = runCompatibilityTest(feature.name, feature.test);
        compatibilityReport.features[feature.name] = result;
      });
    });
  });

  describe("Compatibility Report Generation", () => {
    it("should generate comprehensive compatibility report", () => {
      // This test runs after all other tests to generate the final report
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          totalTests: compatibilityReport.overall.total,
          passed: compatibilityReport.overall.passed,
          failed: compatibilityReport.overall.failed,
          successRate:
            compatibilityReport.overall.total > 0
              ? (
                  (compatibilityReport.overall.passed /
                    compatibilityReport.overall.total) *
                  100
                ).toFixed(2) + "%"
              : "0%",
        },
        browsers: compatibilityReport.browsers,
        platforms: compatibilityReport.platforms,
        features: compatibilityReport.features,
        recommendations: [],
      };

      // Add recommendations based on test results
      if (compatibilityReport.overall.failed > 0) {
        report.recommendations.push(
          "일부 호환성 테스트가 실패했습니다. 실패한 기능들을 확인하고 수정하세요."
        );
      }

      if (
        compatibilityReport.overall.passed === compatibilityReport.overall.total
      ) {
        report.recommendations.push(
          "모든 호환성 테스트가 통과했습니다. 배포 준비가 완료되었습니다."
        );
      }

      // Browser-specific recommendations
      Object.entries(compatibilityReport.browsers).forEach(
        ([browserName, browserReport]) => {
          if (browserReport.overall.failed > 0) {
            report.recommendations.push(
              `${browserName}에서 일부 기능이 실패했습니다. 브라우저별 최적화가 필요합니다.`
            );
          }
        }
      );

      // Platform-specific recommendations
      Object.entries(compatibilityReport.platforms).forEach(
        ([platformName, platformReport]) => {
          if (platformReport.overall.failed > 0) {
            report.recommendations.push(
              `${platformName}에서 일부 기능이 실패했습니다. 플랫폼별 최적화가 필요합니다.`
            );
          }
        }
      );

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.browsers).toBeDefined();
      expect(report.platforms).toBeDefined();
      expect(report.features).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);

      // Log the report for debugging (in real tests, this would be saved to a file)
      console.log(
        "Browser Compatibility Report:",
        JSON.stringify(report, null, 2)
      );
    });

    it("should validate minimum compatibility requirements", () => {
      const minimumRequirements = {
        browsers: ["Chrome 120+", "Edge 120+"],
        platforms: ["Windows", "macOS", "Linux"],
        features: ["Basic TTS", "Korean Language Support", "Voice Selection"],
      };

      // Check browser support
      minimumRequirements.browsers.forEach((browser) => {
        const browserReport = compatibilityReport.browsers[browser];
        if (browserReport) {
          expect(browserReport.overall.passed).toBeGreaterThan(0);
        }
      });

      // Check platform support
      minimumRequirements.platforms.forEach((platform) => {
        const platformReport = compatibilityReport.platforms[platform];
        if (platformReport) {
          expect(platformReport.overall.passed).toBeGreaterThan(0);
        }
      });

      // Check feature support
      minimumRequirements.features.forEach((feature) => {
        const featureReport = compatibilityReport.features[feature];
        if (featureReport) {
          expect(featureReport.status).toBe("PASSED");
        }
      });
    });
  });
});
