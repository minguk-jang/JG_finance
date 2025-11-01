import React, { useState, useEffect, useMemo } from 'react';
import { CalendarEvent, UserCalendarPreferences } from '../../types';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Get year and month for display
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
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
      if (isAdmin || event.isShared) {
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
  }, [events, getDateRange, isAdmin]);

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

  // Get events for a specific date
  const getEventsForDate = (date: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return expandedEvents.filter((event) => {
      const eventDate = parseCalendarDateTime(event.occurrenceDate);
      if (!eventDate) return false;
      return (
        eventDate.getFullYear() === year &&
        eventDate.getMonth() === month &&
        eventDate.getDate() === date
      );
    });
  };

  // Handle navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Handle event actions
  const handleCreateEvent = (day?: number) => {
    setEditingEvent(null);
    // 특정 날짜가 전달되면 그 날짜를 선택
    if (day) {
      const selectedDate = new Date(year, month, day);
      setCurrentDate(selectedDate);
    }
    setShowEventModal(true);
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

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-16 sm:min-h-20 md:min-h-28 p-1 sm:p-2 rounded border text-xs sm:text-sm cursor-pointer transition-all ${
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
                  <>
                    <div className="text-xs sm:text-sm font-semibold text-gray-300 mb-0.5 sm:mb-1">
                      {day}
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      {getEventsForDate(day).map((event, idx) => {
                        // 설정에서 선택한 색상 또는 기본 색상 사용
                        const backgroundColor = event.colorOverride || preferences?.colorHex || '#0ea5e9';

                        return (
                          <div
                            key={`${event.originalId}-${idx}`}
                            className="text-xs px-1 py-0.5 rounded cursor-pointer truncate line-clamp-2 hover:line-clamp-3 transition-all"
                            style={{
                              backgroundColor,
                              opacity: 0.85
                            }}
                            onClick={(e) => {
                              e.stopPropagation();  // 이벤트 클릭 시 날짜 클릭 핸들러 실행 방지
                              (isAdmin && event.createdBy === user?.id) ? handleEditEvent(event) : handleViewEvent(event);
                            }}
                            title={event.title}
                          >
                            {event.title}
                            {event.recurrenceRule && (
                              <span className="ml-0.5">↻</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ))}
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
        />
      )}
    </div>
  );
};

export default Schedule;
