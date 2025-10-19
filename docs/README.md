# Jjoogguk Finance — Project Overview

## Introduction

Jjoogguk Finance는 가계 재무 관리를 위한 풀스택 웹 애플리케이션입니다. React 19 + TypeScript 프론트엔드와 FastAPI 백엔드가 PostgreSQL 데이터베이스와 함께 작동하여 수입·지출, 예산, 투자, 재무 태스크를 관리합니다.

## Folder Structure

```
/
├── components/        # React UI 컴포넌트 (Dashboard, Income, Expenses, Investments, Issues, Settings 등)
├── lib/               # 프론트엔드 API 클라이언트 (api.ts) 및 유틸리티
├── types.ts           # TypeScript 타입 정의
├── App.tsx            # 메인 React 애플리케이션
├── index.tsx          # Vite 엔트리 포인트
├── tailwind.config.js # Tailwind CSS 설정
├── backend/           # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py    # FastAPI 엔트리 + CORS + 라우터 등록
│   │   ├── api/       # 라우터 (categories, expenses, budgets, investments, issues, users 등)
│   │   ├── models/    # SQLAlchemy 모델
│   │   ├── schemas/   # Pydantic 스키마
│   │   ├── core/      # 설정, DB 의존성
│   │   └── seed/      # 샘플 데이터 생성 스크립트
│   ├── tests/         # Pytest 테스트
│   └── alembic/       # 데이터베이스 마이그레이션
└── docs/              # 프로젝트 문서
```

> **참고**: 프론트엔드 파일은 현재 리포지터리 루트에 위치합니다. 추후 `/frontend` 디렉터리로 재구성할 수 있습니다.

## What lives where

- **Root (frontend)**: React 컴포넌트, API 클라이언트, 타입 정의, Vite 설정
  - UI, 라우팅, FastAPI 데이터 페칭, 차트/테이블/폼
  - 모바일 반응형 UI (Tailwind CSS breakpoint 전략)

- **backend/**: FastAPI 애플리케이션
  - REST API, SQLAlchemy 모델, Alembic 마이그레이션, 인증(JWT), 서비스 로직
  - 투자·이슈·라벨 등 모든 도메인 API 구현 완료

- **docs/**: 프로젝트 문서
  - `frontend.md`: 프론트엔드 아키텍처, 모바일 반응형 전략
  - `backend.md`: 백엔드 API, 데이터베이스 구조
  - `workflow.md`: 개발 워크플로, 마이그레이션 가이드

## Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **State Management**: React Hooks (useState, useEffect)
- **API Client**: Fetch API with custom wrapper (`lib/api.ts`)
- **AI Integration**: Google Gemini API (Quick Add feature)

### Backend
- **Framework**: FastAPI (Python 3.9+)
- **ORM**: SQLAlchemy
- **Migration**: Alembic
- **Testing**: Pytest
- **Database**: PostgreSQL (SQLite for testing)
- **Auth**: JWT tokens (planned enhancement)

### Development Tools
- **Version Control**: Git
- **Package Manager**: npm (frontend), pip (backend)
- **Code Quality**: TypeScript, ESLint, Prettier (frontend), Black, MyPy (backend)

## Key Features

### Implemented (✅)
- **Dashboard**: 월별 수입·지출, 예산 대비 지출, 투자 현금 흐름, 자산 배분 시각화
- **Income/Expenses Management**: CRUD + 필터링 + 정렬 + 통계 + 모바일 카드 레이아웃
- **Investment Tracking**: 계좌·보유 자산·거래 내역 관리 (API 완전 연동)
- **Issue Management**: 칸반 보드 형식 재무 태스크 관리 (API 연동)
- **Settings**: 카테고리·예산·사용자·환율 관리
- **Quick Add (Gemini AI)**: 자연어 지출 입력 및 자동 파싱
- **Mobile Responsive UI**: Tailwind breakpoint 기반 모바일/태블릿/데스크톱 최적화

### Planned (⏳)
- Investments.tsx 모바일 반응형 개선
- 사용자 인증/인가 강화 (JWT, 패스워드 해시, RBAC)
- 프론트엔드 테스트 자동화 (Vitest + RTL)
- CI/CD 파이프라인 (GitHub Actions)
- 추가 AI 기능 (예산 추천, 지출 패턴 분석)

## Documentation

- **README.md**: 프로젝트 개요 및 빠른 시작 가이드
- **CLAUDE.md**: AI 에이전트 작업 가이드
- **AGENTS.md**: 기여자 가이드
- **docs/frontend.md**: 프론트엔드 아키텍처 및 모바일 반응형 상세
- **docs/backend.md**: 백엔드 API 및 데이터베이스 구조
- **docs/workflow.md**: 개발 워크플로 및 마이그레이션

## Quick Start

자세한 실행 방법은 루트의 `README.md`를 참조하세요.

1. **PostgreSQL 준비**: `createdb jjoogguk_finance`
2. **백엔드 실행**: `cd backend && uvicorn app.main:app --reload`
3. **프론트엔드 실행**: `npm run dev` (루트에서)
4. **샘플 데이터** (선택): `python -m app.seed.sample_data`

## API Structure

### Main Endpoints

- `/api/categories` — 카테고리 CRUD
- `/api/expenses` — 지출/수익 CRUD + 필터
- `/api/budgets` — 예산 CRUD
- `/api/investments/accounts` — 투자 계좌 CRUD
- `/api/investments/holdings` — 보유 자산 CRUD
- `/api/investments/transactions` — 투자 거래 CRUD + 필터
- `/api/issues` — 이슈 CRUD
- `/api/labels` — 라벨 조회
- `/api/users` — 사용자 CRUD

자세한 내용은 `docs/backend.md`를 참조하세요.

## Mobile Responsive Design

프론트엔드는 Tailwind CSS breakpoint 전략을 사용하여 모든 화면 크기에 최적화되어 있습니다.

- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Strategy**: 테이블 (데스크톱) ↔ 카드 레이아웃 (모바일) 자동 전환
- **Typography**: 반응형 폰트 스케일 (`text-xs sm:text-sm md:text-base`)
- **Spacing**: 반응형 간격 (`space-y-2 sm:space-y-3 md:space-y-4`)

자세한 내용은 `docs/frontend.md`를 참조하세요.
