import React, { useState, useMemo } from 'react';
import { CalendarEvent, CALENDAR_COLOR_PALETTES, UserColorPreferences } from '../../types';
import { getMonthRange, expandRecurrences, getLocalDateTimeWithTimezone } from '../../lib/dateUtils';

interface SharedCalendarProps {
  events: CalendarEvent[];
  loading?: boolean;
  onEventClick?: (event: CalendarEvent) => void;
  yearMonth?: string; // 'YYYY-MM', defaults to current month
  theme?: 'dark' | 'light';
  compact?: boolean; // true = 작은 대시보드 버전, false = 전체 버전
  colorPreferences?: UserColorPreferences | null;
}

/**
 * 공용 캘린더 컴포넌트
 *
 * 공유된 이벤트들을 월간 그리드로 표시합니다.
 * - Dashboard 하단에 공용 캘린더 미리보기로 사용
 * - Settings에서 색상 레전드 표시
 * - 읽기 전용 (편집 기능 없음)
 * - 여러 날짜에 걸친 이벤트는 연결된 막대로 표시
 */
const SharedCalendar: React.FC<SharedCalendarProps> = ({
  events,
  loading = false,
  onEventClick,
  yearMonth = new Date().toISOString().slice(0, 7),
  theme = 'dark',
  compact = true,
  colorPreferences = null
}) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // 연/월 파싱
  const [year, month] = yearMonth.split('-').map(Number);

  if (month < 1 || month > 12) {
    return (
      <div className={`p-4 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          유효하지 않은 날짜입니다.
        </p>
      </div>
    );
  }

  // 월의 첫 날과 마지막 날 계산
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay()); // 주의 시작일(일요일)로 조정

  // 반복 이벤트 전개
  const monthRange = getMonthRange(yearMonth);
  const expandedEvents = useMemo(() => {
    if (!monthRange || !events.length) return [];

    const expanded: Array<CalendarEvent & { expandedStartAt: string }> = [];

    for (const event of events) {
      if (event.recurrenceRule) {
        const occurrences = expandRecurrences(
          event.startAt,
          event.recurrenceRule,
          monthRange.startAt,
          monthRange.endAt
        );

        for (const startAt of occurrences) {
          const eventDuration = new Date(event.endAt).getTime() - new Date(event.startAt).getTime();
          const endAt = new Date(new Date(startAt).getTime() + eventDuration).toISOString();

          expanded.push({
            ...event,
            startAt,
            endAt,
            expandedStartAt: startAt
          });
        }
      } else {
        const startTime = new Date(event.startAt).getTime();
        const monthStart = new Date(monthRange.startAt).getTime();
        const monthEnd = new Date(monthRange.endAt).getTime();

        if (startTime >= monthStart && startTime <= monthEnd) {
          expanded.push({
            ...event,
            expandedStartAt: event.startAt
          });
        }
      }
    }

    return expanded;
  }, [events, monthRange]);

  // 캘린더 그리드 생성
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];

    // 월의 첫 날 요일에 맞춰 빈 셀 추가
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // 월의 날짜들
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(day);
    }

    return days;
  }, [firstDay, lastDay]);

  // 주 단위로 분할
  const calendarWeeks = useMemo(() => {
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    return weeks;
  }, [calendarDays]);

  // 이벤트 위치 계산
  interface EventPosition {
    event: CalendarEvent & { expandedStartAt: string };
    dayIndex: number;
    span: number;
    row: number;
  }

  const getWeekEventPositions = (weekDays: (number | null)[]): EventPosition[][] => {
    const positions: EventPosition[] = [];
    const processedEvents = new Set<string>(); // 중복 방지

    // 주의 날짜 범위 계산
    const weekStart = weekDays.find(d => d !== null);
    const weekEnd = weekDays[weekDays.length - 1];
    if (!weekStart || !weekEnd) return [];

    const weekStartDate = new Date(year, month - 1, weekStart, 0, 0, 0);
    const weekEndDate = new Date(year, month - 1, weekEnd, 23, 59, 59);

    // 이 주와 겹치는 모든 이벤트 찾기
    expandedEvents.forEach((event) => {
      const eventStart = new Date(event.startAt);
      const eventEnd = new Date(event.endAt);

      // 이벤트가 이 주와 겹치는지 확인
      if (eventStart <= weekEndDate && eventEnd >= weekStartDate) {
        // 중복 방지
        const eventKey = `${event.id}-${event.expandedStartAt}`;
        if (processedEvents.has(eventKey)) return;
        processedEvents.add(eventKey);

        // 이벤트가 이 주의 어느 날부터 시작하는지 찾기
        let dayIndex = 0;
        if (eventStart >= weekStartDate) {
          // 이벤트가 이 주 안에서 시작됨
          const eventDay = eventStart.getDate();
          dayIndex = weekDays.findIndex(d => d === eventDay);
          if (dayIndex === -1) return; // 안전 체크
        } else {
          // 이벤트가 이전 주에 시작됨 - 일요일(index 0)부터 표시
          dayIndex = 0;
        }

        // span 계산 (이 주에서 며칠 동안 표시되는지)
        let span = 1;
        for (let i = dayIndex + 1; i < 7; i++) {
          const nextDay = weekDays[i];
          if (!nextDay) break;

          const checkDate = new Date(year, month - 1, nextDay, 0, 0, 0);
          if (checkDate < eventEnd) {
            span++;
          } else {
            break;
          }
        }

        positions.push({
          event,
          dayIndex,
          span,
          row: 0
        });
      }
    });

    // 날짜순, span 큰 순으로 정렬
    positions.sort((a, b) => {
      if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
      return b.span - a.span;
    });

    // 행 배치 (겹치지 않도록)
    const rows: EventPosition[][] = [];
    positions.forEach((pos) => {
      let placed = false;
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const hasOverlap = row.some((existing) => {
          const existingEnd = existing.dayIndex + existing.span;
          const posEnd = pos.dayIndex + pos.span;
          return !(pos.dayIndex >= existingEnd || existing.dayIndex >= posEnd);
        });

        if (!hasOverlap) {
          pos.row = r;
          row.push(pos);
          placed = true;
          break;
        }
      }

      if (!placed) {
        pos.row = rows.length;
        rows.push([pos]);
      }
    });

    return rows;
  };

  // 요일 이름
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  // 색상 취득 함수
  const getEventColor = (event: CalendarEvent): string => {
    if (event.colorOverride) {
      return event.colorOverride;
    }
    // Use color from user preferences based on isShared
    if (colorPreferences) {
      return event.isShared ? colorPreferences.sharedColor : colorPreferences.personalColor;
    }
    // Fallback to default colors
    return event.isShared ? '#ec4899' : '#0ea5e9';
  };

  // 현재 월 확인
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;

  // 컴팩트 모드 크기
  const textSizeClass = compact ? 'text-xs sm:text-sm' : 'text-sm';

  return (
    <div
      className={`w-full rounded-lg overflow-hidden ${
        theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}
    >
      {/* 헤더 */}
      <div
        className={`px-4 py-3 sm:py-4 border-b ${
          theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}
      >
        <h3 className={`font-semibold ${textSizeClass} ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
          {year}년 {month}월 공용 일정
        </h3>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className={`flex items-center justify-center h-64 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-500"></div>
        </div>
      )}

      {/* 요일 헤더 */}
      {!loading && (
        <>
          <div className={`grid grid-cols-7 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            {dayNames.map((day) => (
              <div
                key={day}
                className={`text-center py-2 sm:py-3 font-semibold ${textSizeClass} ${
                  theme === 'dark' ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 캘린더 그리드 - 주 단위 */}
          <div className="space-y-1">
            {calendarWeeks.map((weekDays, weekIndex) => {
              const eventRows = getWeekEventPositions(weekDays);
              const maxRows = Math.max(eventRows.length, 1);
              const minHeight = compact ? 60 : 80;
              const rowHeight = compact ? 20 : 24;

              return (
                <div key={weekIndex} className="relative">
                  {/* 날짜 셀 */}
                  <div
                    className="grid grid-cols-7 gap-0.5"
                    style={{ minHeight: `${minHeight + maxRows * rowHeight}px` }}
                  >
                    {weekDays.map((day, dayIndex) => {
                      const isToday = isCurrentMonth && day === today.getDate();

                      return (
                        <div
                          key={dayIndex}
                          className={`
                            relative border p-1 sm:p-2
                            ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
                            ${isToday ? (theme === 'dark' ? 'bg-sky-900/30' : 'bg-blue-50') : theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
                          `}
                        >
                          {day && (
                            <div
                              className={`
                                font-semibold relative z-10
                                ${textSizeClass}
                                ${
                                  isToday
                                    ? theme === 'dark'
                                      ? 'text-sky-300'
                                      : 'text-sky-600'
                                    : theme === 'dark'
                                    ? 'text-gray-300'
                                    : 'text-gray-700'
                                }
                              `}
                            >
                              {day}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 이벤트 막대 오버레이 */}
                  <div
                    className="absolute top-0 left-0 right-0 grid grid-cols-7 gap-0.5 pointer-events-none"
                    style={{ paddingTop: compact ? '28px' : '36px' }}
                  >
                    {eventRows.map((row, rowIndex) => (
                      <React.Fragment key={rowIndex}>
                        {row.map((pos) => {
                          const backgroundColor = getEventColor(pos.event);

                          return (
                            <div
                              key={`${pos.event.id}-${pos.dayIndex}`}
                              className={`
                                rounded cursor-pointer truncate shadow-sm hover:shadow-md transition-all pointer-events-auto font-medium
                                ${compact ? 'text-xs px-1 py-0.5' : 'text-xs px-2 py-1'}
                              `}
                              style={{
                                backgroundColor,
                                opacity: 0.9,
                                gridColumn: `${pos.dayIndex + 1} / span ${pos.span}`,
                                gridRow: rowIndex + 1,
                                marginTop: `${rowIndex * rowHeight}px`,
                                height: `${rowHeight - 2}px`,
                                display: 'flex',
                                alignItems: 'center',
                                color: '#fff',
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(pos.event);
                                onEventClick?.(pos.event);
                              }}
                              title={pos.event.title}
                            >
                              <span className="truncate">{pos.event.title}</span>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 색상 레전드 (compact가 아닐 때만) */}
      {!compact && !loading && (
        <div className={`px-4 py-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs sm:text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            색상 범례
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.values(CALENDAR_COLOR_PALETTES)
              .slice(0, 6)
              .map((palette) => (
                <div key={palette.key} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded"
                    style={{ backgroundColor: palette.hex }}
                  />
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {palette.name}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && events.length === 0 && (
        <div className={`py-8 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            공유된 일정이 없습니다.
          </p>
        </div>
      )}
    </div>
  );
};

export default SharedCalendar;
