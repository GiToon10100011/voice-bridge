# TTS Voice Bridge 개발 가이드

이 문서는 TTS Voice Bridge 확장프로그램을 개발, 빌드, 테스트, 배포하는 방법에 대한 상세한 가이드입니다.

## 📋 목차

1. [개발 환경 설정](#개발-환경-설정)
2. [프로젝트 구조 이해](#프로젝트-구조-이해)
3. [로컬 개발](#로컬-개발)
4. [빌드 및 패키징](#빌드-및-패키징)
5. [테스트](#테스트)
6. [배포](#배포)
7. [CI/CD 설정](#cicd-설정)
8. [문제 해결](#문제-해결)

## 🛠️ 개발 환경 설정

### 필수 소프트웨어

#### 1. Node.js 설치

```bash
# Node.js 18 LTS 버전 설치 (권장)
# https://nodejs.org/에서 다운로드

# 설치 확인
node --version  # v18.0.0 이상
npm --version   # 8.0.0 이상
```

#### 2. Git 설치

```bash
# Git 설치 확인
git --version

# Git 사용자 정보 설정
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### 3. 코드 에디터 설정

**VS Code 권장 확장프로그램:**

- ESLint
- Prettier - Code formatter
- JavaScript (ES6) code snippets
- Chrome Debugger
- GitLens

### 프로젝트 클론 및 설정

#### 1. 저장소 클론

```bash
# HTTPS로 클론
git clone https://github.com/tts-voice-bridge/extension.git

# 또는 SSH로 클론 (권장)
git clone git@github.com:tts-voice-bridge/extension.git

# 프로젝트 디렉토리로 이동
cd extension
```

#### 2. 의존성 설치

```bash
# npm 사용
npm install

# 또는 yarn 사용 (선택사항)
yarn install
```

#### 3. 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 편집
# NODE_ENV=development
# DEBUG=true
# SENTRY_DSN=your_sentry_dsn_here
```

## 📁 프로젝트 구조 이해

### 디렉토리 구조

```
tts-voice-bridge/
├── .github/                       # GitHub Actions 워크플로우
│   └── workflows/
│       ├── ci.yml                # 지속적 통합
│       └── deploy.yml            # 배포 자동화
├── docs/                         # 문서
├── src/                          # 소스 코드
│   ├── background/               # 백그라운드 스크립트
│   ├── content/                  # 콘텐츠 스크립트
│   ├── popup/                    # 팝업 UI
│   ├── settings/                 # 설정 페이지
│   └── lib/                      # 공유 라이브러리
├── tests/                        # 테스트 파일
├── icons/                        # 아이콘 파일
├── dist/                         # 빌드 출력 (생성됨)
├── manifest.json                 # 확장프로그램 매니페스트
├── package.json                  # Node.js 패키지 설정
├── vitest.config.js             # 테스트 설정
├── .eslintrc.js                 # ESLint 설정
├── .prettierrc                  # Prettier 설정
└── webpack.config.js            # Webpack 설정
```

### 주요 파일 설명

#### `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "TTS Voice Bridge",
  "version": "1.0.0",
  "description": "텍스트를 음성으로 변환하여 음성인식 시스템에서 사용",
  "permissions": ["activeTab", "storage"],
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://chat.openai.com/*", "https://www.google.com/*"],
      "js": ["content/content.js"]
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

#### `package.json` 스크립트

```json
{
  "scripts": {
    "dev": "webpack --mode development --watch",
    "build": "webpack --mode production",
    "build:dev": "webpack --mode development",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui",
    "lint": "eslint src/ tests/",
    "lint:fix": "eslint src/ tests/ --fix",
    "format": "prettier --write src/ tests/",
    "package": "npm run build && npm run zip",
    "zip": "cd dist && zip -r ../tts-voice-bridge.zip .",
    "validate": "npm run lint && npm run test && npm run build"
  }
}
```

## 🔧 로컬 개발

### 개발 서버 시작

#### 1. 개발 모드로 빌드

```bash
# 개발 모드로 빌드 (파일 변경 감지)
npm run dev

# 또는 일회성 개발 빌드
npm run build:dev
```

#### 2. Chrome에서 확장프로그램 로드

1. Chrome 브라우저 열기
2. 주소창에 `chrome://extensions/` 입력
3. 우상단 "개발자 모드" 토글 활성화
4. "압축해제된 확장 프로그램을 로드합니다" 클릭
5. 프로젝트의 `dist/` 폴더 선택

#### 3. 개발 중 업데이트

- 코드 변경 시 자동으로 빌드됨 (`npm run dev` 실행 중인 경우)
- Chrome 확장프로그램 페이지에서 새로고침 버튼 클릭

### 디버깅

#### 1. 백그라운드 스크립트 디버깅

```bash
# Chrome 확장프로그램 페이지에서
# "서비스 워커" 링크 클릭 → 개발자 도구 열림
```

#### 2. 콘텐츠 스크립트 디버깅

```bash
# 대상 웹페이지에서 F12 → Console 탭
# 콘텐츠 스크립트 로그 확인 가능
```

#### 3. 팝업 디버깅

```bash
# 팝업 열기 → 우클릭 → "검사" 클릭
# 팝업 전용 개발자 도구 열림
```

### 코드 스타일 및 품질

#### 1. ESLint 실행

```bash
# 린트 검사
npm run lint

# 자동 수정
npm run lint:fix
```

#### 2. Prettier 포맷팅

```bash
# 코드 포맷팅
npm run format
```

#### 3. 사전 커밋 훅 설정

```bash
# Husky 설치 (이미 package.json에 포함됨)
npx husky install

# 커밋 전 자동 검사 설정
npx husky add .husky/pre-commit "npm run validate"
```

## 📦 빌드 및 패키징

### 개발 빌드

```bash
# 개발용 빌드 (소스맵 포함, 압축 안함)
npm run build:dev
```

### 프로덕션 빌드

```bash
# 프로덕션 빌드 (최적화, 압축)
npm run build

# 빌드 결과 확인
ls -la dist/
```

### 배포 패키지 생성

```bash
# ZIP 파일 생성
npm run package

# 생성된 파일 확인
ls -la tts-voice-bridge.zip
```

### 빌드 최적화

#### Webpack 설정 (`webpack.config.js`)

```javascript
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";

  return {
    entry: {
      "background/background": "./src/background/background.js",
      "content/content": "./src/content/content.js",
      "popup/popup": "./src/popup/popup.js",
      "settings/settings": "./src/settings/settings.js",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      clean: true,
    },
    devtool: isProduction ? false : "source-map",
    optimization: {
      minimize: isProduction,
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: "manifest.json", to: "manifest.json" },
          { from: "src/popup/popup.html", to: "popup/popup.html" },
          { from: "src/popup/popup.css", to: "popup/popup.css" },
          { from: "src/settings/settings.html", to: "settings/settings.html" },
          { from: "src/settings/settings.css", to: "settings/settings.css" },
          { from: "icons/", to: "icons/" },
        ],
      }),
    ],
  };
};
```

## 🧪 테스트

### 테스트 구조

```
tests/
├── unit/                         # 단위 테스트
│   ├── background/
│   ├── content/
│   ├── popup/
│   └── lib/
├── integration/                  # 통합 테스트
├── performance/                  # 성능 테스트
└── user-acceptance/             # 사용자 수용 테스트
```

### 테스트 실행

#### 1. 전체 테스트

```bash
# 모든 테스트 실행
npm test

# 감시 모드로 실행
npm test -- --watch
```

#### 2. 특정 테스트

```bash
# 단위 테스트만 실행
npm test -- tests/unit/

# 특정 파일 테스트
npm test -- tests/unit/lib/tts-engine.test.js

# 패턴으로 테스트
npm test -- --testNamePattern="TTS Engine"
```

#### 3. 커버리지 확인

```bash
# 커버리지 리포트 생성
npm run test:coverage

# 브라우저에서 커버리지 확인
open coverage/index.html
```

#### 4. UI 모드로 테스트

```bash
# 테스트 UI 실행
npm run test:ui
```

### 테스트 작성 가이드

#### 단위 테스트 예시

```javascript
// tests/unit/lib/tts-engine.test.js
import { describe, it, expect, beforeEach, vi } from "vitest";
import TTSEngine from "../../../src/lib/tts-engine.js";

describe("TTS Engine", () => {
  let ttsEngine;

  beforeEach(() => {
    // Mock Web Speech API
    global.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
    };

    ttsEngine = new TTSEngine();
  });

  it("should initialize correctly", () => {
    expect(ttsEngine).toBeDefined();
    expect(ttsEngine.isSupported()).toBe(true);
  });

  it("should speak text", async () => {
    const text = "안녕하세요";
    await ttsEngine.speak(text);

    expect(global.speechSynthesis.speak).toHaveBeenCalled();
  });
});
```

#### 통합 테스트 예시

```javascript
// tests/integration/popup-integration.test.js
import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";

describe("Popup Integration", () => {
  it("should integrate with TTS engine", async () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <input id="textInput" value="테스트 텍스트">
          <button id="playButton">재생</button>
        </body>
      </html>
    `);

    global.window = dom.window;
    global.document = dom.window.document;

    // 팝업 스크립트 로드 및 테스트
    // ...
  });
});
```

## 🚀 배포

### Chrome 웹 스토어 배포

#### 1. 개발자 계정 설정

1. [Chrome 웹 스토어 개발자 대시보드](https://chrome.google.com/webstore/devconsole/) 접속
2. Google 계정으로 로그인
3. 개발자 등록비 $5 결제
4. 개발자 계정 활성화

#### 2. 확장프로그램 등록

```bash
# 배포용 빌드 생성
npm run build

# 패키지 생성
npm run package
```

#### 3. 스토어 정보 작성

- **이름**: TTS Voice Bridge
- **요약**: 텍스트를 음성으로 변환하여 ChatGPT와 구글 음성검색에서 사용
- **설명**: 상세한 기능 설명 및 사용법
- **카테고리**: 생산성
- **언어**: 한국어, 영어

#### 4. 스크린샷 및 아이콘

```bash
# 필요한 이미지 크기
icons/
├── icon16.png    # 16x16 (툴바)
├── icon48.png    # 48x48 (확장프로그램 관리)
├── icon128.png   # 128x128 (웹 스토어)
└── screenshots/  # 1280x800 또는 640x400 (최소 1개, 최대 5개)
```

#### 5. 개인정보 보호정책

```markdown
# 개인정보 보호정책

## 데이터 수집

TTS Voice Bridge는 다음과 같은 데이터를 수집하지 않습니다:

- 개인 식별 정보
- 입력한 텍스트 내용
- 브라우징 기록

## 데이터 저장

- 음성 설정은 로컬 브라우저에만 저장됩니다
- 서버로 전송되는 데이터는 없습니다

## 권한 사용

- activeTab: 현재 탭에서 음성인식 상태 감지
- storage: 사용자 설정 저장
```

### Microsoft Edge Add-ons 배포

#### 1. Partner Center 등록

1. [Microsoft Partner Center](https://partner.microsoft.com/) 접속
2. Microsoft 계정으로 로그인
3. 개발자 계정 등록

#### 2. 확장프로그램 제출

```bash
# Edge 호환 빌드 (필요시)
npm run build:edge

# 패키지 생성
npm run package
```

### 자동 배포 설정

#### GitHub Actions 워크플로우

```yaml
# .github/workflows/deploy.yml
name: Deploy Extension

on:
  push:
    tags:
      - "v*"

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build extension
        run: npm run build

      - name: Package extension
        run: npm run package

      - name: Upload to Chrome Web Store
        uses: mnao305/chrome-extension-upload@v4.0.1
        with:
          file-path: ./tts-voice-bridge.zip
          extension-id: ${{ secrets.CHROME_EXTENSION_ID }}
          client-id: ${{ secrets.CHROME_CLIENT_ID }}
          client-secret: ${{ secrets.CHROME_CLIENT_SECRET }}
          refresh-token: ${{ secrets.CHROME_REFRESH_TOKEN }}

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
```

## ⚙️ CI/CD 설정

### GitHub Actions 설정

#### 1. 지속적 통합 (CI)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16, 18, 20]

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

      - name: Build extension
        run: npm run build
```

#### 2. 환경 변수 설정

GitHub 저장소 → Settings → Secrets and variables → Actions

**필수 시크릿:**

- `CHROME_EXTENSION_ID`: Chrome 웹 스토어 확장프로그램 ID
- `CHROME_CLIENT_ID`: Google API 클라이언트 ID
- `CHROME_CLIENT_SECRET`: Google API 클라이언트 시크릿
- `CHROME_REFRESH_TOKEN`: Google API 리프레시 토큰

### 품질 게이트 설정

#### 1. 브랜치 보호 규칙

```yaml
# GitHub 저장소 → Settings → Branches
# main 브랜치에 대한 보호 규칙:
- Require a pull request before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Include administrators
```

#### 2. 코드 품질 검사

```javascript
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
  },
  rules: {
    "no-unused-vars": "error",
    "no-console": "warn",
    "prefer-const": "error",
  },
};
```

## 🔍 문제 해결

### 일반적인 개발 문제

#### 1. 빌드 오류

```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 캐시 정리
npm cache clean --force
```

#### 2. 테스트 실패

```bash
# 테스트 환경 확인
npm run test -- --reporter=verbose

# 특정 테스트 디버깅
npm run test -- --testNamePattern="failing test" --no-coverage
```

#### 3. 확장프로그램 로드 실패

```bash
# manifest.json 검증
npx web-ext lint

# 권한 확인
# Chrome 확장프로그램 페이지에서 오류 메시지 확인
```

### 성능 최적화

#### 1. 번들 크기 분석

```bash
# webpack-bundle-analyzer 설치
npm install --save-dev webpack-bundle-analyzer

# 번들 분석
npx webpack-bundle-analyzer dist/
```

#### 2. 메모리 사용량 모니터링

```javascript
// 성능 모니터링 코드 추가
const performanceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration}ms`);
  }
});

performanceObserver.observe({ entryTypes: ["measure"] });
```

### 디버깅 도구

#### 1. Chrome DevTools

```javascript
// 백그라운드 스크립트에서
console.log("Debug info:", data);
debugger; // 브레이크포인트 설정
```

#### 2. 확장프로그램 전용 디버깅

```javascript
// 확장프로그램 컨텍스트에서만 실행
if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message);
  });
}
```

---

이 개발 가이드를 따라하시면 TTS Voice Bridge 확장프로그램을 성공적으로 개발, 테스트, 배포할 수 있습니다. 추가 질문이 있으시면 언제든 문의해주세요!
