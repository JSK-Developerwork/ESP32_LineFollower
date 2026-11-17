// 라인팔로워 상황판 오프라인 캐시 (네트워크 우선, 실패 시 마지막 저장본)
// 버전을 올려 이전 캐시가 새 index.html을 가리지 않도록 합니다.
const CACHE = 'lf-dash-v7-sensor-view';
const CACHE_PREFIX = 'lf-dash-';
const FILES = ['./', './index.html'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // 앱의 HTML 요청만 오프라인 처리: 다른 파일에 HTML을 반환하지 않습니다.
  const url = new URL(event.request.url);
  const root = new URL('./', self.registration.scope);
  const index = new URL('index.html', root);
  const appPage = url.origin === root.origin &&
    (url.pathname === root.pathname || url.pathname === index.pathname);
  if (!appPage) return;

  event.respondWith(
    Promise.race([fetch(event.request), timeout(3000)])
      .then(response => {
        if (response.ok) {
          const copy = response.clone(); // 응답 본문이 소비되기 전에 복제
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true })
        .then(cached => cached || caches.match('./index.html')))
  );
});
