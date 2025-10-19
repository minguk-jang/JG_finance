# PWA 패키지 설치 및 설정 완료 가이드

## 설치 명령어

다음 명령어를 프로젝트 루트에서 실행하세요:

### 1단계: 필수 패키지 설치

```bash
npm install -D vite-plugin-pwa workbox-window
```

이 명령어는 다음을 설치합니다:
- **vite-plugin-pwa**: Vite PWA 플러그인 (Service Worker 자동 생성)
- **workbox-window**: 클라이언트에서 Service Worker 제어 라이브러리

### 2단계: Workbox 의존성 설치

```bash
npm install workbox-precaching workbox-routing workbox-strategies workbox-cacheable-response workbox-expiration
```

이 명령어는 다음을 설치합니다:
- **workbox-precaching**: 앱 설치 시 정적 자산 미리 캐싱
- **workbox-routing**: 요청 패턴 매칭
- **workbox-strategies**: 캐싱 전략 (Cache-First, Network-First 등)
- **workbox-cacheable-response**: 응답 캐싱 조건 설정
- **workbox-expiration**: 캐시 만료 관리

### 3단계: 개발 서버 실행

```bash
npm run dev
```

이 명령어로 개발 서버를 시작합니다:
- Service Worker가 자동으로 등록됩니다
- 개발 환경에서 PWA 기능을 테스트할 수 있습니다

## 설치 후 생성된 파일 구조

```
/Users/mingukjang/git/JG_finance/
├── src/
│   ├── sw.ts                   # 수동 Service Worker 설정
│   └── vite-env.d.ts           # PWA TypeScript 타입 정의
├── public/
│   └── offline.html            # 오프라인 폴백 페이지
├── components/
│   └── PWAUpdatePrompt.tsx      # 업데이트 알림 컴포넌트
├── vite.config.ts              # PWA 플러그인 설정
├── index.html                  # Service Worker 등록 스크립트 추가
├── manifest.json               # PWA Manifest (기존 파일 유지)
├── docs/
│   ├── pwa-setup.md            # PWA 상세 가이드
│   └── pwa-install.md          # 이 파일 (설치 가이드)
└── package.json                # 의존성 추가됨
```

## 빌드 및 배포

### 1단계: 프로덕션 빌드

```bash
npm run build
```

빌드 결과:
- `dist/index.html` - 메인 HTML
- `dist/sw.js` - Service Worker
- `dist/manifest.webmanifest` - PWA Manifest
- `dist/[hash].js` - JavaScript 번들 (사전 캐싱)
- `dist/[hash].css` - CSS 번들 (사전 캐싱)
- `dist/offline.html` - 오프라인 폴백

### 2단계: 로컬에서 빌드 결과 확인

```bash
npm run preview
```

`http://localhost:4173`에서 프로덕션 빌드를 확인할 수 있습니다.

### 3단계: 프로덕션 배포

HTTPS가 설정된 프로덕션 서버에 `dist/` 폴더를 배포합니다:

```bash
# 예: Vercel
vercel deploy

# 예: Netlify
netlify deploy --prod --dir=dist

# 예: GitHub Pages
npm run build && git add dist && git commit -m "Deploy PWA"
```

## PWA 기능 테스트 가이드

### 1. Service Worker 등록 확인

1. 브라우저 개발자 도구 (F12) 열기
2. **Application** 탭 이동
3. **Service Workers** 섹션에서 등록 상태 확인

**예상 결과**:
```
http://localhost:5173/
Status: activated and is running
```

### 2. 캐시 상태 확인

1. **Application** 탭에서 **Cache Storage** 확장
2. 다음 캐시 저장소 확인:
   - `api-cache` (API 응답)
   - `image-cache` (이미지)
   - `font-cache` (폰트)
   - `tailwind-cache` (Tailwind CSS)

### 3. 오프라인 테스트

1. **Network** 탭으로 이동
2. **Offline** 체크박스 활성화
3. 앱의 다른 페이지로 이동
4. 오프라인 폴백 페이지(`offline.html`) 표시 확인

### 4. API 캐싱 테스트

1. Network 탭에서 요청 확인:
   ```
   /api/expenses
   /api/categories
   ```

2. 다시 같은 요청 → 캐시에서 로드 (대역폭 절감)

3. 오프라인 상태에서 → API 캐시에서 응답

### 5. 모바일 설치 테스트

#### Android (Chrome)
1. 앱 방문
2. 브라우저 메뉴 → "앱 설치" 또는 "홈 화면에 추가"
3. 설치 후 앱 런처에서 실행

#### iOS (Safari)
1. 앱 방문
2. 공유 버튼 → "홈 화면에 추가"
3. 확인 후 생성된 앱 실행

## 개발 중 주의사항

### 1. Service Worker 개발 모드

개발 중에는 `src/sw.ts`를 수정하면 자동 새로고침됩니다.

수동 새로고침이 필요한 경우:
```bash
# 개발 서버 재시작
npm run dev
```

### 2. 캐시 문제 해결

개발 중 캐시 문제가 발생하면:

**Option 1: DevTools에서 수동 삭제**
1. Application → Cache Storage
2. 각 캐시 저장소 우클릭 → Delete

**Option 2: Service Worker 언로드**
1. Application → Service Workers
2. "Unregister" 클릭

**Option 3: 전체 캐시 삭제**
```javascript
// DevTools 콘솔에서
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

### 3. 브라우저 호환성

| 브라우저 | PWA 지원 | Service Worker | Offline Support |
|---------|---------|-----------------|-----------------|
| Chrome  | ✅      | ✅              | ✅              |
| Firefox | ✅      | ✅              | ✅              |
| Safari  | ✅      | ✅              | ✅              |
| Edge    | ✅      | ✅              | ✅              |
| IE 11   | ❌      | ❌              | ❌              |

## 성능 메트릭

### 예상 성능 개선

PWA 적용 후 기대할 수 있는 성능 개선:

| 메트릭 | 개선 전 | 개선 후 | 개선도 |
|------|--------|--------|------|
| 첫 로드 | 3.5초 | 2.5초 | 28% |
| 반복 로드 | 2.0초 | 0.8초 | 60% |
| 오프라인 접근 | 불가 | 가능 | 100% |
| 캐시 히트율 | - | 70%+ | - |

### 성능 측정

```bash
# Google Lighthouse로 성능 측정
# DevTools → Lighthouse → Generate report
```

**이상적인 Lighthouse 점수 (PWA 적용 후)**:
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+
- PWA: 90+

## 문제 해결

### Q: "Service Worker 등록 오류" 메시지

**A**: 다음을 확인하세요:
- HTTPS 또는 localhost 사용 중인지 확인
- 브라우저 콘솔에서 오류 메시지 확인
- `src/sw.ts` 파일 문법 오류 확인

### Q: 캐시가 너무 크다

**A**: `vite.config.ts`에서 다음 설정을 조정하세요:
```typescript
maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB → 원하는 크기로 변경
```

또는 캐시 항목 제한:
```typescript
expiration: {
  maxEntries: 50,  // 이 값을 줄이세요
  maxAgeSeconds: 24 * 60 * 60
}
```

### Q: API 응답이 캐시되지 않음

**A**: 응답 상태 코드 확인:
- API가 200 상태 코드 반환하는지 확인
- `Content-Type` 헤더 올바른지 확인
- CORS 정책 확인

### Q: 오프라인 페이지가 표시 안 됨

**A**: 다음을 확인하세요:
- `/public/offline.html` 파일 존재 확인
- 빌드 후 `dist/offline.html` 생성 확인
- `vite.config.ts`에서 `offline.html` 포함 확인:
  ```typescript
  includeAssets: ['favicon.ico', 'robots.txt', 'sitemap.xml', 'public/offline.html']
  ```

### Q: Service Worker 업데이트가 안 됨

**A**: 캐시 버스팅:
```bash
# 버전 번호 변경 (package.json)
npm version patch

# 빌드
npm run build

# 배포
```

또는 DevTools에서 업데이트 확인:
1. Application → Service Workers
2. 새 버전 감지 시 "Update on reload" 활성화
3. 페이지 새로고침

## 다음 단계

### 1. PWA 업데이트 알림 활성화

`App.tsx`에 `PWAUpdatePrompt` 컴포넌트 추가:

```tsx
import PWAUpdatePrompt from './components/PWAUpdatePrompt'

export default function App() {
  return (
    <>
      <PWAUpdatePrompt />
      {/* 나머지 컴포넌트 */}
    </>
  )
}
```

### 2. 푸시 알림 설정 (선택)

```typescript
// src/sw.ts에 추가
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() ?? {}
  const title = data.title || '쭈꾹 가계부 알림'

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body,
      icon: '/components/icons/icon-192.png',
      badge: '/components/icons/icon-192.png'
    })
  )
})
```

### 3. 백그라운드 동기화 (선택)

```typescript
// Service Worker에서 백그라운드 동기화 처리
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-expenses') {
    event.waitUntil(syncExpenses())
  }
})
```

## 참고 자료

- **docs/pwa-setup.md**: 상세 PWA 설정 가이드
- [vite-plugin-pwa](https://vite-plugin-pwa.netlify.app/)
- [Workbox 문서](https://developers.google.com/web/tools/workbox)
- [PWA 체크리스트](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

설치 완료 후 `npm run dev`를 실행하여 PWA 기능을 테스트하세요!
