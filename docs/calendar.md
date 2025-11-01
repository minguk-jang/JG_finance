# 캘린더 일정 관리 기능

## 개요

JG_finance의 캘린더 일정 관리 기능은 사용자가 **개인 일정**을 관리하고 **공용 일정**을 공유할 수 있도록 설계되었습니다.

**핵심 기능:**
- 📅 월/주 뷰 캘린더
- 🔁 반복 일정 (RRULE 기반)
- 🔔 다중 리마인더
- 🎨 색상 커스터마이징 (Hermès 팔레트)
- 📍 위치 및 설명 지원
- 🔒 권한 제어 (Admin만 CRUD)
- 🌐 공유 일정 (모든 사용자 조회 가능)

## 데이터 모델

### calendar_events 테이블

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_at TIMESTAMPTZ,           -- ISO 8601 with timezone
  end_at TIMESTAMPTZ,
  is_all_day BOOLEAN,
  recurrence_rule TEXT,           -- RFC 5545 RRULE format
  reminders JSONB,                -- [{ type, minutes_before, method }]
  is_shared BOOLEAN,
  color_override TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### user_calendar_preferences 테이블

```sql
CREATE TABLE user_calendar_preferences (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE,
  color_hex TEXT,                 -- 기본 색상
  palette_key TEXT,               -- sky|coral|orange|tan|amber|dark|custom
  reminders_default JSONB,
  timezone TEXT,                  -- 'Asia/Seoul'
  week_starts_on INTEGER,         -- 0=Sunday, 1=Monday
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## API 엔드포인트

### 캘린더 이벤트

#### 조회

```typescript
// 날짜 범위로 이벤트 조회
const events = await api.getCalendarEvents({
  from_date: '2025-11-01T00:00:00+09:00',  // ISO 8601
  to_date: '2025-11-30T23:59:59+09:00',
  is_shared: false,  // 선택: 공유 여부 필터링
  created_by: 'user-uuid'  // 선택: 작성자 필터링
});

// 단건 조회
const event = await api.getCalendarEvent('event-uuid');
```

#### 생성

```typescript
const newEvent = await api.createCalendarEvent({
  title: '팀 회의',
  description: '분기 목표 검토',
  location: '회의실 A',
  startAt: '2025-11-15T10:00:00+09:00',
  endAt: '2025-11-15T11:00:00+09:00',
  isAllDay: false,
  recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',  // 선택
  reminders: [
    { type: 'notification', minutesBefore: 15, method: 'in_app' },
    { type: 'notification', minutesBefore: 60, method: 'push' }
  ],
  isShared: true,
  colorOverride: '#FF7F50'  // 선택
});
```

**created_by는 자동으로 현재 사용자로 설정됩니다.**

#### 수정

```typescript
const updated = await api.updateCalendarEvent('event-uuid', {
  title: '팀 회의 (연기됨)',
  startAt: '2025-11-16T10:00:00+09:00',
  // 다른 필드들...
});
```

#### 삭제

```typescript
// 단건 삭제
await api.deleteCalendarEvent('event-uuid');

// 다중 삭제
await api.deleteCalendarEvents(['uuid1', 'uuid2', 'uuid3']);
```

### 사용자 선호도

#### 조회

```typescript
// 현재 사용자
const prefs = await api.getUserCalendarPreferences();

// 특정 사용자 (Admin용)
const userPrefs = await api.getUserCalendarPreferencesForUser('user-uuid');
```

#### 수정

```typescript
const updated = await api.updateUserCalendarPreferences({
  colorHex: '#FF6F61',
  paletteKey: 'coral',
  remindersDefault: [
    { type: 'notification', minutesBefore: 30, method: 'email' }
  ],
  timezone: 'Asia/Seoul',
  weekStartsOn: 1  // Monday
});
```

#### 기본값 생성 (Admin용)

```typescript
await api.createDefaultCalendarPreferences('user-uuid');
```

## RRULE (반복 규칙)

RFC 5545 RRULE 형식을 지원합니다.

### 기본 예시

```
FREQ=DAILY                          // 매일
FREQ=WEEKLY;BYDAY=MO,WE,FR         // 월/수/금마다
FREQ=MONTHLY;BYMONTHDAY=15         // 매월 15일
FREQ=YEARLY                         // 매년

// 추가 옵션
FREQ=DAILY;COUNT=10                 // 10회 반복
FREQ=WEEKLY;UNTIL=2025-12-31       // 2025-12-31까지
FREQ=WEEKLY;INTERVAL=2             // 2주마다
```

### 지원되는 필드

| 필드 | 예시 | 설명 |
|------|------|------|
| FREQ | DAILY, WEEKLY, MONTHLY, YEARLY | 반복 빈도 |
| BYDAY | MO,WE,FR | 요일 (WEEKLY일 때) |
| BYMONTHDAY | 15,25 | 날짜 (MONTHLY일 때) |
| INTERVAL | 2 | 간격 (기본: 1) |
| COUNT | 10 | 반복 횟수 |
| UNTIL | 2025-12-31 | 반복 종료 날짜 |

## 리마인더

각 리마인더는 다음 정보를 포함합니다:

```typescript
interface CalendarReminder {
  type: string;              // 'notification' 등
  minutesBefore: number;     // 15, 30, 60 등
  method: 'in_app' | 'push' | 'email';  // 알림 방식
}
```

**기본 리마인더:**
- 15분 전 (앱 내 알림)

**사용자 선택 옵션:**
- 15분 전, 30분 전, 1시간 전, 2시간 전
- 1일 전, 2일 전
- 앱 내 / 푸시 / 이메일

## 색상 팔레트

Hermès 영감의 현대적 팔레트:

| 팔레트 | 코드 | 설명 |
|--------|------|------|
| Sky | #0ea5e9 | 밝은 하늘색 - 기본값 |
| Coral | #FF7F50 | Hermès 코랄 |
| Orange | #FF6F61 | 생생한 주황색 |
| Tan | #E3985B | 따뜻한 갈색 |
| Amber | #FF8F00 | 황금색 |
| Dark | #3D3B30 | 깊은 갈색 |
| Custom | 사용자 정의 | 커스텀 색상 |

## 타임존 처리

모든 시간은 **KST (Asia/Seoul, UTC+09:00)** 기준입니다.

### dateUtils 함수들

```typescript
// ISO 8601 형식 (타임존 포함)으로 현재 시간 반환
const dateStr = getLocalDateTimeWithTimezone();
// "2025-11-01T14:30:00+09:00"

// ISO 8601 파싱
const date = parseCalendarDateTime('2025-11-01T14:30:00+09:00');

// 월 범위 조회
const range = getMonthRange('2025-11');
// { startAt: "2025-11-01T00:00:00+09:00", endAt: "2025-11-30T23:59:59+09:00" }

// 주 범위 조회
const weekRange = getWeekRange(new Date('2025-11-05'));

// RRULE 검증
const valid = isValidRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR');

// RRULE 파싱
const parsed = parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10');
// { freq: 'WEEKLY', byday: ['MO', 'WE', 'FR'], count: 10 }

// 반복 이벤트 전개
const occurrences = expandRecurrences(
  '2025-11-01T10:00:00+09:00',
  'FREQ=WEEKLY;BYDAY=MO,WE,FR',
  '2025-11-01T00:00:00+09:00',
  '2025-11-30T23:59:59+09:00'
);
```

## React 훅

### useCalendarEvents

```typescript
const {
  events,                    // 원본 이벤트들
  expandedEvents,           // RRULE 적용된 전개 이벤트들
  preferences,              // 사용자 선호도
  loading,
  error,
  refreshEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  updatePreferences
} = useCalendarEvents({
  yearMonth: '2025-11',  // 선택사항, 기본값: 현재 월
  isShared: false        // 선택사항, 기본값: false
});

// 사용 예시
const handleCreateEvent = async () => {
  const event = await createEvent({
    title: '새 일정',
    startAt: '2025-11-15T10:00:00+09:00',
    endAt: '2025-11-15T11:00:00+09:00'
  });
};
```

## 권한 제어

### Row Level Security (RLS)

```sql
-- 공유된 이벤트는 모든 사용자가 조회 가능
CREATE POLICY "Users can view shared calendar events"
  ON calendar_events FOR SELECT
  USING (is_shared = TRUE);

-- 자신의 이벤트는 모두 조회 가능
CREATE POLICY "Users can view own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = created_by);

-- Admin은 모든 이벤트 수정/삭제 가능
CREATE POLICY "Admin can manage all calendar events"
  ON calendar_events FOR UPDATE
  USING (is_admin());
```

### 프론트엔드 제어

```typescript
import { useAuth } from '../lib/auth';

const { profile } = useAuth();
const isAdmin = profile?.role === 'Admin';

// Admin만 생성 버튼 표시
{isAdmin && <button>새 일정 생성</button>}

// Admin이 아니면 "조회만 가능" 배지
{!isAdmin && <span className="badge">조회만 가능</span>}
```

## 컴포넌트

### Schedule (메인 일정 관리 페이지)

**경로:** `components/Schedule/index.tsx`

**기능:**
- 월/주 뷰 토글
- 이벤트 목록 및 상세 보기
- Admin: 이벤트 생성/수정/삭제
- 반복 이벤트 시각화
- 리마인더 표시

**사용:**
```typescript
import Schedule from './components/Schedule';

<Schedule />
```

### SharedCalendar (공용 캘린더 미리보기)

**경로:** `components/calendar/SharedCalendar.tsx`

**기능:**
- 공유된 이벤트만 표시
- 월 그리드 뷰
- 색상 레전드
- 읽기 전용
- 대시보드 통합 가능

**사용:**
```typescript
import SharedCalendar from './components/calendar/SharedCalendar';

const { expandedEvents } = useCalendarEvents({ isShared: true });

<SharedCalendar
  events={expandedEvents}
  yearMonth="2025-11"
  compact={true}
  onEventClick={(event) => console.log(event)}
/>
```

## 개발 가이드

### 새 이벤트 타입 추가

1. **DB 마이그레이션**: 필요하면 스키마 수정
2. **types.ts**: `CalendarEvent` 타입 확장
3. **API**: `lib/api.ts`에 함수 추가
4. **UI**: 해당 컴포넌트 업데이트

### 새 리마인더 방식 추가

1. **백엔드**: 리마인더 처리 로직 구현
2. **타입**: `CalendarReminder.method` 확장
3. **UI**: Settings에서 선택 옵션 추가
4. **문서**: 이 파일 업데이트

## 성능 최적화

### 반복 이벤트 확장

```typescript
// useMemo로 최적화
const expandedEvents = useMemo(() => {
  return events.map(event => {
    if (event.recurrenceRule) {
      // 월 범위 내에서만 전개
      return expandRecurrences(event.startAt, event.recurrenceRule, monthStart, monthEnd);
    }
    return [event];
  }).flat();
}, [events, monthStart, monthEnd]);
```

### 쿼리 최적화

```typescript
// 월 범위로 제한하여 데이터 양 최소화
const events = await api.getCalendarEvents({
  from_date: monthRange.startAt,
  to_date: monthRange.endAt
});
```

## 알려진 제약사항

1. **RRULE 복잡성**: 매우 복잡한 RRULE은 rrule.js 라이브러리 사용 권장
2. **리마인더**: 현재 앱 내 알림만 완전히 구현됨 (푸시/이메일은 향후)
3. **타임존**: KST만 기본 지원 (향후 사용자 선택 가능)

## 향후 계획

- [ ] Gemini AI 기반 자연어 일정 추가
- [ ] Google Calendar 동기화
- [ ] 푸시/이메일 알림 구현
- [ ] 일정 검색 및 필터링
- [ ] 일정 내보내기 (iCal 형식)
- [ ] 캘린더 구독 (공유 링크)
- [ ] 시간대 선택 UI
- [ ] 접근성 개선 (스크린 리더)

## 트러블슈팅

### 이벤트가 표시되지 않음

1. **권한 확인**: 공유 여부, Admin 권한 확인
2. **타임존**: 시간대가 올바른지 확인 (KST +09:00)
3. **날짜 범위**: 월 범위가 올바른지 확인
4. **RRULE**: RRULE 형식이 유효한지 확인

```typescript
// 디버깅
console.log('Events:', events);
console.log('Expanded:', expandedEvents);
console.log('Month range:', getMonthRange('2025-11'));
```

### 반복 이벤트 계산 오류

```typescript
// RRULE 검증
if (!isValidRRule(rruleString)) {
  console.error('Invalid RRULE:', rruleString);
  // 기본값으로 폴백
}
```

## 참고 자료

- [RFC 5545 - iCalendar Specification](https://tools.ietf.org/html/rfc5545)
- [RRULE Examples](https://www.rfc-editor.org/rfc/rfc5545#section-3.8.2.4)
- [ISO 8601 Date Time Format](https://en.wikipedia.org/wiki/ISO_8601)

## 관련 파일

```
src/
├── types.ts                          # 캘린더 타입 정의
├── lib/
│   ├── api.ts                        # 캘린더 API 함수
│   ├── dateUtils.ts                  # 날짜/시간/RRULE 유틸
│   └── supabase.ts                   # Supabase 클라이언트
├── hooks/
│   └── useCalendarEvents.ts         # 캘린더 훅
├── components/
│   ├── Schedule/
│   │   ├── index.tsx               # 메인 일정 관리 페이지
│   │   ├── EventModal.tsx          # 이벤트 생성/수정 모달
│   │   └── EventDetailsModal.tsx   # 이벤트 상세 조회 모달
│   └── calendar/
│       └── SharedCalendar.tsx       # 공용 캘린더 미리보기
└── supabase/migrations/
    └── 017_add_calendar_events.sql # 데이터베이스 스키마
```
