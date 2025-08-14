# TTS Voice Bridge 문서

TTS Voice Bridge 사용을 위한 종합 문서 모음입니다.

## 📚 문서 목록

### 🚀 시작하기

- **[설치 가이드](installation-guide.md)** - 확장프로그램 설치 및 초기 설정
- **[시스템 오디오 설정](system-audio-setup.md)** - 스테레오 믹스, BlackHole 등 오디오 라우팅 설정
- **[사용자 가이드](user-guide.md)** - 기본 사용법부터 고급 기능까지

### 🔧 문제 해결

- **[문제 해결 가이드](troubleshooting.md)** - 일반적인 문제와 해결 방법
- **[FAQ](faq.md)** - 자주 묻는 질문과 답변

## 🎯 빠른 시작

### 1단계: 설치

```
Chrome 웹 스토어에서 "TTS Voice Bridge" 검색 후 설치
또는 개발자 모드로 수동 설치
```

### 2단계: 시스템 오디오 설정

```
Windows: 스테레오 믹스 활성화
macOS: BlackHole 설치 및 설정
Linux: PulseAudio 가상 마이크 생성
```

### 3단계: 기본 사용

```
1. 확장프로그램 아이콘 클릭
2. 텍스트 입력
3. 재생 버튼 클릭
4. ChatGPT/Google에서 음성 인식 확인
```

## 📖 주요 기능

### ✨ 핵심 기능

- **텍스트 음성 변환**: 자연스러운 TTS 음성 생성
- **ChatGPT 연동**: 음성모드 자동 감지 및 최적화
- **구글 음성검색**: 검색어 음성 입력 지원
- **다국어 지원**: 한국어, 영어, 일본어 등

### 🎛️ 고급 기능

- **음성 설정 커스터마이징**: 속도, 톤, 볼륨 조정
- **자동 최적화**: 사이트별 최적 설정 자동 적용
- **단축키 지원**: 빠른 접근을 위한 키보드 단축키
- **배치 처리**: 여러 텍스트 순차 재생

## 🔗 지원 사이트

### 완전 지원

- **ChatGPT** (chat.openai.com) - 음성모드 자동 감지
- **Google 검색** (google.com) - 음성검색 지원
- **Google Assistant** (assistant.google.com)

### 부분 지원

- **Bing Chat** (bing.com/chat)
- **Claude** (claude.ai)
- 기타 음성인식 지원 사이트

## 🖥️ 시스템 요구사항

### 지원 브라우저

- Google Chrome 88+
- Microsoft Edge 88+
- Brave, Opera, Vivaldi 등 Chromium 기반 브라우저

### 지원 운영체제

- Windows 10/11
- macOS 10.15+
- Linux (Ubuntu 18.04+)

### 필수 기능

- Web Speech API 지원
- 마이크 권한
- 스피커/헤드폰

## 🛠️ 설치 방법

### Chrome 웹 스토어 (권장)

1. [Chrome 웹 스토어](https://chrome.google.com/webstore/) 접속
2. "TTS Voice Bridge" 검색
3. "Chrome에 추가" 클릭

### 개발자 모드 (개발/테스트용)

```bash
git clone https://github.com/tts-voice-bridge/extension.git
cd extension
npm install
npm run build
```

Chrome 확장프로그램 페이지에서 "압축해제된 확장 프로그램 로드"로 `dist` 폴더 선택

## ⚙️ 기본 설정

### 권한 설정

- **마이크 접근**: TTS 음성을 시스템으로 전달
- **활성 탭**: 음성인식 상태 감지
- **저장소**: 사용자 설정 저장

### 음성 설정

```
언어: 한국어 (ko-KR)
음성: Microsoft Heami / Google 한국어
속도: 0.9 (ChatGPT 최적화)
톤: 1.0
볼륨: 0.8
```

## 🎤 시스템 오디오 설정

TTS 음성을 음성인식 시스템에서 인식하려면 오디오 라우팅 설정이 필요합니다.

### Windows - 스테레오 믹스

```
1. 사운드 제어판 → 녹음 탭
2. 빈 공간 우클릭 → "사용 안 함인 장치 표시"
3. 스테레오 믹스 우클릭 → "사용"
4. 스테레오 믹스 우클릭 → "기본 장치로 설정"
```

### macOS - BlackHole

```bash
# Homebrew로 설치
brew install blackhole-2ch

# Audio MIDI 설정에서 다중 출력 장치 생성
# BlackHole 2ch + 내장 출력 선택
```

### Linux - PulseAudio

```bash
# 가상 마이크 생성
pactl load-module module-null-sink sink_name=virtual-mic
pactl load-module module-loopback source=virtual-mic.monitor sink=@DEFAULT_SINK@
pactl set-default-source virtual-mic.monitor
```

자세한 설정 방법은 [시스템 오디오 설정 가이드](system-audio-setup.md)를 참조하세요.

## 🎯 사용 예시

### ChatGPT 대화

```
1. ChatGPT 페이지에서 음성모드 활성화
2. TTS Voice Bridge 팝업 열기
3. "안녕하세요, ChatGPT. 프로그래밍에 대해 질문이 있습니다." 입력
4. 재생 버튼 클릭
5. ChatGPT가 음성을 인식하여 응답
```

### 구글 음성검색

```
1. Google 검색 페이지에서 마이크 아이콘 클릭
2. TTS Voice Bridge 팝업 열기
3. "서울 날씨" 입력
4. 재생 버튼 클릭
5. 구글이 검색어를 인식하여 검색 실행
```

## 🔧 문제 해결

### 일반적인 문제

#### 음성이 재생되지 않음

- 시스템 볼륨 확인
- 브라우저 사운드 설정 확인
- 다른 TTS 음성으로 변경
- 브라우저 재시작

#### ChatGPT에서 인식 안됨

- 시스템 오디오 설정 확인 (스테레오 믹스 등)
- TTS 속도를 0.8~0.9로 조정
- 마이크 권한 확인
- 볼륨을 0.7~0.8로 조정

#### 성능 문제

- 사용하지 않는 탭 닫기
- 다른 확장프로그램 일시 비활성화
- 브라우저 캐시 정리
- 하드웨어 가속 활성화

더 자세한 문제 해결 방법은 [문제 해결 가이드](troubleshooting.md)를 참조하세요.

## 📞 지원 및 커뮤니티

### 도움 받기

- **GitHub Issues**: 버그 리포트 및 기능 요청
- **GitHub Discussions**: 아이디어 토론 및 질문
- **Discord 서버**: 실시간 커뮤니티 지원
- **Reddit**: r/TTSVoiceBridge

### 기여하기

- **코드 기여**: Pull Request 제출
- **번역**: 다국어 지원 기여
- **문서 개선**: 가이드 및 튜토리얼 작성
- **버그 리포트**: 문제 발견 시 상세한 리포트 작성

### 연락처

- **이메일**: support@ttsvoicebridge.com
- **GitHub**: https://github.com/tts-voice-bridge/extension
- **웹사이트**: https://ttsvoicebridge.com

## 📄 라이선스

TTS Voice Bridge는 MIT 라이선스 하에 배포되는 오픈소스 프로젝트입니다.

```
MIT License

Copyright (c) 2024 TTS Voice Bridge Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🔄 업데이트 및 버전 관리

### 자동 업데이트

- Chrome 웹 스토어를 통한 자동 업데이트
- 새 버전 출시 시 자동으로 설치

### 수동 업데이트 (개발자 모드)

```bash
git pull origin main
npm install
npm run build
```

Chrome 확장프로그램 페이지에서 "새로고침" 버튼 클릭

### 버전 확인

- 확장프로그램 팝업에서 버전 정보 확인
- `chrome://extensions/`에서 세부 정보 확인

---

**TTS Voice Bridge를 사용해주셔서 감사합니다! 문제가 있거나 개선 사항이 있으시면 언제든 연락해주세요.**
