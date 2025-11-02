import React, { useState, useEffect, useMemo } from 'react';
import { CalendarEvent, UserCalendarPreferences, UserColorPreferences } from '../../types';
import Card from '../ui/Card';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { getMonthRange, getWeekRange, getLocalDateTimeWithTimezone, parseCalendarDateTime, expandRecurrences, getLocalDateString, isValidRRule } from '../../lib/dateUtils';
import EventModal from './EventModal';
import EventDetailsModal from './EventDetailsModal';
import './Schedule.css';

interface ScheduleProps {
  // Props可以在这里定义（如果需要）
}

type ViewMode = 'month' | 'week';

const Schedule: React.FC<ScheduleProps> = () => {
  const { user, profile, canEdit } = useAuth();
  const isAdmin = profile?.role === 'Admin';

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [preferences, setPreferences] = useState<UserCalendarPreferences | null>(null);
  const [colorPreferences, setColorPreferences] = useState<UserColorPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Get year and month for display (with safety check)
  const year = useMemo(() => {
    const y = currentDate.getFullYear();
    return isNaN(y) ? new Date().getFullYear() : y;
  }, [currentDate]);

  const month = useMemo(() => {
    const m = currentDate.getMonth();
    return isNaN(m) ? new Date().getMonth() : m;
  }, [currentDate]);

  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Get date range based on view mode
  const getDateRange = useMemo(() => {
    if (viewMode === 'month') {
      return getMonthRange(yearMonth);
    } else {
      return getWeekRange(currentDate);
    }
  }, [viewMode, yearMonth, currentDate]);

  // Fetch events and preferences
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Get user preferences
        const prefs = await api.getUserCalendarPreferences();
        setPreferences(prefs);

        // Get user color preferences
        const colorPrefs = await api.getUserColorPreferences();
        setColorPreferences(colorPrefs);

        // Get events for the current month/week
        if (getDateRange) {
          const eventsData = await api.getCalendarEvents({
            from_date: getDateRange.startAt,
            to_date: getDateRange.endAt
          });
          setEvents(eventsData);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, getDateRange]);

  // Generate expanded events (handling recurrences)
  const expandedEvents = useMemo(() => {
    if (!getDateRange) return [];

    const expanded: (CalendarEvent & { originalId: string; occurrenceDate: string })[] = [];

    for (const event of events) {
      // 표시 권한: Admin이거나, 공유된 이벤트이거나, 자신이 생성한 개인 일정
      const canViewEvent = isAdmin || event.isShared || event.createdBy === user?.id;

      if (canViewEvent) {
        const occurrenceDates = expandRecurrences(
          event.startAt,
          event.recurrenceRule,
          getDateRange.startAt,
          getDateRange.endAt
        );

        for (const occurrenceDate of occurrenceDates) {
          const occurrenceDateTime = parseCalendarDateTime(occurrenceDate);
          if (occurrenceDateTime) {
            expanded.push({
              ...event,
              originalId: event.id,
              occurrenceDate: occurrenceDate
            });
          }
        }
      }
    }

    return expanded;
  }, [events, getDateRange, isAdmin, user?.id]);

  // Generate calendar grid (for month view)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const days: (number | null)[] = [];

    // Fill empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Fill days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [year, month]);

  // Split calendar into weeks
  const calendarWeeks = useMemo(() => {
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    return weeks;
  }, [calendarDays]);

  // Calculate event positions for each week
  interface EventPosition {
    event: CalendarEvent & { originalId: string; occurrenceDate: string };
    dayIndex: number;  // 0-6 (Sun-Sat)
    span: number;      // How many days this event spans in this week
    row: number;       // Which row in the week (for overlapping events)
  }

  const getWeekEventPositions = (weekDays: (number | null)[]): EventPosition[][] => {
    const positions: EventPosition[] = [];

    // For each day in the week
    weekDays.forEach((day, dayIndex) => {
      if (!day) return;

      const currentDate = new Date(year, month, day, 0, 0, 0);

      // Find events that start on this day
      expandedEvents.forEach((event) => {
        const eventStart = new Date(event.startAt);
        const eventEnd = new Date(event.endAt);

        // Check if event starts on this day
        if (
          eventStart.getFullYear() === year &&
          eventStart.getMonth() === month &&
          eventStart.getDate() === day
        ) {
          // Calculate span (how many days in this week)
          let span = 1;
          const endDay = eventEnd.getDate();
          const endMonth = eventEnd.getMonth();
          const endYear = eventEnd.getFullYear();

          // Calculate how many days this event spans in this week
          for (let i = dayIndex + 1; i < 7; i++) {
            const nextDay = weekDays[i];
            if (!nextDay) break;

            const checkDate = new Date(year, month, nextDay, 0, 0, 0);
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
            row: 0 // Will be calculated next
          });
        }
      });
    });

    // Sort by dayIndex, then by span (longer events first)
    positions.sort((a, b) => {
      if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
      return b.span - a.span;
    });

    // Assign rows to avoid overlaps
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

  // Handle navigation
  const handlePrevMonth = () => {
    // year, month 유효성 검증
    const safeYear = isNaN(year) ? new Date().getFullYear() : year;
    const safeMonth = isNaN(month) ? new Date().getMonth() : month;
    const newDate = new Date(safeYear, safeMonth - 1, 1);

    if (!isNaN(newDate.getTime())) {
      setCurrentDate(newDate);
    } else {
      console.error('Failed to create previous month date, using current date');
      setCurrentDate(new Date());
    }
  };

  const handleNextMonth = () => {
    // year, month 유효성 검증
    const safeYear = isNaN(year) ? new Date().getFullYear() : year;
    const safeMonth = isNaN(month) ? new Date().getMonth() : month;
    const newDate = new Date(safeYear, safeMonth + 1, 1);

    if (!isNaN(newDate.getTime())) {
      setCurrentDate(newDate);
    } else {
      console.error('Failed to create next month date, using current date');
      setCurrentDate(new Date());
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Handle event actions
  const handleCreateEvent = (day?: number) => {
    setEditingEvent(null);
    // 특정 날짜가 전달되면 그 날짜를 선택
    if (day) {
      // year, month 유효성 검증
      const safeYear = isNaN(year) ? new Date().getFullYear() : year;
      const safeMonth = isNaN(month) ? new Date().getMonth() : month;
      const selectedDate = new Date(safeYear, safeMonth, day);

      // 생성된 날짜 유효성 검증
      if (!isNaN(selectedDate.getTime())) {
        setCurrentDate(selectedDate);
      } else {
        console.error('Failed to create valid date, using current date');
        setCurrentDate(new Date());
      }

      // 상태 업데이트 완료 후 모달 표시
      setTimeout(() => {
        setShowEventModal(true);
      }, 0);
    } else {
      // currentDate가 유효하지 않으면 현재 날짜로 리셋
      if (isNaN(currentDate.getTime())) {
        setCurrentDate(new Date());
      }
      setShowEventModal(true);
    }
  };

  const handleEditEvent = (event: CalendarEvent & { occurrenceDate: string }) => {
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleViewEvent = (event: CalendarEvent & { occurrenceDate: string }) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  const handleEventSaved = async () => {
    setShowEventModal(false);
    // Reload events
    if (getDateRange) {
      try {
        const eventsData = await api.getCalendarEvents({
          from_date: getDateRange.startAt,
          to_date: getDateRange.endAt
        });
        setEvents(eventsData);
      } catch (err) {
        console.error('Failed to reload events:', err);
      }
    }
  };

  const handleEventDeleted = async () => {
    setShowEventModal(false);
    // Reload events
    if (getDateRange) {
      try {
        const eventsData = await api.getCalendarEvents({
          from_date: getDateRange.startAt,
          to_date: getDateRange.endAt
        });
        setEvents(eventsData);
      } catch (err) {
        console.error('Failed to reload events:', err);
      }
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });

  return (
    <div className="schedule-container p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">일정</h1>
          {isAdmin && (
            <button
              onClick={handleCreateEvent}
              className="hidden sm:block px-3 sm:px-4 py-1.5 sm:py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs sm:text-sm transition-colors font-medium"
            >
              + 새 일정
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('month')}
            className={`px-2 sm:px-4 py-1 sm:py-2 rounded text-xs sm:text-base font-medium transition-colors ${
              viewMode === 'month'
                ? 'bg-sky-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            월
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-2 sm:px-4 py-1 sm:py-2 rounded text-xs sm:text-base font-medium transition-colors ${
              viewMode === 'week'
                ? 'bg-sky-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            주
          </button>
        </div>
      </div>

      {/* Mobile Create Button */}
      {isAdmin && (
        <button
          onClick={handleCreateEvent}
          className="sm:hidden w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + 새 일정
        </button>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-6 bg-gray-800/50 p-2 sm:p-4 rounded-lg">
        <button
          onClick={handlePrevMonth}
          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs sm:text-sm transition-colors font-medium"
        >
          &larr;
        </button>
        <div className="text-center flex-1 min-w-0">
          <p className="text-sm sm:text-base font-semibold truncate">
            {monthName} {year}
          </p>
        </div>
        <button
          onClick={handleToday}
          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs sm:text-sm transition-colors font-medium whitespace-nowrap"
        >
          <span className="hidden sm:inline">오늘</span>
          <span className="sm:hidden">오</span>
        </button>
        <button
          onClick={handleNextMonth}
          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs sm:text-sm transition-colors font-medium"
        >
          &rarr;
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-400">로드 중...</div>
        </div>
      )}

      {/* Calendar View */}
      {!loading && viewMode === 'month' && (
        <Card className="p-2 sm:p-4 md:p-6">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-gray-400 text-xs sm:text-sm py-1 sm:py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid - Week by week */}
          <div className="space-y-1">
            {calendarWeeks.map((weekDays, weekIndex) => {
              const eventRows = getWeekEventPositions(weekDays);
              const maxRows = Math.max(eventRows.length, 1);

              return (
                <div key={weekIndex} className="relative">
                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2" style={{ minHeight: `${80 + maxRows * 28}px` }}>
                    {weekDays.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={`relative p-1 sm:p-2 rounded border text-xs sm:text-sm cursor-pointer transition-all ${
                          day === null
                            ? 'bg-gray-900/50 border-gray-800'
                            : day === new Date().getDate() &&
                              month === new Date().getMonth() &&
                              year === new Date().getFullYear()
                            ? 'bg-blue-900/30 border-blue-600 hover:bg-blue-900/50'
                            : 'bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-600'
                        }`}
                        onClick={() => day && isAdmin && handleCreateEvent(day)}
                      >
                        {day && (
                          <div className="text-xs sm:text-sm font-semibold text-gray-300 mb-0.5 sm:mb-1 relative z-10">
                            {day}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Event bars overlay */}
                  <div className="absolute top-0 left-0 right-0 grid grid-cols-7 gap-1 sm:gap-2 pointer-events-none" style={{ paddingTop: '32px' }}>
                    {eventRows.map((row, rowIndex) => (
                      <React.Fragment key={rowIndex}>
                        {row.map((pos) => {
                          const backgroundColor = pos.event.colorOverride ||
                            (pos.event.isShared
                              ? (colorPreferences?.sharedColor || '#ec4899')
                              : (colorPreferences?.personalColor || '#0ea5e9'));

                          return (
                            <div
                              key={`${pos.event.originalId}-${pos.dayIndex}`}
                              className="text-xs px-2 py-1 rounded-md cursor-pointer truncate shadow-sm hover:shadow-md transition-all pointer-events-auto font-medium"
                              style={{
                                backgroundColor,
                                opacity: 0.9,
                                gridColumn: `${pos.dayIndex + 1} / span ${pos.span}`,
                                gridRow: rowIndex + 1,
                                marginTop: `${rowIndex * 28}px`,
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                color: '#fff',
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                (isAdmin && pos.event.createdBy === user?.id) ? handleEditEvent(pos.event) : handleViewEvent(pos.event);
                              }}
                              title={pos.event.title}
                            >
                              <span className="truncate">
                                {pos.event.title}
                                {pos.event.recurrenceRule && <span className="ml-1">↻</span>}
                              </span>
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
        </Card>
      )}

      {/* Week View - Placeholder */}
      {!loading && viewMode === 'week' && (
        <Card>
          <div className="text-center py-8 text-gray-400">
            주간 뷰는 개발 중입니다.
          </div>
        </Card>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          key={editingEvent ? `edit-${editingEvent.id}` : `new-${Date.now()}`}
          event={editingEvent}
          onClose={() => setShowEventModal(false)}
          onSave={handleEventSaved}
          onDelete={handleEventDeleted}
          currentDate={currentDate}
        />
      )}

      {/* Event Details Modal */}
      {showDetailsModal && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setShowDetailsModal(false)}
          onEdit={handleEditEvent}
          isOwner={isAdmin && selectedEvent.createdBy === user?.id}
          colorPreferences={colorPreferences}
        />
      )}
    </div>
  );
};

export default Schedule;
