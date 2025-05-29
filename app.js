// PWA 관련 변수
let deferredPrompt;
let isInstalled = false;

// 앱 관련 변수
const MODELS = {
  emotion: "https://teachablemachine.withgoogle.com/models/_Yn5oTjFE/",
  skin: "https://teachablemachine.withgoogle.com/models/Zd0FUwzdG/"
};

let currentMode = null;
let model, webcam, maxPredictions;
let emotionDetected = false;
let animationId;
let detectionActive = false;
let countdownInterval;
let timeLeft = 5;

// YouTube API 키 (실제 사용시에는 본인의 API 키로 교체 필요)
const YOUTUBE_API_KEY = '_YOUTUBE_API_KEY';

// 감정별 플레이리스트 검색 키워드
const musicKeywords = {
  '행복한 표정': ['신나는 플레이리스트'], 
  '슬픈표정': ['감성 플레이리스트'], 
  '무표정': ['멜론 100']
};

// 감정별 이모지 매핑
const emotionEmojis = {
  '행복한 표정': '😊', 
  '슬픈표정': '😢', 
  '무표정': '😐'
};

// 피부 상태별 이모지 매핑
const skinEmojis = {
  'Good': '✨', 'Normal': '😊', 'Dry': '🌵', 'Oily': '💧',
  'Acne': '🔴', 'Sensitive': '🌸',
  '트러블': '😔', '정상 피부': '😊', '화면에 얼굴을 가까이 해주세요': '📷',
  '학습성 여드름': '😰', '건성': '🌵', '지성': '💧', '민감성': '🌸',
  'Class 1': '✨', 'Class 2': '😊', 'Class 3': '😔',
  'Class 4': '💧', 'Class 5': '🔴', 'Class 6': '🌸'
};

// PWA 초기화
document.addEventListener('DOMContentLoaded', function() {
  initPWA();
  checkURLParams();
});

// PWA 기능 초기화
async function initPWA() {
  // Service Worker 등록
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker 등록 성공:', registration.scope);
      
      // 업데이트 확인
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 새 버전이 설치됨
            showUpdateNotification();
          }
        });
      });
      
    } catch (error) {
      console.error('Service Worker 등록 실패:', error);
    }
  }
  
  // 설치 프롬프트 처리
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('설치 프롬프트 이벤트 발생');
    e.preventDefault();
    deferredPrompt = e;
    showInstallPrompt();
  });
  
  // 앱 설치 완료 감지
  window.addEventListener('appinstalled', (e) => {
    console.log('앱 설치 완료');
    isInstalled = true;
    hideInstallPrompt();
    showToast('Mirrorcle이 성공적으로 설치되었습니다! 🎉');
  });
  
  // 이미 설치된 상태인지 확인
  if (window.matchMedia('(display-mode: standalone)').matches) {
    isInstalled = true;
    console.log('이미 설치된 상태로 실행 중');
  }
}

// URL 파라미터 확인 (바로가기 링크 처리)
function checkURLParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  
  if (mode && (mode === 'emotion' || mode === 'skin')) {
    selectMode(mode);
  }
}

// 설치 프롬프트 표시
function showInstallPrompt() {
  if (!isInstalled) {
    const installPrompt = document.getElementById('installPrompt');
    installPrompt.classList.add('show');
    
    document.getElementById('installBtn').addEventListener('click', installApp);
  }
}

// 설치 프롬프트 숨기기
function hideInstallPrompt() {
  const installPrompt = document.getElementById('installPrompt');
  installPrompt.classList.remove('show');
  localStorage.setItem('installPromptHidden', 'true');
}

// 앱 설치
async function installApp() {
  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('사용자가 설치를 승인했습니다');
      } else {
        console.log('사용자가 설치를 거부했습니다');
      }
      
      deferredPrompt = null;
      hideInstallPrompt();
    } catch (error) {
      console.error('설치 중 오류:', error);
      // iOS Safari의 경우 수동 설치 안내
      if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
        showIOSInstallGuide();
      }
    }
  } else {
    // iOS Safari의 경우 수동 설치 안내
    if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
      showIOSInstallGuide();
    }
  }
}

// iOS 설치 가이드 표시
function showIOSInstallGuide() {
  const guide = `
    iOS에서 앱으로 설치하기:
    1. 화면 하단의 공유 버튼(📤)을 탭하세요
    2. "홈 화면에 추가"를 선택하세요
    3. "추가"를 탭하여 설치를 완료하세요
  `;
  
  alert(guide);
}

// 업데이트 알림 표시
function showUpdateNotification() {
  if (confirm('새로운 버전이 사용 가능합니다. 페이지를 새로고침하시겠습니까?')) {
    window.location.reload();
  }
}

// 토스트 메시지 표시
function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #4CAF50;
    color: white;
    padding: 15px 25px;
    border-radius: 25px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideInDown 0.3s ease-out;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutUp 0.3s ease-in';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// 모드 선택 함수
function selectMode(mode) {
  currentMode = mode;
  document.getElementById('mode-selection').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';
  
  if (mode === 'emotion') {
    document.getElementById('mode-title').innerHTML = '😊 표정 감정 인식';
    document.getElementById('startBtn').innerText = '감정 인식 시작';
  } else if (mode === 'skin') {
    document.getElementById('mode-title').innerHTML = '✨ 피부 상태 분석';
    document.getElementById('startBtn').innerText = '피부 분석 시작';
  }
  
  init();
}

// 뒤로가기 함수
function goBack() {
  if (webcam) {
    webcam.stop();
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('mode-selection').style.display = 'block';
  
  currentMode = null;
  model = null;
  webcam = null;
  emotionDetected = false;
  detectionActive = false;
  
  const container = document.getElementById('webcam-container');
  container.innerHTML = '';
}

// 초기화 함수
async function init() {
  const statusDiv = document.getElementById('status');
  
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('웹캠이 지원되지 않는 브라우저입니다.');
    }

    statusDiv.innerHTML = '🤖 AI 모델 로딩 중...';
    
    const modelURL = MODELS[currentMode] + "model.json";
    const metadataURL = MODELS[currentMode] + "metadata.json";
    
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    
    statusDiv.innerHTML = '📷 웹캠 설정 중...';
    
    const flip = true;
    webcam = new tmImage.Webcam(400, 400, flip);
    await webcam.setup();
    await webcam.play();
    
    document.getElementById("webcam-container").appendChild(webcam.canvas);
    
    const modeText = currentMode === 'emotion' ? '감정 인식' : '피부 분석';
    statusDiv.innerHTML = `✅ 준비 완료! 버튼을 눌러 ${modeText}을 시작하세요.`;
    statusDiv.className = 'success';
    
    document.getElementById('startBtn').disabled = false;
    
    loop();
    
  } catch (error) {
    console.error('초기화 오류:', error);
    statusDiv.innerHTML = `❌ 오류: ${error.message}`;
    statusDiv.className = 'error';
    
    if (error.name === 'NotAllowedError' || error.message.includes('Permission')) {
      const retryBtn = document.createElement('button');
      retryBtn.innerText = '웹캠 권한 허용하고 재시도';
      retryBtn.onclick = () => location.reload();
      document.getElementById('controls').appendChild(retryBtn);
    }
  }
}

// 루프 함수
async function loop() {
  if (webcam) {
    webcam.update();
    await predict();
    requestAnimationFrame(loop);
  }
}

// 예측 함수
async function predict() {
  if (!model || !webcam) return;
  
  try {
    const prediction = await model.predict(webcam.canvas);
    
    updatePredictionDisplay(prediction);
    
    if (detectionActive && !emotionDetected) {
      const topPrediction = prediction.reduce((a, b) => 
        a.probability > b.probability ? a : b
      );
      
      if (topPrediction.probability > 0.6) {
        emotionDetected = true;
        detectionActive = false;
        clearInterval(countdownInterval);
        
        const emojiMap = currentMode === 'emotion' ? emotionEmojis : skinEmojis;
        const emoji = emojiMap[topPrediction.className] || '🤔';
        const modeText = currentMode === 'emotion' ? '감정 인식' : '피부 분석';
        
        document.getElementById('status').innerHTML = 
          `✅ ${modeText} 성공!<br>${emoji} ${topPrediction.className} (${Math.round(topPrediction.probability * 100)}%)`;
        document.getElementById('status').className = 'success';
        
        if (currentMode === 'emotion') {
          recommendMusic(topPrediction.className);
        } else if (currentMode === 'skin') {
          // 피부 분석 완료 후 피부 타입 선택 모달 표시
          setTimeout(() => {
            showSkinTypeModal();
          }, 1500); // 1.5초 후 모달 표시
        }
        
        showRestartButton();
      }
    }
    
  } catch (error) {
    console.error('예측 오류:', error);
  }
}

// 예측 결과 표시 함수
function updatePredictionDisplay(predictions) {
  const predictionList = document.getElementById('prediction-list');
  const predictionsDiv = document.getElementById('predictions');
  
  if (!detectionActive) {
    predictionsDiv.style.display = 'block';
  }
  
  predictionList.innerHTML = '';
  
  const emojiMap = currentMode === 'emotion' ? emotionEmojis : skinEmojis;
  
  predictions
    .sort((a, b) => b.probability - a.probability)
    .forEach(pred => {
      const item = document.createElement('div');
      item.className = 'prediction-item';
      
      const emoji = emojiMap[pred.className] || '🤔';
      const percentage = Math.round(pred.probability * 100);
      
      item.innerHTML = `
        <span>${emoji} ${pred.className}</span>
        <div class="prediction-bar">
          <div class="prediction-fill" style="width: ${percentage}%"></div>
        </div>
        <span>${percentage}%</span>
      `;
      
      predictionList.appendChild(item);
    });
}

// 감지 시작 함수
function startDetection() {
  if (emotionDetected) {
    restart();
    return;
  }
  
  detectionActive = true;
  emotionDetected = false;
  timeLeft = 5;
  
  document.getElementById('startBtn').disabled = true;
  document.getElementById('predictions').style.display = 'none';
  
  const modeText = currentMode === 'emotion' ? '감정 분석' : '피부 분석';
  const instructionText = currentMode === 'emotion' ? 
    '카메라를 보고 표정을 지어주세요!' : 
    '카메라를 보고 얼굴을 정면으로 맞춰주세요!';
  
  countdownInterval = setInterval(() => {
    if (detectionActive && timeLeft > 0) {
      document.getElementById('status').innerHTML = 
        `🔍 ${modeText} 중... (${timeLeft}초 남음)<br>${instructionText}`;
      document.getElementById('status').className = '';
      timeLeft--;
    } else if (detectionActive) {
      detectionActive = false;
      emotionDetected = false;
      clearInterval(countdownInterval);
      
      document.getElementById('status').innerHTML = 
        `❌ ${modeText} 실패 (5초 초과)<br>더 명확하게 시도해보세요!`;
      document.getElementById('status').className = 'error';
      
      showRestartButton();
    }
  }, 1000);
  
  setTimeout(() => {
    if (detectionActive && !emotionDetected) {
      detectionActive = false;
      clearInterval(countdownInterval);
      
      const modeText = currentMode === 'emotion' ? '감정 인식' : '피부 분석';
      document.getElementById('status').innerHTML = 
        `❌ ${modeText} 실패 (5초 초과)<br>더 명확하게 시도해보세요!`;
      document.getElementById('status').className = 'error';
      
      showRestartButton();
    }
  }, 5000);
}

// 재시작 버튼 표시 함수
function showRestartButton() {
  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('restartBtn').style.display = 'inline-block';
  document.getElementById('predictions').style.display = 'block';
}

// 재시작 함수
function restart() {
  detectionActive = false;
  emotionDetected = false;
  clearInterval(countdownInterval);
  
  const modeText = currentMode === 'emotion' ? '감정 인식' : '피부 분석';
  document.getElementById('status').innerHTML = 
    `✅ 준비 완료! 버튼을 눌러 ${modeText}을 시작하세요.`;
  document.getElementById('status').className = 'success';
  
  document.getElementById('startBtn').style.display = 'inline-block';
  document.getElementById('startBtn').disabled = false;
  document.getElementById('restartBtn').style.display = 'none';
  document.getElementById('predictions').style.display = 'block';
  
  document.getElementById('music-recommendation').style.display = 'none';
}

// YouTube 음악 추천 함수
async function recommendMusic(emotion) {
  const musicDiv = document.getElementById('music-recommendation');
  const musicContent = document.getElementById('music-content');
  
  musicDiv.style.display = 'block';
  musicContent.innerHTML = '<div class="loading-music">🎵 당신의 기분에 맞는 음악을 찾고 있습니다...</div>';
  
  try {
    if (YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY') {
      showDummyMusic(emotion);
      return;
    }
    
    const keywords = musicKeywords[emotion];
    if (!keywords) {
      console.log('감정을 찾을 수 없음:', emotion);
      showDummyMusic(emotion);
      return;
    }
    
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    console.log('선택된 감정:', emotion, '검색 키워드:', randomKeyword);
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(randomKeyword)}&type=video&videoDuration=long&maxResults=6&key=${YOUTUBE_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('YouTube API 호출 실패');
    }
    
    const data = await response.json();
    displayMusic(data.items, emotion);
    
  } catch (error) {
    console.error('음악 추천 오류:', error);
    showDummyMusic(emotion);
  }
}

// 실제 YouTube 데이터 표시
function displayMusic(videos, emotion) {
  const musicContent = document.getElementById('music-content');
  const emotionText = getEmotionText(emotion);
  
  let html = `<p style="text-align: center; margin-bottom: 15px; color: #666;">
    ${emotionText} 기분에 어울리는 플레이리스트를 추천해드려요! 🎵
  </p><div class="music-grid">`;
  
  videos.forEach(video => {
    html += `
      <div class="music-item" onclick="playYouTubeVideo('${video.id.videoId}')">
        <img src="${video.snippet.thumbnails.medium.url}" 
             alt="${video.snippet.title}" 
             class="music-thumbnail"
             onerror="this.src='https://via.placeholder.com/240x135/333/fff?text=🎵'">
        <div class="music-info">
          <div class="music-title-text">${video.snippet.title}</div>
          <div class="music-channel">${video.snippet.channelTitle}</div>
          <button class="play-button" onclick="event.stopPropagation(); playYouTubeVideo('${video.id.videoId}')">
            ▶️ 재생
          </button>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  musicContent.innerHTML = html;
}

// 더미 음악 데이터 표시 (API 키가 없을 때) - 썸네일 문제 해결
function showDummyMusic(emotion) {
  const musicContent = document.getElementById('music-content');
  const emotionText = getEmotionText(emotion);
  
  console.log('더미 데이터 표시 - 감정:', emotion, '감정 텍스트:', emotionText);
  
  const dummyVideos = getDummyMusicData(emotion);
  console.log('선택된 더미 데이터:', dummyVideos);
  
  let html = `<p style="text-align: center; margin-bottom: 15px; color: #666;">
    ${emotionText} 기분에 어울리는 플레이리스트를 추천해드려요! 🎵<br>
    <small style="color: #999;">(YouTube API 키가 설정되지 않아 샘플 데이터를 표시합니다)</small>
  </p><div class="music-grid">`;
  
  dummyVideos.forEach((video, index) => {
    // 감정에 따른 썸네일 색상 선택
    const thumbnailColor = getThumbnailColor(emotion);
    const thumbnailUrl = `https://via.placeholder.com/240x135/${thumbnailColor}/fff?text=🎵`;
    
    html += `
      <div class="music-item" onclick="searchYouTube('${video.title}')">
        <img src="${thumbnailUrl}" 
             alt="${video.title}" 
             class="music-thumbnail"
             loading="lazy">
        <div class="music-info">
          <div class="music-title-text">${video.title}</div>
          <div class="music-channel">${video.artist}</div>
          <button class="play-button" onclick="event.stopPropagation(); searchYouTube('${video.title}')">
            🔍 YouTube에서 찾기
          </button>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  musicContent.innerHTML = html;
}

// 감정에 따른 썸네일 색상 반환
function getThumbnailColor(emotion) {
  const normalizedEmotion = emotion.trim().toLowerCase();
  
  if (normalizedEmotion.includes('행복') || normalizedEmotion.includes('happy') || normalizedEmotion.includes('joy')) {
    return 'FFD700'; // 금색 (행복한 느낌)
  } else if (normalizedEmotion.includes('슬픈') || normalizedEmotion.includes('sad') || normalizedEmotion.includes('우울')) {
    return '4169E1'; // 로얄블루 (차분한 느낌)
  } else {
    return '32CD32'; // 라임그린 (중립적인 느낌)
  }
}

// 감정에 따른 차별화된 더미 플레이리스트 - 수정된 버전
function getDummyMusicData(emotion) {
  console.log('getDummyMusicData 호출됨 - 감정:', emotion);
  
  // 감정 값 정규화 (공백, 대소문자 처리)
  const normalizedEmotion = emotion.trim().toLowerCase();
  
  const playlistData = {
    // 다양한 형태의 행복한 감정 키들
    '행복한 표정': [
      { title: '[신나는 음악] 드라이브할 때 듣기 좋은 플레이리스트', artist: 'Music Playlist' },
      { title: '신나는 팝송 모음 | 기분 좋아지는 노래 플레이리스트', artist: 'Pop Music' },
      { title: '댄스 뮤직 베스트 | 파티 플레이리스트 신나는 음악', artist: 'Dance Hits' },
      { title: '신나는 K-POP 댄스곡 모음 | 운동할 때 듣는 노래', artist: 'K-Pop Dance' },
      { title: '신나는 EDM 플레이리스트 | 클럽 뮤직 베스트', artist: 'EDM Hits' },
      { title: '기분 좋아지는 신나는 음악 모음집', artist: 'Feel Good Music' }
    ],
    'happy': [
      { title: '[신나는 음악] 드라이브할 때 듣기 좋은 플레이리스트', artist: 'Music Playlist' },
      { title: '신나는 팝송 모음 | 기분 좋아지는 노래 플레이리스트', artist: 'Pop Music' },
      { title: '댄스 뮤직 베스트 | 파티 플레이리스트 신나는 음악', artist: 'Dance Hits' },
      { title: '신나는 K-POP 댄스곡 모음 | 운동할 때 듣는 노래', artist: 'K-Pop Dance' },
      { title: '신나는 EDM 플레이리스트 | 클럽 뮤직 베스트', artist: 'EDM Hits' },
      { title: '기분 좋아지는 신나는 음악 모음집', artist: 'Feel Good Music' }
    ],
    
    // 다양한 형태의 슬픈 감정 키들
    '슬픈표정': [
      { title: '감성 발라드 모음 | 밤에 듣기 좋은 슬픈 노래', artist: 'Ballad Collection' },
      { title: '감성 플레이리스트 | 우울할 때 듣는 음악 모음', artist: 'Emotional Music' },
      { title: '이별 노래 모음 | 슬픈 감성 발라드 플레이리스트', artist: 'Breakup Songs' },
      { title: '감성 인디 음악 | 혼자 있을 때 듣는 노래', artist: 'Indie Emotional' },
      { title: '비 오는 날 듣기 좋은 감성 플레이리스트', artist: 'Rainy Day Music' },
      { title: '감성 R&B 모음 | 깊은 밤 플레이리스트', artist: 'R&B Emotional' }
    ],
    'sad': [
      { title: '감성 발라드 모음 | 밤에 듣기 좋은 슬픈 노래', artist: 'Ballad Collection' },
      { title: '감성 플레이리스트 | 우울할 때 듣는 음악 모음', artist: 'Emotional Music' },
      { title: '이별 노래 모음 | 슬픈 감성 발라드 플레이리스트', artist: 'Breakup Songs' },
      { title: '감성 인디 음악 | 혼자 있을 때 듣는 노래', artist: 'Indie Emotional' },
      { title: '비 오는 날 듣기 좋은 감성 플레이리스트', artist: 'Rainy Day Music' },
      { title: '감성 R&B 모음 | 깊은 밤 플레이리스트', artist: 'R&B Emotional' }
    ],
    
    // 다양한 형태의 무표정/중립 감정 키들
    '무표정': [
      { title: '멜론 차트 TOP 100 | 최신 인기곡 모음', artist: 'Melon Chart' },
      { title: '2024 멜론 연간차트 베스트 100', artist: 'Melon Annual Chart' },
      { title: '멜론 실시간 차트 1위~100위 논스톱', artist: 'Melon Real-time' },
      { title: '멜론 HOT 100 | 지금 가장 인기있는 노래', artist: 'Melon Hot 100' },
      { title: '멜론차트 인기곡 모음 | K-POP 히트송', artist: 'Melon K-Pop Hits' },
      { title: '멜론 월간차트 TOP 100 베스트', artist: 'Melon Monthly Chart' }
    ],
    'neutral': [
      { title: '멜론 차트 TOP 100 | 최신 인기곡 모음', artist: 'Melon Chart' },
      { title: '2024 멜론 연간차트 베스트 100', artist: 'Melon Annual Chart' },
      { title: '멜론 실시간 차트 1위~100위 논스톱', artist: 'Melon Real-time' },
      { title: '멜론 HOT 100 | 지금 가장 인기있는 노래', artist: 'Melon Hot 100' },
      { title: '멜론차트 인기곡 모음 | K-POP 히트송', artist: 'Melon K-Pop Hits' },
      { title: '멜론 월간차트 TOP 100 베스트', artist: 'Melon Monthly Chart' }
    ]
  };
  
  // 먼저 정확한 매칭을 시도
  let result = playlistData[emotion];
  
  // 정확한 매칭이 없으면 정규화된 키로 매칭 시도
  if (!result) {
    result = playlistData[normalizedEmotion];
  }
  
  // 여전히 매칭되지 않으면 감정 키워드를 포함하는지 확인
  if (!result) {
    if (normalizedEmotion.includes('행복') || normalizedEmotion.includes('happy') || normalizedEmotion.includes('joy')) {
      result = playlistData['행복한 표정'];
    } else if (normalizedEmotion.includes('슬픈') || normalizedEmotion.includes('sad') || normalizedEmotion.includes('우울')) {
      result = playlistData['슬픈표정'];
    } else {
      result = playlistData['무표정']; // 기본값
    }
  }
  
  console.log('받은 감정 값:', emotion);
  console.log('정규화된 감정 값:', normalizedEmotion);
  console.log('매칭된 플레이리스트 길이:', result?.length);
  console.log('반환되는 플레이리스트 첫 번째 항목:', result?.[0]);
  
  return result;
}

// 감정 텍스트 변환 - 더 유연한 매칭
function getEmotionText(emotion) {
  const normalizedEmotion = emotion.trim().toLowerCase();
  
  if (normalizedEmotion.includes('행복') || normalizedEmotion.includes('happy') || normalizedEmotion.includes('joy')) {
    return '행복한';
  } else if (normalizedEmotion.includes('슬픈') || normalizedEmotion.includes('sad') || normalizedEmotion.includes('우울')) {
    return '슬픈';
  } else {
    return '차분한';
  }
}

// YouTube 동영상 재생 (새 탭에서)
function playYouTubeVideo(videoId) {
  window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
}

// YouTube 검색 (더미 데이터용)
function searchYouTube(query) {
  window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
}

// 종료 시 정리
window.addEventListener("beforeunload", () => {
  if (webcam) {
    webcam.stop();
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-100%);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  @keyframes slideOutUp {
    from {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(-100%);
    }
  }
`;

// 피부 타입별 제품 데이터베이스
const skinCareProducts = {
  '지성': {
    emoji: '💧',
    description: '기름기가 많은 피부를 위한 제품들',
    products: [
      {
        name: '살리실산 클렌저',
        category: '세안제',
        description: '모공 깊숙한 기름기와 각질 제거',
        price: '15,000원~25,000원',
        ingredients: '살리실산(BHA), 티트리오일'
      },
      {
        name: '나이아신아마이드 세럼',
        category: '세럼',
        description: '모공 축소 및 피지 조절',
        price: '20,000원~35,000원',
        ingredients: '나이아신아마이드 5-10%, 아연'
      },
      {
        name: '논코메도제닉 수분크림',
        category: '보습제',
        description: '모공을 막지 않는 가벼운 보습',
        price: '18,000원~30,000원',
        ingredients: '히알루론산, 세라마이드'
      }
    ],
    tips: ['하루 2회 세안', '기름종이 사용 자제', '과도한 세안은 금물', '논코메도제닉 제품 선택']
  },
  '건성': {
    emoji: '🌵',
    description: '수분이 부족한 피부를 위한 제품들',
    products: [
      {
        name: '세라마이드 클렌저',
        category: '세안제',
        description: '수분을 유지하며 부드럽게 세안',
        price: '18,000원~28,000원',
        ingredients: '세라마이드, 글리세린, 스쿠알란'
      },
      {
        name: '히알루론산 세럼',
        category: '세럼',
        description: '깊은 수분 공급과 보습막 형성',
        price: '25,000원~40,000원',
        ingredients: '저분자 히알루론산, 글리세린'
      },
      {
        name: '리치 모이스처라이저',
        category: '보습제',
        description: '진한 질감의 영양 크림',
        price: '30,000원~50,000원',
        ingredients: '시어버터, 세라마이드, 콜라겐'
      }
    ],
    tips: ['미지근한 물로 세안', '세안 후 3분 내 보습제 사용', '가습기 사용 권장', '각질 제거는 주 1회만']
  },
  '민감성': {
    emoji: '🌸',
    description: '자극에 민감한 피부를 위한 순한 제품들',
    products: [
      {
        name: '약산성 클렌저',
        category: '세안제',
        description: '자극 없는 순한 pH 균형 세안제',
        price: '16,000원~26,000원',
        ingredients: '아미노산 계면활성제, 판테놀'
      },
      {
        name: '센텔라 진정 세럼',
        category: '세럼',
        description: '염증 진정 및 피부 장벽 강화',
        price: '22,000원~38,000원',
        ingredients: '센텔라 추출물, 판테놀, 베타글루칸'
      },
      {
        name: '무향료 보습크림',
        category: '보습제',
        description: '향료 무첨가 저자극 보습제',
        price: '20,000원~35,000원',
        ingredients: '세라마이드, 콜로이드 오트밀'
      }
    ],
    tips: ['새 제품 사용 전 패치 테스트', '강한 성분(레티놀, AHA) 피하기', '자외선 차단제 필수', '스트레스 관리 중요']
  },
  '복합성': {
    emoji: '⚖️',
    description: 'T존은 지성, 볼은 건성인 복합성 피부용 제품들',
    products: [
      {
        name: '젠틀 폼 클렌저',
        category: '세안제',
        description: '부위별 차별 케어가 가능한 중성 세안제',
        price: '17,000원~27,000원',
        ingredients: '코코일 글루타메이트, 글리세린'
      },
      {
        name: '듀얼 케어 세럼',
        category: '세럼',
        description: 'T존과 볼 부위 차별 케어',
        price: '28,000원~45,000원',
        ingredients: '나이아신아마이드, 히알루론산'
      },
      {
        name: '밸런싱 로션',
        category: '보습제',
        description: '유분과 수분의 균형을 맞춘 제품',
        price: '25,000원~40,000원',
        ingredients: '세라마이드, 스쿠알란'
      }
    ],
    tips: ['부위별 다른 제품 사용', 'T존은 가볍게, 볼은 충분히 보습', '일주일에 1-2회 T존만 각질 제거', '계절별 제품 조정']
  },
  '트러블': {
    emoji: '🔴',
    description: '여드름과 트러블이 있는 피부를 위한 케어 제품들',
    products: [
      {
        name: '살리실산 워시',
        category: '세안제',
        description: '모공 속 각질과 세균 제거',
        price: '18,000원~30,000원',
        ingredients: '살리실산 0.5%, 티트리오일'
      },
      {
        name: '벤조일 퍼옥사이드 트리트먼트',
        category: '트리트먼트',
        description: '여드름균 억제 및 염증 완화',
        price: '15,000원~25,000원',
        ingredients: '벤조일 퍼옥사이드 2.5%, 알로에베라'
      },
      {
        name: '논코메도제닉 젤 크림',
        category: '보습제',
        description: '모공을 막지 않는 가벼운 젤 타입',
        price: '20,000원~32,000원',
        ingredients: '나이아신아마이드, 아연옥사이드'
      }
    ],
    tips: ['절대 손으로 짜지 않기', '베개커버 자주 교체', '유제품과 당분 섭취 줄이기', '충분한 수면과 스트레스 관리']
  },
  '정상': {
    emoji: '😊',
    description: '건강한 정상 피부를 유지하기 위한 기본 케어 제품들',
    products: [
      {
        name: '마일드 클렌저',
        category: '세안제',
        description: '피부 본연의 균형을 유지하는 세안제',
        price: '15,000원~25,000원',
        ingredients: '아미노산 계면활성제, 글리세린'
      },
      {
        name: '비타민 C 세럼',
        category: '세럼',
        description: '항산화 및 브라이트닝 효과',
        price: '25,000원~40,000원',
        ingredients: '비타민C 유도체, 비타민E'
      },
      {
        name: '데일리 모이스처라이저',
        category: '보습제',
        description: '매일 사용하기 좋은 가벼운 보습제',
        price: '20,000원~35,000원',
        ingredients: '히알루론산, 세라마이드'
      }
    ],
    tips: ['꾸준한 자외선 차단', '주 1-2회 각질 제거', '충분한 수분 섭취', '규칙적인 생활 패턴 유지']
  }
};

// 1. 피부 타입 선택 모달 표시 함수
function showSkinTypeModal() {
  // 기존 음악 추천 영역 숨기기
  const musicDiv = document.getElementById('music-recommendation');
  if (musicDiv) {
    musicDiv.style.display = 'none';
  }
  
  // 피부 타입 모달 HTML이 없으면 생성
  let skinModal = document.getElementById('skin-type-modal');
  if (!skinModal) {
    skinModal = document.createElement('div');
    skinModal.id = 'skin-type-modal';
    skinModal.className = 'skin-modal';
    document.body.appendChild(skinModal);
  }
  
  // 모달 내용 생성
  skinModal.innerHTML = `
    <div class="skin-modal-content">
      <div class="skin-modal-header">
        <h2>🎯 피부 타입을 선택해주세요</h2>
        <button class="close-btn" onclick="closeSkinTypeModal()">×</button>
      </div>
      <div class="skin-modal-body">
        <p>AI가 분석한 결과를 바탕으로 더 정확한 제품을 추천하기 위해<br>현재 피부 상태를 선택해주세요.</p>
        <div class="skin-type-grid">
          <button class="skin-type-btn" onclick="selectSkinType('지성')">
            <span class="skin-emoji">💧</span>
            <span class="skin-name">지성 피부</span>
            <span class="skin-desc">기름기가 많고 모공이 큰 편</span>
          </button>
          <button class="skin-type-btn" onclick="selectSkinType('건성')">
            <span class="skin-emoji">🌵</span>
            <span class="skin-name">건성 피부</span>
            <span class="skin-desc">건조하고 당기는 느낌</span>
          </button>
          <button class="skin-type-btn" onclick="selectSkinType('민감성')">
            <span class="skin-emoji">🌸</span>
            <span class="skin-name">민감성 피부</span>
            <span class="skin-desc">자극에 쉽게 반응</span>
          </button>
          <button class="skin-type-btn" onclick="selectSkinType('복합성')">
            <span class="skin-emoji">⚖️</span>
            <span class="skin-name">복합성 피부</span>
            <span class="skin-desc">T존은 지성, 볼은 건성</span>
          </button>
          <button class="skin-type-btn" onclick="selectSkinType('트러블')">
            <span class="skin-emoji">🔴</span>
            <span class="skin-name">트러블 피부</span>
            <span class="skin-desc">여드름, 뾰루지가 있음</span>
          </button>
          <button class="skin-type-btn" onclick="selectSkinType('정상')">
            <span class="skin-emoji">😊</span>
            <span class="skin-name">정상 피부</span>
            <span class="skin-desc">특별한 문제없이 건강함</span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  // 모달 표시
  skinModal.style.display = 'flex';

  // 이벤트 리스너를 한 번만 등록하도록 수정
  skinModal.removeEventListener('click', handleModalClick);
  skinModal.removeEventListener('touchstart', handleModalTouch);
  
  skinModal.addEventListener('click', handleModalClick);
  skinModal.addEventListener('touchstart', handleModalTouch);
}

// 별도 함수로 분리
function handleModalClick(e) {
  if (e.target === e.currentTarget) {
    closeSkinTypeModal();
  }
}

function handleModalTouch(e) {
  if (e.target === e.currentTarget) {
    closeSkinTypeModal();
  }
}

  // 모달 외부 클릭 시 닫기
  skinModal.addEventListener('click', function(e) {
  if (e.target === skinModal) {
    closeSkinTypeModal();
  }
});

skinModal.addEventListener('touchstart', function(e) {
  if (e.target === skinModal) {
    closeSkinTypeModal();
  }
});


// 2. 피부 타입 선택 처리 함수
function selectSkinType(type) {
  console.log('선택된 피부 타입:', type);
  
  // 모달 닫기
  closeSkinTypeModal();
  
  // 로딩 표시
  showLoadingMessage('선택하신 피부 타입에 맞는 제품을 추천하고 있습니다...');
  
  // 1초 후 추천 결과 표시 (사용자 경험 향상)
  setTimeout(() => {
    recommendSkincare(type);
  }, 1000);
}

// 3. 모달 닫기 함수
function closeSkinTypeModal() {
  const skinModal = document.getElementById('skin-type-modal');
  if (skinModal) {
    skinModal.style.display = 'none';
  }
}

// 4. 피부 타입별 제품 추천 함수
function recommendSkincare(skinType) {
  console.log('스킨케어 추천 시작:', skinType);

  // 피부 추천 전용 div 사용
let recommendationDiv = document.getElementById('skincare-recommendation');
if (!recommendationDiv) {
  recommendationDiv = document.createElement('div');
  recommendationDiv.id = 'skincare-recommendation';
  recommendationDiv.className = 'recommendation-section';
  
  const statusDiv = document.getElementById('status');
  statusDiv.parentNode.insertBefore(recommendationDiv, statusDiv.nextSibling);
}
  
  // 스킨케어 제품 데이터 가져오기
  const skinData = skinCareProducts[skinType];
  
  if (!skinData) {
    console.error('피부 타입 데이터를 찾을 수 없습니다:', skinType);
    return;
  }
  
  // 추천 내용 생성
  let html = `
    <div class="skincare-recommendation">
      <div class="skincare-header">
        <h3>${skinData.emoji} ${skinType} 피부 맞춤 추천</h3>
        <p class="skincare-description">${skinData.description}</p>
      </div>
      
      <div class="products-section">
        <h4>🛍️ 추천 제품</h4>
        <div class="products-grid">
  `;
  
  // 제품 목록 추가
  skinData.products.forEach((product, index) => {
    const categoryEmoji = getCategoryEmoji(product.category);
    html += `
      <div class="product-card">
        <div class="product-header">
          <span class="category-emoji">${categoryEmoji}</span>
          <div class="product-title">
            <h5>${product.name}</h5>
            <span class="product-category">${product.category}</span>
          </div>
        </div>
        <p class="product-description">${product.description}</p>
        <div class="product-details">
          <div class="product-price">💰 ${product.price}</div>
          <div class="product-ingredients">🧪 ${product.ingredients}</div>
        </div>
      </div>
    `;
  });
  
  html += `
        </div>
      </div>
      
      <div class="tips-section">
        <h4>💡 ${skinType} 피부 관리 팁</h4>
        <div class="tips-grid">
  `;
  
  // 관리 팁 추가
  skinData.tips.forEach((tip, index) => {
    html += `<div class="tip-item">✓ ${tip}</div>`;
  });
  
  html += `
        </div>
      </div>
      
      <div class="action-buttons">
        <button class="retry-btn" onclick="showSkinTypeModal()">
          🔄 다른 피부 타입 선택
        </button>
        <button class="search-btn" onclick="searchProducts('${skinType}')">
          🔍 온라인에서 제품 찾기
        </button>
      </div>
    </div>
  `;
  
  // 내용 업데이트 및 표시
  recommendationDiv.innerHTML = html;
  recommendationDiv.style.display = 'block';
  
  // 스크롤 이동 (부드럽게)
  setTimeout(() => {
    recommendationDiv.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  }, 100);
}

// 보조 함수들

// 로딩 메시지 표시
function showLoadingMessage(message) {
  let recommendationDiv = document.getElementById('skincare-recommendation');
  if (!recommendationDiv) {
    recommendationDiv = document.createElement('div');
    recommendationDiv.id = 'skincare-recommendation';
    const statusDiv = document.getElementById('status');
    statusDiv.parentNode.insertBefore(recommendationDiv, statusDiv.nextSibling);
  }
  
  recommendationDiv.innerHTML = `
    <div class="loading-skincare">
      <div class="loading-spinner">🔄</div>
      <p>${message}</p>
    </div>
  `;
  recommendationDiv.style.display = 'block';
}

// 카테고리별 이모지 반환
function getCategoryEmoji(category) {
  const emojiMap = {
    '세안제': '🧼',
    '세럼': '💧',
    '보습제': '🧴',
    '트리트먼트': '💊',
    '선크림': '☀️',
    '마스크': '🎭'
  };
  return emojiMap[category] || '🧴';
}

// 쿠팡과 올리브영 동시에 열기
function searchProducts(skinType) {
  const coupangQuery = `${skinType} 피부 스킨케어`;
  const oliveYoungQuery = `${skinType} 피부 스킨케어`;
  
  const coupangUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(coupangQuery)}`;
  const oliveYoungUrl = `https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=${encodeURIComponent(oliveYoungQuery)}`;
  
  // 두 사이트를 새 탭으로 열기
  window.open(coupangUrl, '_blank');
  setTimeout(() => {
    window.open(oliveYoungUrl, '_blank');
  }, 500); // 0.5초 간격으로 열기
}

// 기존 predict 함수 수정 (피부 분석 완료 후 모달 표시)
// 주의: 기존 predict 함수를 찾아서 이 부분을 추가하세요
/*
기존 predict 함수에서 피부 분석 완료 후 다음 코드 추가:

if (currentMode === 'skin') {
  // 피부 분석 완료 후 피부 타입 선택 모달 표시
  setTimeout(() => {
    showSkinTypeModal();
  }, 1500); // 1.5초 후 모달 표시
}
*/

// CSS 스타일 추가
const skinCareStyles = document.createElement('style');
skinCareStyles.textContent = `
  /* 피부 타입 모달 스타일 */
  .skin-modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  }
  
  .skin-modal-content {
    background: white;
    padding: 0;
    border-radius: 15px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    animation: slideInUp 0.3s ease-out;
  }
  
  .skin-modal-header {
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 15px 15px 0 0;
  }
  
  .skin-modal-header h2 {
    margin: 0;
    font-size: 1.3em;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: white;
    padding: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  
  .close-btn:hover {
    background-color: rgba(255,255,255,0.2);
  }
  
  .skin-modal-body {
    padding: 25px;
  }
  
  .skin-modal-body p {
    text-align: center;
    color: #666;
    margin-bottom: 25px;
    line-height: 1.5;
  }
  
  .skin-type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 15px;
  }
  
  .skin-type-btn {
    background: white;
    border: 2px solid #e1e5e9;
    border-radius: 12px;
    padding: 20px 15px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  
  .skin-type-btn:hover {
    border-color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
  }
  
  .skin-emoji {
    font-size: 2em;
    margin-bottom: 5px;
  }
  
  .skin-name {
    font-weight: bold;
    color: #333;
    font-size: 1em;
  }
  
  .skin-desc {
    font-size: 0.85em;
    color: #666;
    line-height: 1.3;
  }
  
  /* 스킨케어 추천 스타일 */
  .skincare-recommendation {
    background: #f8f9fa;
    border-radius: 15px;
    padding: 25px;
    margin-top: 20px;
  }
  
  .skincare-header {
    text-align: center;
    margin-bottom: 25px;
    padding-bottom: 20px;
    border-bottom: 2px solid #e1e5e9;
  }
  
  .skincare-header h3 {
    color: #333;
    margin: 0 0 10px 0;
    font-size: 1.4em;
  }
  
  .skincare-description {
    color: #666;
    margin: 0;
    font-style: italic;
  }
  
  .products-section, .tips-section {
    margin-bottom: 25px;
  }
  
  .products-section h4, .tips-section h4 {
    color: #333;
    margin-bottom: 15px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e1e5e9;
  }
  
  .products-grid {
    display: grid;
    gap: 15px;
  }
  
  .product-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: transform 0.2s ease;
  }
  
  .product-card:hover {
    transform: translateY(-2px);
  }
  
  .product-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  
  .category-emoji {
    font-size: 1.5em;
  }
  
  .product-title h5 {
    margin: 0;
    color: #333;
    font-size: 1.1em;
  }
  
  .product-category {
    color: #666;
    font-size: 0.85em;
  }
  
  .product-description {
    color: #555;
    margin-bottom: 15px;
    line-height: 1.4;
  }
  
  .product-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .product-price, .product-ingredients {
    font-size: 0.9em;
    color: #666;
  }
  
  .product-price {
    font-weight: bold;
    color: #e74c3c;
  }
  
  .tips-grid {
    display: grid;
    gap: 10px;
  }
  
  .tip-item {
    background: white;
    padding: 12px 15px;
    border-radius: 8px;
    border-left: 4px solid #667eea;
    color: #333;
  }
  
  .action-buttons {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-top: 25px;
  }
  
  .retry-btn, .search-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 25px;
    cursor: pointer;
    font-weight: 500;
    transition: transform 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  
  .retry-btn:hover, .search-btn:hover {
    transform: translateY(-1px);
  }
  
  .search-btn {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }
  
  .loading-skincare {
    text-align: center;
    padding: 40px 20px;
    background: #f8f9fa;
    border-radius: 15px;
    margin-top: 20px;
  }
  
  .loading-spinner {
    font-size: 2em;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInUp {
    from { 
      opacity: 0;
      transform: translateY(30px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* 모바일 반응형 */
  @media (max-width: 768px) {
    .skin-modal-content {
      width: 95%;
      margin: 10px;
    }
    
    .skin-type-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .action-buttons {
      flex-direction: column;
    }
    
    .products-grid {
      gap: 12px;
    }
    
    .product-card {
      padding: 15px;
    }
  }
`;

// 스타일을 head에 추가
document.head.appendChild(skinCareStyles);

// 전역 함수로 등록
window.closeSkinTypeModal = closeSkinTypeModal;
window.selectSkinType = selectSkinType;
window.showSkinTypeModal = showSkinTypeModal;
window.searchProducts = searchProducts;

const fixStyle = document.createElement('style');
fixStyle.textContent = `
  * {
    touch-action: manipulation;
  }
  
  button, .music-item, .prediction-item {
    pointer-events: auto !important;
    cursor: pointer !important;
    user-select: none;
  }
  
  .music-item:hover, button:hover {
    opacity: 0.8;
  }
`;
document.head.appendChild(fixStyle);
