import { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarEvent, UserCalendarPreferences } from '../types';
import { api } from '../lib/api';
import {
  getMonthRange,
  expandRecurrences,
  getLocalDateTimeWithTimezone
} from '../lib/dateUtils';
import { supabase } from '../lib/supabase';

interface UseCalendarEventsOptions {
  yearMonth?: string; // 'YYYY-MM'
  isShared?: boolean;
}

interface UseCalendarEventsReturn {
  events: CalendarEvent[];
  expandedEvents: CalendarEvent[]; // 반복 규칙이 적용된 전개된 이벤트들
  preferences: UserCalendarPreferences | null;
  loading: boolean;
  error: Error | null;
  refreshEvents: () => Promise<void>;
  createEvent: (eventData: any) => Promise<CalendarEvent | null>;
  updateEvent: (id: string, eventData: any) => Promise<CalendarEvent | null>;
  deleteEvent: (id: string) => Promise<void>;
  updatePreferences: (preferences: any) => Promise<UserCalendarPreferences | null>;
}

/**
 * 캘린더 이벤트 및 사용자 선호도를 관리하는 커스텀 훅
 *
 * 기능:
 * - 월별 이벤트 조회 (공유 여부 필터링)
 * - 반복 규칙(RRULE) 기반 이벤트 전개
 * - Supabase 실시간 구독
 * - CRUD 작업
 * - 사용자 선호도 관리
 */
export function useCalendarEvents(
  options: UseCalendarEventsOptions = {}
): UseCalendarEventsReturn {
  const { yearMonth = new Date().toISOString().slice(0, 7), isShared = false } = options;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<CalendarEvent[]>([]);
  const [preferences, setPreferences] = useState<UserCalendarPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Realtime 구독 유지
  const subscriptionRef = useRef<any>(null);

  // 반복 이벤트 전개 (RRULE 적용)
  const expandRecurringEvents = useCallback((rawEvents: CalendarEvent[]): CalendarEvent[] => {
    const monthRange = getMonthRange(yearMonth);
    if (!monthRange) return rawEvents;

    const expanded: CalendarEvent[] = [];

    for (const event of rawEvents) {
      if (event.recurrenceRule) {
        // RRULE이 있는 경우 반복 전개
        const occurrences = expandRecurrences(
          event.startAt,
          event.recurrenceRule,
          monthRange.startAt,
          monthRange.endAt
        );

        // 각 발생에 대해 이벤트 생성 (ID는 고유하게 생성)
        for (const startAt of occurrences) {
          const eventDuration = new Date(event.endAt).getTime() - new Date(event.startAt).getTime();
          const endAt = new Date(new Date(startAt).getTime() + eventDuration).toISOString();

          expanded.push({
            ...event,
            // 원본 ID + 발생 시간으로 고유 ID 생성 (UI에서 구분용)
            id: `${event.id}-${startAt}`,
            startAt,
            endAt,
            // 원본 ID 유지 (수정/삭제 시 사용)
            createdBy: event.createdBy // 이후 원본 이벤트 ID로 매핑될 때 사용
          });
        }
      } else {
        // RRULE이 없으면 그냥 추가
        const monthRange = getMonthRange(yearMonth);
        if (monthRange) {
          const startTime = new Date(event.startAt).getTime();
          const monthStart = new Date(monthRange.startAt).getTime();
          const monthEnd = new Date(monthRange.endAt).getTime();

          // 월 범위에 속하는 이벤트만 추가
          if (startTime >= monthStart && startTime <= monthEnd) {
            expanded.push(event);
          }
        }
      }
    }

    return expanded;
  }, [yearMonth]);

  // 이벤트 및 선호도 로드
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const monthRange = getMonthRange(yearMonth);
      if (!monthRange) {
        throw new Error('Invalid year-month format');
      }

      // 이벤트 조회 (공유 여부에 따라)
      const fetchedEvents = await api.getCalendarEvents({
        from_date: monthRange.startAt,
        to_date: monthRange.endAt,
        is_shared: isShared ? true : undefined
      });

      setEvents(fetchedEvents || []);

      // 반복 이벤트 전개
      if (fetchedEvents) {
        const expanded = expandRecurringEvents(fetchedEvents);
        setExpandedEvents(expanded);
      }

      // 사용자 선호도 조회 (로그인한 경우만)
      try {
        const userPrefs = await api.getUserCalendarPreferences();
        setPreferences(userPrefs);
      } catch (err) {
        // 선호도 조회 실패는 무시 (선택적)
        console.warn('Failed to fetch calendar preferences:', err);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load calendar data');
      setError(error);
      console.error('[useCalendarEvents] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [yearMonth, isShared, expandRecurringEvents]);

  // 초기 로드 및 Realtime 구독
  useEffect(() => {
    fetchData();

    // Supabase Realtime 구독 (calendar_events 변경 감지)
    const subscription = supabase
      .channel('calendar_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events'
        },
        (payload: any) => {
          console.log('[useCalendarEvents] Realtime update:', payload);
          // 데이터 다시 로드
          fetchData();
        }
      )
      .subscribe((status) => {
        console.log('[useCalendarEvents] Subscription status:', status);
      });

    subscriptionRef.current = subscription;

    return () => {
      // 언마운트 시 구독 해제
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [fetchData]);

  // CRUD 작업들
  const createEvent = useCallback(async (eventData: any): Promise<CalendarEvent | null> => {
    try {
      const newEvent = await api.createCalendarEvent(eventData);
      if (newEvent) {
        // 로컬 상태 업데이트
        setEvents((prev) => [...prev, newEvent]);
        const expanded = expandRecurringEvents([...events, newEvent]);
        setExpandedEvents(expanded);
      }
      return newEvent;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create event');
      setError(error);
      throw error;
    }
  }, [events, expandRecurringEvents]);

  const updateEvent = useCallback(async (id: string, eventData: any): Promise<CalendarEvent | null> => {
    try {
      const updated = await api.updateCalendarEvent(id, eventData);
      if (updated) {
        // 로컬 상태 업데이트
        setEvents((prev) =>
          prev.map((e) => (e.id === id ? updated : e))
        );
        const expanded = expandRecurringEvents(events.map((e) => (e.id === id ? updated : e)));
        setExpandedEvents(expanded);
      }
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update event');
      setError(error);
      throw error;
    }
  }, [events, expandRecurringEvents]);

  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    try {
      await api.deleteCalendarEvent(id);
      // 로컬 상태 업데이트
      setEvents((prev) => prev.filter((e) => e.id !== id));
      const expanded = expandRecurringEvents(events.filter((e) => e.id !== id));
      setExpandedEvents(expanded);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete event');
      setError(error);
      throw error;
    }
  }, [events, expandRecurringEvents]);

  const updatePreferences = useCallback(async (prefs: any): Promise<UserCalendarPreferences | null> => {
    try {
      const updated = await api.updateUserCalendarPreferences(prefs);
      if (updated) {
        setPreferences(updated);
      }
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update preferences');
      setError(error);
      throw error;
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    events,
    expandedEvents,
    preferences,
    loading,
    error,
    refreshEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    updatePreferences
  };
}
