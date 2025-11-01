import React from 'react';
import { CalendarEvent, UserColorPreferences } from '../../types';
import { parseCalendarDateTime, getLocalDateString } from '../../lib/dateUtils';

interface EventDetailsModalProps {
  event: CalendarEvent & { occurrenceDate: string };
  onClose: () => void;
  onEdit: (event: CalendarEvent & { occurrenceDate: string }) => void;
  isOwner: boolean;
  colorPreferences: UserColorPreferences | null;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  onClose,
  onEdit,
  isOwner,
  colorPreferences
}) => {
  const startDate = parseCalendarDateTime(event.startAt);
  const endDate = parseCalendarDateTime(event.endAt);

  const formatDateTime = (date: Date | null) => {
    if (!date) return 'N/A';

    const dateStr = date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (event.isAllDay) {
      return dateStr;
    }

    const timeStr = date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${dateStr} ${timeStr}`;
  };

  const getReminderText = (minutesBefore: number): string => {
    if (minutesBefore === 0) return '시작 시간에';
    if (minutesBefore < 60) return `${minutesBefore}분 전에`;
    if (minutesBefore === 60) return '1시간 전에';
    if (minutesBefore < 1440) {
      const hours = Math.floor(minutesBefore / 60);
      return `${hours}시간 전에`;
    }
    const days = Math.floor(minutesBefore / 1440);
    return `${days}일 전에`;
  };

  const getMethodText = (method: string): string => {
    switch (method) {
      case 'in_app': return '앱 내 알림';
      case 'push': return '푸시 알림';
      case 'email': return '이메일';
      default: return method;
    }
  };

  // Determine color based on isShared and user preferences
  const backgroundColor = event.colorOverride ||
    (event.isShared
      ? (colorPreferences?.sharedColor || '#ec4899')
      : (colorPreferences?.personalColor || '#0ea5e9'));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header with color bar */}
        <div
          className="h-2"
          style={{ backgroundColor }}
        />

        {/* Close button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title and badges */}
          <div className="pr-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{event.title}</h2>
            <div className="flex flex-wrap gap-2">
              {event.recurrenceRule && (
                <span className="inline-block px-2 py-1 bg-sky-500/20 text-sky-400 rounded text-xs font-medium">
                  ↻ 반복됨
                </span>
              )}
              {event.isShared && (
                <span className="inline-block px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                  🔗 공유됨
                </span>
              )}
              {event.isAllDay && (
                <span className="inline-block px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
                  하루 종일
                </span>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-1">날짜 및 시간</h3>
            <p className="text-base text-gray-200">
              {formatDateTime(startDate)}
              {endDate && startDate?.toDateString() !== endDate.toDateString() && (
                <> ~ {formatDateTime(endDate)}</>
              )}
            </p>
          </div>

          {/* Location */}
          {event.location && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">장소</h3>
              <p className="text-base text-gray-200">{event.location}</p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">설명</h3>
              <p className="text-base text-gray-200 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Recurrence details */}
          {event.recurrenceRule && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">반복 규칙</h3>
              <p className="text-base text-gray-200 font-mono text-xs bg-gray-900 p-2 rounded">
                {event.recurrenceRule}
              </p>
            </div>
          )}

          {/* Reminders */}
          {event.reminders && event.reminders.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">리마인더</h3>
              <ul className="space-y-1">
                {event.reminders.map((reminder, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-center gap-2">
                    <span className="text-sky-400">🔔</span>
                    {getReminderText(reminder.minutesBefore)} {getMethodText(reminder.method)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div>
                <span className="font-semibold">생성일</span>
                <p>{new Date(event.createdAt).toLocaleDateString('ko-KR')}</p>
              </div>
              <div>
                <span className="font-semibold">수정일</span>
                <p>{new Date(event.updatedAt).toLocaleDateString('ko-KR')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-6 flex items-center justify-between gap-3">
          {isOwner && (
            <button
              onClick={() => onEdit(event)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors"
            >
              수정
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;
