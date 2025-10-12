# CLAUDE.md

이 문서는 Claude Code(claude.ai/code)가 이 리포지터리에서 작업할 때 알아야 할 핵심 정보를 제공합니다.

## 프로젝트 개요

Jjoogguk Finance는 가계 재무 관리를 위한 풀스택 애플리케이션입니다. 프론트엔드는 **React 19 + TypeScript + Vite**, 백엔드는 **FastAPI + SQLAlchemy**로 구성되어 있으며 PostgreSQL을 기본 데이터베이스로 사용합니다. 현재 대시보드, 수익/지출 관리, 설정, 투자·이슈 요약 화면이 FastAPI API와 연동되어 동작하고 있습니다.

## 폴더 구조

```
/
├── App.tsx, index.tsx          # Vite + React 엔트리
├── components/                 # 페이지 및 UI 컴포넌트
│   ├── Dashboard.tsx           # 대시보드 (API 기반)
│   ├── Income.tsx              # 수익 CRUD + 통계
│   ├── Expenses.tsx            # 지출 CRUD + 통계
│   ├── Investments.tsx         # 투자 요약 (추후 백엔드 연동 예정)
│   ├── Issues.tsx              # 이슈/태스크 보드 (추후 연동 예정)
│   └── Settings.tsx            # 카테고리·예산·사용자 관리
├── lib/api.ts                  # 프론트엔드 API 클라이언트
├── types.ts                    # 도메인 타입 정의
├── constants.ts                # 샘플 사용자·예산 등 (점진적 제거 예정)
├── backend/                    # FastAPI 애플리케이션
│   ├── app/main.py             # FastAPI 엔트리 + CORS + 라우터 등록
│   ├── app/api/                # 라우터 (categories, expenses, budgets, ... )
│   ├── app/models/             # SQLAlchemy 모델
│   ├── app/schemas/            # Pydantic 스키마
│   ├── app/core/               # 설정, 의존성(get_db 등)
│   └── tests/                  # Pytest (현재 expenses CRUD 테스트 포함)
├── docs/                       # 상세 문서 (frontend.md, backend.md 등)
└── README.md, AGENTS.md        # 실행 가이드 및 기여자 지침
```

## 실행/개발 명령

### 프론트엔드 (루트에서)
```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview
```

### 백엔드 (`/backend`)
```bash
python3 -m venv venv
source venv/bin/activate      # Windows는 venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload  # http://localhost:8000
```

테스트는 `cd backend && pytest` 로 실행합니다. 현 개발 환경의 `.bash_profile` 오류로 실행이 막히면 `bash --noprofile -lc "cd backend && pytest"`처럼 호출하거나 해당 오류 라인을 임시 주석 처리하십시오.

## 프론트엔드 구현 요약

- **App.tsx**: `currentPage`와 통화 상태를 관리하며, Sidebar/헤더/각 페이지를 렌더링합니다.
- **Sidebar.tsx**: `'Dashboard' | 'Income' | 'Expenses' | 'Investments' | 'Issues' | 'Settings'` 중 선택된 페이지를 전환합니다.
- **Dashboard.tsx**: `/api/expenses`, `/api/categories`, `/api/budgets`, `/api/investments/holdings`를 호출해 월별 수입·지출, 예산 대비 지출, 투자 배분을 계산합니다.
- **Income.tsx / Expenses.tsx**: 동일한 `/api/expenses` 엔드포인트를 사용하지만, 카테고리 타입(`income`/`expense`)으로 데이터를 구분합니다. 날짜/카테고리 필터, 정렬, 모달 기반 CRUD를 제공합니다.
- **Settings.tsx**: 카테고리·예산·사용자 API에 연결되어 있으며, 카테고리 삭제 시 예산/지출 연관 관계를 검사합니다.
- **lib/api.ts**: `/api` 프록시를 기준으로 CRUD 헬퍼(`apiGet`, `apiPost`, `apiPut`, `apiDelete`)와 도메인별 메서드를 제공합니다.

## 백엔드 구현 요약

- **app/api/expenses.py**: SQLAlchemy를 사용한 CRUD. 날짜/카테고리 필터를 지원하며, `created_by`가 비어 있으면 기본 사용자 ID(1)를 사용합니다.
- **app/api/categories.py**: 카테고리 CRUD. 예산/지출이 연결된 경우 삭제를 차단합니다.
- **app/core/deps.py**: `get_db` 의존성과 JWT 디코딩 유틸(추후 인증 강화 예정).
- **app/models/**: `User`, `Category`, `Expense`, `Budget`, `Investment` 등 테이블 정의.
- **tests/test_expenses_api.py**: FastAPI `TestClient` + 인메모리 SQLite로 지출 생성/조회·수정·삭제 흐름을 검증합니다.

## 작업 시 유의사항

- 프론트엔드에서 새 엔드포인트를 사용하려면 `lib/api.ts`에 메서드를 추가하고, 컴포넌트에서 Promise.all로 데이터를 가져온 뒤 camelCase/snake_case 정규화를 맞춰 주세요.
- 백엔드 작업은 모델 → 스키마 → 라우터 순으로 추가하고 `app/main.py`에 라우터를 등록합니다. Alembic 마이그레이션을 생성 후 `alembic upgrade head`로 반영합니다.
- 테스트는 Pytest 패턴을 참고하여 `app.core.deps.get_db` 의존성을 override한 채 작성하세요.
- `.env`(backend) / `.env.development`(frontend) 파일을 활용하여 DB, JWT, 프록시 설정을 관리합니다. 민감한 값은 커밋하지 마세요.

## 향후 개선 항목

- 투자·이슈 라우터를 실제 DB와 연결하고 프론트 데이터를 API 기반으로 전환
- 사용자 인증/인가(JWT, 패스워드 해시) 및 권한 적용
- 프론트엔드 Vitest/RTL 테스트 작성 및 CI 파이프라인 구축
- `.bash_profile`에 남아 있는 syntax error 정리 (현재 테스트 실행 시 방해 요인)
- 프로덕션 배포 시 HTTPS 및 신뢰할 수 있는 CORS 도메인만 허용

추가 정보는 `README.md`, `AGENTS.md`, `docs/` 폴더 문서를 참조하세요. 문제가 발생하면 GitHub Issue 또는 `docs/workflow.md` 절차에 따라 대응합니다.
