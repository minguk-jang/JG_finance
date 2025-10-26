import React, { useEffect, useState } from 'react';
import { Note } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import Card from './ui/Card';

const Notes: React.FC = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
    // Delete old notes on mount
    deleteOldNotesIfNeeded();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getNotes();
      setNotes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || '노트를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const deleteOldNotesIfNeeded = async () => {
    try {
      await api.deleteOldNotes();
    } catch (err) {
      console.error('Failed to delete old notes:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      setError('로그인이 필요합니다.');
      return;
    }

    const trimmedValue = inputValue.trim();
    if (!trimmedValue) {
      return;
    }

    try {
      await api.createNote({
        content: trimmedValue,
        isCompleted: false,
        createdBy: user.id,
      });
      setInputValue('');
      await fetchNotes();
    } catch (err: any) {
      setError(err.message || '노트 생성에 실패했습니다.');
    }
  };

  const handleToggleComplete = async (note: Note) => {
    try {
      const now = new Date().toISOString();
      await api.updateNote(note.id, {
        isCompleted: !note.isCompleted,
        completedAt: !note.isCompleted ? now : null,
      });
      await fetchNotes();
    } catch (err: any) {
      setError(err.message || '상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 노트를 삭제하시겠습니까?')) return;

    try {
      await api.deleteNote(id);
      await fetchNotes();
    } catch (err: any) {
      setError(err.message || '삭제에 실패했습니다.');
    }
  };

  const getDaysAgo = (createdAt: string): number => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-100">간단 노트</h1>
        <div className="text-sm text-gray-400">
          완료 후 7일 뒤 자동 삭제
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Input Form */}
      <Card className="p-4">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="장볼거나 공유할 내용 입력 후 엔터..."
              className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 text-gray-100 placeholder-gray-400"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              추가
            </button>
          </div>
        </form>
      </Card>

      {/* Notes List */}
      <div className="space-y-2">
        {notes.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">노트가 없습니다.</p>
            <p className="text-sm text-gray-600 mt-1">위에서 새 노트를 추가해보세요!</p>
          </Card>
        ) : (
          notes.map((note) => {
            const daysAgo = getDaysAgo(note.createdAt);
            const daysUntilDeletion = note.isCompleted && note.completedAt
              ? 7 - getDaysAgo(note.completedAt)
              : null;

            return (
              <Card
                key={note.id}
                className={`p-4 transition-all ${
                  note.isCompleted ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleComplete(note)}
                    className="mt-1 flex-shrink-0"
                  >
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                      note.isCompleted
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-500 hover:border-gray-400'
                    }`}>
                      {note.isCompleted && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-gray-100 ${
                      note.isCompleted ? 'line-through text-gray-500' : ''
                    }`}>
                      {note.content}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{daysAgo === 0 ? '오늘' : `${daysAgo}일 전`}</span>
                      {daysUntilDeletion !== null && daysUntilDeletion >= 0 && (
                        <span className="text-orange-400">
                          🗑️ {daysUntilDeletion}일 후 삭제
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="flex-shrink-0 p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                    title="삭제"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Stats */}
      {notes.length > 0 && (
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-400">{notes.length}</p>
              <p className="text-xs text-gray-500">전체</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {notes.filter(n => !n.isCompleted).length}
              </p>
              <p className="text-xs text-gray-500">미완료</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-400">
                {notes.filter(n => n.isCompleted).length}
              </p>
              <p className="text-xs text-gray-500">완료</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">
                {notes.filter(n => n.isCompleted && n.completedAt && getDaysAgo(n.completedAt) >= 7).length}
              </p>
              <p className="text-xs text-gray-500">삭제 대기</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Notes;
