/* 감성 가계부 서비스 워커
 * - 오프라인에서도 앱이 열리도록 핵심 자산을 캐싱합니다.
 * - 전략: 탐색(HTML)은 네트워크 우선(실패 시 캐시), 그 외 핵심 자산은 캐시 우선(백그라운드 갱신).
 * - activate 시점에 구버전 캐시를 정리합니다.
 */
const CACHE_NAME = 'sab-cache-v3';

// 캐시할 핵심 자산
const CORE_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// 설치: 핵심 자산 사전 캐싱 (cache: 'reload'로 HTTP 캐시 우회 → 항상 최신본 저장)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => Promise.all(
                CORE_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
            ))
            .then(() => self.skipWaiting())
    );
});

// 활성화: 구버전 캐시 정리
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// 요청 가로채기
self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // CDN 등 외부 리소스: 네트워크 우선, 실패 시 캐시(STALE fallback)로 대응
    if (url.origin !== self.location.origin) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // 페이지 탐색(HTML): 네트워크 우선, 오프라인이면 캐시된 index.html
    if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
                    return response;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // 같은 출처의 정적 자산: stale-while-revalidate (캐시로 즉시 응답하고, 백그라운드에서 최신본을 받아 갱신)
    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cached = await cache.match(request);
            const network = fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        cache.put(request, response.clone());
                    }
                    return response;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});
