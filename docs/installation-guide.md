# TTS Voice Bridge 설치 가이드

TTS Voice Bridge는 크로미움 기반 브라우저(Chrome, Edge 등)에서 작동하는 확장프로그램입니다. 이 가이드를 따라 설치하고 설정하세요.

## 📋 시스템 요구사항

### 지원 브라우저

- **Google Chrome** 88 이상
- **Microsoft Edge** 88 이상
- **Chromium 기반 브라우저** (Brave, Opera 등)

### 지원 운영체제

- **Windows** 10/11
- **macOS** 10.15 (Catalina) 이상
- **Linux** (Ubuntu 18.04 이상 권장)

### 필수 기능

- **Web Speech API 지원** (대부분의 최신 브라우저에서 지원)
- **마이크 권한** (음성 입력을 위해 필요)
- **스피커/헤드폰** (TTS 음성 출력용)

## 🚀 설치 방법

### 방법 1: Chrome 웹 스토어에서 설치 (권장)

1. **Chrome 웹 스토어 접속**

   ```
   https://chrome.google.com/webstore/
   ```

2. **TTS Voice Bridge 검색**

   - 검색창에 "TTS Voice Bridge" 입력
   - 개발자가 "TTS Voice Bridge Team"인지 확인

3. **설치하기**

   - "Chrome에 추가" 버튼 클릭
   - 권한 요청 창에서 "확장 프로그램 추가" 클릭

4. **설치 확인**
   - 브라우저 우상단에 TTS Voice Bridge 아이콘이 나타나는지 확인
   - 아이콘이 보이지 않으면 확장프로그램 메뉴(퍼즐 아이콘)에서 고정

### 방법 2: 개발자 모드로 설치 (개발/테스트용)

1. **소스 코드 다운로드**

   ```bash
   git clone https://github.com/tts-voice-bridge/extension.git
   cd extension
   npm install
   npm run build
   ```

2. **Chrome 확장프로그램 페이지 열기**

   - Chrome 주소창에 `chrome://extensions/` 입력
   - 또는 메뉴 → 도구 더보기 → 확장프로그램

3. **개발자 모드 활성화**

   - 우상단의 "개발자 모드" 토글 스위치 켜기

4. **압축해제된 확장프로그램 로드**

   - "압축해제된 확장 프로그램을 로드합니다" 클릭
   - 빌드된 `dist` 폴더 선택

5. **설치 확인**
   - 확장프로그램 목록에 "TTS Voice Bridge"가 나타나는지 확인
   - 활성화 상태인지 확인

## ⚙️ 초기 설정

### 1. 권한 설정

설치 후 다음 권한들이 필요합니다:

#### 필수 권한

- **마이크 접근**: TTS 음성을 시스템으로 전달하기 위해 필요
- **활성 탭**: 현재 페이지의 음성인식 상태 감지용
- **저장소**: 사용자 설정 저장용

#### 권한 허용 방법

1. 확장프로그램 아이콘 클릭
2. "권한 설정" 버튼 클릭
3. 각 권한에 대해 "허용" 선택
4. 브라우저 재시작 (권장)

### 2. 기본 설정 구성

1. **확장프로그램 아이콘 클릭**
2. **설정(⚙️) 버튼 클릭**
3. **기본 설정 구성**:

   ```
   음성 설정:
   - 언어: 한국어 (ko-KR)
   - 음성: Microsoft Heami (Windows) / Google 한국어
   - 속도: 0.9 (ChatGPT 최적화)
   - 톤: 1.0 (기본)
   - 볼륨: 0.8 (권장)

   고급 설정:
   - 자동 감지: 활성화
   - 지원 사이트: ChatGPT, Google 검색
   - 단축키: Ctrl+Shift+T (기본)
   ```

4. **설정 저장** 버튼 클릭

### 3. 음성 테스트

1. **미리듣기 기능 사용**

   - 설정 페이지에서 "미리듣기" 버튼 클릭
   - "안녕하세요, TTS Voice Bridge입니다" 음성이 재생되는지 확인

2. **기본 기능 테스트**
   - 확장프로그램 팝업 열기
   - 텍스트 입력 필드에 "테스트" 입력
   - 재생 버튼(▶️) 클릭
   - 음성이 정상적으로 재생되는지 확인

## 🔧 시스템 오디오 설정

TTS Voice Bridge가 생성한 음성을 다른 애플리케이션의 음성인식 시스템에서 인식하려면 시스템 오디오 설정이 필요합니다.

### Windows 설정

#### 방법 1: 스테레오 믹스 활성화 (권장)

1. **사운드 설정 열기**

   - 작업표시줄의 스피커 아이콘 우클릭
   - "사운드 설정 열기" 선택

2. **고급 사운드 옵션**

   - "사운드 제어판" 클릭
   - "녹음" 탭 선택

3. **스테레오 믹스 활성화**

   - 빈 공간에서 우클릭 → "사용 안 함인 장치 표시" 체크
   - "스테레오 믹스" 우클릭 → "사용" 선택
   - "스테레오 믹스" 우클릭 → "기본 장치로 설정"

4. **설정 확인**
   - TTS Voice Bridge에서 음성 재생
   - 스테레오 믹스의 레벨 표시기가 움직이는지 확인

#### 방법 2: 가상 오디오 케이블 사용

1. **VB-Audio Virtual Cable 설치**

   ```
   https://vb-audio.com/Cable/
   ```

2. **가상 케이블 설정**

   - 설치 후 재부팅
   - 사운드 설정에서 "CABLE Input"을 기본 재생 장치로 설정
   - "CABLE Output"을 기본 녹음 장치로 설정

3. **브라우저 오디오 설정**
   - Chrome 설정 → 고급 → 개인정보 및 보안 → 사이트 설정
   - 마이크 → "CABLE Output" 선택

### macOS 설정

#### 방법 1: SoundFlower 사용

1. **SoundFlower 설치**

   ```bash
   brew install --cask soundflower
   ```

2. **Audio MIDI 설정**

   - 응용 프로그램 → 유틸리티 → Audio MIDI 설정
   - "+" 버튼 → "다중 출력 장치 생성"
   - SoundFlower (2ch)와 내장 출력 모두 체크

3. **시스템 사운드 설정**
   - 시스템 환경설정 → 사운드
   - 출력: 생성한 다중 출력 장치 선택
   - 입력: SoundFlower (2ch) 선택

#### 방법 2: BlackHole 사용 (권장)

1. **BlackHole 설치**

   ```bash
   brew install blackhole-2ch
   ```

2. **Audio MIDI 설정**

   - Audio MIDI 설정 열기
   - 다중 출력 장치 생성
   - BlackHole 2ch와 내장 출력 선택

3. **시스템 설정**
   - 출력: 다중 출력 장치
   - 입력: BlackHole 2ch

### Linux 설정

#### PulseAudio 사용

1. **PulseAudio 모듈 로드**

   ```bash
   pactl load-module module-null-sink sink_name=virtual-mic
   pactl load-module module-loopback source=virtual-mic.monitor sink=@DEFAULT_SINK@
   ```

2. **기본 소스 설정**

   ```bash
   pactl set-default-source virtual-mic.monitor
   ```

3. **영구 설정**
   ```bash
   echo "load-module module-null-sink sink_name=virtual-mic" >> ~/.config/pulse/default.pa
   echo "load-module module-loopback source=virtual-mic.monitor sink=@DEFAULT_SINK@" >> ~/.config/pulse/default.pa
   ```

## ✅ 설치 확인

### 1. 기본 기능 테스트

1. **확장프로그램 동작 확인**

   - 브라우저 우상단의 TTS Voice Bridge 아이콘 클릭
   - 팝업이 정상적으로 열리는지 확인

2. **TTS 기능 테스트**

   - 텍스트 입력: "안녕하세요"
   - 재생 버튼 클릭
   - 음성이 재생되는지 확인

3. **설정 페이지 접근**
   - 팝업에서 설정(⚙️) 버튼 클릭
   - 설정 페이지가 열리는지 확인

### 2. ChatGPT 연동 테스트

1. **ChatGPT 페이지 접속**

   ```
   https://chat.openai.com
   ```

2. **음성모드 활성화**

   - ChatGPT 음성 버튼 클릭
   - "Listening..." 상태 확인

3. **TTS Voice Bridge 사용**
   - 확장프로그램 팝업 열기
   - "안녕하세요, ChatGPT입니다" 입력
   - 재생 버튼 클릭
   - ChatGPT가 음성을 인식하는지 확인

### 3. 구글 음성검색 테스트

1. **구글 검색 페이지 접속**

   ```
   https://www.google.com
   ```

2. **음성검색 활성화**

   - 검색창의 마이크 아이콘 클릭
   - "말씀하세요" 상태 확인

3. **TTS Voice Bridge 사용**
   - 확장프로그램 팝업 열기
   - "오늘 날씨" 입력
   - 재생 버튼 클릭
   - 구글이 검색어를 인식하는지 확인

## 🔧 문제 해결

### 일반적인 문제

#### 1. 확장프로그램 아이콘이 보이지 않음

**해결방법:**

- 브라우저 우상단의 확장프로그램 메뉴(퍼즐 아이콘) 클릭
- TTS Voice Bridge 찾아서 고정(📌) 아이콘 클릭

#### 2. 음성이 재생되지 않음

**해결방법:**

- 브라우저 사운드 설정 확인
- 시스템 볼륨 확인
- 다른 음성으로 변경 시도
- 브라우저 재시작

#### 3. 권한 오류

**해결방법:**

- Chrome 설정 → 개인정보 및 보안 → 사이트 설정
- 마이크 권한 확인 및 허용
- 확장프로그램 권한 재설정

#### 4. ChatGPT/Google에서 인식 안됨

**해결방법:**

- 시스템 오디오 설정 확인 (스테레오 믹스 등)
- TTS 속도를 0.8~0.9로 조정
- 볼륨을 0.7~0.9로 조정
- 마이크 입력 장치 확인

### 고급 문제 해결

#### 브라우저별 특이사항

**Chrome:**

- 최신 버전 사용 권장
- 하드웨어 가속 비활성화 시 성능 개선 가능

**Edge:**

- Windows 통합 TTS 엔진 사용 가능
- 개인정보 보호 설정 확인 필요

**기타 Chromium 브라우저:**

- Web Speech API 지원 여부 확인
- 확장프로그램 호환성 확인

#### 운영체제별 특이사항

**Windows:**

- Windows Defender 실시간 보호 예외 추가 고려
- 사운드 드라이버 최신 버전 확인

**macOS:**

- 시스템 무결성 보호(SIP) 설정 확인
- 마이크 접근 권한 시스템 설정에서 허용

**Linux:**

- PulseAudio/ALSA 설정 확인
- 권한 문제 시 사용자 그룹 확인

## 📞 지원 및 문의

### 문서 및 리소스

- **사용자 가이드**: [docs/user-guide.md](user-guide.md)
- **문제 해결 가이드**: [docs/troubleshooting.md](troubleshooting.md)
- **FAQ**: [docs/faq.md](faq.md)

### 커뮤니티 지원

- **GitHub Issues**: 버그 리포트 및 기능 요청
- **Discord 서버**: 실시간 커뮤니티 지원
- **Reddit**: r/TTSVoiceBridge

### 개발자 연락처

- **이메일**: support@ttsvoicebridge.com
- **GitHub**: https://github.com/tts-voice-bridge/extension

---

**설치가 완료되었다면 [사용자 가이드](user-guide.md)를 참고하여 TTS Voice Bridge를 활용해보세요!**
