/**
 * 날짜 유틸리티 함수 (KST 기준)
 * 모든 날짜는 타임존 변환 없이 로컬 시간대(KST)를 사용합니다.
 */

/**
 * 현재 로컬 날짜를 YYYY-MM-DD 형식으로 반환
 * UTC 변환 없이 순수 로컬 시간대 사용
 */
export function getLocalDateString(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 날짜 형식 검증 (YYYY-MM-DD)
 */
export function isValidDateFormat(dateString: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateString)) {
    return false;
  }

  // 실제 유효한 날짜인지 확인
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * 두 날짜 문자열 비교 (YYYY-MM-DD 형식)
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDateStrings(date1: string, date2: string): number {
  return date1.localeCompare(date2);
}

/**
 * 날짜 문자열을 Date 객체로 변환 (로컬 시간대)
 */
export function parseDateString(dateString: string): Date | null {
  if (!isValidDateFormat(dateString)) {
    return null;
  }

  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// ============================================
// 타임존 처리 함수 (캘린더용)
// ============================================

/**
 * 현재 로컬 날짜/시간을 ISO 8601 형식 문자열로 반환 (타임존 포함)
 * 예: "2025-11-01T14:30:00+09:00" (KST)
 */
export function getLocalDateTimeWithTimezone(date?: Date, timezone: string = 'Asia/Seoul'): string {
  const d = date || new Date();

  // KST 기준으로 ISO 문자열 생성
  // JavaScript에서는 기본적으로 local time을 기반으로 함
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  // KST는 UTC+09:00
  const offset = timezone === 'Asia/Seoul' ? '+09:00' : '+00:00';

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
}

/**
 * ISO 8601 날짜/시간 문자열을 파싱 (타임존 정보 유지)
 * 예: "2025-11-01T14:30:00+09:00" → Date 객체
 */
export function parseCalendarDateTime(isoString: string): Date | null {
  try {
    // ISO 8601 형식 파싱
    // 예: "2025-11-01T14:30:00+09:00" 또는 "2025-11-01T14:30:00Z"
    const date = new Date(isoString);

    // 유효한 날짜 확인
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}

/**
 * 날짜/시간 범위 (월) 생성
 * 특정 월의 시작과 끝 시간을 반환
 * 예: 2025-11 → { startAt: "2025-11-01T00:00:00+09:00", endAt: "2025-11-30T23:59:59+09:00" }
 */
export function getMonthRange(yearMonth: string): { startAt: string; endAt: string } | null {
  const match = yearMonth.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const [, yearStr, monthStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (month < 1 || month > 12) return null;

  // 달의 마지막 날 계산
  const lastDay = new Date(year, month, 0).getDate();

  const startDate = new Date(year, month - 1, 1, 0, 0, 0);
  const endDate = new Date(year, month - 1, lastDay, 23, 59, 59);

  return {
    startAt: getLocalDateTimeWithTimezone(startDate),
    endAt: getLocalDateTimeWithTimezone(endDate)
  };
}

/**
 * 날짜/시간 범위 (주) 생성
 * 특정 주의 시작(월요일)과 끝(일요일) 시간을 반환
 */
export function getWeekRange(date?: Date): { startAt: string; endAt: string } {
  const d = date || new Date();

  // 월요일(1) 기준으로 주 계산
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일이 -6, 일요일이 1

  const startDate = new Date(d.setDate(diff));
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  return {
    startAt: getLocalDateTimeWithTimezone(startDate),
    endAt: getLocalDateTimeWithTimezone(endDate)
  };
}

// ============================================
// RRULE (Recurrence Rule) 처리 함수
// ============================================

/**
 * RRULE 형식 검증
 * RFC 5545 RRULE 형식: "FREQ=DAILY;COUNT=10" 등
 */
export function isValidRRule(rruleString: string | null | undefined): boolean {
  if (!rruleString) return false;

  // 기본 RRULE 패턴 검증
  const rrulePattern = /^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/i;
  return rrulePattern.test(rruleString);
}

/**
 * RRULE 문자열을 파싱하여 객체로 변환
 * 예: "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10"
 * → { freq: 'WEEKLY', byday: ['MO', 'WE', 'FR'], count: 10 }
 */
export function parseRRule(rruleString: string): Record<string, any> | null {
  if (!isValidRRule(rruleString)) {
    return null;
  }

  const parts = rruleString.split(';');
  const result: Record<string, any> = {};

  for (const part of parts) {
    const [key, value] = part.split('=');
    const lowerKey = key.toLowerCase();

    if (lowerKey === 'freq') {
      result.freq = value.toUpperCase();
    } else if (lowerKey === 'count') {
      result.count = parseInt(value, 10);
    } else if (lowerKey === 'interval') {
      result.interval = parseInt(value, 10);
    } else if (lowerKey === 'byday') {
      result.byday = value.split(',');
    } else if (lowerKey === 'bymonth') {
      result.bymonth = value.split(',').map((v) => parseInt(v, 10));
    } else if (lowerKey === 'bymonthday') {
      result.bymonthday = value.split(',').map((v) => parseInt(v, 10));
    } else if (lowerKey === 'until') {
      result.until = value;
    }
  }

  return result;
}

/**
 * 이벤트의 반복 규칙을 기반으로 지정된 날짜 범위 내 모든 발생 날짜 계산
 * 간단한 구현 (복잡한 RRULE은 rrule.js 라이브러리 권장)
 *
 * @param startDate 이벤트 시작 날짜 (YYYY-MM-DD 또는 ISO 8601)
 * @param rruleString RRULE 문자열 (예: "FREQ=WEEKLY;BYDAY=MO,WE,FR")
 * @param rangeStart 범위 시작 (ISO 8601)
 * @param rangeEnd 범위 끝 (ISO 8601)
 * @returns 반복되는 모든 발생 날짜 배열
 */
export function expandRecurrences(
  startDate: string,
  rruleString: string | null,
  rangeStart: string,
  rangeEnd: string
): string[] {
  if (!rruleString || !isValidRRule(rruleString)) {
    // RRULE이 없으면 시작 날짜만 반환
    return [startDate];
  }

  const occurrences: string[] = [];
  const parsed = parseRRule(rruleString);
  if (!parsed) return [startDate];

  const startDateObj = parseCalendarDateTime(startDate);
  const rangeStartObj = parseCalendarDateTime(rangeStart);
  const rangeEndObj = parseCalendarDateTime(rangeEnd);

  if (!startDateObj || !rangeStartObj || !rangeEndObj) {
    return [startDate];
  }

  const freq = parsed.freq?.toUpperCase();
  const interval = parsed.interval || 1;
  const count = parsed.count || Infinity;
  const until = parsed.until ? parseCalendarDateTime(parsed.until) : null;

  let current = new Date(startDateObj);
  let occurrenceCount = 0;

  // 최대 500개의 반복까지만 처리 (무한 루프 방지)
  while (occurrenceCount < Math.min(count, 500)) {
    if (current > rangeEndObj) break;

    if (current >= rangeStartObj && current <= rangeEndObj) {
      occurrences.push(getLocalDateTimeWithTimezone(current));
    }

    if (until && current > until) break;

    // 다음 발생 날짜 계산
    switch (freq) {
      case 'DAILY':
        current.setDate(current.getDate() + interval);
        break;
      case 'WEEKLY': {
        if (parsed.byday && Array.isArray(parsed.byday)) {
          // BYDAY 필드 처리 (예: MO, WE, FR)
          const dayMap: Record<string, number> = {
            SU: 0,
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6
          };

          const targetDays = parsed.byday.map((d: string) => dayMap[d]).filter((d) => d !== undefined);
          const currentDay = current.getDay();

          let nextDay = targetDays.find((d) => d > currentDay);
          if (nextDay === undefined) {
            // 이번 주에 해당하는 요일이 없으면 다음 주 첫 요일로
            nextDay = targetDays[0];
            current.setDate(current.getDate() + (7 - currentDay + nextDay));
          } else {
            // 같은 주의 다음 요일로
            current.setDate(current.getDate() + (nextDay - currentDay));
          }
        } else {
          // BYDAY 없으면 매주 같은 요일
          current.setDate(current.getDate() + 7 * interval);
        }
        break;
      }
      case 'MONTHLY': {
        const monthDay = startDateObj.getDate();
        current.setMonth(current.getMonth() + interval);
        // 달의 마지막 날보다 작으면 조정
        const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        if (monthDay > lastDay) {
          current.setDate(lastDay);
        } else {
          current.setDate(monthDay);
        }
        break;
      }
      case 'YEARLY':
        current.setFullYear(current.getFullYear() + interval);
        break;
      default:
        return [startDate]; // 알 수 없는 FREQ
    }

    occurrenceCount++;
  }

  return occurrences.length > 0 ? occurrences : [startDate];
}
