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
const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY';

// 감정별 플레이리스트 검색 키워드
const musicKeywords = {
  '행복': ['행복할 때 듣는 노래 플레이리스트', '신나는 음악 모음', '기분 좋은 음악 플레이리스트', 'happy playlist', 'upbeat music playlist'],
  '슬픔': ['슬플 때 듣는 노래 플레이리스트', '감성 발라드 모음', '우울할 때 듣는 음악', 'sad playlist', 'melancholy music playlist'],
  '화남': ['화날 때 듣는 노래 플레이리스트', '록 음악 모음', '스트레스 해소 음악', 'angry playlist', 'rock music playlist'],
  '놀람': ['놀랄 때 듣는 음악 플레이리스트', '흥미진진한 음악 모음', '긴장감 있는 음악', 'exciting playlist', 'energetic music playlist'],
  '무표정': ['잔잔한 음악 플레이리스트', '평온한 음악 모음', '차분한 플레이리스트', 'calm playlist', 'relaxing music playlist'],
  '변화없음': ['일상 음악 플레이리스트', '배경음악 모음', '공부할 때 듣는 음악', 'chill playlist', 'background music playlist'],
  '두려움': ['불안할 때 듣는 음악 플레이리스트', '위로가 되는 음악 모음', '치유 음악', 'comfort playlist', 'healing music playlist'],
  '혐오': ['기분 전환 음악 플레이리스트', '밝은 음악 모음', '긍정적인 음악', 'mood boost playlist', 'positive music playlist'],
  'Happy': ['행복할 때 듣는 노래 플레이리스트', 'happy playlist', 'upbeat music playlist'],
  'Sad': ['슬플 때 듣는 노래 플레이리스트', 'sad playlist', 'melancholy music playlist'],
  'Angry': ['화날 때 듣는 노래 플레이리스트', 'angry playlist', 'rock music playlist'],
  'Surprised': ['놀랄 때 듣는 음악 플레이리스트', 'exciting playlist', 'energetic music playlist'],
  'Neutral': ['잔잔한 음악 플레이리스트', 'calm playlist', 'relaxing music playlist'],
  'Fear': ['불안할 때 듣는 음악 플레이리스트', 'comfort playlist', 'healing music playlist'],
  'Disgust': ['기분 전환 음악 플레이리스트', 'mood boost playlist', 'positive music playlist']
};

// 감정별 이모지 매핑
const emotionEmojis = {
  'Happy': '😊', 'Sad': '😢', 'Angry': '😠', 'Surprised': '😲',
  'Neutral': '😐', 'Fear': '😨', 'Disgust': '🤢',
  '행복': '😊', '슬픔': '😢', '화남': '😠', '놀람': '😲',
  '무표정': '😐', '변화없음': '😐', '두려움': '😨', '혐오': '🤢',
  'Class 1': '😊', 'Class 2': '😢', 'Class 3': '😠', 
  'Class 4': '😲', 'Class 5': '😐', 'Class 6': '😨'
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
        <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}" class="music-thumbnail">
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

// 더미 음악 데이터 표시 (API 키가 없을 때)
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
  
  dummyVideos.forEach(video => {
    html += `
      <div class="music-item" onclick="searchYouTube('${video.title}')">
        <img src="/api/placeholder/240/135" alt="${video.title}" class="music-thumbnail">
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

// 감정에 따른 차별화된 더미 플레이리스트 데이터
function getDummyMusicData(emotion) {
  console.log('getDummyMusicData 호출됨 - 감정:', emotion);
  
  const playlistData = {
    '행복': [
      { title: 'BTS - Dynamite | 신나는 K-POP 댄스 음악', artist: 'BTS Official' },
      { title: 'Bruno Mars - Uptown Funk | 펑키한 댄스 히트곡', artist: 'Bruno Mars' },
      { title: 'Pharrell Williams - Happy | 행복 테마송', artist: 'Pharrell Williams' },
      { title: 'Dua Lipa - Levitating | 댄스 팝 명곡', artist: 'Dua Lipa' },
      { title: 'The Weeknd - Blinding Lights | 신스팝 히트곡', artist: 'The Weeknd' },
      { title: 'Lizzo - Good As Hell | 자신감 넘치는 팝송', artist: 'Lizzo' }
    ],
    '슬픔': [
      { title: 'Adele - Someone Like You | 감성 발라드 명곡', artist: 'Adele' },
      { title: 'IU(아이유) - Through the Night | 잔잔한 K-발라드', artist: 'IU Official' },
      { title: 'Sam Smith - Stay With Me | 애절한 R&B 발라드', artist: 'Sam Smith' },
      { title: 'Billie Eilish - When The Party\'s Over | 우울한 팝발라드', artist: 'Billie Eilish' },
      { title: '볼빨간사춘기 - 썸 탈꺼야 | 감성적인 인디 발라드', artist: 'BOL4' },
      { title: 'Lana Del Rey - Young and Beautiful | 몽환적 발라드', artist: 'Lana Del Rey' }
    ],
    '화남': [
      { title: 'Eminem - Lose Yourself | 강렬한 랩 음악', artist: 'Eminem' },
      { title: 'Linkin Park - In The End | 뉴메탈 대표곡', artist: 'Linkin Park' },
      { title: 'Rage Against The Machine - Killing In The Name | 하드록', artist: 'Rage Against The Machine' },
      { title: 'Metallica - Enter Sandman | 헤비메탈 클래식', artist: 'Metallica' },
      { title: 'Green Day - American Idiot | 펑크록 앤썸', artist: 'Green Day' },
      { title: 'System Of A Down - Chop Suey! | 얼터너티브 메탈', artist: 'System Of A Down' }
    ],
    '놀람': [
      { title: 'Skrillex - Bangarang | 강렬한 더브스텝', artist: 'Skrillex' },
      { title: 'David Guetta ft. Sia - Titanium | 에너지 넘치는 EDM', artist: 'David Guetta' },
      { title: 'Calvin Harris - Feel So Close | 하우스 댄스 히트', artist: 'Calvin Harris' },
      { title: 'Avicii - Wake Me Up | 프로그레시브 하우스', artist: 'Avicii' },
      { title: 'Marshmello - Happier | 감성 EDM', artist: 'Marshmello' },
      { title: 'The Chainsmokers - Closer | 일렉트로팝', artist: 'The Chainsmokers' }
    ],
    '무표정': [
      { title: 'Norah Jones - Don\'t Know Why | 잔잔한 재즈', artist: 'Norah Jones' },
      { title: 'Lo-Fi Hip Hop Radio - 24/7 Study Music | 로파이 비트', artist: 'ChilledCow' },
      { title: 'Ludovico Einaudi - Nuvole Bianche | 클래식 피아노', artist: 'Ludovico Einaudi' },
      { title: 'Bon Iver - Skinny Love | 인디 포크', artist: 'Bon Iver' },
      { title: 'Ólafur Arnalds - Near Light | 앰비언트 클래식', artist: 'Ólafur Arnalds' },
      { title: 'Kiasmos - Blurred EP | 미니멀 일렉트로니카', artist: 'Kiasmos' }
    ],
    '변화없음': [
      { title: 'Ed Sheeran - Perfect | 부드러운 팝 발라드', artist: 'Ed Sheeran' },
      { title: 'John Mayer - Gravity | 어쿠스틱 블루스', artist: 'John Mayer' },
      { title: 'Coldplay - Fix You | 대안 록 발라드', artist: 'Coldplay' },
      { title: 'James Blake - Retrograde | 실험적 R&B', artist: 'James Blake' },
      { title: 'Radiohead - Creep | 얼터너티브 록', artist: 'Radiohead' },
      { title: 'The National - Bloodbuzz Ohio | 인디 록', artist: 'The National' }
    ],
    '두려움': [
      { title: 'Enya - Only Time | 뉴에이지 힐링', artist: 'Enya' },
      { title: 'Max Richter - On The Nature of Daylight | 네오클래식', artist: 'Max Richter' },
      { title: 'Sigur Rós - Hoppípolla | 포스트록 서정곡', artist: 'Sigur Rós' },
      { title: 'Brian Eno - Music for Airports | 앰비언트 음악', artist: 'Brian Eno' },
      { title: 'Ólafur Arnalds & Nils Frahm - Four | 피아노 앰비언트', artist: 'Ólafur Arnalds' },
      { title: 'GoGo Penguin - Hopopono | 재즈 트리오', artist: 'GoGo Penguin' }
    ],
    '혐오': [
      { title: 'Katrina & The Waves - Walking on Sunshine | 밝은 팝', artist: 'Katrina & The Waves' },
      { title: 'Bobby McFerrin - Don\'t Worry Be Happy | 긍정 메시지송', artist: 'Bobby McFerrin' },
      { title: 'Jason Mraz - I\'m Yours | 어쿠스틱 팝', artist: 'Jason Mraz' },
      { title: 'Jack Johnson - Better Together | 서핑 뮤직', artist: 'Jack Johnson' },
      { title: 'Israel Kamakawiwoʻole - Over the Rainbow | 우쿨렐레 커버', artist: 'Israel Kamakawiwoʻole' },
      { title: 'Vance Joy - Riptide | 인디 팝', artist: 'Vance Joy' }
    ],
    // 영어 감정명도 동일하게 매핑
    'Happy': [
      { title: 'BTS - Dynamite | 신나는 K-POP 댄스 음악', artist: 'BTS Official' },
      { title: 'Bruno Mars - Uptown Funk | 펑키한 댄스 히트곡', artist: 'Bruno Mars' },
      { title: 'Pharrell Williams - Happy | 행복 테마송', artist: 'Pharrell Williams' },
      { title: 'Dua Lipa - Levitating | 댄스 팝 명곡', artist: 'Dua Lipa' },
      { title: 'The Weeknd - Blinding Lights | 신스팝 히트곡', artist: 'The Weeknd' },
      { title: 'Lizzo - Good As Hell | 자신감 넘치는 팝송', artist: 'Lizzo' }
    ],
    'Sad': [
      { title: 'Adele - Someone Like You | 감성 발라드 명곡', artist: 'Adele' },
      { title: 'IU(아이유) - Through the Night | 잔잔한 K-발라드', artist: 'IU Official' },
      { title: 'Sam Smith - Stay With Me | 애절한 R&B 발라드', artist: 'Sam Smith' },
      { title: 'Billie Eilish - When The Party\'s Over | 우울한 팝발라드', artist: 'Billie Eilish' },
      { title: '볼빨간사춘기 - 썸 탈꺼야 | 감성적인 인디 발라드', artist: 'BOL4' },
      { title: 'Lana Del Rey - Young and Beautiful | 몽환적 발라드', artist: 'Lana Del Rey' }
    ],
    'Angry': [
      { title: 'Eminem - Lose Yourself | 강렬한 랩 음악', artist: 'Eminem' },
      { title: 'Linkin Park - In The End | 뉴메탈 대표곡', artist: 'Linkin Park' },
      { title: 'Rage Against The Machine - Killing In The Name | 하드록', artist: 'Rage Against The Machine' },
      { title: 'Metallica - Enter Sandman | 헤비메탈 클래식', artist: 'Metallica' },
      { title: 'Green Day - American Idiot | 펑크록 앤썸', artist: 'Green Day' },
      { title: 'System Of A Down - Chop Suey! | 얼터너티브 메탈', artist: 'System Of A Down' }
    ],
    'Surprised': [
      { title: 'Skrillex - Bangarang | 강렬한 더브스텝', artist: 'Skrillex' },
      { title: 'David Guetta ft. Sia - Titanium | 에너지 넘치는 EDM', artist: 'David Guetta' },
      { title: 'Calvin Harris - Feel So Close | 하우스 댄스 히트', artist: 'Calvin Harris' },
      { title: 'Avicii - Wake Me Up | 프로그레시브 하우스', artist: 'Avicii' },
      { title: 'Marshmello - Happier | 감성 EDM', artist: 'Marshmello' },
      { title: 'The Chainsmokers - Closer | 일렉트로팝', artist: 'The Chainsmokers' }
    ],
    'Neutral': [
      { title: 'Norah Jones - Don\'t Know Why | 잔잔한 재즈', artist: 'Norah Jones' },
      { title: 'Lo-Fi Hip Hop Radio - 24/7 Study Music | 로파이 비트', artist: 'ChilledCow' },
      { title: 'Ludovico Einaudi - Nuvole Bianche | 클래식 피아노', artist: 'Ludovico Einaudi' },
      { title: 'Bon Iver - Skinny Love | 인디 포크', artist: 'Bon Iver' },
      { title: 'Ólafur Arnalds - Near Light | 앰비언트 클래식', artist: 'Ólafur Arnalds' },
      { title: 'Kiasmos - Blurred EP | 미니멀 일렉트로니카', artist: 'Kiasmos' }
    ],
    'Fear': [
      { title: 'Enya - Only Time | 뉴에이지 힐링', artist: 'Enya' },
      { title: 'Max Richter - On The Nature of Daylight | 네오클래식', artist: 'Max Richter' },
      { title: 'Sigur Rós - Hoppípolla | 포스트록 서정곡', artist: 'Sigur Rós' },
      { title: 'Brian Eno - Music for Airports | 앰비언트 음악', artist: 'Brian Eno' },
      { title: 'Ólafur Arnalds & Nils Frahm - Four | 피아노 앰비언트', artist: 'Ólafur Arnalds' },
      { title: 'GoGo Penguin - Hopopono | 재즈 트리오', artist: 'GoGo Penguin' }
    ],
    'Disgust': [
      { title: 'Katrina & The Waves - Walking on Sunshine | 밝은 팝', artist: 'Katrina & The Waves' },
      { title: 'Bobby McFerrin - Don\'t Worry Be Happy | 긍정 메시지송', artist: 'Bobby McFerrin' },
      { title: 'Jason Mraz - I\'m Yours | 어쿠스틱 팝', artist: 'Jason Mraz' },
      { title: 'Jack Johnson - Better Together | 서핑 뮤직', artist: 'Jack Johnson' },
      { title: 'Israel Kamakawiwoʻole - Over the Rainbow | 우쿨렐레 커버', artist: 'Israel Kamakawiwoʻole' },
      { title: 'Vance Joy - Riptide | 인디 팝', artist: 'Vance Joy' }
    ]
  };
  
  const result = playlistData[emotion] || playlistData['무표정'];
  console.log('반환되는 플레이리스트:', result);
  return result;
}

// 감정 텍스트 변환
function getEmotionText(emotion) {
  const emotionTexts = {
    '행복': '행복한', '슬픔': '슬픈', '화남': '화난', '놀람': '놀란',
    '무표정': '차분한', '변화없음': '평온한', '두려움': '불안한', '혐오': '불쾌한',
    'Happy': '행복한', 'Sad': '슬픈', 'Angry': '화난', 'Surprised': '놀란',
    'Neutral': '차분한', 'Fear': '불안한', 'Disgust': '불쾌한'
  };
  
  return emotionTexts[emotion] || '현재';
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
document.head.appendChild(style);