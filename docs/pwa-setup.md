# PWA (Progressive Web App) 통합 가이드

## 개요

이 프로젝트는 **vite-plugin-pwa**를 사용하여 완전한 PWA 기능을 제공합니다. 오프라인 지원, 캐싱 전략, Service Worker 관리가 자동화되어 있습니다.

## 설치

다음 명령어로 필요한 의존성을 설치하세요:

```bash
npm install -D vite-plugin-pwa workbox-window
npm install workbox-precaching workbox-routing workbox-strategies workbox-cacheable-response workbox-expiration
```

## 주요 기능

### 1. Service Worker 자동 등록

`index.html`에서 자동으로 Service Worker를 등록합니다:

```javascript
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() { /* 업데이트 필요 시 */ },
  onOffline() { /* 오프라인 전환 시 */ },
  onRegistered() { /* 등록 완료 시 */ },
  onRegisterError(err) { /* 등록 오류 시 */ }
})

window.__PWA_UPDATE__ = updateSW // 수동 업데이트 함수
```

### 2. 캐싱 전략

#### 2.1 API 요청 - Network-First (네트워크 우선)

**패턴**: `/api/*`

- 네트워크 요청 시도 (10초 타임아웃)
- 실패 시 캐시에서 로드
- 캐시 만료: 24시간
- 최대 항목: 50개

```typescript
{
  urlPattern: /^\/api\/.*/,
  handler: 'NetworkFirst',
  options: {
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    expiration: {
      maxEntries: 50,
      maxAgeSeconds: 24 * 60 * 60
    }
  }
}
```

**사용 예**:
- 지출/수익 목록 조회
- 카테고리 정보
- 예산 데이터
- 투자 거래 내역

#### 2.2 이미지 - Cache-First (캐시 우선)

**패턴**: `*.png`, `*.jpg`, `*.jpeg`, `*.svg`, `*.gif`, `*.webp`

- 캐시에서 먼저 로드
- 없으면 네트워크에서 로드
- 캐시 만료: 30일
- 최대 항목: 100개

```typescript
{
  urlPattern: /^https?:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/,
  handler: 'CacheFirst',
  options: {
    cacheName: 'image-cache',
    expiration: {
      maxEntries: 100,
      maxAgeSeconds: 30 * 24 * 60 * 60
    }
  }
}
```

**사용 예**:
- 앱 아이콘 (192x192, 512x512)
- 사용자 아바타 이미지
- 차트 렌더링

#### 2.3 폰트 - Cache-First

**패턴**: `*.woff`, `*.woff2`, `*.ttf`, `*.otf`, `*.eot`

- 캐시에서 먼저 로드
- 없으면 네트워크에서 로드
- 캐시 만료: 60일
- 최대 항목: 30개

```typescript
{
  urlPattern: /^https?:\/\/.*\.(woff|woff2|ttf|otf|eot)$/,
  handler: 'CacheFirst',
  options: {
    cacheName: 'font-cache',
    expiration: {
      maxEntries: 30,
      maxAgeSeconds: 60 * 24 * 60 * 60
    }
  }
}
```

#### 2.4 Tailwind CDN - Stale-While-Revalidate

**패턴**: `https://cdn.tailwindcss.com/*`

- 캐시에서 로드하면서 백그라운드에서 업데이트
- 캐시 만료: 24시간
- 최대 항목: 10개

```typescript
{
  urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/,
  handler: 'StaleWhileRevalidate',
  options: {
    cacheName: 'tailwind-cache',
    expiration: {
      maxEntries: 10,
      maxAgeSeconds: 24 * 60 * 60
    }
  }
}
```

### 3. 오프라인 폴백

파일: `/public/offline.html`

인터넷 연결이 없을 때 표시되는 페이지입니다.

**기능**:
- 오프라인 상태 표시
- 다시 시도 버튼
- 홈으로 돌아가기 버튼
- 온라인 복구 시 자동 리다이렉트

**코드**:
```typescript
// Service Worker fetch 이벤트
if (request.mode === 'navigate') {
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match('/offline.html');
    })
  );
}
```

### 4. 업데이트 알림

컴포넌트: `/components/PWAUpdatePrompt.tsx`

새 버전의 앱이 준비되었을 때 사용자에게 알리는 컴포넌트입니다.

**사용 방법**:

```tsx
// App.tsx
import PWAUpdatePrompt from './components/PWAUpdatePrompt'

export default function App() {
  return (
    <>
      <PWAUpdatePrompt
        onUpdate={() => console.log('업데이트 시작')}
        onDismiss={() => console.log('업데이트 거절')}
      />
      {/* 나머지 컴포넌트 */}
    </>
  )
}
```

**기능**:
- 업데이트 가능 시 알림 표시
- 사용자가 선택 가능 (지금 업데이트 / 나중에)
- 업데이트 시 자동 페이지 새로고침

## 개발 중 PWA 테스트

### 1. Service Worker 활성화

개발 환경에서도 Service Worker가 작동합니다:

```bash
npm run dev
```

개발자 도구 (DevTools) -> Application -> Service Workers에서 확인 가능합니다.

### 2. 캐시 상태 확인

DevTools -> Application -> Cache Storage에서 캐시된 항목을 확인합니다:

- `api-cache`: API 응답
- `image-cache`: 이미지
- `font-cache`: 폰트
- `tailwind-cache`: Tailwind CSS

### 3. 오프라인 테스트

1. DevTools -> Network 탭에서 "Offline" 체크박스 클릭
2. 앱 네비게이션 시도 → `/offline.html` 표시 확인

### 4. Service Worker 업데이트 테스트

```bash
# 새로운 버전의 코드 수정
npm run build
npm run preview

# 또는 개발 중에 Service Worker 파일 수정 후 페이지 새로고침
```

## 빌드 프로세스

### 1. 프로덕션 빌드

```bash
npm run build
```

빌드 후 생성되는 파일:
- `dist/index.html` - 메인 HTML 파일
- `dist/sw.js` - Service Worker
- `dist/manifest.webmanifest` - PWA Manifest
- `dist/[hash].js` - JS 번들 (사전 캐싱)
- `dist/[hash].css` - CSS 번들 (사전 캐싱)

### 2. 사전 캐싱 (Precaching)

다음 파일들이 자동으로 사전 캐싱됩니다:

```
- **/*.{js,css,html}
- components/icons/*.{png,svg,ico}
```

사전 캐싱된 파일은 앱 설치 시 다운로드되어 즉시 오프라인 사용 가능합니다.

### 3. 런타임 캐싱 (Runtime Caching)

위의 캐싱 전략에 따라 사용 중에 동적으로 캐싱됩니다.

## 성능 최적화

### 1. 캐시 크기 제한

각 캐시 저장소의 최대 크기:

```typescript
maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
```

개별 캐시:
- `api-cache`: 50개 항목 제한
- `image-cache`: 100개 항목 제한
- `font-cache`: 30개 항목 제한

### 2. 자동 정리

```typescript
cleanupOutdatedCaches: true
```

이전 버전의 캐시는 자동 삭제됩니다.

### 3. 네트워크 타임아웃

API 요청의 네트워크 타임아웃: 10초

```typescript
networkTimeoutSeconds: 10
```

10초 이상 응답이 없으면 캐시에서 로드합니다.

## 보안 고려사항

### 1. HTTPS 필수

PWA는 HTTPS 프로토콜에서만 작동합니다 (localhost 제외).

프로덕션 배포 시:
```
https://yourdomain.com
```

### 2. 민감한 데이터 캐싱 주의

API 응답에 민감한 정보가 포함된 경우:

```typescript
// 캐시하지 않을 URL 패턴 추가
globIgnores: [
  '**/auth/**',
  '**/payment/**'
]
```

### 3. CORS 정책

Service Worker는 CORS 정책을 준수합니다:

```typescript
// vite.config.ts의 proxy 설정
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  }
}
```

## 문제 해결

### 1. Service Worker 등록 안 됨

**확인 사항**:
- HTTPS 또는 localhost 사용 확인
- DevTools -> Application -> Service Workers 확인
- 브라우저 콘솔 오류 확인

**해결 방법**:
```javascript
// 수동 등록 테스트
navigator.serviceWorker.register('/dist/sw.js')
  .then(reg => console.log('등록됨:', reg))
  .catch(err => console.error('오류:', err))
```

### 2. 캐시가 업데이트 안 됨

**원인**: 파일 해시 변경 안 됨

**해결 방법**:
```bash
# 캐시 전체 삭제
npm run build -- --clearCache

# 또는 DevTools에서 수동 삭제
```

### 3. API 응답 캐시되지 않음

**확인 사항**:
- 응답 상태 코드가 200인지 확인
- `Content-Type` 헤더 확인
- `Cache-Control` 헤더 확인

```typescript
// 응답 로깅
self.addEventListener('fetch', (event) => {
  console.log('Fetch:', event.request.url, event.request.method);
});
```

### 4. 오프라인 폴백 작동 안 함

**확인 사항**:
- `/public/offline.html` 파일 존재 확인
- 빌드 후 `dist/offline.html` 생성 확인

**테스트**:
```bash
# 개발 중 DevTools -> Network -> Offline 체크
# 프로덕션에서 DevTools -> Network -> Offline 체크
```

## Manifest 커스터마이징

파일: `vite.config.ts`의 `VitePWA` 플러그인 설정

```typescript
manifest: {
  name: '쭈꾹 가계부',
  short_name: '쭈꾹',
  description: '가계 재무 관리 애플리케이션',
  theme_color: '#0ea5e9',
  background_color: '#fff5f7',
  display: 'standalone',
  icons: [
    // 아이콘 정의
  ]
}
```

## 배포 체크리스트

프로덕션 배포 전 확인 사항:

- [ ] HTTPS 설정 완료
- [ ] `npm run build` 성공
- [ ] `dist/sw.js` 생성 확인
- [ ] `dist/manifest.webmanifest` 생성 확인
- [ ] DevTools에서 Service Worker 등록 확인
- [ ] 오프라인 테스트 완료
- [ ] API 캐시 정책 확인
- [ ] 캐시 크기 정상 범위 확인
- [ ] 모바일 기기에서 "홈 화면에 추가" 가능 확인
- [ ] 앱 시작 속도 측정 (기대값: 1초 이하)

## 참고 문서

- [vite-plugin-pwa 공식 문서](https://vite-plugin-pwa.netlify.app/)
- [Workbox 문서](https://developers.google.com/web/tools/workbox)
- [PWA 기본](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## 추가 개선 사항

### 1. 푸시 알림

```typescript
// Service Worker에서
self.registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: PUBLIC_KEY
});
```

### 2. 백그라운드 동기화

```typescript
// 오프라인 상태에서 변경사항 저장 후 온라인 복구 시 동기화
self.registration.sync.register('sync-expenses');
```

### 3. 주기적 백그라운드 동기화

```typescript
// 백그라운드에서 주기적으로 데이터 업데이트
self.registration.periodicSync.register('sync-data', {
  minInterval: 24 * 60 * 60 * 1000 // 24시간
});
```

## 라이센스

이 PWA 설정은 프로젝트의 라이센스를 따릅니다.
