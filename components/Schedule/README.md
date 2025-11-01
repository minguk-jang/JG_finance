# Schedule Component

완전한 캘린더 관리 기능을 제공하는 React 컴포넌트입니다. 월별/주별 뷰, 이벤트 CRUD, 반복 일정, 리마인더 관리를 지원합니다.

## 기능

### 기본 기능
- **월별/주별 캘린더 뷰**: 직관적인 그리드 기반 캘린더 (월 뷰 구현, 주 뷰 플레이스홀더)
- **이벤트 표시**: 날짜별로 일정 표시, 색상 커스터마이징 지원
- **권한 기반 접근**: Admin은 CRUD 가능, Editor/Viewer는 읽기만 가능 (공유 이벤트)

### Admin 기능
- **이벤트 생성**: 새로운 일정 생성
- **이벤트 수정**: 기존 일정 편집
- **이벤트 삭제**: 일정 삭제
- **공유 설정**: 이벤트를 다른 사용자와 공유 (공유된 이벤트는 모든 인증 사용자가 조회 가능)

### 이벤트 기능
- **반복 일정**: RRULE 기반 반복 설정 (매일, 매주, 매월, 매년)
- **리마인더**: 다중 리마인더 설정 (시간 전, 방법: 앱/푸시/이메일)
- **색상 커스터마이징**: 이벤트별 커스텀 색상 또는 사용자 기본 색상 사용
- **전일 이벤트**: 하루 종일 일정 표시
- **시간대 표시**: ISO 8601 형식으로 정확한 시간대 관리

## 파일 구조

```
components/Schedule/
├── index.tsx              # 메인 Schedule 컴포넌트
├── EventModal.tsx         # 이벤트 생성/수정 모달
├── EventDetailsModal.tsx  # 이벤트 상세 조회 모달
├── Schedule.css          # 컴포넌트 스타일
└── README.md            # 이 파일
```

## 컴포넌트 상세

### Schedule (index.tsx)

메인 캘린더 컴포넌트입니다.

**기능:**
- 월별 캘린더 그리드 렌더링
- 이벤트 데이터 로드 및 반복 이벤트 확장
- 사용자 권한에 따른 기능 제어
- 달력 네비게이션 (이전/다음/오늘)
- 뷰 모드 토글 (월/주)

**Props:**
- 현재는 Props 없음 (useAuth 후크를 통해 인증 정보 가져옴)

**상태:**
- `viewMode`: 'month' | 'week' (기본값: 'month')
- `currentDate`: 현재 표시 중인 날짜
- `events`: 캘린더 이벤트 배열
- `preferences`: 사용자 캘린더 선호도
- `loading`: 데이터 로드 상태
- `error`: 오류 메시지
- `showEventModal`: 이벤트 모달 표시 여부
- `showDetailsModal`: 상세 모달 표시 여부

**API 호출:**
- `api.getCalendarEvents()`: 날짜 범위의 이벤트 조회
- `api.getUserCalendarPreferences()`: 사용자 캘린더 선호도 조회

### EventModal (EventModal.tsx)

이벤트를 생성하거나 수정하는 모달입니다.

**기능:**
- 제목, 설명, 위치 입력
- 날짜/시간 선택 (전일 옵션 포함)
- 반복 규칙 설정 (빈도, 종료 날짜)
- 색상 선택
- 공유 여부 설정
- 리마인더 다중 설정 및 관리

**Props:**
- `event`: 수정할 이벤트 (null이면 새로 생성)
- `onClose`: 모달 닫기 콜백
- `onSave`: 저장 성공 콜백
- `onDelete`: 삭제 성공 콜백
- `currentDate`: 기본 날짜로 사용할 Date 객체

**API 호출:**
- `api.createCalendarEvent()`: 새 이벤트 생성
- `api.updateCalendarEvent()`: 기존 이벤트 수정
- `api.deleteCalendarEvent()`: 이벤트 삭제

### EventDetailsModal (EventDetailsModal.tsx)

이벤트의 상세 정보를 보여주는 읽기 전용 모달입니다.

**기능:**
- 이벤트 제목, 설명, 위치 표시
- 날짜/시간 포매팅된 표시
- 반복 규칙 표시
- 리마인더 목록 표시
- 생성일/수정일 메타데이터
- 소유자인 경우 수정 버튼 표시

**Props:**
- `event`: 표시할 이벤트
- `onClose`: 모달 닫기 콜백
- `onEdit`: 수정 버튼 클릭 콜백
- `isOwner`: 현재 사용자가 이벤트 소유자인지 여부

## 스타일 (Schedule.css)

다크/라이트 테마를 지원하는 완전한 스타일링입니다.

**주요 특징:**
- CSS 변수 사용으로 테마 커스터마이징 가능
- 모바일 우선 반응형 디자인
- 접근성을 고려한 포커스 스타일
- 인쇄 스타일 지원

**CSS 클래스:**
- `.schedule-container`: 메인 컨테이너
- `.calendar-grid`: 캘린더 그리드
- `.calendar-day`: 개별 날짜 셀
- `.calendar-event`: 이벤트 표시
- `.modal-overlay`, `.modal-content`: 모달 스타일
- `.form-*`: 폼 요소 스타일
- `.btn`: 버튼 스타일

## 반응형 디자인

### 모바일 (< 640px)
- 최소 높이 64px인 날짜 셀
- 축소된 텍스트 크기
- 한 줄에 최대 2개 이벤트 표시
- 네비게이션 버튼 축약 표시 (← → 등)
- "오늘" 버튼 축약 표시

### 태블릿 (640px ~ 1024px)
- 중간 크기 날짜 셀 (최소 높이 80px)
- 일반 텍스트 크기
- 전체 월 그리드 표시

### 데스크톱 (> 1024px)
- 최소 높이 112px인 충분한 셀 높이
- 모든 이벤트 완전 표시
- 여유 있는 패딩과 간격

## 사용 예시

### 기본 사용법

```tsx
import Schedule from './components/Schedule';

function App() {
  return <Schedule />;
}
```

### App.tsx 통합

이미 App.tsx에 다음과 같이 통합되어 있습니다:

```tsx
const Schedule = lazy(() => import('./components/Schedule'));

// 페이지 렌더링 내에서
case 'Schedule':
  return <Schedule />;
```

## API 통합

### Supabase 테이블

이 컴포넌트는 다음 테이블과 상호작용합니다:

- **calendar_events**: 이벤트 저장
  - id: UUID
  - title: 이벤트 제목
  - description: 설명
  - location: 위치
  - start_at: 시작 시간 (TIMESTAMPTZ)
  - end_at: 종료 시간 (TIMESTAMPTZ)
  - is_all_day: 전일 이벤트 여부
  - is_shared: 공유 여부
  - color_override: 커스텀 색상
  - recurrence_rule: RFC 5545 RRULE
  - reminders: JSON 배열
  - created_by: 생성자 UUID

- **user_calendar_preferences**: 사용자 선호도
  - user_id: 사용자 UUID
  - color_hex: 기본 색상
  - timezone: 타임존
  - week_starts_on: 주 시작 요일
  - reminders_default: 기본 리마인더

### API 함수 (lib/api.ts)

```typescript
// 이벤트 조회
api.getCalendarEvents({
  from_date: '2025-11-01T00:00:00+09:00',
  to_date: '2025-11-30T23:59:59+09:00',
  is_shared: true,
  created_by: 'user-uuid'
})

// 단일 이벤트 조회
api.getCalendarEvent(eventId)

// 이벤트 생성
api.createCalendarEvent({
  title: '회의',
  startAt: '2025-11-15T10:00:00+09:00',
  endAt: '2025-11-15T11:00:00+09:00',
  ...
})

// 이벤트 수정
api.updateCalendarEvent(eventId, {...})

// 이벤트 삭제
api.deleteCalendarEvent(eventId)

// 사용자 선호도
api.getUserCalendarPreferences()
api.updateUserCalendarPreferences({...})
```

## 유틸리티 함수 (lib/dateUtils.ts)

이 컴포넌트는 다음 유틸리티 함수를 사용합니다:

```typescript
// 월 범위 계산
getMonthRange('2025-11')
// → { startAt: '2025-11-01T00:00:00+09:00', endAt: '2025-11-30T23:59:59+09:00' }

// 주 범위 계산
getWeekRange(date)

// 날짜/시간 포매팅
getLocalDateTimeWithTimezone(date, 'Asia/Seoul')
getLocalDateString(date)

// 날짜 파싱
parseCalendarDateTime('2025-11-15T10:00:00+09:00')

// RRULE 처리
isValidRRule(rruleString)
parseRRule(rruleString)
expandRecurrences(startDate, rruleString, rangeStart, rangeEnd)
```

## 권한 모델

### Admin
- 모든 이벤트에 대한 CRUD 가능
- "일정 생성" 버튼 표시
- 다른 사용자의 이벤트도 수정/삭제 가능

### Editor / Viewer
- 공유된 이벤트만 조회 가능
- 수정/삭제 불가
- "조회만 가능" 배지 표시 (예정)

## 향후 개선사항

1. **주간 뷰 구현**: 현재는 플레이스홀더 상태
2. **일간 뷰 구현**: 상세한 시간별 뷰
3. **복제 기능**: 기존 이벤트 복제
4. **드래그 & 드롭**: 이벤트 이동
5. **검색 기능**: 이벤트 검색
6. **구글/아웃룩 동기화**: 외부 캘린더 연동
7. **캘린더 그룹**: 여러 캘린더 그룹화
8. **공휴일 표시**: 국가별 공휴일 표시
9. **참석자 관리**: 초대 및 참석 여부 추적
10. **실시간 동기화**: WebSocket 기반 실시간 업데이트

## 테스트 및 검증

### 수동 테스트 체크리스트

- [ ] 캘린더 월별 뷰 정상 표시
- [ ] 현재 날짜 강조 표시
- [ ] 이벤트 클릭 시 상세 모달 표시
- [ ] Admin: 새 일정 생성 가능
- [ ] Admin: 이벤트 수정 가능
- [ ] Admin: 이벤트 삭제 가능
- [ ] 반복 이벤트 올바르게 확장됨
- [ ] 리마인더 설정 저장됨
- [ ] 색상 커스터마이징 작동
- [ ] 공유 이벤트 옵션 작동
- [ ] 모바일 반응형 레이아웃 정상
- [ ] 에러 메시지 적절히 표시

### 브라우저 호환성

- Chrome/Edge (최신)
- Firefox (최신)
- Safari (최신)
- 모바일 브라우저 (iOS Safari, Chrome Android)

## 성능 고려사항

- `useMemo`로 expanded events 최적화 (반복 이벤트 확장)
- 월별 이벤트만 로드 (필터링으로 최소화)
- 리스트 아이템 key는 고유한 ID 사용
- CSS는 별도 파일로 최적화

## 접근성 (A11y)

- ARIA 레이블 (예정)
- 키보드 네비게이션 지원
- 포커스 스타일 명확
- 색상 대비 WCAG AA 준수

## 문제 해결

### 이벤트가 표시되지 않음
1. 브라우저 콘솔에서 API 호출 확인
2. Supabase RLS 정책 확인 (is_shared 또는 created_by 확인)
3. 날짜 범위 확인

### 모달이 열리지 않음
1. 브라우저 콘솔 에러 확인
2. Admin 권한 확인

### 반복 이벤트가 올바르지 않음
1. RRULE 형식 확인
2. dateUtils.expandRecurrences() 로직 검증

## 라이선스

프로젝트와 동일
