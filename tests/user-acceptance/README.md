# User Acceptance Tests - TTS Voice Bridge

이 디렉토리는 TTS Voice Bridge 확장프로그램의 사용자 수용 테스트(User Acceptance Tests)를 포함합니다.

## 테스트 개요

사용자 수용 테스트는 실제 사용 시나리오를 기반으로 하여 다음 요구사항들을 검증합니다:

- **Requirements 2.1, 2.2**: ChatGPT 음성모드에서의 TTS 인식률 및 상태 감지
- **Requirements 3.1, 3.2**: 구글 음성검색에서의 TTS 인식률 및 상태 감지
- **Requirement 5.1**: 다양한 언어 및 음성 설정에서의 테스트

## 테스트 파일 구조

```
tests/user-acceptance/
├── README.md                     # 이 파일
├── user-acceptance.test.js       # 전체 사용자 수용 테스트
├── chatgpt-integration.test.js   # ChatGPT 통합 테스트
├── google-voice-search.test.js   # 구글 음성검색 테스트
└── test-runner.js               # 테스트 실행 도구
```

## 테스트 실행 방법

### 전체 사용자 수용 테스트 실행

```bash
npm test -- tests/user-acceptance/
```

### 개별 테스트 파일 실행

```bash
# ChatGPT 통합 테스트
npm test -- tests/user-acceptance/chatgpt-integration.test.js

# 구글 음성검색 테스트
npm test -- tests/user-acceptance/google-voice-search.test.js

# 전체 사용자 수용 테스트
npm test -- tests/user-acceptance/user-acceptance.test.js
```

### 테스트 커버리지 확인

```bash
npm run test:coverage -- tests/user-acceptance/
```

## 테스트 시나리오

### 1. ChatGPT 음성모드 테스트 (`chatgpt-integration.test.js`)

#### 테스트 카테고리:

- **음성모드 감지**: ChatGPT 페이지에서 음성모드 활성화/비활성화 상태 감지
- **최적화 설정**: 텍스트 길이와 복잡도에 따른 TTS 설정 최적화
- **인식 정확도**: 다양한 카테고리의 텍스트에 대한 인식률 측정
- **오류 처리**: 페이지 로딩 오류, DOM 구조 변경 등에 대한 대응

#### 주요 테스트 케이스:

```javascript
// 일상 대화 (기대 정확도: 92% 이상)
"안녕하세요", "고마워요", "잘 지내세요?";

// 기술 질문 (기대 정확도: 88% 이상)
"JavaScript 배우는 방법", "React 컴포넌트 만들기";

// 복잡한 질문 (기대 정확도: 82% 이상)
("머신러닝과 딥러닝의 차이점을 설명해주세요");
```

### 2. 구글 음성검색 테스트 (`google-voice-search.test.js`)

#### 테스트 카테고리:

- **음성검색 감지**: 구글 검색 페이지에서 음성검색 활성화 상태 감지
- **검색 최적화**: 검색어 특성에 따른 TTS 설정 최적화
- **인식 정확도**: 검색어 카테고리별 인식률 측정
- **특수 기능**: "OK Google" 핫워드, 자동완성, 오류 복구 등

#### 주요 테스트 케이스:

```javascript
// 일반 검색어 (기대 정확도: 95% 이상)
"날씨", "뉴스", "맛집", "영화";

// 위치 기반 검색 (기대 정확도: 92% 이상)
"근처 카페", "서울 맛집", "강남역 주변";

// 기술 관련 검색 (기대 정확도: 88% 이상)
"파이썬 강의", "JavaScript 튜토리얼";
```

### 3. 다국어 및 음성 설정 테스트 (`user-acceptance.test.js`)

#### 테스트 카테고리:

- **다국어 지원**: 한국어, 영어, 일본어 등 다양한 언어 테스트
- **음성 설정**: 속도, 톤, 볼륨 등 다양한 설정 조합 테스트
- **성능 테스트**: 연속 재생, 메모리 사용량, 응답 시간 등
- **통합 시나리오**: 실제 사용자 플로우를 모방한 종합 테스트

#### 지원 언어:

- **한국어 (ko-KR)**: Microsoft Heami, Google 한국어
- **영어 (en-US)**: Google US English, Microsoft Zira
- **일본어 (ja-JP)**: Google 日本語
- **기타**: 프랑스어, 스페인어 등 (대체 음성 사용)

## 테스트 결과 해석

### 인식 정확도 기준

| 카테고리        | ChatGPT | Google 검색 | 기준                    |
| --------------- | ------- | ----------- | ----------------------- |
| 간단한 텍스트   | ≥ 92%   | ≥ 95%       | 일상적인 단어/구문      |
| 일반적인 텍스트 | ≥ 88%   | ≥ 92%       | 보통 길이의 문장        |
| 복잡한 텍스트   | ≥ 82%   | ≥ 85%       | 긴 문장, 기술 용어 포함 |
| 다국어 텍스트   | ≥ 85%   | ≥ 88%       | 영어, 일본어 등         |

### 성능 기준

| 메트릭        | 기준        | 설명                       |
| ------------- | ----------- | -------------------------- |
| 응답 시간     | < 1초       | TTS 생성 및 재생 시작 시간 |
| 메모리 사용량 | < 50MB      | 확장프로그램 메모리 사용량 |
| 연속 재생     | 100% 성공률 | 10회 연속 재생 안정성      |
| 캐시 효율성   | > 80%       | 캐시 히트율                |

## 테스트 환경 설정

### Mock 환경

테스트는 실제 브라우저 환경을 시뮬레이션하는 Mock 객체를 사용합니다:

```javascript
// Web Speech API Mock
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn().mockReturnValue(mockVoices),
};

// DOM Mock (ChatGPT/Google 페이지)
const mockPage = {
  querySelector: vi.fn(),
  addEventListener: vi.fn(),
};
```

### 시뮬레이션 정확도

실제 음성인식 시스템의 동작을 시뮬레이션하기 위해 다음 요소들을 고려합니다:

- **언어별 인식률 차이**
- **텍스트 복잡도에 따른 정확도 변화**
- **TTS 설정(속도, 볼륨 등)의 영향**
- **네트워크 지연 시뮬레이션**
- **실제 환경의 변동성 (±5% 랜덤 요소)**

## 테스트 실패 시 대응

### 일반적인 실패 원인

1. **인식 정확도 미달**

   - TTS 설정 최적화 필요
   - 텍스트 전처리 개선 필요
   - 음성 품질 향상 필요

2. **상태 감지 실패**

   - DOM 셀렉터 업데이트 필요
   - 페이지 구조 변경 대응 필요
   - 대체 감지 방법 구현 필요

3. **성능 문제**
   - 메모리 누수 확인
   - 캐시 최적화 필요
   - 비동기 처리 개선 필요

### 디버깅 방법

```bash
# 상세 로그와 함께 테스트 실행
npm test -- tests/user-acceptance/ --verbose

# 특정 테스트만 실행
npm test -- tests/user-acceptance/ --testNamePattern="ChatGPT"

# 커버리지 리포트 생성
npm run test:coverage -- tests/user-acceptance/
```

## 지속적인 개선

### 테스트 업데이트 주기

- **월간**: 인식 정확도 기준 검토 및 조정
- **분기별**: 새로운 사용 시나리오 추가
- **반기별**: 지원 언어 및 플랫폼 확장

### 피드백 수집

실제 사용자 피드백을 바탕으로 테스트 시나리오를 지속적으로 개선합니다:

1. 사용자 보고 오류 사례를 테스트에 반영
2. 새로운 웹사이트 지원 요청 시 테스트 추가
3. 성능 개선 요구사항을 테스트 기준에 반영

## 관련 문서

- [Requirements Document](../../.kiro/specs/tts-voice-bridge/requirements.md)
- [Design Document](../../.kiro/specs/tts-voice-bridge/design.md)
- [Integration Tests](../integration/README.md)
- [Performance Tests](../performance/README.md)
