/**
 * User Acceptance Test Runner
 * 사용자 수용 테스트 실행 및 결과 분석 도구
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

class UserAcceptanceTestRunner {
  constructor() {
    this.testResults = {
      chatgpt: null,
      google: null,
      overall: null,
      performance: null,
    };
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * 모든 사용자 수용 테스트 실행
   */
  async runAllTests() {
    console.log("🚀 Starting User Acceptance Tests for TTS Voice Bridge\n");
    this.startTime = Date.now();

    try {
      // 1. ChatGPT 통합 테스트
      console.log("📝 Running ChatGPT Integration Tests...");
      await this.runChatGPTTests();

      // 2. 구글 음성검색 테스트
      console.log("🔍 Running Google Voice Search Tests...");
      await this.runGoogleTests();

      // 3. 전체 사용자 수용 테스트
      console.log("🎯 Running Overall User Acceptance Tests...");
      await this.runOverallTests();

      // 4. 성능 테스트
      console.log("⚡ Running Performance Tests...");
      await this.runPerformanceTests();

      this.endTime = Date.now();

      // 결과 분석 및 리포트 생성
      this.generateReport();
    } catch (error) {
      console.error("❌ Test execution failed:", error.message);
      process.exit(1);
    }
  }

  /**
   * ChatGPT 통합 테스트 실행
   */
  async runChatGPTTests() {
    try {
      const result = execSync(
        "npm test -- tests/user-acceptance/chatgpt-integration.test.js --reporter=json",
        { encoding: "utf8", stdio: "pipe" }
      );

      this.testResults.chatgpt = this.parseTestResult(result);
      console.log(
        `✅ ChatGPT Tests: ${this.testResults.chatgpt.passed}/${this.testResults.chatgpt.total} passed\n`
      );
    } catch (error) {
      console.log(`❌ ChatGPT Tests failed: ${error.message}\n`);
      this.testResults.chatgpt = {
        passed: 0,
        total: 0,
        failed: true,
        error: error.message,
      };
    }
  }

  /**
   * 구글 음성검색 테스트 실행
   */
  async runGoogleTests() {
    try {
      const result = execSync(
        "npm test -- tests/user-acceptance/google-voice-search.test.js --reporter=json",
        { encoding: "utf8", stdio: "pipe" }
      );

      this.testResults.google = this.parseTestResult(result);
      console.log(
        `✅ Google Tests: ${this.testResults.google.passed}/${this.testResults.google.total} passed\n`
      );
    } catch (error) {
      console.log(`❌ Google Tests failed: ${error.message}\n`);
      this.testResults.google = {
        passed: 0,
        total: 0,
        failed: true,
        error: error.message,
      };
    }
  }

  /**
   * 전체 사용자 수용 테스트 실행
   */
  async runOverallTests() {
    try {
      const result = execSync(
        "npm test -- tests/user-acceptance/user-acceptance.test.js --reporter=json",
        { encoding: "utf8", stdio: "pipe" }
      );

      this.testResults.overall = this.parseTestResult(result);
      console.log(
        `✅ Overall Tests: ${this.testResults.overall.passed}/${this.testResults.overall.total} passed\n`
      );
    } catch (error) {
      console.log(`❌ Overall Tests failed: ${error.message}\n`);
      this.testResults.overall = {
        passed: 0,
        total: 0,
        failed: true,
        error: error.message,
      };
    }
  }

  /**
   * 성능 테스트 실행
   */
  async runPerformanceTests() {
    try {
      // 성능 관련 테스트만 필터링하여 실행
      const result = execSync(
        'npm test -- tests/user-acceptance/ --testNamePattern="성능|performance|Performance" --reporter=json',
        { encoding: "utf8", stdio: "pipe" }
      );

      this.testResults.performance = this.parseTestResult(result);
      console.log(
        `✅ Performance Tests: ${this.testResults.performance.passed}/${this.testResults.performance.total} passed\n`
      );
    } catch (error) {
      console.log(`❌ Performance Tests failed: ${error.message}\n`);
      this.testResults.performance = {
        passed: 0,
        total: 0,
        failed: true,
        error: error.message,
      };
    }
  }

  /**
   * 테스트 결과 파싱
   */
  parseTestResult(jsonOutput) {
    try {
      // JSON 출력에서 실제 결과 부분만 추출
      const lines = jsonOutput.split("\n");
      const jsonLine = lines.find((line) => line.trim().startsWith("{"));

      if (!jsonLine) {
        return {
          passed: 0,
          total: 0,
          failed: true,
          error: "No JSON output found",
        };
      }

      const result = JSON.parse(jsonLine);

      return {
        passed: result.numPassedTests || 0,
        total: result.numTotalTests || 0,
        failed: result.numFailedTests > 0,
        duration:
          result.testResults?.[0]?.perfStats?.end -
            result.testResults?.[0]?.perfStats?.start || 0,
        coverage: result.coverageMap
          ? this.calculateCoverage(result.coverageMap)
          : null,
      };
    } catch (error) {
      // JSON 파싱 실패 시 텍스트에서 정보 추출 시도
      const passedMatch = jsonOutput.match(/(\d+) passed/);
      const totalMatch = jsonOutput.match(/(\d+) total/);

      return {
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        total: totalMatch ? parseInt(totalMatch[1]) : 0,
        failed: jsonOutput.includes("failed") || jsonOutput.includes("FAIL"),
        error: error.message,
      };
    }
  }

  /**
   * 커버리지 계산
   */
  calculateCoverage(coverageMap) {
    if (!coverageMap) return null;

    let totalStatements = 0;
    let coveredStatements = 0;

    Object.values(coverageMap).forEach((fileCoverage) => {
      if (fileCoverage.s) {
        Object.values(fileCoverage.s).forEach((count) => {
          totalStatements++;
          if (count > 0) coveredStatements++;
        });
      }
    });

    return totalStatements > 0
      ? ((coveredStatements / totalStatements) * 100).toFixed(2)
      : 0;
  }

  /**
   * 테스트 결과 리포트 생성
   */
  generateReport() {
    const duration = this.endTime - this.startTime;
    const totalPassed = Object.values(this.testResults).reduce(
      (sum, result) => (result ? sum + (result.passed || 0) : sum),
      0
    );
    const totalTests = Object.values(this.testResults).reduce(
      (sum, result) => (result ? sum + (result.total || 0) : sum),
      0
    );
    const overallSuccess = totalPassed === totalTests && totalTests > 0;

    console.log("\n" + "=".repeat(60));
    console.log("📊 USER ACCEPTANCE TEST RESULTS");
    console.log("=".repeat(60));

    console.log(`\n⏱️  Total Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(
      `📈 Overall Success Rate: ${
        totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0
      }% (${totalPassed}/${totalTests})`
    );

    console.log("\n📋 Test Category Results:");
    console.log("─".repeat(40));

    // ChatGPT 테스트 결과
    if (this.testResults.chatgpt) {
      const chatgptRate =
        this.testResults.chatgpt.total > 0
          ? (
              (this.testResults.chatgpt.passed /
                this.testResults.chatgpt.total) *
              100
            ).toFixed(1)
          : 0;
      console.log(
        `🤖 ChatGPT Integration: ${chatgptRate}% (${this.testResults.chatgpt.passed}/${this.testResults.chatgpt.total})`
      );
    }

    // 구글 테스트 결과
    if (this.testResults.google) {
      const googleRate =
        this.testResults.google.total > 0
          ? (
              (this.testResults.google.passed / this.testResults.google.total) *
              100
            ).toFixed(1)
          : 0;
      console.log(
        `🔍 Google Voice Search: ${googleRate}% (${this.testResults.google.passed}/${this.testResults.google.total})`
      );
    }

    // 전체 테스트 결과
    if (this.testResults.overall) {
      const overallRate =
        this.testResults.overall.total > 0
          ? (
              (this.testResults.overall.passed /
                this.testResults.overall.total) *
              100
            ).toFixed(1)
          : 0;
      console.log(
        `🎯 Overall Acceptance: ${overallRate}% (${this.testResults.overall.passed}/${this.testResults.overall.total})`
      );
    }

    // 성능 테스트 결과
    if (this.testResults.performance) {
      const performanceRate =
        this.testResults.performance.total > 0
          ? (
              (this.testResults.performance.passed /
                this.testResults.performance.total) *
              100
            ).toFixed(1)
          : 0;
      console.log(
        `⚡ Performance Tests: ${performanceRate}% (${this.testResults.performance.passed}/${this.testResults.performance.total})`
      );
    }

    // 실패한 테스트 상세 정보
    console.log("\n🔍 Detailed Results:");
    console.log("─".repeat(40));

    Object.entries(this.testResults).forEach(([category, result]) => {
      if (result && result.failed) {
        console.log(
          `❌ ${category.toUpperCase()} - ${
            result.error || "Some tests failed"
          }`
        );
      } else if (result && result.passed === result.total && result.total > 0) {
        console.log(`✅ ${category.toUpperCase()} - All tests passed`);
      }
    });

    // 권장사항
    console.log("\n💡 Recommendations:");
    console.log("─".repeat(40));

    if (overallSuccess) {
      console.log(
        "🎉 All user acceptance tests passed! The TTS Voice Bridge is ready for deployment."
      );
    } else {
      console.log("⚠️  Some tests failed. Please review the following:");

      if (this.testResults.chatgpt?.failed) {
        console.log(
          "   • Check ChatGPT integration and voice recognition optimization"
        );
      }
      if (this.testResults.google?.failed) {
        console.log(
          "   • Verify Google Voice Search compatibility and accuracy"
        );
      }
      if (this.testResults.overall?.failed) {
        console.log(
          "   • Review overall system integration and multi-language support"
        );
      }
      if (this.testResults.performance?.failed) {
        console.log("   • Optimize performance and memory usage");
      }
    }

    // JSON 리포트 파일 생성
    this.saveJsonReport();

    console.log(
      "\n📄 Detailed report saved to: tests/user-acceptance/test-report.json"
    );
    console.log("=".repeat(60));

    // 실패 시 exit code 설정
    if (!overallSuccess) {
      process.exit(1);
    }
  }

  /**
   * JSON 형태의 상세 리포트 저장
   */
  saveJsonReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.endTime - this.startTime,
      summary: {
        totalTests: Object.values(this.testResults).reduce(
          (sum, result) => (result ? sum + (result.total || 0) : sum),
          0
        ),
        totalPassed: Object.values(this.testResults).reduce(
          (sum, result) => (result ? sum + (result.passed || 0) : sum),
          0
        ),
        overallSuccessRate: 0,
      },
      categories: this.testResults,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      requirements: {
        2.1: "ChatGPT 음성모드에서의 TTS 인식률",
        2.2: "ChatGPT 음성인식 상태 감지",
        3.1: "구글 음성검색에서의 TTS 인식률",
        3.2: "구글 음성검색 상태 감지",
        5.1: "다양한 언어 및 음성 설정 지원",
      },
    };

    // 성공률 계산
    if (report.summary.totalTests > 0) {
      report.summary.overallSuccessRate = (
        (report.summary.totalPassed / report.summary.totalTests) *
        100
      ).toFixed(2);
    }

    const reportPath = path.join(
      process.cwd(),
      "tests/user-acceptance/test-report.json"
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  /**
   * 특정 카테고리 테스트만 실행
   */
  async runSpecificTest(category) {
    console.log(`🎯 Running ${category} tests only...\n`);
    this.startTime = Date.now();

    try {
      switch (category.toLowerCase()) {
        case "chatgpt":
          await this.runChatGPTTests();
          break;
        case "google":
          await this.runGoogleTests();
          break;
        case "overall":
          await this.runOverallTests();
          break;
        case "performance":
          await this.runPerformanceTests();
          break;
        default:
          throw new Error(`Unknown test category: ${category}`);
      }

      this.endTime = Date.now();
      this.generateReport();
    } catch (error) {
      console.error(`❌ ${category} test execution failed:`, error.message);
      process.exit(1);
    }
  }
}

// CLI 실행 지원
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new UserAcceptanceTestRunner();
  const category = process.argv[2];

  if (category) {
    runner.runSpecificTest(category);
  } else {
    runner.runAllTests();
  }
}

export default UserAcceptanceTestRunner;
