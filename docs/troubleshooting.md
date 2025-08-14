# TTS Voice Bridge 문제 해결 가이드

TTS Voice Bridge 사용 중 발생할 수 있는 문제들과 해결 방법을 안내합니다.

## 📋 목차

1. [일반적인 문제](#일반적인-문제)
2. [음성 재생 문제](#음성-재생-문제)
3. [음성인식 문제](#음성인식-문제)
4. [시스템별 문제](#시스템별-문제)
5. [브라우저별 문제](#브라우저별-문제)
6. [성능 문제](#성능-문제)
7. [고급 문제 해결](#고급-문제-해결)

## 🔧 일반적인 문제

### 확장프로그램이 설치되지 않음

#### 증상

- Chrome 웹 스토어에서 설치 버튼이 작동하지 않음
- "확장 프로그램을 추가할 수 없습니다" 오류 메시지

#### 해결 방법

1. **브라우저 버전 확인**

   ```
   Chrome 88 이상 필요
   chrome://version/ 에서 확인
   ```

2. **브라우저 업데이트**

   ```
   Chrome 메뉴 → 도움말 → Chrome 정보
   자동 업데이트 확인 및 적용
   ```

3. **확장프로그램 정책 확인**

   ```
   회사/학교 계정: 관리자에게 문의
   개인 계정: 브라우저 설정 → 고급 → 재설정
   ```

4. **수동 설치 시도**
   ```bash
   # 개발자 모드로 설치
   1. chrome://extensions/ 접속
   2. 개발자 모드 활성화
   3. 소스 코드 다운로드 후 로드
   ```

### 확장프로그램 아이콘이 보이지 않음

#### 증상

- 설치는 완료되었지만 브라우저에 아이콘이 표시되지 않음

#### 해결 방법

1. **확장프로그램 메뉴 확인**

   - 브라우저 우상단 퍼즐 아이콘(🧩) 클릭
   - TTS Voice Bridge 찾아서 고정(📌) 클릭

2. **확장프로그램 활성화 확인**

   ```
   chrome://extensions/ 접속
   TTS Voice Bridge 활성화 상태 확인
   비활성화되어 있으면 토글 스위치 클릭
   ```

3. **브라우저 재시작**
   - 모든 Chrome 창 닫기
   - Chrome 완전 종료 후 재시작

### 권한 오류

#### 증상

- "마이크 권한이 필요합니다" 메시지
- "저장소 접근 권한이 없습니다" 오류

#### 해결 방법

1. **브라우저 권한 설정**

   ```
   Chrome 설정 → 개인정보 및 보안 → 사이트 설정
   마이크 → 허용 목록에 확장프로그램 추가
   ```

2. **확장프로그램 권한 재설정**

   ```
   chrome://extensions/ → TTS Voice Bridge
   세부정보 → 권한 → 모든 권한 허용
   ```

3. **시스템 권한 확인**
   - **Windows**: 설정 → 개인정보 → 마이크 → Chrome 허용
   - **macOS**: 시스템 환경설정 → 보안 및 개인정보 보호 → 마이크 → Chrome 체크
   - **Linux**: 시스템 설정에서 마이크 접근 권한 확인

## 🔊 음성 재생 문제

### 음성이 전혀 재생되지 않음

#### 증상

- 재생 버튼을 눌러도 아무 소리가 나지 않음
- 진행 표시줄이 움직이지 않음

#### 해결 방법

1. **시스템 볼륨 확인**

   ```
   시스템 볼륨이 0이 아닌지 확인
   음소거 상태가 아닌지 확인
   스피커/헤드폰 연결 상태 확인
   ```

2. **브라우저 사운드 설정**

   ```
   Chrome 설정 → 고급 → 개인정보 및 보안
   사이트 설정 → 사운드 → 허용
   ```

3. **다른 음성으로 테스트**

   ```
   설정에서 다른 TTS 음성 선택
   Microsoft → Google 또는 그 반대로 변경
   ```

4. **Web Speech API 지원 확인**
   ```javascript
   // 개발자 도구 콘솔에서 실행
   console.log("speechSynthesis" in window);
   console.log(speechSynthesis.getVoices());
   ```

### 음성이 끊어지거나 불안정함

#### 증상

- 음성 재생 중 갑자기 중단됨
- 음성이 로봇처럼 들림
- 재생 속도가 일정하지 않음

#### 해결 방법

1. **TTS 설정 조정**

   ```
   속도: 0.8 ~ 1.2 범위로 조정
   볼륨: 0.7 ~ 0.9 범위로 조정
   다른 음성 엔진 시도
   ```

2. **시스템 리소스 확인**

   ```
   작업 관리자에서 CPU/메모리 사용률 확인
   다른 프로그램 종료하여 리소스 확보
   ```

3. **브라우저 하드웨어 가속**

   ```
   Chrome 설정 → 고급 → 시스템
   "사용 가능한 경우 하드웨어 가속 사용" 토글
   ```

4. **오디오 드라이버 업데이트**
   - **Windows**: 장치 관리자 → 사운드, 비디오 및 게임 컨트롤러
   - **macOS**: 시스템 업데이트 확인
   - **Linux**: `sudo apt update && sudo apt upgrade` (Ubuntu)

### 특정 텍스트에서만 문제 발생

#### 증상

- 일부 텍스트는 정상 재생되지만 특정 텍스트에서 오류
- 특수 문자나 숫자가 포함된 텍스트에서 문제

#### 해결 방법

1. **텍스트 전처리**

   ```
   특수 문자 제거: !@#$%^&*()
   숫자를 한글로: 123 → 일이삼
   영어를 한글로: Hello → 헬로
   ```

2. **언어 설정 확인**

   ```
   텍스트 언어와 TTS 언어 일치 확인
   혼합 언어 텍스트의 경우 주 언어로 설정
   ```

3. **텍스트 길이 제한**
   ```
   한 번에 500자 이하로 제한
   긴 텍스트는 문장 단위로 분할
   ```

## 🎤 음성인식 문제

### ChatGPT에서 인식되지 않음

#### 증상

- TTS 음성이 재생되지만 ChatGPT가 인식하지 못함
- ChatGPT 음성모드가 "Listening..." 상태에서 변화 없음

#### 해결 방법

1. **시스템 오디오 설정 확인**

   **Windows - 스테레오 믹스 설정:**

   ```
   1. 작업표시줄 스피커 아이콘 우클릭
   2. "사운드 설정 열기" → "사운드 제어판"
   3. "녹음" 탭 → 빈 공간 우클릭
   4. "사용 안 함인 장치 표시" 체크
   5. "스테레오 믹스" 우클릭 → "사용"
   6. "스테레오 믹스" 우클릭 → "기본 장치로 설정"
   ```

   **macOS - SoundFlower/BlackHole 설정:**

   ```bash
   # BlackHole 설치
   brew install blackhole-2ch

   # Audio MIDI 설정에서 다중 출력 장치 생성
   # BlackHole 2ch + 내장 출력 선택
   ```

2. **TTS 설정 최적화**

   ```
   ChatGPT 최적화 설정:
   - 속도: 0.8 ~ 0.9
   - 볼륨: 0.7 ~ 0.8
   - 톤: 1.0
   - 언어: 질문 언어와 일치
   ```

3. **마이크 입력 확인**

   ```
   Chrome 설정 → 개인정보 및 보안 → 사이트 설정
   마이크 → chat.openai.com 허용 확인
   ```

4. **ChatGPT 음성모드 재시작**
   ```
   1. ChatGPT 음성모드 비활성화
   2. 페이지 새로고침
   3. 음성모드 다시 활성화
   4. TTS 테스트
   ```

### 구글 음성검색에서 인식되지 않음

#### 증상

- 구글 음성검색이 "말씀하세요" 상태이지만 TTS 음성을 인식하지 못함

#### 해결 방법

1. **구글 음성검색 설정**

   ```
   Google 계정 → 데이터 및 개인정보 보호
   웹 및 앱 활동 → 음성 및 오디오 활동 활성화
   ```

2. **TTS 설정 최적화**

   ```
   Google 검색 최적화 설정:
   - 속도: 1.0 ~ 1.1
   - 볼륨: 0.8 ~ 0.9
   - 톤: 1.0
   - 언어: 검색어 언어와 일치
   ```

3. **브라우저 마이크 설정**

   ```
   Chrome 설정 → 개인정보 및 보안 → 사이트 설정
   마이크 → google.com 허용 확인
   ```

4. **검색어 최적화**
   ```
   좋은 예: "서울 날씨", "맛집 추천"
   피해야 할 예: "음... 서울의 날씨가 어떤지..."
   ```

### 인식률이 낮음

#### 증상

- 음성은 인식되지만 정확도가 떨어짐
- 일부 단어만 인식되거나 잘못 인식됨

#### 해결 방법

1. **발음 개선**

   ```
   명확한 발음을 위한 설정:
   - 속도를 0.8~0.9로 낮춤
   - 톤을 1.0~1.1로 설정
   - 볼륨을 적절히 조정 (0.7~0.8)
   ```

2. **텍스트 최적화**

   ```
   - 완전한 문장 사용
   - 불필요한 감탄사 제거
   - 기술 용어는 풀어서 설명
   - 숫자는 한글로 표기
   ```

3. **환경 최적화**
   ```
   - 조용한 환경에서 테스트
   - 다른 오디오 소스 차단
   - 마이크 감도 조정
   ```

## 💻 시스템별 문제

### Windows 문제

#### Windows Defender 차단

```
Windows Defender → 바이러스 및 위협 방지
예외 추가 → 폴더 → Chrome 확장프로그램 폴더
```

#### 사운드 드라이버 문제

```
장치 관리자 → 사운드, 비디오 및 게임 컨트롤러
오디오 장치 우클릭 → 드라이버 업데이트
```

#### 스테레오 믹스 없음

```
1. Realtek HD Audio Manager 설치
2. VB-Audio Virtual Cable 사용
3. VoiceMeeter 사용 (고급 사용자)
```

### macOS 문제

#### 시스템 무결성 보호 (SIP)

```bash
# SIP 상태 확인
csrutil status

# 필요시 복구 모드에서 SIP 일시 비활성화
# (권장하지 않음, 대신 대체 방법 사용)
```

#### 마이크 권한 문제

```
시스템 환경설정 → 보안 및 개인정보 보호
개인정보 보호 → 마이크 → Chrome 체크
```

#### 오디오 라우팅 문제

```bash
# BlackHole 설치 및 설정
brew install blackhole-2ch

# Audio MIDI 설정에서 다중 출력 장치 생성
```

### Linux 문제

#### PulseAudio 설정

```bash
# PulseAudio 재시작
pulseaudio -k
pulseaudio --start

# 가상 마이크 생성
pactl load-module module-null-sink sink_name=virtual-mic
pactl load-module module-loopback source=virtual-mic.monitor sink=@DEFAULT_SINK@
```

#### ALSA 설정

```bash
# ALSA 설정 파일 편집
sudo nano /etc/asound.conf

# 가상 사운드 카드 설정 추가
```

#### 권한 문제

```bash
# 사용자를 audio 그룹에 추가
sudo usermod -a -G audio $USER

# 재로그인 필요
```

## 🌐 브라우저별 문제

### Chrome 특이사항

#### 하드웨어 가속 문제

```
Chrome 설정 → 고급 → 시스템
"사용 가능한 경우 하드웨어 가속 사용" 토글
```

#### 사이트 격리 문제

```
chrome://flags/#site-isolation-trial-opt-out
Disabled로 설정 (보안상 권장하지 않음)
```

#### 메모리 부족

```
chrome://settings/system
"Chrome이 닫혀 있을 때 백그라운드 앱 계속 실행" 비활성화
```

### Edge 특이사항

#### Windows 통합 TTS

```
Edge는 Windows TTS 엔진과 더 잘 통합됨
설정에서 Microsoft 음성 엔진 우선 선택
```

#### 개인정보 보호 설정

```
Edge 설정 → 개인정보, 검색 및 서비스
추적 방지를 "균형"으로 설정
```

### 기타 Chromium 브라우저

#### Brave 브라우저

```
Brave Shields 비활성화 (TTS Voice Bridge 사이트에서)
brave://settings/shields → 사이트별 설정
```

#### Opera 브라우저

```
Opera 설정 → 고급 → 개인정보 및 보안
사이트 설정에서 마이크 권한 확인
```

## ⚡ 성능 문제

### 메모리 사용량 과다

#### 증상

- 브라우저가 느려짐
- 시스템 전체 성능 저하
- "메모리 부족" 오류 메시지

#### 해결 방법

1. **캐시 정리**

   ```
   TTS Voice Bridge 설정 → 고급 → 캐시 정리
   또는 브라우저 재시작
   ```

2. **설정 최적화**

   ```
   - 자동 감지 기능 비활성화
   - 캐시 크기 제한 설정
   - 불필요한 음성 엔진 비활성화
   ```

3. **브라우저 최적화**
   ```
   chrome://settings/system
   "Chrome이 닫혀 있을 때 백그라운드 앱 계속 실행" 비활성화
   ```

### 응답 속도 저하

#### 증상

- TTS 재생 시작까지 오래 걸림
- 설정 변경이 느림
- 팝업 열기가 지연됨

#### 해결 방법

1. **하드웨어 가속 활성화**

   ```
   Chrome 설정 → 고급 → 시스템
   하드웨어 가속 사용 활성화
   ```

2. **확장프로그램 최적화**

   ```
   - 사용하지 않는 다른 확장프로그램 비활성화
   - TTS Voice Bridge만 활성화 상태로 테스트
   ```

3. **시스템 리소스 확인**
   ```
   작업 관리자에서 CPU/메모리 사용률 확인
   백그라운드 프로세스 정리
   ```

### 배터리 소모 과다 (노트북)

#### 해결 방법

1. **전력 절약 설정**

   ```
   - 볼륨을 낮춤 (0.6~0.7)
   - 자동 감지 기능 비활성화
   - 사용하지 않을 때 확장프로그램 비활성화
   ```

2. **시스템 전력 관리**
   ```
   Windows: 전원 옵션 → 절전 모드
   macOS: 에너지 절약 → 배터리 최적화
   ```

## 🔬 고급 문제 해결

### 개발자 도구 활용

#### 콘솔 오류 확인

```javascript
// 개발자 도구 (F12) → 콘솔 탭
// TTS Voice Bridge 관련 오류 메시지 확인

// Web Speech API 상태 확인
console.log("speechSynthesis" in window);
console.log(speechSynthesis.getVoices());

// 확장프로그램 상태 확인
chrome.runtime.getManifest();
```

#### 네트워크 탭 확인

```
개발자 도구 → 네트워크 탭
TTS 관련 요청 실패 여부 확인
응답 시간 및 오류 코드 확인
```

### 로그 파일 분석

#### Chrome 로그 활성화

```bash
# Chrome을 로그 모드로 실행
chrome.exe --enable-logging --log-level=0 --v=1

# 로그 파일 위치
# Windows: %LOCALAPPDATA%\Google\Chrome\User Data\chrome_debug.log
# macOS: ~/Library/Application Support/Google/Chrome/chrome_debug.log
```

#### 확장프로그램 로그

```javascript
// 백그라운드 페이지에서 로그 확인
chrome.runtime.getBackgroundPage(function (backgroundPage) {
  console.log(backgroundPage.console);
});
```

### 네트워크 문제 진단

#### DNS 문제

```bash
# DNS 캐시 정리
# Windows
ipconfig /flushdns

# macOS
sudo dscacheutil -flushcache

# Linux
sudo systemctl restart systemd-resolved
```

#### 방화벽 문제

```
Windows Defender 방화벽 → 앱 또는 기능 허용
Chrome 및 관련 프로세스 허용 확인
```

### 레지스트리/설정 파일 수정 (고급)

#### Windows 레지스트리

```
주의: 레지스트리 수정은 시스템에 영향을 줄 수 있습니다.
백업 후 진행하세요.

HKEY_CURRENT_USER\Software\Google\Chrome\Extensions
TTS Voice Bridge 관련 설정 확인
```

#### Chrome 설정 파일

```
Chrome 사용자 데이터 폴더:
Windows: %LOCALAPPDATA%\Google\Chrome\User Data
macOS: ~/Library/Application Support/Google/Chrome
Linux: ~/.config/google-chrome

Preferences 파일에서 확장프로그램 설정 확인
```

## 🆘 추가 지원

### 문제가 해결되지 않는 경우

1. **GitHub Issues 등록**

   ```
   https://github.com/tts-voice-bridge/extension/issues

   포함할 정보:
   - 운영체제 및 버전
   - 브라우저 및 버전
   - 확장프로그램 버전
   - 구체적인 오류 메시지
   - 재현 단계
   ```

2. **로그 파일 첨부**

   ```
   - 브라우저 콘솔 로그
   - 시스템 오류 로그
   - 확장프로그램 디버그 정보
   ```

3. **커뮤니티 지원**
   ```
   - Discord 서버 참여
   - Reddit 커뮤니티 질문
   - 사용자 포럼 검색
   ```

### 긴급 문제 해결

#### 임시 해결책

```
1. 확장프로그램 비활성화 후 재활성화
2. 브라우저 완전 재시작
3. 시스템 재부팅
4. 확장프로그램 재설치
```

#### 백업 및 복구

```
설정 백업:
TTS Voice Bridge 설정 → 내보내기 → JSON 파일 저장

설정 복구:
TTS Voice Bridge 설정 → 가져오기 → JSON 파일 선택
```

---

**이 가이드로 해결되지 않는 문제가 있으시면 [GitHub Issues](https://github.com/tts-voice-bridge/extension/issues)에 상세한 정보와 함께 문의해주세요.**
