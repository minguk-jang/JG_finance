# Jjoogguk Finance

Jjoogguk Finance는 가계의 수입·지출, 예산, 투자 현황을 한 번에 확인하고 관리할 수 있는 **Vite + React 프론트엔드**와 **FastAPI 백엔드** 기반의 풀스택 개인 재무 관리 서비스입니다. 대시보드, 지출/수익 관리, 투자 계좌·거래 추적, 이슈 관리, 설정(카테고리·예산·사용자) 화면을 제공하며, 모든 기능이 FastAPI REST API와 실시간으로 연동됩니다.

## 주요 기능

- **대시보드**: 월별 수입·지출, 예산 대비 지출, 투자 현금 흐름, 자산 배분을 실시간 API 데이터 기반으로 시각화
- **수익/지출 관리**: 카테고리 필터, 정렬, 통계, 모달 기반 CRUD — 모바일 친화적 카드 레이아웃 지원
- **투자 관리**: 투자 계좌, 보유 자산, 매수·매도 거래 내역을 완전히 API 연동하여 관리 (날짜/계좌/유형 필터 포함)
- **이슈 관리**: 재무 태스크를 칸반 보드 형식으로 시각화 (Open/In Progress/Closed) — API 기반 CRUD
- **예산 및 사용자 설정**: 설정 화면에서 카테고리·예산·사용자·환율 관리
- **Quick Add (Gemini AI)**: Gemini API를 활용한 자연어 지출 입력 및 자동 파싱
- **모바일 반응형 UI**: Tailwind CSS 기반 breakpoint 전략으로 모바일/태블릿/데스크톱 모두 최적화
- **백엔드 API**: FastAPI + SQLAlchemy 기반 REST API, Alembic 마이그레이션, Pytest 테스트

## 폴더 구조

```
/
├── components/        # React UI 컴포넌트 (Dashboard, Income, Expenses, Investments, Issues, Settings 등)
├── lib/               # 프론트엔드 API 클라이언트 (api.ts) 및 유틸
├── types.ts           # TypeScript 타입 정의
├── App.tsx            # 메인 React 앱
├── index.tsx          # Vite 엔트리 포인트
├── tailwind.config.js # Tailwind CSS 설정
├── backend/           # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py    # FastAPI 엔트리 + CORS + 라우터 등록
│   │   ├── api/       # 라우터 (categories, expenses, budgets, investments, issues 등)
│   │   ├── models/    # SQLAlchemy 모델
│   │   ├── schemas/   # Pydantic 스키마
│   │   ├── core/      # 설정, DB 의존성
│   │   └── seed/      # 샘플 데이터 스크립트
│   ├── tests/         # Pytest 테스트
│   └── alembic/       # 데이터베이스 마이그레이션
├── docs/              # 상세 개발 문서 (frontend.md, backend.md, workflow.md 등)
└── README.md, CLAUDE.md, AGENTS.md
```

> **참고**: 프론트엔드 파일은 현재 리포지터리 루트에 위치합니다. 추후 `/frontend` 디렉터리로 재구성할 수 있습니다.

## 기술 스택

- **프론트엔드**: React 19, TypeScript, Vite, Tailwind CSS, Recharts
- **백엔드**: Python 3.9+, FastAPI, SQLAlchemy, Alembic, Pytest
- **데이터베이스**: PostgreSQL (로컬 개발용 SQLite 테스트 가능)
- **AI 통합**: Google Gemini API (Quick Add 기능)
- **PWA**: vite-plugin-pwa, Workbox (오프라인 지원, 자동 캐싱, Service Worker)

## 빠른 시작

### 1. 데이터베이스 준비

```bash
brew services start postgresql@14  # macOS
createdb jjoogguk_finance
```

Windows/Linux 사용자는 PostgreSQL 설치 후 동일한 데이터베이스를 생성하세요.

### 2. 백엔드 실행

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# .env 파일 작성 (예시)
# DATABASE_URL=postgresql://localhost:5432/jjoogguk_finance
# JWT_SECRET=your-secret-key

alembic upgrade head
uvicorn app.main:app --reload  # http://localhost:8000
```

- **API 문서**: `http://localhost:8000/docs` (Swagger UI)

### 2-1. 샘플 데이터 입력 (선택)

데이터가 비어 있으면 대시보드/설정 화면이 비활성화되어 보일 수 있습니다. 다음 스크립트를 실행하면 사용자, 카테고리, 수익·지출, 예산, 투자 계좌, 보유 자산, 투자 거래, 이슈, 라벨 등 주요 엔터티에 샘플 레코드가 생성됩니다.

```bash
cd backend
source venv/bin/activate  # 가상환경 활성화
python -m app.seed.sample_data
```

> **주의**: PostgreSQL 서버가 실행 중이어야 합니다. 오류 발생 시 `brew services start postgresql@14` 등으로 먼저 기동하세요.

### 3. 프론트엔드 실행

```bash
# 리포지터리 루트에서
npm install
npm run dev  # http://localhost:5173
```

프론트엔드는 Vite 프록시를 통해 `/api` 요청을 백엔드 (`http://localhost:8000`)로 전달합니다. 필요 시 `vite.config.ts`에서 프록시 설정을 조정할 수 있습니다.

### 3-1. Quick Add (Gemini AI) 설정 (선택)

빠른 추가 기능을 사용하려면 프로젝트 루트에 `.env` 파일을 생성하고 Gemini API 키를 설정하세요.

```bash
# .env (루트 디렉터리)
VITE_GEMINI_API_KEY=your-google-gemini-api-key

# (선택) 기본 모델 재정의
VITE_GEMINI_MODEL=gemini-2.0-flash-exp
```

- [Google AI Studio](https://aistudio.google.com/apikey)에서 무료 API 키를 발급받을 수 있습니다.
- 지출 화면에서 텍스트를 입력한 뒤 "Gemini 분석" 버튼을 클릭하면 AI가 날짜, 카테고리, 금액, 메모를 자동으로 파싱합니다.
- API 호출 실패 시 오류 메시지가 표시되며, 사용자는 수동으로 폼을 수정하여 지출을 저장할 수 있습니다.

### 3-2. 환율 설정

- **설정 → 환율 설정** 카드에서 USD → KRW 환율을 직접 입력하여 통화 변환 비율을 관리할 수 있습니다.
- 입력한 값은 브라우저 `localStorage`에 저장되며, 새로고침 후에도 유지됩니다.
- 상단 통화 토글 (KRW ↔ USD)과 대시보드/지출/수익/투자 화면의 금액 표시에 즉시 반영됩니다.

## 대표 API 엔드포인트

### 카테고리 관리
- `GET /api/categories` — 모든 카테고리 조회
- `POST /api/categories` — 새 카테고리 생성
- `PUT /api/categories/{id}` — 카테고리 수정
- `DELETE /api/categories/{id}` — 카테고리 삭제

### 지출/수익 관리
- `GET /api/expenses` — 지출/수익 조회 (필터: `from_date`, `to_date`, `category_id`)
- `POST /api/expenses` — 지출/수익 생성
- `PUT /api/expenses/{id}` — 지출/수익 수정
- `DELETE /api/expenses/{id}` — 지출/수익 삭제

### 예산 관리
- `GET /api/budgets` — 모든 예산 조회
- `POST /api/budgets` — 새 예산 생성
- `PUT /api/budgets/{id}` — 예산 수정
- `DELETE /api/budgets/{id}` — 예산 삭제

### 투자 관리
- `GET /api/investments/accounts` — 투자 계좌 목록
- `POST /api/investments/accounts` — 투자 계좌 생성
- `GET /api/investments/holdings` — 보유 자산 목록
- `POST /api/investments/holdings` — 보유 자산 추가
- `GET /api/investments/transactions` — 거래 내역 조회 (필터: `account_id`, `start_date`, `end_date`, `type`)
- `POST /api/investments/transactions` — 거래 추가

### 이슈 관리
- `GET /api/issues` — 모든 이슈 조회
- `POST /api/issues` — 새 이슈 생성
- `PUT /api/issues/{id}` — 이슈 수정
- `DELETE /api/issues/{id}` — 이슈 삭제
- `GET /api/labels` — 라벨 목록 조회

### 사용자 관리
- `GET /api/users` — 사용자 목록 조회
- `POST /api/users` — 새 사용자 생성

### 예시: 지출 생성

```http
POST /api/expenses
Content-Type: application/json

{
  "category_id": 2,
  "date": "2025-10-19",
  "amount": 120000,
  "memo": "장보기",
  "created_by": 1
}
```

`created_by`가 전달되지 않으면 기본 사용자 ID(1)로 저장됩니다. 수익은 `categories.type === 'income'`인 카테고리를 선택해 생성합니다.

## 모바일 반응형 UI

프론트엔드는 **Tailwind CSS breakpoint 전략**을 사용하여 다양한 화면 크기에서 최적화된 경험을 제공합니다.

### 주요 개선사항

#### 1. Income.tsx & Expenses.tsx
- **데스크톱 (md 이상)**: 전통적인 테이블 레이아웃 (정렬 가능, 모든 컬럼 표시)
- **모바일 (md 미만)**: 컴팩트한 카드 레이아웃
  - 각 지출/수익을 독립 카드로 표시
  - 날짜, 카테고리 뱃지, 금액 (큰 폰트), 메모, 작성자
  - 수정/삭제 버튼은 아이콘으로 표시
  - 가로 스크롤 없이 모든 정보 표시

#### 2. Dashboard.tsx
- 원형 차트, 프로그레스 바, 카드 그리드 모두 반응형
- 폰트 크기: `text-base sm:text-lg md:text-2xl lg:text-3xl` 패턴
- 월 선택 드롭다운: 모바일에서도 충분한 크기 (160px)

#### 3. Investments.tsx
- **보유 자산 테이블** (8개 컬럼) → 모바일에서 카드 레이아웃
- **투자 거래 내역** (11개 컬럼) → 모바일에서 컴팩트 카드
- 모든 정보를 수직 배치하여 가독성 향상

### Tailwind 반응형 패턴

```tsx
// 테이블: 데스크톱에서만 표시
<table className="hidden md:table w-full">...</table>

// 카드: 모바일에서만 표시
<div className="block md:hidden space-y-2">
  {items.map(item => <Card key={item.id}>...</Card>)}
</div>

// 반응형 폰트
<h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold">

// 반응형 간격
<div className="space-y-3 sm:space-y-4 md:space-y-6">

// 반응형 그리드
<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
```

## 테스트

백엔드에는 인메모리 SQLite를 사용하는 Pytest 테스트가 포함되어 있습니다.

```bash
cd backend
source venv/bin/activate
pytest tests/test_expenses_api.py -vv
```

> **주의**: `.bash_profile` 오류가 있을 경우 `bash --noprofile -lc "cd backend && pytest"`로 실행하거나 오류 라인을 임시 주석 처리하세요.

프론트엔드 테스트는 Vitest + React Testing Library 기반 구성을 권장합니다.

## 문서 & 참고 자료

- **AGENTS.md**: 기여자 가이드 (프로젝트 구조, 커맨드, 리뷰 규칙)
- **CLAUDE.md**: AI 에이전트(Claude/AI) 작업 가이드
- **docs/README.md**: 프로젝트 기술 개요
- **docs/frontend.md**: 프론트엔드 아키텍처 및 모바일 반응형 상세
- **docs/backend.md**: 백엔드 API 및 데이터베이스 구조
- **docs/workflow.md**: 개발 워크플로 및 마이그레이션 가이드
- **docs/pwa-setup.md**: PWA 설정, 캐싱 전략, 오프라인 모드 가이드

## 향후 계획

- 사용자 인증(JWT) 및 권한 강화 (Admin/Editor/Viewer 역할)
- 프론트엔드 테스트 자동화 (Vitest + RTL)
- CI/CD 파이프라인 구축 (GitHub Actions)
- 프로덕션 배포 (HTTPS, 신뢰할 수 있는 CORS 도메인만 허용)
- 추가 AI 기능 (예산 추천, 지출 패턴 분석 등)

---

궁금한 점이나 이슈가 있다면 GitHub 이슈에 등록하거나 `docs/workflow.md`에 정리된 절차를 참고해 주세요.
