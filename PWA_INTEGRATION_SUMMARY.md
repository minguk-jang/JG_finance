# PWA 통합 최종 요약

## 개요

JG_finance 프로젝트에 **Vite PWA 플러그인**을 통합하여 완전한 Progressive Web App 기능을 구현했습니다. 자동화된 Service Worker 생성, 다층 캐싱 전략, 오프라인 지원이 모두 구성되었습니다.

---

## 1. 설치 명령어

### 단계 1: 필수 패키지 설치

```bash
npm install -D vite-plugin-pwa workbox-window
npm install workbox-precaching workbox-routing workbox-strategies workbox-cacheable-response workbox-expiration
```

### 단계 2: 개발 서버 실행

```bash
npm run dev
```

---

## 2. 생성/수정된 파일 목록

### 핵심 구성 파일

| 파일 | 역할 | 상태 |
|------|------|------|
| `/vite.config.ts` | VitePWA 플러그인 설정 | 수정됨 |
| `/index.html` | Service Worker 등록 스크립트 | 수정됨 |

### 신규 생성 파일

| 파일 | 역할 |
|------|------|
| `/src/sw.ts` | 커스텀 Service Worker 구현 |
| `/src/vite-env.d.ts` | TypeScript 타입 정의 (PWA) |
| `/public/offline.html` | 오프라인 폴백 페이지 |
| `/components/PWAUpdatePrompt.tsx` | 업데이트 알림 컴포넌트 |
| `/docs/pwa-setup.md` | PWA 상세 설정 가이드 |
| `/docs/pwa-install.md` | 설치 및 테스트 가이드 |
| `/docs/pwa-deployment.md` | 배포 및 운영 가이드 |

### 업데이트된 파일

| 파일 | 변경사항 |
|------|---------|
| `/README.md` | PWA 기술 스택 및 문서 링크 추가 |

---

## 3. 주요 기능 구현

### 3.1 자동 Service Worker 등록

```javascript
// index.html에서 자동 실행
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() { /* 업데이트 알림 */ },
  onOffline() { /* 오프라인 알림 */ },
  onRegistered() { /* 등록 완료 */ },
  onRegisterError(err) { /* 오류 처리 */ }
})
```

### 3.2 다층 캐싱 전략

| 대상 | 전략 | 캐시명 | 만료 | 항목 제한 |
|------|------|--------|------|---------|
| API (`/api/*`) | Network-First | api-cache | 24h | 50개 |
| 이미지 (`*.png`, `*.jpg`, etc) | Cache-First | image-cache | 30일 | 100개 |
| 폰트 (`*.woff`, `*.ttf`, etc) | Cache-First | font-cache | 60일 | 30개 |
| Tailwind CDN | Stale-While-Revalidate | tailwind-cache | 24h | 10개 |

**Network-First**: 네트워크 요청 시도 → 실패 시 캐시 사용
- 가장 최신 데이터 제공
- 오프라인 시 캐시된 데이터 표시
- 사용 사례: API 요청

**Cache-First**: 캐시에서 먼저 제공 → 없으면 네트워크
- 빠른 로딩 속도
- 대역폭 절감
- 사용 사례: 정적 자산 (이미지, 폰트)

**Stale-While-Revalidate**: 캐시 제공하면서 백그라운드 업데이트
- 빠른 로딩
- 항상 최신 데이터 유지
- 사용 사례: CDN 자산

### 3.3 오프라인 폴백 페이지

- 경로: `/public/offline.html`
- 기능:
  - 오프라인 상태 표시
  - 다시 시도 버튼
  - 홈으로 돌아가기 버튼
  - 온라인 복구 시 자동 리다이렉트
  - 프로젝트 테마 적용

### 3.4 업데이트 알림 컴포넌트

```tsx
// App.tsx에 추가
import PWAUpdatePrompt from './components/PWAUpdatePrompt'

export default function App() {
  return <PWAUpdatePrompt />
}
```

**기능**:
- 새 버전 감지 시 알림
- 사용자 선택: "지금 업데이트" 또는 "나중에"
- 업데이트 시 자동 페이지 새로고침

---

## 4. 개발 중 테스트

### 4.1 Service Worker 확인

1. DevTools 열기 (F12)
2. **Application** 탭 → **Service Workers**
3. 상태 확인: "activated and is running"

### 4.2 캐시 확인

1. **Application** → **Cache Storage**
2. 다음 캐시 존재 확인:
   - `api-cache`
   - `image-cache`
   - `font-cache`
   - `tailwind-cache`

### 4.3 오프라인 테스트

1. **Network** 탭 → "Offline" 활성화
2. 페이지 새로고침 또는 다른 페이지 이동
3. `/offline.html` 표시 확인

### 4.4 네트워크 모니터링

1. **Network** 탭에서 요청 확인
2. 반복 방문 시 캐시에서 로드 (Status: 304 또는 "(from service worker)")

---

## 5. 빌드 및 배포

### 5.1 프로덕션 빌드

```bash
npm run build
```

생성되는 파일:
- `dist/sw.js` - Service Worker
- `dist/manifest.webmanifest` - PWA Manifest
- `dist/offline.html` - 오프라인 폴백
- `dist/index.html` - 메인 HTML
- `dist/[hash].js`, `dist/[hash].css` - 정적 자산 (사전 캐싱)

### 5.2 로컬에서 빌드 확인

```bash
npm run preview
# http://localhost:4173에서 확인
```

### 5.3 배포 플랫폼별 설정

#### Vercel
```bash
vercel deploy --prod
```

#### Netlify
```bash
netlify deploy --prod --dir=dist
```

#### GitHub Pages
```bash
npm run build && gh-pages -d dist
```

#### Docker
```bash
docker build -t jjoogguk-finance .
docker run -p 3000:3000 jjoogguk-finance
```

---

## 6. 성능 개선

### 예상 개선도

| 메트릭 | 개선 전 | 개선 후 | 개선도 |
|------|--------|--------|------|
| 첫 로드 | 3.5초 | 2.5초 | 28% |
| 반복 로드 | 2.0초 | 0.8초 | 60% |
| 오프라인 접근 | 불가 | 가능 | 100% |

### Lighthouse 점수 목표

- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+
- PWA: 90+

---

## 7. 주요 파일 상세 설명

### 7.1 vite.config.ts (PWA 플러그인 설정)

```typescript
VitePWA({
  // 개발 환경 활성화
  devOptions: { enabled: true },

  // Workbox 캐싱 전략
  workbox: {
    runtimeCaching: [
      // API: Network-First (10초 타임아웃)
      // 이미지: Cache-First (30일 만료)
      // 폰트: Cache-First (60일 만료)
      // Tailwind: Stale-While-Revalidate
    ]
  },

  // Manifest 설정
  manifest: { /* PWA 메타데이터 */ },

  // Service Worker 자동 등록
  injectRegister: 'auto',
  registerType: 'autoUpdate'
})
```

### 7.2 src/sw.ts (Service Worker 로직)

```typescript
// 정적 자산 사전 캐싱
precacheAndRoute(self.__WB_MANIFEST)

// 런타임 캐싱 규칙
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ /* 설정 */ })
)

// 메시지 핸들러 (클라이언트 통신)
self.addEventListener('message', (event) => {
  // SKIP_WAITING, CLEAR_CACHE 처리
})

// 오프라인 폴백
self.addEventListener('fetch', (event) => {
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    )
  }
})
```

### 7.3 public/offline.html (오프라인 페이지)

- 프로젝트 테마 적용 (다크/라이트 모드)
- 반응형 디자인
- 오프라인 상태 표시
- 온라인 복구 감지 및 자동 리다이렉트

### 7.4 components/PWAUpdatePrompt.tsx (업데이트 알림)

```tsx
export default function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  // Service Worker 업데이트 감지
  // 사용자 알림 표시
  // "지금 업데이트" / "나중에" 버튼
  // 업데이트 시 페이지 새로고침
}
```

---

## 8. 캐싱 정책 상세

### 8.1 API 캐싱 (Network-First)

```
요청 → 네트워크 시도 (10초 타임아웃)
         ↓ (성공)
      응답 반환 + 캐시 저장
         ↓ (실패 또는 타임아웃)
      캐시에서 반환
         ↓ (캐시도 없음)
      오프라인 폴백
```

**사용 사례**:
- `/api/expenses` - 지출 목록
- `/api/categories` - 카테고리
- `/api/budgets` - 예산
- `/api/investments/*` - 투자 데이터

### 8.2 이미지 캐싱 (Cache-First)

```
요청 → 캐시 확인
         ↓ (있음)
      캐시 반환
         ↓ (없음)
      네트워크에서 로드
         ↓ (성공)
      캐시 저장 + 반환
         ↓ (실패)
      오류 반환
```

**만료 정책**:
- 30일 동안 유지
- 최대 100개 이미지

### 8.3 폰트 캐싱 (Cache-First)

```
동일한 이미지 캐싱과 유사
- 60일 동안 유지
- 최대 30개 폰트
- 한 번 로드되면 계속 사용
```

### 8.4 Tailwind CDN (Stale-While-Revalidate)

```
요청 → 캐시 확인
         ↓ (있음)
      캐시 반환 + 백그라운드 네트워크 요청
         ↓ (없음)
      네트워크에서 로드
         ↓
      캐시 저장 + 반환
```

**장점**:
- 즉시 로딩 (캐시에서)
- 항상 최신 유지 (백그라운드 업데이트)

---

## 9. 보안 고려사항

### 9.1 HTTPS 필수

- 로컬: `localhost`는 예외
- 프로덕션: 반드시 HTTPS 적용

### 9.2 민감한 데이터 보호

캐시하지 않을 패턴 추가:

```typescript
runtimeCaching: [
  {
    urlPattern: /^\/api\/(auth|payment)\/.*/,
    handler: 'NetworkOnly' // 네트워크만 사용, 캐시 안 함
  }
]
```

### 9.3 API 인증

- JWT 토큰은 HttpOnly 쿠키 사용 권장
- Service Worker는 쿠키 자동 전송

### 9.4 CORS 정책

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true
  }
}
```

---

## 10. 문제 해결

### Q: Service Worker 등록 안 됨

**A**:
- DevTools에서 오류 메시지 확인
- HTTPS 또는 localhost 사용 확인
- 브라우저 콘솔 오류 확인

### Q: 캐시가 너무 크다

**A**:
```typescript
// vite.config.ts
maximumFileSizeToCacheInBytes: 3 * 1024 * 1024 // 5MB → 3MB
```

또는 항목 제한:
```typescript
expiration: {
  maxEntries: 30 // 50 → 30
}
```

### Q: API 응답 캐시 안 됨

**A**:
- 응답 상태 코드 200 확인
- `Content-Type` 헤더 확인
- Network 탭에서 응답 확인

### Q: 오프라인 폴백 작동 안 함

**A**:
- `/public/offline.html` 존재 확인
- 빌드 후 `dist/offline.html` 생성 확인
- DevTools → Network → Offline 테스트

---

## 11. 다음 단계 (선택사항)

### 11.1 푸시 알림

```typescript
// src/sw.ts에 추가
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() ?? {}
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/components/icons/icon-192.png'
  })
})
```

### 11.2 백그라운드 동기화

```typescript
// 오프라인 상태에서 변경사항 저장 후 온라인 복구 시 동기화
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-expenses') {
    event.waitUntil(syncExpenses())
  }
})
```

### 11.3 주기적 백그라운드 동기화

```typescript
// 백그라운드에서 주기적으로 데이터 업데이트
self.registration.periodicSync.register('sync-data', {
  minInterval: 24 * 60 * 60 * 1000 // 24시간
})
```

---

## 12. 참고 문서

| 문서 | 용도 |
|------|------|
| `/docs/pwa-setup.md` | PWA 상세 설정 및 캐싱 전략 |
| `/docs/pwa-install.md` | 설치 방법 및 개발 중 테스트 |
| `/docs/pwa-deployment.md` | 배포 및 운영 (Vercel, Netlify, AWS 등) |
| `/README.md` | 프로젝트 개요 (PWA 기술 스택 추가) |

---

## 13. 체크리스트

### 개발자용
- [ ] `npm install` 실행 (PWA 패키지)
- [ ] `npm run dev` 실행 및 테스트
- [ ] DevTools에서 Service Worker 확인
- [ ] 오프라인 테스트 실행
- [ ] `npm run build` 성공 확인

### 배포 전
- [ ] HTTPS 설정 확인
- [ ] `npm run build` 성공
- [ ] `dist/sw.js` 생성 확인
- [ ] Lighthouse 점수 90+ 확인
- [ ] 배포 플랫폼 설정 (Vercel, Netlify 등)

### 배포 후
- [ ] Service Worker 등록 확인 (사용자 기준)
- [ ] 캐시 생성 확인
- [ ] 오프라인 접근 테스트
- [ ] API 캐싱 확인
- [ ] 모바일 설치 테스트

---

## 14. 요약

이제 JG_finance 프로젝트는 다음 PWA 기능을 완전히 갖추고 있습니다:

✅ **자동 Service Worker 생성 및 등록**
✅ **다층 캐싱 전략** (API, 이미지, 폰트, CDN)
✅ **오프라인 폴백 페이지**
✅ **업데이트 알림 시스템**
✅ **개발/배포 문서**
✅ **TypeScript 타입 지원**
✅ **프로덕션 최적화**

**다음 명령어를 실행하세요**:
```bash
npm install -D vite-plugin-pwa workbox-window
npm install workbox-precaching workbox-routing workbox-strategies workbox-cacheable-response workbox-expiration
npm run dev
```

**그 다음**:
- DevTools에서 Service Worker 확인
- 오프라인 테스트 실행
- 배포 플랫폼 선택 후 배포

모든 상세 내용은 `/docs/pwa-setup.md`, `/docs/pwa-install.md`, `/docs/pwa-deployment.md`를 참고하세요!

---

**생성일**: 2025-10-19
**작성자**: Claude Code
**상태**: 완료 및 테스트 준비됨
