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
