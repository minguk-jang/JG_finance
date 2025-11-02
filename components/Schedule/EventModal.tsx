import React, { useState, useEffect } from 'react';
import { CalendarEvent, CALENDAR_COLOR_PALETTES } from '../../types';
import { api } from '../../lib/api';
import { getLocalDateTimeWithTimezone, parseCalendarDateTime, getLocalDateString } from '../../lib/dateUtils';

interface EventModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  currentDate: Date;
}

type RecurrenceFreq = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

const EventModal: React.FC<EventModalProps> = ({
  event,
  onClose,
  onSave,
  onDelete,
  currentDate
}) => {
  // 안전한 기본 날짜값 (하드코딩)
  const safeDefaultDate = getLocalDateString(new Date());

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startDate: safeDefaultDate,
    startTime: '09:00',
    endDate: safeDefaultDate,
    endTime: '10:00',
    isAllDay: false,
    isShared: false,
    colorOverride: null as string | null,
    recurrenceFreq: 'NONE' as RecurrenceFreq,
    recurrenceInterval: 1,
    recurrenceEndDate: '',
    reminders: [] as Array<{ minutesBefore: number; method: 'in_app' | 'push' | 'email' }>
  });

  const [showReminders, setShowReminders] = useState(false);
  const [userColors, setUserColors] = useState<{ personalColor: string; sharedColor: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user color preferences
  useEffect(() => {
    const loadUserColors = async () => {
      try {
        const colors = await api.getUserColorPreferences();
        setUserColors({
          personalColor: colors.personalColor,
          sharedColor: colors.sharedColor
        });
      } catch (err) {
        console.error('Failed to load user colors:', err);
        // Use default colors if failed
        setUserColors({
          personalColor: '#0ea5e9',
          sharedColor: '#ec4899'
        });
      }
    };
    loadUserColors();
  }, []);

  // Initialize form with event data
  useEffect(() => {
    if (event) {
      const startDate = parseCalendarDateTime(event.startAt);
      const endDate = parseCalendarDateTime(event.endAt);

      if (startDate && endDate) {
        const startDateStr = getLocalDateString(startDate);
        const endDateStr = getLocalDateString(endDate);
        const startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
        const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

        // Parse recurrence
        let recurrenceFreq: RecurrenceFreq = 'NONE';
        let recurrenceEndDate = '';

        if (event.recurrenceRule) {
          if (event.recurrenceRule.includes('FREQ=DAILY')) recurrenceFreq = 'DAILY';
          else if (event.recurrenceRule.includes('FREQ=WEEKLY')) recurrenceFreq = 'WEEKLY';
          else if (event.recurrenceRule.includes('FREQ=MONTHLY')) recurrenceFreq = 'MONTHLY';
          else if (event.recurrenceRule.includes('FREQ=YEARLY')) recurrenceFreq = 'YEARLY';

          // Extract UNTIL date if present
          const untilMatch = event.recurrenceRule.match(/UNTIL=([^;]*)/);
          if (untilMatch) {
            const untilDate = parseCalendarDateTime(untilMatch[1]);
            if (untilDate) {
              recurrenceEndDate = getLocalDateString(untilDate);
            }
          }
        }

        const hasReminders = event.reminders && event.reminders.length > 0;
        setFormData({
          title: event.title,
          description: event.description || '',
          location: event.location || '',
          startDate: startDateStr,
          startTime: startTimeStr,
          endDate: endDateStr,
          endTime: endTimeStr,
          isAllDay: event.isAllDay,
          isShared: event.isShared,
          colorOverride: event.colorOverride,
          recurrenceFreq,
          recurrenceInterval: 1,
          recurrenceEndDate,
          reminders: event.reminders || []
        });
        setShowReminders(hasReminders);
      }
    } else {
      // New event - set default dates (robust against invalid dates)
      try {
        let dateToUse = new Date();

        // currentDate 유효성 검증
        if (currentDate && currentDate instanceof Date) {
          const timeValue = currentDate.getTime();
          if (!isNaN(timeValue) && timeValue > 0) {
            dateToUse = currentDate;
          } else {
            console.warn('Invalid currentDate detected:', currentDate, 'using fallback');
          }
        }

        const dateStr = getLocalDateString(dateToUse);

        // 날짜 문자열 검증
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || dateStr.includes('NaN')) {
          throw new Error('Invalid date string format: ' + dateStr);
        }

        setFormData((prev) => ({
          ...prev,
          title: '',
          description: '',
          location: '',
          startDate: dateStr,
          endDate: dateStr,
          startTime: '09:00',
          endTime: '10:00',
          isAllDay: false,
          isShared: false,
          colorOverride: null,
          recurrenceFreq: 'NONE',
          recurrenceInterval: 1,
          recurrenceEndDate: '',
          reminders: []
        }));
      } catch (err) {
        console.error('Error setting default dates:', err);
        const safeDateStr = getLocalDateString(new Date());
        setFormData((prev) => ({
          ...prev,
          title: '',
          description: '',
          location: '',
          startDate: safeDateStr,
          endDate: safeDateStr,
          startTime: '09:00',
          endTime: '10:00',
          isAllDay: false,
          isShared: false,
          colorOverride: null,
          recurrenceFreq: 'NONE',
          recurrenceInterval: 1,
          recurrenceEndDate: '',
          reminders: []
        }));
      }
      setShowReminders(false);
    }
  }, [event, currentDate]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleReminderChange = (index: number, field: string, value: any) => {
    const newReminders = [...formData.reminders];
    newReminders[index] = { ...newReminders[index], [field]: value };
    setFormData((prev) => ({
      ...prev,
      reminders: newReminders
    }));
  };

  const handleAddReminder = () => {
    setFormData((prev) => ({
      ...prev,
      reminders: [...prev.reminders, { minutesBefore: 30, method: 'in_app' }]
    }));
  };

  const handleRemoveReminder = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((_, i) => i !== index)
    }));
  };

  const buildRecurrenceRule = (): string | null => {
    if (formData.recurrenceFreq === 'NONE') {
      return null;
    }

    let rrule = `FREQ=${formData.recurrenceFreq}`;

    if (formData.recurrenceInterval > 1) {
      rrule += `;INTERVAL=${formData.recurrenceInterval}`;
    }

    if (formData.recurrenceEndDate) {
      const endDate = parseCalendarDateTime(formData.recurrenceEndDate);
      if (endDate) {
        const untilStr = getLocalDateTimeWithTimezone(endDate).replace(/\D/g, '').slice(0, 8);
        rrule += `;UNTIL=${untilStr}T235959Z`;
      }
    }

    return rrule;
  };

  // 취소 핸들러 - 상태 초기화
  const handleCancel = () => {
    const safeDate = getLocalDateString(new Date());
    setFormData({
      title: '',
      description: '',
      location: '',
      startDate: safeDate,
      startTime: '09:00',
      endDate: safeDate,
      endTime: '10:00',
      isAllDay: false,
      isShared: false,
      colorOverride: null,
      recurrenceFreq: 'NONE',
      recurrenceInterval: 1,
      recurrenceEndDate: '',
      reminders: []
    });
    setError(null);
    setSaving(false);
    onClose();
  };

  const handleSave = async () => {
    try {
      setError(null);
      setSaving(true);

      if (!formData.title.trim()) {
        setError('제목을 입력해주세요');
        return;
      }

      if (!formData.startDate || !formData.endDate) {
        setError('날짜를 지정해주세요');
        return;
      }

      // Build start and end times - parse as local datetime
      const [startYear, startMonth, startDay] = formData.startDate.split('-').map(Number);
      const [startHour, startMinute] = formData.startTime.split(':').map(Number);

      const [endYear, endMonth, endDay] = formData.endDate.split('-').map(Number);
      const [endHour, endMinute] = formData.endTime.split(':').map(Number);

      const startDate = new Date(startYear, startMonth - 1, startDay, startHour, startMinute, 0);
      const endDate = new Date(endYear, endMonth - 1, endDay, endHour, endMinute, 0);

      const startAt = getLocalDateTimeWithTimezone(startDate, 'Asia/Seoul');
      const endAt = getLocalDateTimeWithTimezone(endDate, 'Asia/Seoul');

      // Save event with optional custom color override
      const eventData = {
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        startAt,
        endAt,
        isAllDay: formData.isAllDay,
        isShared: formData.isShared,
        colorOverride: formData.colorOverride || null, // Use custom color if set, otherwise use user preference colors
        recurrenceRule: buildRecurrenceRule(),
        reminders: formData.reminders
      };

      if (event) {
        // Update existing event
        await api.updateCalendarEvent(event.id, eventData);
      } else {
        // Create new event
        await api.createCalendarEvent(eventData);
      }

      onSave();
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    if (!confirm('이 일정을 삭제하시겠습니까?')) {
      return;
    }

    try {
      setSaving(true);
      await api.deleteCalendarEvent(event.id);
      onDelete();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 sm:p-6 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold">
            {event ? '일정 수정' : '새 일정'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-200 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Title & Share Toggle */}
          <div>
            <div className="flex items-end gap-4 mb-2">
              <label className="block text-sm font-medium text-gray-300">제목</label>
              <div className="flex items-center gap-2 ml-auto">
                <span className={`text-xs font-medium ${formData.isShared ? 'text-gray-400' : 'text-green-400'}`}>
                  개인
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="shared"
                    checked={formData.isShared}
                    onChange={(e) => handleChange('isShared', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
                <span className={`text-xs font-medium ${formData.isShared ? 'text-green-400' : 'text-gray-400'}`}>
                  공용
                </span>
              </div>
            </div>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 outline-none transition"
              placeholder="일정 제목을 입력하세요"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 outline-none transition resize-none h-24"
              placeholder="설명을 입력하세요"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">장소</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 outline-none transition"
              placeholder="장소를 입력하세요"
            />
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            {/* Start Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">시작 날짜</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 outline-none transition"
                />
              </div>
              {!formData.isAllDay && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">시작 시간</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 outline-none transition"
                  />
                </div>
              )}
            </div>

            {/* End Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">종료 날짜</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 outline-none transition"
                />
              </div>
              {!formData.isAllDay && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">종료 시간</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 outline-none transition"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">일정 색상</label>
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-2">
              {/* No Color (Default) */}
              <button
                type="button"
                onClick={() => handleChange('colorOverride', null)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  formData.colorOverride === null
                    ? 'border-sky-400 ring-2 ring-sky-400/50'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                title="사용자 기본 색상"
              >
                <div className="text-xs text-gray-400 font-medium">자동</div>
              </button>
              {/* Color Palette Options */}
              {Object.values(CALENDAR_COLOR_PALETTES)
                .filter((palette) => palette.key !== 'custom')
                .map((palette) => (
                  <button
                    key={palette.key}
                    type="button"
                    onClick={() => handleChange('colorOverride', palette.hex)}
                    className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                      formData.colorOverride === palette.hex
                        ? 'border-white ring-2 ring-white/50'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: palette.hex }}
                    title={palette.name}
                  />
                ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {formData.colorOverride ? '선택한 색상으로 표시됩니다' : '사용자 선호도에 따라 색상이 자동 결정됩니다'}
            </p>
          </div>

          {/* All Day Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={formData.isAllDay}
              onChange={(e) => handleChange('isAllDay', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-sky-600 focus:ring-2 focus:ring-sky-500/30 cursor-pointer"
            />
            <label htmlFor="allDay" className="text-sm text-gray-300 cursor-pointer">
              하루 종일
            </label>
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">반복</label>
            <select
              value={formData.recurrenceFreq}
              onChange={(e) => handleChange('recurrenceFreq', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 outline-none transition"
            >
              <option value="NONE">반복 없음</option>
              <option value="DAILY">매일</option>
              <option value="WEEKLY">매주</option>
              <option value="MONTHLY">매월</option>
              <option value="YEARLY">매년</option>
            </select>
          </div>

          {formData.recurrenceFreq !== 'NONE' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">반복 종료 날짜</label>
              <input
                type="date"
                value={formData.recurrenceEndDate}
                onChange={(e) => handleChange('recurrenceEndDate', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 outline-none transition"
                placeholder="날짜를 선택하지 않으면 계속 반복됩니다"
              />
            </div>
          )}

          {/* Reminders */}
          <div>
            <button
              type="button"
              onClick={() => {
                const newShowReminders = !showReminders;
                setShowReminders(newShowReminders);
                if (newShowReminders && formData.reminders.length === 0) {
                  setFormData(prev => ({
                    ...prev,
                    reminders: [{ minutesBefore: 15, method: 'in_app' }]
                  }));
                }
              }}
              className="w-full flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors"
            >
              <span className="text-sm font-medium text-gray-300">리마인더</span>
              <div className="flex items-center gap-2">
                {formData.reminders.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {formData.reminders.length}개 설정됨
                  </span>
                )}
                <span className={`text-gray-400 transition-transform ${showReminders ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </button>

            {showReminders && (
              <div className="mt-2 space-y-2 p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                {formData.reminders.map((reminder, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="number"
                      value={reminder.minutesBefore}
                      onChange={(e) => handleReminderChange(index, 'minutesBefore', parseInt(e.target.value))}
                      className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:border-sky-500 outline-none"
                      min="1"
                    />
                    <span className="text-sm text-gray-400">분 전</span>
                    <select
                      value={reminder.method}
                      onChange={(e) => handleReminderChange(index, 'method', e.target.value)}
                      className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:border-sky-500 outline-none text-sm"
                    >
                      <option value="in_app">앱 내 알림</option>
                      <option value="push">푸시 알림</option>
                      <option value="email">이메일</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveReminder(index)}
                      className="px-2 py-1 text-red-400 hover:text-red-300 transition-colors text-sm"
                    >
                      제거
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddReminder}
                  className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
                >
                  + 리마인더 추가
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-4 sm:p-6 flex items-center justify-between gap-3">
          {event && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              삭제
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
