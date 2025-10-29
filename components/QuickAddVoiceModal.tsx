import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Currency, Category } from '../types';
import { api } from '../lib/api';
import { generateExpenseSuggestion, GeminiExpenseSuggestion } from '../lib/gemini';
import { useAuth } from '../lib/auth';
import { getLocalDateString, isValidDateFormat } from '../lib/dateUtils';

interface QuickAddVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
  theme: 'dark' | 'light';
  onExpenseCreated?: (expense: any) => void;
}

interface ExpenseFormState {
  amount: string;
  categoryId: string;
  date: string;
  memo: string;
}

const INITIAL_FORM_STATE: ExpenseFormState = {
  amount: '',
  categoryId: '',
  date: getLocalDateString(),
  memo: '',
};

const QuickAddVoiceModal: React.FC<QuickAddVoiceModalProps> = ({
  isOpen,
  onClose,
  currency,
  theme,
  onExpenseCreated,
}) => {
  const { user } = useAuth();
  const [transcript, setTranscript] = useState<string>('');
  const [suggestion, setSuggestion] = useState<GeminiExpenseSuggestion | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<ExpenseFormState>(INITIAL_FORM_STATE);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasCreated, setHasCreated] = useState<boolean>(false);
  const isDark = theme === 'dark';

  const modalBgClass = isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900';
  const fieldBgClass = isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900';
  const textareaBgClass = isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-gray-100 border-gray-300 text-gray-900';

  const resetState = useCallback(() => {
    setTranscript('');
    setSuggestion(null);
    setError(null);
    setNotice(null);
    setIsProcessing(false);
    setIsSubmitting(false);
    setHasCreated(false);
    setFormData({
      amount: '',
      categoryId: '',
      date: getLocalDateString(),
      memo: '',
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
      return;
    }

    let mounted = true;
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await api.getCategories();
        if (!mounted) return;
        const expenseCategories = (Array.isArray(data) ? data : []).filter(
          (category) => category.type === 'expense'
        );
        setCategories(expenseCategories);
      } catch (loadError) {
        console.error('Failed to load categories for quick add:', loadError);
        if (mounted) {
          setError('카테고리 목록을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
        }
      } finally {
        if (mounted) {
          setCategoriesLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      mounted = false;
    };
  }, [isOpen, resetState]);

  const matchCategoryId = useCallback(
    (name: string | undefined | null): string | null => {
      if (!name) return null;
      const normalized = name.trim().toLowerCase();
      if (!normalized) return null;
      const exact = categories.find((category) => category.name.trim().toLowerCase() === normalized);
      if (exact) return exact.id;

      const partial = categories.find((category) =>
        category.name.trim().toLowerCase().includes(normalized)
      );
      return partial ? partial.id : null;
    },
    [categories]
  );

  const handleProcessTranscript = useCallback(async () => {
    if (!transcript.trim()) {
      setError('지출 내용을 먼저 입력해주세요.');
      return;
    }

    setError(null);
    setNotice(null);
    setIsProcessing(true);
    try {
      const generated = await generateExpenseSuggestion(transcript.trim(), {
        fallbackCurrency: currency,
        categories: categories.map((category) => category.name),
      });
      setSuggestion(generated);

      const matchedId = matchCategoryId(generated.categoryName);
      setFormData({
        amount: generated.amount.toString(),
        categoryId: matchedId ?? '',
        date: generated.date,
        memo: generated.memo ?? '',
      });

      if (!matchedId) {
        setNotice(`"${generated.categoryName}" 카테고리를 찾을 수 없습니다. 제공된 목록 중에서 직접 선택해주세요.`);
      } else {
        setNotice(null);
      }
      setHasCreated(false);
    } catch (processingError: any) {
      console.error('Failed to process with Gemini:', processingError);
      setError(processingError?.message ?? '지출 정보를 분석하는 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  }, [categories, currency, matchCategoryId, transcript]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);

      if (!user) {
        setError('로그인이 필요합니다.');
        return;
      }

      const amount = parseFloat(formData.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError('금액을 확인해주세요.');
        return;
      }

      const categoryId = formData.categoryId.trim();
      if (!categoryId) {
        setError('카테고리를 선택해주세요.');
        return;
      }

      if (!formData.date) {
        setError('날짜를 입력해주세요.');
        return;
      }

      // 날짜 형식 검증
      if (!isValidDateFormat(formData.date)) {
        setError('유효한 날짜를 선택해주세요.');
        return;
      }

      const payload = {
        category_id: categoryId,
        date: formData.date, // 타임존 변환 없이 그대로 사용
        amount,
        memo: formData.memo,
        // created_by는 api.createExpense에서 자동으로 설정됨
      };

      setIsSubmitting(true);
      try {
        const created = await api.createExpense(payload);
        setHasCreated(true);
        setSuggestion(null);
        setNotice(null);
        onExpenseCreated?.(created);
        setFormData({
          amount: '',
          categoryId: '',
          date: getLocalDateString(),
          memo: '',
        });
        setTranscript('');
      } catch (submitError) {
        console.error('Failed to create expense via quick add:', submitError);
        setError('지출을 저장하는 중 오류가 발생했습니다. 입력값을 확인하고 다시 시도해주세요.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, formData, onExpenseCreated]
  );

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const transcriptPlaceholder = useMemo(() => {
    return [
      '예: 어제 마트에서 장보고 58,000원 사용했어.',
      '또는: 3월 2일 온라인 쇼핑으로 45달러 썼다.',
    ].join('\n');
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[60] px-4">
      <div
        className={`${modalBgClass} w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl border max-h-[90vh] overflow-y-auto ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-600/40 sticky top-0 bg-inherit">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold">지출 빠른 추가</h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              지출 내용을 자유롭게 입력하고 Gemini의 제안을 바탕으로 세부 정보를 확인하세요.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-200 transition flex-shrink-0 ml-4"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {error && <div className="rounded-lg bg-red-500/10 border border-red-500/40 px-4 py-2 text-red-300 text-sm">{error}</div>}
          {notice && !error && (
            <div className="rounded-lg bg-sky-500/10 border border-sky-500/40 px-4 py-2 text-sky-300 text-sm">
              {notice}
            </div>
          )}
          {hasCreated && (
            <div
              className={`rounded-lg border px-4 py-2 text-sm ${
                isDark ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-emerald-300 bg-emerald-50 text-emerald-700'
              }`}
            >
              지출이 성공적으로 추가되었습니다. 계속 추가하려면 텍스트를 입력하고 다시 분석해주세요.
            </div>
          )}

          <div
            className={`rounded-xl border ${
              isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'
            } p-4 sm:p-5 space-y-4`}
          >
            <div className="space-y-2">
              <label htmlFor="quick-add-transcript" className="text-xs sm:text-sm font-medium text-gray-300">
                지출 내용 설명
              </label>
              <textarea
                id="quick-add-transcript"
                rows={4}
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder={transcriptPlaceholder}
                className={`w-full rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                  textareaBgClass
                }`}
              />
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={handleProcessTranscript}
                  disabled={isProcessing}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                    isProcessing
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isProcessing ? '분석 중...' : 'Gemini로 분석'}
                </button>
                <button
                  onClick={() => {
                    setTranscript('');
                    setSuggestion(null);
                    setNotice(null);
                    setError(null);
                    setHasCreated(false);
                    setFormData({
                      amount: '',
                      categoryId: '',
                      date: getLocalDateString(),
                      memo: '',
                    });
                  }}
                  className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border border-gray-500/40 text-gray-300 hover:border-gray-400/80 transition"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="quick-add-amount" className="text-xs sm:text-sm font-medium text-gray-300">
                  금액
                </label>
                <div className="relative">
                  <input
                    id="quick-add-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(event) => setFormData((prev) => ({ ...prev, amount: event.target.value }))}
                    className={`w-full rounded-lg border px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 ${fieldBgClass}`}
                    placeholder="예: 58000"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-xs sm:text-sm text-gray-400">
                    {currency}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="quick-add-date" className="text-xs sm:text-sm font-medium text-gray-300">
                  날짜
                </label>
                <input
                  id="quick-add-date"
                  type="date"
                  value={formData.date}
                  onChange={(event) => setFormData((prev) => ({ ...prev, date: event.target.value }))}
                  className={`w-full rounded-lg border px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 ${fieldBgClass}`}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="quick-add-category" className="text-xs sm:text-sm font-medium text-gray-300">
                  카테고리
                </label>
                <select
                  id="quick-add-category"
                  value={formData.categoryId}
                  onChange={(event) => setFormData((prev) => ({ ...prev, categoryId: event.target.value }))}
                  className={`w-full rounded-lg border px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 appearance-none cursor-pointer ${fieldBgClass}`}
                  disabled={categoriesLoading}
                >
                  <option value="">{categoriesLoading ? '불러오는 중...' : '카테고리 선택'}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {suggestion && suggestion.categoryName && (
                  <p className="text-xs text-gray-400">
                    Gemini 추천: <span className="font-medium">{suggestion.categoryName}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="quick-add-memo" className="text-xs sm:text-sm font-medium text-gray-300">
                  메모 (선택)
                </label>
                <input
                  id="quick-add-memo"
                  type="text"
                  value={formData.memo}
                  onChange={(event) => setFormData((prev) => ({ ...prev, memo: event.target.value }))}
                  className={`w-full rounded-lg border px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 ${fieldBgClass}`}
                  placeholder="예: 마트 장보기, 주유 등"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2 sm:gap-3 sticky bottom-0 bg-inherit pt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border border-gray-500/40 text-gray-300 hover:border-gray-400/80 transition"
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  isSubmitting
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isSubmitting ? '저장 중...' : '지출 추가'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuickAddVoiceModal;
