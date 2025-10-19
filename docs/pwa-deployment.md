# PWA 배포 및 운영 가이드

## 배포 전 체크리스트

배포하기 전에 다음 항목을 모두 확인하세요:

### 보안
- [ ] HTTPS 적용 (PWA는 HTTPS 필수)
- [ ] SSL 인증서 유효성 확인
- [ ] CORS 정책 검토 (`vite.config.ts` 프록시 설정)
- [ ] 민감한 데이터 캐싱 정책 검토
- [ ] API 인증 토큰 보안 확인

### 빌드
- [ ] `npm run build` 성공 확인
- [ ] `dist/` 폴더 생성 확인
- [ ] `dist/sw.js` Service Worker 파일 생성 확인
- [ ] `dist/manifest.webmanifest` 생성 확인
- [ ] 빌드 오류/경고 없음 확인

### PWA 기능
- [ ] `public/offline.html` 생성 확인
- [ ] Service Worker 등록 (Application 탭에서 확인)
- [ ] 캐시 저장소 생성 확인:
  - `api-cache`
  - `image-cache`
  - `font-cache`
  - `tailwind-cache`
- [ ] 오프라인 폴백 작동 확인
- [ ] 온라인 복구 시 자동 리다이렉트 확인

### 성능
- [ ] Lighthouse PWA 점수 90 이상
- [ ] 첫 로드 시간 측정
- [ ] 반복 로드 시간 측정 (캐시 적중)
- [ ] 캐시 크기 확인 (5MB 이내)
- [ ] 네트워크 요청 감소 확인

### 호환성
- [ ] Chrome 최신 버전 테스트
- [ ] Firefox 최신 버전 테스트
- [ ] Safari 최신 버전 테스트
- [ ] Edge 최신 버전 테스트
- [ ] 모바일 Chrome 테스트
- [ ] 모바일 Safari 테스트

### API & 데이터
- [ ] FastAPI 백엔드 배포 확인
- [ ] API 엔드포인트 접근 가능 확인
- [ ] API 응답 상태 코드 확인 (200 또는 캐시 가능한 코드)
- [ ] CORS 헤더 설정 확인
- [ ] 데이터베이스 연결 확인

### 배포 환경
- [ ] 환경 변수 설정 (`.env` 파일)
- [ ] `VITE_GEMINI_API_KEY` 설정 (있는 경우)
- [ ] 프로덕션 환경 변수와 개발 환경 분리
- [ ] 로깅 및 모니터링 설정

### 문서
- [ ] README 최신화
- [ ] docs/pwa-setup.md 숙지
- [ ] docs/pwa-install.md 숙지
- [ ] 팀원에게 PWA 기능 설명

## 배포 플랫폼별 가이드

### Vercel 배포

```bash
# 1단계: Vercel CLI 설치
npm i -g vercel

# 2단계: 프로젝트 폴더로 이동
cd /Users/mingukjang/git/JG_finance

# 3단계: Vercel에 배포
vercel deploy --prod

# 또는 GitHub 연동으로 자동 배포
git push origin main
```

**Vercel 설정 (`vercel.json`)**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ],
  "env": {
    "VITE_GEMINI_API_KEY": "@VITE_GEMINI_API_KEY"
  },
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/manifest.webmanifest",
      "headers": [
        { "key": "Content-Type", "value": "application/manifest+json" }
      ]
    }
  ]
}
```

### Netlify 배포

```bash
# 1단계: Netlify CLI 설치
npm i -g netlify-cli

# 2단계: 프로젝트 폴더로 이동
cd /Users/mingukjang/git/JG_finance

# 3단계: 빌드 및 배포
netlify deploy --prod --dir=dist
```

**Netlify 설정 (`netlify.toml`)**:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[context.production]
  environment = { VITE_GEMINI_API_KEY = "$VITE_GEMINI_API_KEY" }

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Content-Type = "application/manifest+json"
```

### GitHub Pages 배포

```bash
# 1단계: dist 폴더 빌드
npm run build

# 2단계: gh-pages 패키지 설치 (처음 한 번만)
npm install --save-dev gh-pages

# 3단계: 배포
npx gh-pages -d dist

# 또는 GitHub Actions로 자동 배포
# .github/workflows/deploy.yml 참고
```

**package.json 설정**:
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

### AWS S3 + CloudFront

```bash
# 1단계: AWS CLI 설치
brew install awscli  # macOS

# 2단계: AWS 자격증명 설정
aws configure

# 3단계: S3 버킷 생성
aws s3 mb s3://jjoogguk-finance

# 4단계: 빌드
npm run build

# 5단계: 배포
aws s3 sync dist/ s3://jjoogguk-finance --delete

# 6단계: CloudFront 캐시 무효화 (필요시)
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

**CloudFront 캐시 정책**:
```
- `/sw.js`: 캐시 없음 (Cache-Control: max-age=0, must-revalidate)
- `/manifest.webmanifest`: 캐시 1시간
- `/*.js`, `/*.css`: 캐시 1년 (콘텐츠 해시 포함)
- `/index.html`: 캐시 1시간 또는 캐시 없음
- `/offline.html`: 캐시 1시간
```

### Docker 배포

```dockerfile
# Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000
ENV NODE_ENV production

# Service Worker 캐시 정책 설정
ENV SW_CACHE_CONTROL "public, max-age=0, must-revalidate"

CMD ["serve", "-s", "dist", "-l", "3000"]
```

**docker-compose.yml**:
```yaml
version: '3'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY}
    volumes:
      - ./dist:/app/dist

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/jjoogguk_finance
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=jjoogguk_finance
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 배포 후 모니터링

### 성능 모니터링

#### Google Analytics 통합

```html
<!-- index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');

  // PWA 이벤트 추적
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(() => {
      gtag('event', 'service_worker_ready');
    });
  }
</script>
```

#### Sentry 에러 추적

```javascript
// index.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV
});

// Service Worker 오류 추적
window.addEventListener('error', (event) => {
  if (event.filename && event.filename.includes('sw.js')) {
    Sentry.captureException(event.error);
  }
});
```

### 캐시 모니터링

```javascript
// Service Worker에서 캐시 크기 측정
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  console.log(`Total cache size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  return totalSize;
}

// 정기적으로 캐시 크기 확인
setInterval(getCacheSize, 60000); // 1분마다
```

### 사용자 환경 데이터

```javascript
// Service Worker 통계
async function getServiceWorkerStats() {
  const registration = await navigator.serviceWorker.ready;

  return {
    swState: registration.active ? 'active' : 'inactive',
    updateTime: new Date().toISOString(),
    cacheNames: await caches.keys()
  };
}
```

## 배포 후 체크리스트

배포 후 다음을 확인하세요:

### 1시간 후
- [ ] 서비스 접근 가능 확인
- [ ] API 응답 정상 확인
- [ ] 에러 로그 확인
- [ ] 성능 메트릭 확인

### 1일 후
- [ ] Service Worker 등록 확인 (사용자 기준)
- [ ] 캐시 누적 확인
- [ ] 사용자 오류 리포트 확인

### 1주 후
- [ ] 캐시 히트율 확인 (70% 이상 목표)
- [ ] 성능 개선도 측정
- [ ] 오프라인 사용자 비율 확인
- [ ] 브라우저별 호환성 확인

### 1개월 후
- [ ] PWA 설치 수 확인
- [ ] 재방문율 분석
- [ ] API 응답 시간 분석
- [ ] 캐시 정책 조정 필요성 판단

## 업데이트 배포 전략

### 전략 1: 자동 업데이트 (권장)

```typescript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate', // 자동 업데이트
  // ...
})
```

**장점**: 사용자가 최신 버전 사용
**단점**: 예기치 않은 업데이트 발생 가능

### 전략 2: 사용자 선택 업데이트

```typescript
// vite.config.ts
VitePWA({
  registerType: 'prompt' // 업데이트 알림
  // ...
})
```

`PWAUpdatePrompt` 컴포넌트 사용

### 전략 3: 예약 업데이트

```typescript
// Service Worker에서
setInterval(async () => {
  const registration = await navigator.serviceWorker.ready;
  registration.update(); // 1시간마다 확인
}, 60 * 60 * 1000);
```

## 롤백 전략

배포 후 문제 발생 시:

### 즉각적 대응

1. **Service Worker 비활성화**
```javascript
// index.html에서
if (navigator.serviceWorker) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
  });
}
```

2. **이전 버전 배포**
```bash
# Vercel
vercel --prod --env ROLLBACK=true

# Netlify
netlify deploy --prod --dir=dist-rollback
```

3. **캐시 초기화**
```javascript
// 서버에서 응답 헤더
Cache-Control: public, max-age=0, must-revalidate
```

## 성능 최적화 팁

### 1. 캐시 크기 최적화

```typescript
// vite.config.ts
workbox: {
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
  runtimeCaching: [
    {
      urlPattern: /^\/api\/.*/,
      options: {
        expiration: {
          maxEntries: 30,      // 50 -> 30
          maxAgeSeconds: 12 * 60 * 60 // 24h -> 12h
        }
      }
    }
  ]
}
```

### 2. 네트워크 타임아웃 조정

```typescript
{
  urlPattern: /^\/api\/.*/,
  handler: 'NetworkFirst',
  options: {
    networkTimeoutSeconds: 5 // 10 -> 5 (더 빠른 폴백)
  }
}
```

### 3. 이미지 최적화

```typescript
{
  urlPattern: /^https?:\/\/.*\.(png|jpg|jpeg|webp)$/,
  handler: 'CacheFirst',
  options: {
    expiration: {
      maxEntries: 50,        // 100 -> 50
      maxAgeSeconds: 14 * 24 * 60 * 60 // 30d -> 14d
    }
  }
}
```

## 문제 해결

### Service Worker 업데이트 안 됨

**원인**: 브라우저 캐시

**해결**:
```bash
# 버전 번호 업데이트
npm version patch

# 빌드
npm run build

# 배포
npm run deploy

# 사용자: 캐시 삭제 후 강력 새로고침 (Ctrl+Shift+R)
```

### API 오류 후 캐시된 응답 표시

**원인**: Network-First 전략으로 오류 응답도 캐시

**해결**:
```typescript
{
  urlPattern: /^\/api\/.*/,
  handler: 'NetworkFirst',
  options: {
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200], // 오류 응답(0) 제외
      })
    ]
  }
}
```

## 참고 자료

- [Vercel 배포](https://vercel.com/docs)
- [Netlify 배포](https://docs.netlify.com/)
- [GitHub Pages](https://pages.github.com/)
- [AWS CloudFront](https://docs.aws.amazon.com/cloudfront/)
- [Docker 배포](https://www.docker.com/use-cases/deploy)

---

배포 후 `docs/pwa-setup.md`를 참고하여 모니터링을 계속하세요!
