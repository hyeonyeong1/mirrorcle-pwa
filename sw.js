const CACHE_NAME = 'mirrorcle-v1.0.0';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  // 외부 라이브러리 (온라인 상태에서만 로드)
  'https://cdnjs.cloudflare.com/ajax/libs/tensorflow/3.18.0/tf.min.js',
  'https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js'
];

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('Service Worker 설치 중...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('캐시 열기 성공');
        // 핵심 파일만 미리 캐시 (외부 라이브러리는 제외)
        return cache.addAll([
          '/',
          '/index.html',
          '/app.js',
          '/manifest.json'
        ]);
      })
      .catch((error) => {
        console.error('캐시 설치 실패:', error);
      })
  );
  // 새 Service Worker를 즉시 활성화
  self.skipWaiting();
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('Service Worker 활성화 중...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 이전 버전 캐시 삭제
          if (cacheName !== CACHE_NAME) {
            console.log('이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Service Worker가 즉시 클라이언트 제어
  return self.clients.claim();
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // GET 요청만 처리
  if (request.method !== 'GET') {
    return;
  }
  
  // Chrome extension 및 특수 URL 무시
  if (url.protocol === 'chrome-extension:' || 
      url.protocol === 'moz-extension:' ||
      url.protocol === 'safari-web-extension:') {
    return;
  }
  
  event.respondWith(
    handleFetch(request)
  );
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // 외부 API 및 중요한 리소스는 네트워크 우선
    if (url.hostname.includes('teachablemachine.withgoogle.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('cdn.jsdelivr.net')) {
      
      try {
        // 네트워크에서 먼저 시도
        const networkResponse = await fetch(request);
        
        // 성공하면 캐시에 저장
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (networkError) {
        console.log('네트워크 실패, 캐시에서 찾는 중:', request.url);
        
        // 네트워크 실패 시 캐시에서 찾기
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // 캐시에도 없으면 오류 응답
        return new Response('오프라인 상태입니다. 인터넷 연결을 확인해주세요.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/html; charset=utf-8'
          })
        });
      }
    }
    
    // 일반 리소스는 캐시 우선 전략
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 캐시에 없으면 네트워크에서 가져오기
    const networkResponse = await fetch(request);
    
    // 성공적인 응답이면 캐시에 저장
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('Fetch 처리 중 오류:', error);
    
    // 기본 오프라인 페이지 또는 메시지 반환
    if (request.destination === 'document') {
      return new Response(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>오프라인 - Mirrorcle</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: rgba(255,255,255,0.1);
              padding: 40px;
              border-radius: 20px;
              backdrop-filter: blur(10px);
            }
            h1 { font-size: 3em; margin-bottom: 20px; }
            p { font-size: 1.2em; margin-bottom: 30px; }
            button {
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              color: white;
              padding: 15px 30px;
              border-radius: 25px;
              cursor: pointer;
              font-size: 16px;
              transition: all 0.3s;
            }
            button:hover {
              background: rgba(255,255,255,0.3);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🪞</h1>
            <h2>Mirrorcle</h2>
            <p>현재 오프라인 상태입니다.</p>
            <p>인터넷 연결을 확인한 후 다시 시도해주세요.</p>
            <button onclick="window.location.reload()">다시 시도</button>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    return new Response('네트워크 오류', { status: 503 });
  }
}

// 백그라운드 동기화 (미래 기능 확장용)
self.addEventListener('sync', (event) => {
  console.log('백그라운드 동기화:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // 나중에 오프라인 데이터 동기화 등에 사용
  console.log('백그라운드 동기화 수행');
}

// 푸시 알림 (미래 기능 확장용)
self.addEventListener('push', (event) => {
  console.log('푸시 메시지 수신:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Mirrorcle에서 새로운 소식이 있습니다!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: [
        {
          action: 'open',
          title: '열기',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'close',
          title: '닫기'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Mirrorcle', options)
    );
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('알림 클릭:', event);