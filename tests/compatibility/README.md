# Browser Compatibility Tests

이 디렉토리는 TTS Voice Bridge 확장프로그램의 브라우저 호환성 테스트를 포함합니다.

## 테스트 구조

### 1. browser-compatibility.test.js

Chrome과 Edge 브라우저에서의 전체 기능 테스트를 수행합니다.

**테스트 범위:**

- Chrome 120+ 브라우저 호환성
- Edge 120+ 브라우저 호환성
- Web Speech API 지원 확인
- Chrome Extension API 호환성
- 크로스 브라우저 기능 테스트
- 브라우저 버전 호환성
- Extension API 호환성

**주요 테스트 케이스:**

- 브라우저 감지 및 식별
- Web Speech API 지원 여부
- TTS 음성 재생 기능
- 한국어 음성 지원
- Chrome/Edge 확장프로그램 API
- 스토리지 API 기능
- 메시지 통신 기능

### 2. os-tts-quality.test.js

다양한 운영체제에서의 TTS 품질 테스트를 수행합니다.

**테스트 범위:**

- Windows TTS 품질 테스트
- macOS TTS 품질 테스트
- Linux TTS 품질 테스트
- 크로스 플랫폼 TTS 호환성
- TTS 품질 메트릭
- 플랫폼별 오류 처리

**주요 테스트 케이스:**

- 플랫폼별 음성 엔진 감지
- 운영체제별 한국어 음성 지원
- TTS 품질 최적화 설정
- 음성인식 호환성 테스트
- TTS 응답 시간 측정
- 일관성 테스트
- 오류 처리 테스트

### 3. compatibility-runner.test.js

종합적인 호환성 테스트 실행 및 리포트 생성을 담당합니다.

**테스트 범위:**

- 브라우저 호환성 매트릭스
- 플랫폼 호환성 매트릭스
- 기능별 호환성 테스트
- 호환성 리포트 생성
- 최소 요구사항 검증

**주요 기능:**

- 자동화된 호환성 테스트 실행
- 상세한 호환성 리포트 생성
- 실패한 테스트에 대한 권장사항 제공
- 최소 호환성 요구사항 검증

## 지원하는 브라우저

### Chrome

- **최소 버전:** Chrome 100+
- **권장 버전:** Chrome 120+
- **테스트된 기능:**
  - Web Speech API
  - Chrome Extension API
  - 한국어 TTS 지원
  - 스토리지 API
  - 메시지 통신

### Edge

- **최소 버전:** Edge 100+
- **권장 버전:** Edge 120+
- **테스트된 기능:**
  - Web Speech API
  - Chrome Extension API (호환)
  - 한국어 TTS 지원
  - 스토리지 API
  - 메시지 통신

## 지원하는 운영체제

### Windows

- **테스트된 음성:** Microsoft Heami (한국어), Microsoft Zira (영어)
- **최적화 설정:** Rate 0.9, Volume 0.8
- **특징:** 고품질 Microsoft TTS 엔진 지원

### macOS

- **테스트된 음성:** Yuna (한국어), Samantha (영어)
- **최적화 설정:** Rate 1.0, Volume 0.9
- **특징:** Apple 고품질 TTS 엔진 지원

### Linux

- **테스트된 음성:** eSpeak Korean, eSpeak English
- **최적화 설정:** Rate 0.8, Volume 1.0
- **특징:** 오픈소스 eSpeak 엔진 지원

## 테스트 실행 방법

### 모든 호환성 테스트 실행

```bash
npm run test:compatibility
```

### 호환성 테스트 감시 모드

```bash
npm run test:compatibility:watch
```

### 특정 테스트 파일 실행

```bash
# 브라우저 호환성 테스트만
npx vitest tests/compatibility/browser-compatibility.test.js --run

# OS TTS 품질 테스트만
npx vitest tests/compatibility/os-tts-quality.test.js --run

# 호환성 리포트 생성
npx vitest tests/compatibility/compatibility-runner.test.js --run
```

## 테스트 결과 해석

### 성공 기준

- 모든 브라우저에서 Web Speech API 지원
- 모든 플랫폼에서 한국어 TTS 지원
- Extension API 정상 동작
- TTS 품질 최적화 설정 적용

### 실패 시 대응

1. **브라우저 미지원:** 최신 버전으로 업데이트 권장
2. **음성 엔진 없음:** 시스템 TTS 설정 확인
3. **권한 오류:** 브라우저 권한 설정 확인
4. **API 오류:** Extension manifest 설정 확인

## 호환성 리포트

테스트 실행 시 자동으로 생성되는 호환성 리포트는 다음 정보를 포함합니다:

- **요약:** 전체 테스트 통과율
- **브라우저별 결과:** Chrome, Edge 각각의 기능별 테스트 결과
- **플랫폼별 결과:** Windows, macOS, Linux 각각의 TTS 품질 테스트 결과
- **기능별 결과:** 각 기능의 호환성 상태
- **권장사항:** 실패한 테스트에 대한 해결 방안

## 요구사항 매핑

이 테스트들은 다음 요구사항을 검증합니다:

- **Requirement 6.1:** Chrome에서의 안정적 작동
- **Requirement 6.2:** Edge에서의 안정적 작동
- **Requirement 6.3:** 브라우저 권한 처리
- **Requirement 6.4:** Web Speech API 미지원 시 대체 솔루션

## 지속적인 호환성 관리

1. **정기 테스트:** 새로운 브라우저 버전 출시 시 호환성 테스트 실행
2. **모니터링:** 사용자 피드백을 통한 호환성 이슈 추적
3. **업데이트:** 새로운 플랫폼이나 브라우저 지원 시 테스트 케이스 추가
4. **문서화:** 호환성 변경사항 문서 업데이트

## 문제 해결

### 일반적인 문제들

1. **TTS 음성이 재생되지 않음**

   - 브라우저 TTS 권한 확인
   - 시스템 오디오 설정 확인
   - Web Speech API 지원 여부 확인

2. **한국어 음성이 없음**

   - 시스템 언어팩 설치 확인
   - 브라우저 언어 설정 확인
   - TTS 엔진 설치 상태 확인

3. **Extension API 오류**
   - manifest.json 권한 설정 확인
   - 브라우저 확장프로그램 권한 확인
   - 개발자 모드 활성화 확인

### 디버깅 팁

- 브라우저 개발자 도구 콘솔에서 오류 메시지 확인
- `chrome://extensions/` 페이지에서 확장프로그램 상태 확인
- 시스템 TTS 설정에서 음성 엔진 상태 확인
- 테스트 실행 시 상세 로그 확인
