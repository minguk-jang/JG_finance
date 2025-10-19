# Vercel 배포 가이드

JG Finance 애플리케이션을 Vercel에 배포하는 방법을 설명합니다.

## 사전 준비

1. ✅ Supabase 프로젝트 생성 완료
2. ✅ 데이터베이스 스키마 및 RLS 정책 설정 완료
3. ✅ GitHub 저장소에 코드 푸시 완료
4. ✅ Vercel 계정 생성 (https://vercel.com)

## 1단계: Vercel에 프로젝트 연결

### GitHub에서 Import

1. [Vercel Dashboard](https://vercel.com/dashboard)로 이동
2. "Add New..." → "Project" 클릭
3. GitHub 저장소를 연결 (처음이라면 GitHub 앱 설치 필요)
4. JG_finance 저장소 선택
5. "Import" 클릭

## 2단계: 프로젝트 설정

### Build & Development Settings

Vercel이 자동으로 Vite 프로젝트를 감지합니다:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

대부분의 경우 기본 설정 그대로 사용하면 됩니다.

### Root Directory

프로젝트 루트가 저장소 루트와 다른 경우에만 설정합니다.
(대부분의 경우 비워둡니다)

## 3단계: 환경 변수 설정

**Environment Variables** 섹션에서 다음 환경 변수를 추가합니다:

| Name | Value | Notes |
|------|-------|-------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase anon public key |
| `VITE_GEMINI_API_KEY` | `AIzaSy...` | (선택사항) Gemini AI API 키 |

### 환경 변수 가져오는 방법

1. Supabase 대시보드 → **Settings** → **API**
2. **Project URL** 복사 → `VITE_SUPABASE_URL`
3. **anon public** 키 복사 → `VITE_SUPABASE_ANON_KEY`

**주의:** `service_role` 키는 **절대** 프론트엔드에 노출하지 마세요!

## 4단계: 배포

"Deploy" 버튼을 클릭하면 배포가 시작됩니다.

배포 프로세스:
1. 코드 빌드
2. Static assets 생성
3. Vercel CDN에 배포
4. 도메인 할당

일반적으로 1-3분 정도 소요됩니다.

## 5단계: 배포 확인

배포가 완료되면:

1. Vercel이 제공하는 URL로 접속 (예: `https://jg-finance.vercel.app`)
2. 로그인/회원가입 기능 테스트
3. 데이터 CRUD 작업 테스트
4. PWA 설치 기능 테스트 (모바일에서)

## 6단계: 커스텀 도메인 설정 (선택사항)

### 도메인 연결

1. Vercel Dashboard → 프로젝트 → **Settings** → **Domains**
2. "Add" 버튼 클릭
3. 도메인 입력 (예: `finance.mydomain.com`)
4. DNS 설정 지침에 따라 도메인 제공업체에서 레코드 추가

### DNS 레코드 예시

Vercel이 제공하는 값으로 설정:

```
Type: A
Name: finance
Value: 76.76.21.21

Type: CNAME
Name: finance
Value: cname.vercel-dns.com
```

### SSL/TLS

Vercel은 자동으로 Let's Encrypt SSL 인증서를 발급합니다.
- HTTPS는 자동 활성화
- 인증서 갱신도 자동

## 자동 배포 설정

Vercel은 기본적으로 Git 통합을 제공합니다:

### Production 배포

- **main** 브랜치에 push하면 자동으로 프로덕션 배포
- PR(Pull Request) 생성 시 프리뷰 배포 생성
- 각 커밋마다 고유한 URL 제공

### Preview 배포

모든 브랜치와 PR은 프리뷰 URL을 받습니다:
- `https://jg-finance-git-feature-xxx.vercel.app`
- 팀원들과 공유하여 리뷰 가능
- 프로덕션에 영향 없음

## 모니터링 및 로그

### 배포 로그

1. Vercel Dashboard → 프로젝트 → **Deployments**
2. 특정 배포 클릭
3. **Build Logs** 탭에서 빌드 로그 확인
4. **Function Logs** 탭에서 런타임 로그 확인

### Analytics (Pro 플랜)

Vercel Pro 플랜을 사용하는 경우:
- 실시간 방문자 통계
- Web Vitals 성능 지표
- 사용자 경험 모니터링

## 성능 최적화

### 1. Image Optimization

Vite + Vercel은 자동으로 이미지를 최적화합니다.

### 2. Edge Functions

필요한 경우 Vercel Edge Functions를 사용하여 서버 사이드 로직을 추가할 수 있습니다.

### 3. Caching

`vercel.json`에 캐싱 헤더가 설정되어 있습니다:
- Service Worker: no-cache (항상 최신 버전 확인)
- Static assets: 긴 캐시 시간 (빌드 해시로 버전 관리)

## 문제 해결

### 빌드 실패

1. **로컬에서 빌드 테스트**
   ```bash
   npm run build
   npm run preview
   ```

2. **환경 변수 확인**
   - Supabase URL과 key가 올바른지 확인
   - `.env.example`과 비교

3. **의존성 문제**
   - `package-lock.json` 커밋 확인
   - Node.js 버전 확인 (Vercel은 Node 18+ 사용)

### 런타임 오류

1. **브라우저 콘솔 확인**
   - F12 → Console 탭
   - 네트워크 오류 확인

2. **Supabase 연결 확인**
   - URL과 key가 올바른지 확인
   - Supabase 대시보드에서 프로젝트 상태 확인

3. **CORS 오류**
   - Supabase는 기본적으로 모든 origin 허용
   - 특정 origin만 허용하려면 Supabase 설정 변경

### PWA 문제

1. **Service Worker 등록 실패**
   - HTTPS 필수 (Vercel은 자동 제공)
   - `sw.js` 파일 경로 확인

2. **캐시 문제**
   - 브라우저 캐시 삭제
   - Service Worker unregister 후 재등록

## 롤백

문제가 발생한 경우 이전 배포로 롤백:

1. Vercel Dashboard → 프로젝트 → **Deployments**
2. 이전 배포 선택
3. "Promote to Production" 클릭

즉시 이전 버전으로 복구됩니다.

## 비용

### Vercel 무료 플랜

- 개인 프로젝트 무제한
- 100GB 대역폭/월
- 초과 시 자동으로 차단 (요금 청구 없음)

### Supabase 무료 플랜

- 500MB 데이터베이스
- 2GB 파일 스토리지
- 50,000 월간 활성 사용자
- 1주일 비활성 시 일시 중지 (재접속 시 자동 재시작)

대부분의 개인 프로젝트는 무료 플랜으로 충분합니다.

## 추가 리소스

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel + Vite Guide](https://vercel.com/docs/frameworks/vite)
- [Supabase + Vercel Integration](https://supabase.com/docs/guides/getting-started/tutorials/with-vercel)
