import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test-setup.js'],
    // 테스트 타임아웃 설정
    testTimeout: 10000,
    hookTimeout: 10000,
    // 병렬 실행 제한 (안정성 향상)
    maxConcurrency: 5,
    // 실패한 테스트 재시도
    retry: 1,
    // 로그 레벨 설정
    logLevel: 'warn',
    // 테스트 환경 설정
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        runScripts: 'dangerously',
        url: 'https://example.com'
      }
    },
    // 커버리지 설정
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test-setup.js',
        'vitest.config.js',
        'dist/',
        'coverage/',
        '**/*.test.js',
        '**/*.spec.js'
      ]
    }
  }
});
