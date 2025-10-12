# Jjoogguk Finance

Jjoogguk Finance는 가계의 수입·지출, 예산, 투자 현황을 한 번에 확인하고 관리할 수 있는 **Vite + React 프론트엔드**와 **FastAPI 백엔드** 기반의 풀스택 개인 재무 관리 서비스입니다. 현재는 기본적인 대시보드, 지출/수익 관리, 설정(카테고리·예산·사용자), 투자 요약, 이슈 관리 화면을 제공하며, 프론트엔드는 API와 실시간으로 연동됩니다.

## 주요 기능

- **대시보드**: 월별 수입·지출, 예산 대비 지출, 투자 자산 배분을 실시간 API 데이터를 기반으로 시각화
- **수익/지출 관리**: 카테고리 필터, 정렬, 모달 기반 CRUD / 수익과 지출을 별도 탭으로 분리
- **예산 및 사용자 설정**: 설정 화면에서 카테고리·예산·사용자 관리 가능
- **투자/이슈**: 투자 계좌와 보유 종목, 재무 관련 태스크를 한눈에 파악 (점진적 고도화 예정)
- **백엔드 API**: FastAPI + SQLAlchemy 기반 REST API, Alembic 마이그레이션, Pytest로 주요 CRUD 검증

## 폴더 구조

```
/
├── backend/           # FastAPI 백엔드 (라우터, 모델, 스키마, DB 설정)
├── components/        # React UI 컴포넌트
├── lib/               # 프론트엔드 API 클라이언트 및 유틸
├── docs/              # 상세 개발 문서
├── App.tsx / index.tsx 등  # 프론트엔드 엔트리
└── AGENTS.md, README.md 등
```

프론트엔드 파일은 현재 리포지터리 루트에 위치하며, 추후 `/frontend` 디렉터리로 재구성할 계획입니다.

## 기술 스택

- **프론트엔드**: React 19, TypeScript, Vite, Tailwind CSS, Recharts
- **백엔드**: Python 3.9, FastAPI, SQLAlchemy, Alembic, Pytest
- **데이터베이스**: PostgreSQL (로컬 개발용 SQLite 테스트 가능)

## 빠른 시작

### 1. 데이터베이스 준비

```bash
brew services start postgresql@14 # macOS
createdb jjoogguk_finance
```

### 2. 백엔드 실행

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# .env 작성 (예시)
# DATABASE_URL=postgresql://localhost:5432/jjoogguk_finance
# JWT_SECRET=local-secret

alembic upgrade head
uvicorn app.main:app --reload  # http://localhost:8000
```

- API 문서: `http://localhost:8000/docs`

### 2-1. 샘플 데이터 입력 (선택)

데이터가 비어 있으면 대시보드/설정 화면이 비활성화되어 보일 수 있습니다. 다음 스크립트를 실행하면 사용자, 카테고리, 수익·지출, 예산, 투자 계좌, 이슈 등 주요 엔터티에 샘플 레코드 3개씩이 생성됩니다.

```bash
cd backend
venv/bin/python -m app.seed.sample_data
```

> PostgreSQL 서버가 실행 중이어야 합니다. (오류가 발생하면 `brew services start postgresql@14` 등으로 먼저 기동하세요.)

### 3. 프론트엔드 실행

```bash
npm install
npm run dev  # http://localhost:5173
```

프론트엔드는 Vite 프록시를 통해 `/api` 요청을 백엔드로 전달합니다. 필요 시 `.env.development`로 API 기본 URL을 조정할 수 있습니다.

### 3-1. 빠른 추가 설정

빠른 추가 기능을 사용하려면 프론트엔드 루트에 `.env` 파일을 생성하고 Gemini API 키를 설정하세요.

```
# .env
VITE_GEMINI_API_KEY=your-google-gemini-api-key
# (선택) 기본 모델을 재정의하려면 아래 키를 사용하세요.
# VITE_GEMINI_MODEL=gemini-2.5-flash
```

- Google AI Studio에서 무료 플랜을 이용할 수 있습니다. 키 발급 후 최소 권한으로 관리하세요.
- 지출 내용을 텍스트로 입력한 뒤 Gemini 분석 버튼을 눌러 제안된 데이터를 검토하고 저장할 수 있습니다.
- API 호출이 실패하면 오류 메시지가 표시되며, 사용자는 텍스트와 폼을 직접 수정해 지출을 저장할 수 있습니다.

## 대표 API 엔드포인트

- `GET /api/categories` / `POST /api/categories` … 카테고리 CRUD
- `GET /api/expenses` / `POST /api/expenses` … 지출/수익 CRUD + 필터 (from_date, to_date, category_id)
- `GET /api/budgets` / `POST /api/budgets` … 예산 CRUD
- `GET /api/investments/holdings` … 투자 내역 조회
- `GET /api/issues` … 재무 태스크 관리

### 예시: 지출 생성

```http
POST /api/expenses
{
  "category_id": 2,
  "date": "2024-07-01",
  "amount": 120000,
  "memo": "장보기"
}
```

`created_by`가 따로 전달되지 않으면 기본 사용자 ID(1)로 저장합니다. 수익은 `categories.type === 'income'`인 카테고리를 선택해 생성합니다.

## 테스트

백엔드에는 인메모리 SQLite를 사용하는 Pytest 스위트가 포함되어 있습니다.

```bash
cd backend
pytest tests/test_expenses_api.py -vv
```

터미널에 `.bash_profile` 오류가 있을 경우 `bash --noprofile -lc "cd backend && pytest …"`와 같이 실행하거나 오류 라인을 임시로 주석 처리하세요.

프론트엔드 테스트는 Vitest/RTL 기반 구성을 권장합니다 (`components/__tests__/` 하위).

## 문서 & 참고 자료

- `AGENTS.md`: 기여자 가이드 (프로젝트 구조, 커맨드, 리뷰 규칙)
- `docs/`: 아키텍처 및 워크플로 설명 (`frontend.md`, `backend.md`, `workflow.md`)
- `CLAUDE.md`: 에이전트(Claude/AI) 작업 가이드

## 향후 계획

- 투자/이슈 화면의 실제 백엔드 API 연동
- 사용자 인증(JWT) 및 권한 강화
- 프론트엔드 테스트 자동화
- CI/CD 파이프라인 구축

---  
궁금한 점이나 이슈가 있다면 GitHub 이슈에 등록하거나 `docs/workflow.md`에 정리된 절차를 참고해 주세요.
