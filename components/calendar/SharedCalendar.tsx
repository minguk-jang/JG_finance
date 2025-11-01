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

  // 날짜별 이벤트 그룹화
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Array<CalendarEvent & { expandedStartAt: string }>> = {};

    for (const event of expandedEvents) {
      const dateStr = event.expandedStartAt.split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(event);
    }

    return grouped;
  }, [expandedEvents]);

  // 캘린더 그리드 생성
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];

  // 월의 첫 날 요일에 맞춰 빈 셀 추가 (firstDay 사용)
  for (let i = 0; i < firstDay.getDay(); i++) {
    week.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  while (week.length > 0 && week.length < 7) {
    week.push(null);
  }
  if (week.length > 0) {
    weeks.push(week);
  }

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
  const cellSizeClass = compact ? 'h-12 sm:h-16' : 'h-20 sm:h-24';
  const textSizeClass = compact ? 'text-xs sm:text-sm' : 'text-sm';
  const eventSizeClass = compact ? 'text-xs px-1 py-0.5' : 'text-xs px-2 py-1';

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
        <div className={`flex items-center justify-center ${cellSizeClass} ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
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

          {/* 캘린더 그리드 */}
          <div className={`grid grid-cols-7`}>
            {weeks.map((week, weekIdx) =>
              week.map((day, dayIdx) => {
                const dateStr = day
                  ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  : null;
                const dayEvents = dateStr ? (eventsByDate[dateStr] || []) : [];
                const isToday = isCurrentMonth && day === today.getDate();

                return (
                  <div
                    key={`${weekIdx}-${dayIdx}`}
                    className={`
                      ${cellSizeClass} border
                      ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
                      ${isToday ? (theme === 'dark' ? 'bg-sky-900' : 'bg-blue-50') : theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
                      p-1 sm:p-2 overflow-hidden
                      ${day ? 'cursor-default' : ''}
                    `}
                  >
                    {day && (
                      <>
                        {/* 날짜 */}
                        <div
                          className={`
                            font-semibold mb-0.5 sm:mb-1
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

                        {/* 이벤트 목록 */}
                        <div className="space-y-0.5 sm:space-y-1">
                          {dayEvents.slice(0, compact ? 2 : 3).map((event, idx) => (
                            <div
                              key={`${event.id}-${idx}`}
                              onClick={() => {
                                setSelectedEvent(event);
                                onEventClick?.(event);
                              }}
                              className={`
                                rounded px-1 sm:px-2 py-0.5 sm:py-1 truncate cursor-pointer
                                transition-opacity hover:opacity-75
                                ${eventSizeClass}
                                text-white font-medium
                              `}
                              style={{ backgroundColor: getEventColor(event) }}
                              title={event.title}
                            >
                              {event.title}
                            </div>
                          ))}

                          {/* "더보기" 배지 */}
                          {dayEvents.length > (compact ? 2 : 3) && (
                            <div
                              className={`
                                text-center rounded
                                ${textSizeClass}
                                ${theme === 'dark' ? 'text-gray-400 bg-gray-700' : 'text-gray-600 bg-gray-200'}
                              `}
                            >
                              +{dayEvents.length - (compact ? 2 : 3)}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
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
