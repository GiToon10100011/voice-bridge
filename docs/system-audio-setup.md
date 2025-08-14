# 시스템 오디오 설정 가이드

TTS Voice Bridge가 생성한 음성을 다른 애플리케이션의 음성인식 시스템에서 인식할 수 있도록 하는 시스템 오디오 설정 방법을 안내합니다.

## 📋 목차

1. [개요](#개요)
2. [Windows 설정](#windows-설정)
3. [macOS 설정](#macos-설정)
4. [Linux 설정](#linux-설정)
5. [설정 검증](#설정-검증)
6. [문제 해결](#문제-해결)

## 🎯 개요

### 왜 시스템 오디오 설정이 필요한가?

TTS Voice Bridge는 브라우저 확장프로그램으로서 다음과 같은 제약이 있습니다:

1. **직접적인 마이크 입력 불가**: 브라우저 보안 정책상 다른 애플리케이션의 마이크 입력에 직접 접근할 수 없습니다.
2. **가상 오디오 디바이스 생성 불가**: 확장프로그램은 시스템 레벨의 가상 오디오 디바이스를 생성할 수 없습니다.

따라서 TTS로 생성된 음성을 시스템의 스피커로 출력하고, 이를 다시 마이크 입력으로 라우팅하는 설정이 필요합니다.

### 작동 원리

```
TTS Voice Bridge → 스피커 출력 → 시스템 오디오 라우팅 → 마이크 입력 → 음성인식 시스템
```

## 🪟 Windows 설정

### 방법 1: 스테레오 믹스 사용 (권장)

스테레오 믹스는 Windows에 내장된 기능으로, 스피커 출력을 마이크 입력으로 라우팅할 수 있습니다.

#### 1단계: 스테레오 믹스 활성화

1. **사운드 설정 열기**

   ```
   방법 1: 작업표시줄 스피커 아이콘 우클릭 → "사운드 설정 열기"
   방법 2: 설정 → 시스템 → 사운드
   방법 3: 제어판 → 하드웨어 및 소리 → 사운드
   ```

2. **사운드 제어판 접속**

   ```
   사운드 설정 페이지에서 "사운드 제어판" 클릭
   또는 실행(Win+R) → mmsys.cpl 입력
   ```

3. **녹음 탭에서 스테레오 믹스 찾기**

   ```
   "녹음" 탭 클릭
   빈 공간에서 우클릭 → "사용 안 함인 장치 표시" 체크
   빈 공간에서 우클릭 → "연결이 끊어진 장치 표시" 체크
   ```

4. **스테레오 믹스 활성화**
   ```
   "스테레오 믹스" 또는 "What U Hear" 장치 찾기
   해당 장치 우클릭 → "사용" 선택
   ```

#### 2단계: 스테레오 믹스를 기본 장치로 설정

1. **기본 녹음 장치 설정**

   ```
   스테레오 믹스 우클릭 → "기본 장치로 설정"
   스테레오 믹스 우클릭 → "기본 통신 장치로 설정"
   ```

2. **레벨 조정**
   ```
   스테레오 믹스 더블클릭 → "수준" 탭
   마이크 레벨을 70-80으로 설정
   "향상" 탭에서 "마이크 부스트" 활성화 (필요시)
   ```

#### 3단계: 브라우저 마이크 설정

1. **Chrome 마이크 설정**

   ```
   Chrome 설정 → 개인정보 및 보안 → 사이트 설정 → 마이크
   기본값을 "스테레오 믹스"로 설정
   ```

2. **사이트별 권한 확인**
   ```
   chat.openai.com → 마이크 허용
   google.com → 마이크 허용
   ```

### 방법 2: VB-Audio Virtual Cable 사용

스테레오 믹스가 없거나 작동하지 않는 경우 가상 오디오 케이블을 사용합니다.

#### 1단계: VB-Audio Virtual Cable 설치

1. **다운로드**

   ```
   공식 사이트: https://vb-audio.com/Cable/
   "VB-CABLE Virtual Audio Device" 다운로드
   ```

2. **설치**
   ```
   관리자 권한으로 실행
   설치 완료 후 시스템 재부팅
   ```

#### 2단계: 가상 케이블 설정

1. **재생 장치 설정**

   ```
   사운드 제어판 → "재생" 탭
   "CABLE Input (VB-Audio Virtual Cable)" 우클릭
   "기본 장치로 설정" 선택
   ```

2. **녹음 장치 설정**

   ```
   "녹음" 탭으로 이동
   "CABLE Output (VB-Audio Virtual Cable)" 우클릭
   "기본 장치로 설정" 선택
   ```

3. **모니터링 설정**
   ```
   CABLE Output 더블클릭 → "듣기" 탭
   "이 장치로 듣기" 체크
   "재생 장치" 드롭다운에서 실제 스피커 선택
   ```

### 방법 3: VoiceMeeter 사용 (고급)

더 정교한 오디오 라우팅이 필요한 경우 VoiceMeeter를 사용합니다.

#### 1단계: VoiceMeeter 설치

1. **다운로드 및 설치**
   ```
   공식 사이트: https://vb-audio.com/Voicemeeter/
   VoiceMeeter Banana 권장 (무료)
   ```

#### 2단계: VoiceMeeter 설정

1. **하드웨어 입력 설정**

   ```
   Hardware Input 1: WDM - 마이크 (실제 마이크)
   Hardware Input 2: WDM - CABLE Output (가상 케이블)
   ```

2. **하드웨어 출력 설정**

   ```
   A1: 실제 스피커/헤드폰
   A2: CABLE Input (가상 케이블)
   ```

3. **라우팅 설정**
   ```
   Hardware Input 2 → A1 (모니터링용)
   Virtual Input → A2 (TTS 출력용)
   ```

## 🍎 macOS 설정

### 방법 1: BlackHole 사용 (권장)

BlackHole은 macOS용 가상 오디오 드라이버입니다.

#### 1단계: BlackHole 설치

1. **Homebrew로 설치**

   ```bash
   # Homebrew가 없는 경우 먼저 설치
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

   # BlackHole 설치
   brew install blackhole-2ch
   ```

2. **수동 설치**
   ```
   공식 사이트: https://existential.audio/blackhole/
   BlackHole 2ch.pkg 다운로드 및 설치
   ```

#### 2단계: 다중 출력 장치 생성

1. **Audio MIDI 설정 열기**

   ```
   응용 프로그램 → 유틸리티 → Audio MIDI 설정
   또는 Spotlight에서 "Audio MIDI Setup" 검색
   ```

2. **다중 출력 장치 생성**

   ```
   좌측 하단 "+" 버튼 클릭
   "다중 출력 장치 생성" 선택
   ```

3. **출력 장치 선택**

   ```
   "BlackHole 2ch" 체크
   "내장 출력" (또는 사용 중인 스피커) 체크
   "내장 출력"에서 "마스터 장치" 체크
   ```

4. **장치 이름 변경**
   ```
   생성된 장치 우클릭 → "장치 이름 사용"
   "TTS Multi-Output" 등으로 이름 변경
   ```

#### 3단계: 시스템 사운드 설정

1. **출력 장치 설정**

   ```
   시스템 환경설정 → 사운드 → 출력
   "TTS Multi-Output" 선택
   ```

2. **입력 장치 설정**
   ```
   시스템 환경설정 → 사운드 → 입력
   "BlackHole 2ch" 선택
   ```

#### 4단계: 브라우저 설정

1. **Chrome 마이크 권한**
   ```
   Chrome 설정 → 개인정보 및 보안 → 사이트 설정 → 마이크
   기본값을 "BlackHole 2ch"로 설정
   ```

### 방법 2: SoundFlower 사용 (레거시)

#### 1단계: SoundFlower 설치

1. **Homebrew로 설치**

   ```bash
   brew install --cask soundflower
   ```

2. **수동 설치**
   ```
   GitHub: https://github.com/mattingalls/Soundflower
   최신 릴리스 다운로드 및 설치
   ```

#### 2단계: SoundFlower 설정

1. **다중 출력 장치 생성**

   ```
   Audio MIDI 설정에서 다중 출력 장치 생성
   "Soundflower (2ch)" 및 "내장 출력" 선택
   ```

2. **시스템 사운드 설정**
   ```
   출력: 생성한 다중 출력 장치
   입력: Soundflower (2ch)
   ```

## 🐧 Linux 설정

### 방법 1: PulseAudio 사용

대부분의 Linux 배포판에서 기본으로 사용하는 PulseAudio를 활용합니다.

#### 1단계: 가상 사운드 카드 생성

1. **임시 설정 (재부팅 시 초기화)**

   ```bash
   # 가상 싱크 생성
   pactl load-module module-null-sink sink_name=virtual-mic sink_properties=device.description="Virtual_Microphone"

   # 루프백 모듈 로드 (가상 싱크 → 기본 출력)
   pactl load-module module-loopback source=virtual-mic.monitor sink=@DEFAULT_SINK@

   # 기본 소스를 가상 마이크로 설정
   pactl set-default-source virtual-mic.monitor
   ```

2. **영구 설정**

   ```bash
   # PulseAudio 설정 파일 편집
   nano ~/.config/pulse/default.pa

   # 다음 라인들 추가
   load-module module-null-sink sink_name=virtual-mic sink_properties=device.description="Virtual_Microphone"
   load-module module-loopback source=virtual-mic.monitor sink=@DEFAULT_SINK@
   set-default-source virtual-mic.monitor
   ```

#### 2단계: PulseAudio 재시작

```bash
# PulseAudio 재시작
pulseaudio -k
pulseaudio --start

# 또는 시스템 재시작
sudo reboot
```

#### 3단계: 설정 확인

```bash
# 사용 가능한 소스 확인
pactl list sources short

# 사용 가능한 싱크 확인
pactl list sinks short

# 기본 소스 확인
pactl info | grep "Default Source"
```

### 방법 2: JACK 사용 (고급)

전문적인 오디오 작업을 위해 JACK을 사용하는 경우의 설정입니다.

#### 1단계: JACK 설치

```bash
# Ubuntu/Debian
sudo apt install jackd2 qjackctl

# Fedora
sudo dnf install jack-audio-connection-kit qjackctl

# Arch Linux
sudo pacman -S jack2 qjackctl
```

#### 2단계: JACK 설정

1. **QjackCtl 실행**

   ```bash
   qjackctl
   ```

2. **가상 포트 생성**
   ```bash
   # 가상 MIDI 포트 생성 (필요시)
   jack_connect system:capture_1 system:playback_1
   ```

### 방법 3: ALSA 직접 설정

#### 1단계: ALSA 설정 파일 편집

```bash
# 시스템 전체 설정
sudo nano /etc/asound.conf

# 또는 사용자별 설정
nano ~/.asoundrc
```

#### 2단계: 가상 사운드 카드 설정

```bash
# ~/.asoundrc 파일에 추가
pcm.!default {
    type asym
    playback.pcm "playback"
    capture.pcm "capture"
}

pcm.playback {
    type plug
    slave.pcm "dmix"
}

pcm.capture {
    type plug
    slave.pcm "dsnoop"
}

pcm.dmix {
    type dmix
    ipc_key 1024
    slave {
        pcm "hw:0,0"
        period_time 0
        period_size 1024
        buffer_size 4096
        rate 44100
    }
    bindings {
        0 0
        1 1
    }
}

pcm.dsnoop {
    type dsnoop
    ipc_key 2048
    slave {
        pcm "hw:0,0"
        channels 2
        period_time 0
        period_size 1024
        buffer_size 4096
        rate 44100
    }
    bindings {
        0 0
        1 1
    }
}
```

## ✅ 설정 검증

### 기본 테스트

#### 1단계: 시스템 오디오 테스트

1. **Windows**

   ```
   사운드 제어판 → 녹음 탭
   스테레오 믹스 또는 가상 케이블의 레벨 표시기 확인
   음악 재생 시 레벨이 움직이는지 확인
   ```

2. **macOS**

   ```
   시스템 환경설정 → 사운드 → 입력
   BlackHole 2ch의 입력 레벨 확인
   음악 재생 시 레벨이 움직이는지 확인
   ```

3. **Linux**

   ```bash
   # PulseAudio 볼륨 컨트롤 실행
   pavucontrol

   # 녹음 탭에서 virtual-mic.monitor 확인
   # 음악 재생 시 레벨 변화 확인
   ```

#### 2단계: 브라우저 마이크 테스트

1. **마이크 테스트 사이트 접속**

   ```
   https://mictests.com/
   또는
   https://webcammictest.com/check-mic.html
   ```

2. **마이크 권한 허용**

   - 브라우저에서 마이크 접근 권한 요청 시 "허용" 클릭

3. **오디오 재생 및 확인**
   - 다른 탭에서 음악이나 비디오 재생
   - 마이크 테스트 사이트에서 입력 레벨 확인

#### 3단계: TTS Voice Bridge 테스트

1. **기본 TTS 테스트**

   ```
   TTS Voice Bridge 팝업 열기
   "테스트 음성입니다" 입력
   재생 버튼 클릭
   마이크 테스트 사이트에서 입력 감지 확인
   ```

2. **ChatGPT 연동 테스트**

   ```
   ChatGPT 페이지에서 음성모드 활성화
   TTS Voice Bridge로 "안녕하세요" 재생
   ChatGPT가 음성을 인식하는지 확인
   ```

3. **구글 음성검색 테스트**
   ```
   Google 검색 페이지에서 음성검색 활성화
   TTS Voice Bridge로 "날씨" 재생
   구글이 검색어를 인식하는지 확인
   ```

### 고급 검증

#### 오디오 지연 측정

1. **Windows - LatencyMon 사용**

   ```
   LatencyMon 다운로드 및 실행
   오디오 지연 시간 측정
   100ms 이하 권장
   ```

2. **macOS - 시스템 정보 확인**

   ```
   Option 키 + Apple 메뉴 → 시스템 정보
   오디오 → 내장 오디오 → 지연 시간 확인
   ```

3. **Linux - JACK 지연 측정**

   ```bash
   # JACK 사용 시
   jack_iodelay

   # PulseAudio 사용 시
   pactl list sinks | grep -i latency
   ```

#### 음질 테스트

1. **주파수 응답 테스트**

   ```
   온라인 톤 제너레이터 사용
   20Hz ~ 20kHz 범위에서 테스트
   음성인식에 중요한 300Hz ~ 3.4kHz 범위 집중 확인
   ```

2. **노이즈 레벨 확인**
   ```
   무음 상태에서 마이크 입력 레벨 확인
   -60dB 이하 권장
   ```

## 🔧 문제 해결

### 일반적인 문제

#### 스테레오 믹스가 없음 (Windows)

**원인:**

- 오디오 드라이버가 스테레오 믹스를 지원하지 않음
- 드라이버 설정에서 비활성화됨

**해결방법:**

1. **Realtek HD Audio Manager 설치**

   ```
   제조사 웹사이트에서 최신 드라이버 다운로드
   설치 후 Realtek HD Audio Manager 실행
   "믹서" 탭에서 "스테레오 믹스" 활성화
   ```

2. **가상 오디오 케이블 사용**
   ```
   VB-Audio Virtual Cable 또는 VoiceMeeter 사용
   위의 "방법 2" 또는 "방법 3" 참조
   ```

#### BlackHole이 인식되지 않음 (macOS)

**원인:**

- 시스템 보안 설정으로 인한 차단
- 설치 권한 부족

**해결방법:**

1. **시스템 환경설정 확인**

   ```
   시스템 환경설정 → 보안 및 개인정보 보호
   "일반" 탭에서 BlackHole 허용 버튼 클릭
   ```

2. **재설치**

   ```bash
   # 기존 설치 제거
   brew uninstall blackhole-2ch

   # 재설치
   brew install blackhole-2ch
   ```

#### PulseAudio 모듈 로드 실패 (Linux)

**원인:**

- PulseAudio 서비스 문제
- 권한 부족
- 모듈 충돌

**해결방법:**

1. **PulseAudio 재시작**

   ```bash
   pulseaudio -k
   pulseaudio --start
   ```

2. **권한 확인**

   ```bash
   # 사용자를 audio 그룹에 추가
   sudo usermod -a -G audio $USER

   # 로그아웃 후 다시 로그인
   ```

3. **모듈 상태 확인**

   ```bash
   # 로드된 모듈 확인
   pactl list modules

   # 특정 모듈 언로드
   pactl unload-module module-null-sink
   ```

### 성능 문제

#### 오디오 지연 (레이턴시) 문제

**증상:**

- TTS 음성과 인식 사이에 긴 지연
- 실시간 대화가 어려움

**해결방법:**

1. **버퍼 크기 조정**

   ```
   Windows: 사운드 제어판 → 고급 → 기본 형식에서 낮은 비트율 선택
   macOS: Audio MIDI 설정에서 샘플 레이트 44.1kHz로 설정
   Linux: PulseAudio 설정에서 fragment 크기 조정
   ```

2. **하드웨어 가속 활성화**
   ```
   오디오 드라이버 설정에서 하드웨어 가속 활성화
   ASIO 드라이버 사용 (Windows, 가능한 경우)
   ```

#### 음질 저하 문제

**증상:**

- 음성이 왜곡되거나 노이즈가 많음
- 음성인식 정확도 저하

**해결방법:**

1. **샘플 레이트 통일**

   ```
   모든 오디오 장치를 동일한 샘플 레이트로 설정
   44.1kHz 또는 48kHz 권장
   ```

2. **비트 깊이 조정**

   ```
   16-bit 또는 24-bit 사용
   32-bit float는 호환성 문제 가능성
   ```

3. **노이즈 게이트 설정**
   ```
   마이크 입력에 노이즈 게이트 적용
   -40dB ~ -30dB 임계값 설정
   ```

### 호환성 문제

#### 특정 애플리케이션에서 작동하지 않음

**원인:**

- 애플리케이션별 오디오 설정
- 독점 모드 사용
- 보안 정책

**해결방법:**

1. **애플리케이션 오디오 설정 확인**

   ```
   각 애플리케이션의 마이크 설정에서
   시스템 기본값 또는 가상 마이크 선택
   ```

2. **독점 모드 비활성화**
   ```
   Windows: 사운드 제어판 → 장치 속성 → 고급
   "응용 프로그램에서 이 장치를 독점적으로 사용할 수 있도록 허용" 해제
   ```

#### 다중 사용자 환경 문제

**원인:**

- 사용자별 오디오 세션 분리
- 권한 차이

**해결방법:**

1. **시스템 전체 설정 적용**

   ```
   Windows: 시스템 계정으로 설정 적용
   Linux: /etc/pulse/system.pa 편집
   ```

2. **사용자별 설정 복사**
   ```
   관리자 계정에서 설정 후
   다른 사용자 계정으로 설정 복사
   ```

---

**시스템 오디오 설정이 완료되었다면 [사용자 가이드](user-guide.md)를 참고하여 TTS Voice Bridge를 활용해보세요!**
