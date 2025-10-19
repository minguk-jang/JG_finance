# CLAUDE.md

## 프로젝트 개요

가계 재무 관리 풀스택 앱: **React 19 + TypeScript + Vite** (FE) + **FastAPI + SQLAlchemy + PostgreSQL** (BE)

## 폴더 구조

```
/
├── components/        # React 컴포넌트 (Dashboard, Income, Expenses, Investments, Issues, Settings)
├── lib/api.ts        # API 클라이언트
├── types.ts          # 타입 정의
├── backend/
│   ├── app/api/      # FastAPI 라우터
│   ├── app/models/   # SQLAlchemy 모델
│   ├── app/schemas/  # Pydantic 스키마
│   └── tests/        # Pytest
└── docs/             # 상세 문서

## 실행 명령

**Frontend**: `npm run dev` → http://localhost:5173
**Backend**: `cd backend && uvicorn app.main:app --reload` → http://localhost:8000
**샘플 데이터**: `cd backend && python -m app.seed.sample_data`
**테스트**: `cd backend && pytest`

## 기술 스택

**Frontend**: React 19, TypeScript, Vite, Tailwind CSS (반응형: sm/md/lg/xl breakpoints)
**Backend**: FastAPI, SQLAlchemy, PostgreSQL, Alembic
**Features**: 대시보드, 수익/지출 관리, 투자 추적, 이슈 보드, Gemini AI Quick Add

**API 엔드포인트**: `/api/expenses`, `/api/categories`, `/api/budgets`, `/api/investments/*`, `/api/issues`, `/api/labels`, `/api/users`

**모바일 반응형**: 테이블 `hidden md:table` + 카드 `block md:hidden` 패턴 적용 (Income, Expenses, Dashboard 완료)

## 주요 파일

**Models**: User, Category, Expense, Budget, InvestmentAccount/Holding/Transaction, Issue, Label
**Routers**: expenses, categories, budgets, investments, issues, labels, users
**Deps**: `app/core/deps.py` (get_db, JWT 유틸)
**Tests**: `tests/test_expenses_api.py` (FastAPI TestClient + SQLite)

## 작업 가이드

**Frontend**: `lib/api.ts`에 API 메서드 추가 → 컴포넌트에서 호출 (camelCase/snake_case 정규화)
**Backend**: Model → Schema → Router → `app/main.py` 등록 → Alembic migration (`alembic revision --autogenerate`)
**환경변수**: `.env` (backend: DATABASE_URL, JWT_SECRET / frontend: VITE_GEMINI_API_KEY)

## 상태

**완료**: 대시보드, 수익/지출 CRUD, 투자 관리, 이슈 보드, Gemini AI, 모바일 반응형 (일부)
**예정**: Investments 모바일, 인증/인가, 프론트엔드 테스트, HTTPS/CORS 강화

상세 문서: `README.md`, `docs/` 폴더 참조
