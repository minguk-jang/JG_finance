import React, { useMemo, useState } from 'react';
import { Currency } from '../types';
import Card from './ui/Card';
import { getLocalDateString } from '../lib/dateUtils';

interface StudyReference {
  id: string;
  title: string;
  url: string;
}

interface StudyFollowUp {
  id: string;
  task: string;
  owner: string;
  due: string;
  completed: boolean;
}

interface StudySession {
  id: string;
  topic: string;
  date: string;
  source: string;
  participants: string;
  tags: string[];
  highlights: string[];
  notes: string;
  references: StudyReference[];
  followUps: StudyFollowUp[];
}

interface InvestmentsProps {
  currency: Currency;
  exchangeRate: number;
}

const MAX_HIGHLIGHTS = 3;
const PROMPT_TEMPLATE = `당신은 투자 스터디 기록을 정리하는 전문 분석 어시스턴트입니다.

입력:
1) 첨부한 PDF 보고서 또는 메모
2) 내가 제공하는 추가 메모 (있다면)

출력 형식 (JSON):
{
  "topic": "<스터디 주제>",
  "date": "<YYYY-MM-DD, 없으면 오늘>",
  "source": "<자료 출처>",
  "participants": "<참여자>",
  "tags": ["태그1", "태그2", ...],
  "highlights": [
    "핵심 요약 1",
    "핵심 요약 2",
    "핵심 요약 3"
  ],
  "notes": "- 세부 메모를 Markdown bullet로 정리",
  "references": [
    {"title": "자료 이름", "url": "링크"}
  ],
  "followUps": [
    {"task": "액션 항목", "owner": "담당자", "due": "YYYY-MM-DD", "completed": false}
  ]
}

규칙:
- PDF에서 추출한 핵심 수치·동향·리스크를 우선적으로 담고, 모호한 문장은 피한다.
- highlights는 최대 3줄, each <= 120자.
- notes는 bullet 목록으로 3~6줄.
- references에는 원문 제목/링크를 가능한 한 채운다.
- followUps는 필요 시 1~3개 작성. 기한이 없으면 일주일 뒤로 설정.`;

const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const padHighlights = (highlights: string[]) => {
  const next = [...highlights];
  while (next.length < MAX_HIGHLIGHTS) {
    next.push('');
  }
  return next.slice(0, MAX_HIGHLIGHTS);
};

const cloneSession = (session: StudySession): StudySession => ({
  ...session,
  tags: [...session.tags],
  highlights: padHighlights(session.highlights),
  references: session.references.map((ref) => ({ ...ref })),
  followUps: session.followUps.map((item) => ({ ...item })),
});

const createEmptySession = (): StudySession => ({
  id: '',
  topic: '',
  date: getLocalDateString(),
  source: '',
  participants: '',
  tags: [],
  highlights: padHighlights(['']),
  notes: '',
  references: [],
  followUps: [],
});

const INITIAL_SESSIONS: StudySession[] = [
  {
    id: 'session-240520',
    topic: '금리 사이클이 자산군에 미치는 영향',
    date: '2024-05-20',
    source: 'JP Morgan Macro Outlook',
    participants: 'M, K',
    tags: ['채권', '매크로', '멀티에셋'],
    highlights: [
      '장단기 금리 역전 완화, Q3 채권 비중 +5% 검토',
      '정책 변곡 시 리스크 헤지 수단 재점검',
      '성장주 대비 가치주 리스크/보상 분석 필요',
    ],
    notes: [
      '- 연준 점도표와 선물시장의 금리 경로 차이를 비교했고 9월까지 동결 시나리오가 우세함.',
      '- 10Y-2Y 스프레드는 Q4에 플러스로 돌아설 가능성이 커 보이며 멀티에셋 리밸런싱 시그널로 활용 예정.',
      '- 기관 고객 채권 편입 비중을 5%p 늘릴 경우 듀레이션 리스크를 커버하기 위한 헤지 비용 추산 필요.',
    ].join('\n'),
    references: [
      { id: 'ref-01', title: 'JP Morgan Macro Outlook', url: 'https://example.com/jpm-macro' },
      { id: 'ref-02', title: 'BIS Annual Report 2024 (p.42)', url: 'https://example.com/bis-2024' },
    ],
    followUps: [
      { id: 'todo-01', task: '국채 ETF 편입 비중 재산정', owner: 'M', due: '2024-05-25', completed: false },
      { id: 'todo-02', task: '회사채 스프레드 모니터링 시트 공유', owner: 'K', due: '2024-05-21', completed: true },
    ],
  },
  {
    id: 'session-240512',
    topic: '반도체 업황 점검 및 AI CapEx 영향',
    date: '2024-05-12',
    source: 'Morgan Stanley Tech Pulse',
    participants: 'M',
    tags: ['반도체', 'AI', '성장주'],
    highlights: [
      'H2 메모리 ASP 시나리오 상향, DDR5 재고 턴 확인',
      'AI CapEx → 파운드리 가동률 90% 회복 예상',
      '대만 공급 차질 시 긴급 대응 플랜 필요',
    ],
    notes: [
      '- DDR5 재고가 7주 수준으로 줄었고 ASP가 QoQ +12% 가이던스.',
      '- 2025년까지 북미 하이퍼스케일러 CapEx CAGR 19% 전망, 관련 장비 업체 Top pick 재검토.',
      '- 지정학 리스크 완화 전까지 파운드리 이중 소싱 정책을 유지.',
    ].join('\n'),
    references: [
      { id: 'ref-03', title: 'Morgan Stanley Tech Pulse', url: 'https://example.com/ms-tech' },
    ],
    followUps: [
      { id: 'todo-03', task: 'AI CapEx 민감도 시트 업데이트', owner: 'M', due: '2024-05-18', completed: false },
    ],
  },
  {
    id: 'session-240503',
    topic: '배당 ETF 비교 스터디',
    date: '2024-05-03',
    source: 'Internal deck',
    participants: '팀 전체',
    tags: ['배당', 'ETF'],
    highlights: [
      '분배금 성장률과 총수익률을 분리 분석',
      '국내/미국 배당 ETF 세제 차이 정리',
      '현금흐름 캘린더 작성 필요',
    ],
    notes: [
      '- 분배금 성장률이 5% 이상인 ETF에 집중하되, 시총 상위 30% 편중 여부를 추가 확인.',
      '- ETF 분배 스케줄을 월별 현금흐름 테이블로 변환해 고정비 상쇄 계획에 반영.',
    ].join('\n'),
    references: [],
    followUps: [
      { id: 'todo-04', task: '배당 캘린더 샘플 공유', owner: '팀 전체', due: '2024-05-10', completed: false },
    ],
  },
];

const STORAGE_KEY_SESSIONS = 'investment_study_sessions';
const STORAGE_KEY_PROMPT = 'investment_study_prompt_template';

const Investments: React.FC<InvestmentsProps> = ({ currency, exchangeRate }) => {
  // Load initial data from localStorage
  const [sessions, setSessions] = useState<StudySession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sessions from localStorage', error);
    }
    return INITIAL_SESSIONS;
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (stored) {
        const loadedSessions = JSON.parse(stored);
        return loadedSessions[0]?.id ?? null;
      }
    } catch (error) {
      console.error('Failed to load active session', error);
    }
    return INITIAL_SESSIONS[0]?.id ?? null;
  });

  const [draft, setDraft] = useState<StudySession>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (stored) {
        const loadedSessions = JSON.parse(stored);
        return loadedSessions[0] ? cloneSession(loadedSessions[0]) : createEmptySession();
      }
    } catch (error) {
      console.error('Failed to load draft', error);
    }
    return INITIAL_SESSIONS[0] ? cloneSession(INITIAL_SESSIONS[0]) : createEmptySession();
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (stored) {
        const loadedSessions = JSON.parse(stored);
        return loadedSessions.length === 0;
      }
    } catch (error) {
      console.error('Failed to check if creating new', error);
    }
    return INITIAL_SESSIONS.length === 0;
  });

  const [tagInput, setTagInput] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showJsonImportModal, setShowJsonImportModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [promptTemplate, setPromptTemplate] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROMPT);
      if (stored) {
        return stored;
      }
    } catch (error) {
      console.error('Failed to load prompt template', error);
    }
    return PROMPT_TEMPLATE;
  });
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  // Save sessions to localStorage whenever they change
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save sessions to localStorage', error);
    }
  }, [sessions]);

  // Save prompt template to localStorage whenever it changes
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROMPT, promptTemplate);
    } catch (error) {
      console.error('Failed to save prompt template to localStorage', error);
    }
  }, [promptTemplate]);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  }, [sessions]);

  const confirmDiscard = () => {
    if (!isDirty) {
      return true;
    }
    return window.confirm('아직 저장하지 않은 변경 사항이 있습니다. 계속하시겠어요?');
  };

  const handleSelectSession = (sessionId: string) => {
    if (!confirmDiscard()) {
      return;
    }
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) {
      return;
    }
    setActiveSessionId(session.id);
    setDraft(cloneSession(session));
    setIsCreatingNew(false);
    setIsDirty(false);
  };

  const handleStartNewSession = () => {
    if (!confirmDiscard()) {
      return;
    }
    setActiveSessionId(null);
    setDraft(createEmptySession());
    setIsCreatingNew(true);
    setIsDirty(false);
  };

  const updateDraftField = <K extends keyof StudySession>(key: K, value: StudySession[K]) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
    setIsDirty(true);
  };

  const handleHighlightChange = (index: number, value: string) => {
    setDraft((prev) => {
      const next = [...prev.highlights];
      next[index] = value;
      return { ...prev, highlights: next };
    });
    setIsDirty(true);
  };

  const handleAddReference = () => {
    updateDraftField('references', [
      ...draft.references,
      { id: generateId(), title: '', url: '' },
    ]);
  };

  const handleReferenceChange = (id: string, field: keyof StudyReference, value: string) => {
    setDraft((prev) => ({
      ...prev,
      references: prev.references.map((ref) => (ref.id === id ? { ...ref, [field]: value } : ref)),
    }));
    setIsDirty(true);
  };

  const handleRemoveReference = (id: string) => {
    updateDraftField(
      'references',
      draft.references.filter((ref) => ref.id !== id)
    );
  };

  const handleAddFollowUp = () => {
    updateDraftField('followUps', [
      ...draft.followUps,
      { id: generateId(), task: '', owner: '', due: getLocalDateString(), completed: false },
    ]);
  };

  const handleFollowUpChange = (id: string, field: keyof StudyFollowUp, value: string | boolean) => {
    setDraft((prev) => ({
      ...prev,
      followUps: prev.followUps.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
    setIsDirty(true);
  };

  const handleRemoveFollowUp = (id: string) => {
    updateDraftField(
      'followUps',
      draft.followUps.filter((item) => item.id !== id)
    );
  };

  const handleTagAdd = () => {
    const next = tagInput.trim();
    if (!next) {
      return;
    }
    if (draft.tags.includes(next)) {
      setTagInput('');
      return;
    }
    updateDraftField('tags', [...draft.tags, next]);
    setTagInput('');
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      handleTagAdd();
    }
  };

  const handleRemoveTag = (tag: string) => {
    updateDraftField(
      'tags',
      draft.tags.filter((item) => item !== tag)
    );
  };

  const handleResetDraft = () => {
    if (isCreatingNew || !activeSessionId) {
      setDraft(createEmptySession());
    } else {
      const session = sessions.find((item) => item.id === activeSessionId);
      if (session) {
        setDraft(cloneSession(session));
      }
    }
    setTagInput('');
    setIsDirty(false);
  };

  const handleSaveSession = () => {
    const topic = draft.topic.trim();
    if (!topic) {
      alert('스터디 주제를 입력해주세요.');
      return;
    }
    const cleanedHighlights = draft.highlights.map((line) => line.trim()).filter(Boolean);
    if (cleanedHighlights.length === 0) {
      alert('핵심 요약을 최소 한 줄 이상 입력해주세요.');
      return;
    }
    const normalized: StudySession = {
      ...draft,
      id: draft.id || generateId(),
      topic,
      source: draft.source.trim(),
      participants: draft.participants.trim(),
      tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
      highlights: cleanedHighlights,
      references: draft.references
        .map((ref) => ({
          ...ref,
          title: ref.title.trim(),
          url: ref.url.trim(),
        }))
        .filter((ref) => ref.title || ref.url),
      followUps: draft.followUps.map((item) => ({
        ...item,
        task: item.task.trim(),
        owner: item.owner.trim(),
        due: item.due,
      })),
    };

    if (isCreatingNew || !activeSessionId) {
      setSessions((prev) => [normalized, ...prev]);
      setActiveSessionId(normalized.id);
      setIsCreatingNew(false);
    } else {
      setSessions((prev) => prev.map((session) => (session.id === normalized.id ? normalized : session)));
    }

    setDraft(cloneSession(normalized));
    setIsDirty(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!window.confirm('이 스터디를 삭제하시겠습니까?')) {
      return;
    }

    setSessions((prev) => prev.filter((session) => session.id !== sessionId));

    // If deleting the active session, reset to empty or select another
    if (sessionId === activeSessionId) {
      const remainingSessions = sessions.filter((s) => s.id !== sessionId);
      if (remainingSessions.length > 0) {
        const nextSession = remainingSessions[0];
        setActiveSessionId(nextSession.id);
        setDraft(cloneSession(nextSession));
        setIsCreatingNew(false);
      } else {
        setActiveSessionId(null);
        setDraft(createEmptySession());
        setIsCreatingNew(true);
      }
      setIsDirty(false);
    }
  };

  const formatListDate = (date: string) => {
    try {
      return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(date));
    } catch {
      return date;
    }
  };

  const currencyBadge = `${currency} 기준 • 환율 ${exchangeRate.toLocaleString('ko-KR')}`;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptTemplate);
      setCopyMessage('복사 완료!');
      setTimeout(() => setCopyMessage(null), 2000);
    } catch (error) {
      console.error('Failed to copy prompt', error);
      setCopyMessage('클립보드 복사에 실패했습니다.');
      setTimeout(() => setCopyMessage(null), 2000);
    }
  };

  const handleJsonImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);

      // Parse the JSON and populate the draft
      const importedData: Partial<StudySession> = {
        topic: parsed.topic || '',
        date: parsed.date || getLocalDateString(),
        source: parsed.source || '',
        participants: parsed.participants || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        highlights: padHighlights(Array.isArray(parsed.highlights) ? parsed.highlights : []),
        notes: parsed.notes || '',
        references: Array.isArray(parsed.references)
          ? parsed.references.map((ref: any) => ({
              id: generateId(),
              title: ref.title || '',
              url: ref.url || '',
            }))
          : [],
        followUps: Array.isArray(parsed.followUps)
          ? parsed.followUps.map((item: any) => ({
              id: generateId(),
              task: item.task || '',
              owner: item.owner || '',
              due: item.due || getLocalDateString(),
              completed: item.completed || false,
            }))
          : [],
      };

      setDraft((prev) => ({
        ...prev,
        ...importedData,
      }));

      setIsDirty(true);
      setShowJsonImportModal(false);
      setJsonInput('');
      alert('JSON 데이터를 성공적으로 불러왔습니다!');
    } catch (error) {
      console.error('Failed to parse JSON', error);
      alert('JSON 형식이 올바르지 않습니다. 다시 확인해주세요.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-100">투자 스터디 기록</h1>
        <div className="flex flex-wrap items-center gap-2">
          {isDirty && <span className="rounded-full bg-amber-500/30 border border-amber-600 px-3 py-1 text-amber-200 text-xs">임시 변경사항 있음</span>}
          <button
            type="button"
            onClick={() => setShowPromptModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            프롬프트
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/3 space-y-4">
          <Card title="스터디 히스토리">
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleStartNewSession}
                className="w-full rounded-lg border-2 border-dashed border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-500/20 transition"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                새 스터디 추가
              </button>

              {sortedSessions.length === 0 && (
                <p className="text-sm text-gray-500">아직 저장된 스터디가 없습니다. 새로운 세션을 추가해보세요.</p>
              )}

              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {sortedSessions.map((session) => {
                  const isActive = session.id === activeSessionId && !isCreatingNew;
                  return (
                    <div
                      key={session.id}
                      className={`relative w-full rounded-lg border px-4 py-3 shadow-sm transition ${
                        isActive
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-blue-400/50 hover:bg-gray-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectSession(session.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1 pr-6">
                          <span>{formatListDate(session.date)}</span>
                          {session.tags[0] && <span className="font-medium text-blue-400">#{session.tags[0]}</span>}
                        </div>
                        <div
                          className="text-sm font-semibold text-gray-100 overflow-hidden pr-6"
                          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                        >
                          {session.topic}
                        </div>
                        {session.source && (
                          <div className="text-xs text-gray-400 mt-1 pr-6">{session.source}</div>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:flex-1 space-y-4">
          <Card>
            <div className="flex flex-col gap-2 border-b border-gray-700 pb-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-gray-400">현재 편집 중</p>
                  <h2 className="text-2xl font-bold text-gray-100">{draft.topic || '제목 없는 스터디'}</h2>
                  <p className="text-sm text-gray-400">
                    스터디마다 동일한 템플릿을 사용해 요약 · 참고 자료 · 후속 액션을 빠르게 정리할 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowJsonImportModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm whitespace-nowrap flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  ChatGPT가 도와줬음:)
                </button>
              </div>
            </div>

            <form className="space-y-6">
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-gray-300">
                  주제
                  <input
                    type="text"
                    value={draft.topic}
                    onChange={(event) => updateDraftField('topic', event.target.value)}
                    className="rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="예: 금리 사이클 분석"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-gray-300">
                  날짜
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => updateDraftField('date', event.target.value)}
                    className="rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-gray-300">
                  자료 출처
                  <input
                    type="text"
                    value={draft.source}
                    onChange={(event) => updateDraftField('source', event.target.value)}
                    className="rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="보고서, 영상 등"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-gray-300">
                  참여자
                  <input
                    type="text"
                    value={draft.participants}
                    onChange={(event) => updateDraftField('participants', event.target.value)}
                    className="rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="예: M, K"
                  />
                </label>
              </section>

              <section>
                <p className="text-sm font-semibold text-gray-100 mb-2">태그</p>
                <div className="flex flex-wrap items-center gap-2">
                  {draft.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-500/40 px-3 py-1 text-sm text-blue-300"
                    >
                      #{tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="text-xs text-blue-400 hover:text-blue-200">
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="flex-1 min-w-[140px] rounded-md border border-gray-600 bg-gray-700 px-3 py-1 text-sm text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="엔터로 태그 추가"
                  />
                  <button
                    type="button"
                    onClick={handleTagAdd}
                    className="rounded-md border border-blue-500/40 bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-300 hover:bg-blue-500/30"
                  >
                    추가
                  </button>
                </div>
              </section>

              <section>
                <p className="text-sm font-semibold text-gray-100 mb-2">핵심 요약 (최대 {MAX_HIGHLIGHTS}줄)</p>
                <div className="space-y-2">
                  {draft.highlights.map((line, index) => (
                    <div key={`highlight-${index}`} className="flex items-start gap-2">
                      <span className="mt-2 text-xs font-semibold text-gray-500">{index + 1}.</span>
                      <textarea
                        value={line}
                        onChange={(event) => handleHighlightChange(index, event.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="핵심 메시지를 한 줄로 정리"
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-sm font-semibold text-gray-100 mb-2">세부 노트</p>
                <textarea
                  value={draft.notes}
                  onChange={(event) => updateDraftField('notes', event.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-3 text-sm text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="- 자유롭게 메모를 남겨두세요."
                />
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-100">참고 자료 / 링크</p>
                  <button
                    type="button"
                    onClick={handleAddReference}
                    className="text-sm font-medium text-blue-400 hover:text-blue-300"
                  >
                    + 자료 추가
                  </button>
                </div>
                {draft.references.length === 0 && (
                  <p className="text-sm text-gray-400">URL을 붙여 제목과 출처를 기록해두세요.</p>
                )}
                <div className="space-y-3">
                  {draft.references.map((ref) => (
                    <div key={ref.id} className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-800 p-3 md:flex-row md:items-center">
                      <input
                        type="text"
                        value={ref.title}
                        onChange={(event) => handleReferenceChange(ref.id, 'title', event.target.value)}
                        className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:ring-blue-500 md:flex-1"
                        placeholder="자료 제목"
                      />
                      <input
                        type="url"
                        value={ref.url}
                        onChange={(event) => handleReferenceChange(ref.id, 'url', event.target.value)}
                        className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:ring-blue-500 md:flex-[1.2]"
                        placeholder="https://"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveReference(ref.id)}
                        className="text-sm text-gray-400 hover:text-red-400"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-100">Follow-up</p>
                  <button
                    type="button"
                    onClick={handleAddFollowUp}
                    className="text-sm font-medium text-blue-400 hover:text-blue-300"
                  >
                    + 할 일 추가
                  </button>
                </div>
                {draft.followUps.length === 0 && (
                  <p className="text-sm text-gray-400">스터디 후 필요한 실행 과제를 체크리스트로 관리하세요.</p>
                )}
                <div className="space-y-3">
                  {draft.followUps.map((item) => (
                    <div key={item.id} className="rounded-lg border border-gray-700 bg-gray-800 p-3 space-y-2">
                      <div className="grid gap-3 md:grid-cols-12">
                        <label className="md:col-span-6 text-sm text-gray-300 flex flex-col gap-1">
                          할 일
                          <input
                            type="text"
                            value={item.task}
                            onChange={(event) => handleFollowUpChange(item.id, 'task', event.target.value)}
                            className="rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="예: 국채 ETF 비중 재산정"
                          />
                        </label>
                        <label className="md:col-span-3 text-sm text-gray-300 flex flex-col gap-1">
                          담당자
                          <input
                            type="text"
                            value={item.owner}
                            onChange={(event) => handleFollowUpChange(item.id, 'owner', event.target.value)}
                            className="rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="이름/팀"
                          />
                        </label>
                        <label className="md:col-span-3 text-sm text-gray-300 flex flex-col gap-1">
                          기한
                          <input
                            type="date"
                            value={item.due}
                            onChange={(event) => handleFollowUpChange(item.id, 'due', event.target.value)}
                            className="rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={(event) => handleFollowUpChange(item.id, 'completed', event.target.checked)}
                            className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                          />
                          완료
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveFollowUp(item.id)}
                          className="text-sm text-gray-400 hover:text-red-400"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex flex-col gap-3 border-t border-gray-700 pt-4 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={handleResetDraft}
                  className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600 transition-colors"
                >
                  {isCreatingNew || !activeSessionId ? '초안 초기화' : '변경사항 취소'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveSession}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  {isCreatingNew || !activeSessionId ? '새 스터디 저장' : '업데이트 저장'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-gray-800 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-100">PDF 요약 자동화 프롬프트</h3>
                <p className="text-sm text-gray-400 mt-1">ChatGPT에 PDF와 함께 붙여넣으면 스터디 템플릿에 맞춰 정리해 줍니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="text-gray-400 hover:text-gray-200 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              className="mt-4 h-72 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-3 text-sm text-gray-100 focus:border-blue-500 focus:ring-blue-500"
            />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-400">{copyMessage || '프롬프트를 수정하고 저장할 수 있습니다.'}</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                >
                  복사
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCopyMessage('프롬프트가 저장되었습니다!');
                    setTimeout(() => {
                      setCopyMessage(null);
                      setShowPromptModal(false);
                    }, 1500);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON Import Modal */}
      {showJsonImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-gray-800 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-100">JSON 데이터 불러오기</h3>
                <p className="text-sm text-gray-400 mt-1">
                  ChatGPT에서 생성한 JSON을 붙여넣으면 자동으로 폼에 입력됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowJsonImportModal(false);
                  setJsonInput('');
                }}
                className="text-gray-400 hover:text-gray-200 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                JSON 데이터 붙여넣기
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-96 rounded-md border border-gray-600 bg-gray-700 px-3 py-3 text-sm text-gray-100 font-mono focus:border-blue-500 focus:ring-blue-500"
                placeholder={`예시:
{
  "topic": "금리 사이클 분석",
  "date": "2025-10-26",
  "source": "JP Morgan Report",
  "participants": "팀 전체",
  "tags": ["금리", "채권"],
  "highlights": [
    "핵심 요약 1",
    "핵심 요약 2"
  ],
  "notes": "- 상세 메모\\n- 추가 내용",
  "references": [
    {"title": "참고자료", "url": "https://example.com"}
  ],
  "followUps": [
    {"task": "할 일", "owner": "담당자", "due": "2025-11-01", "completed": false}
  ]
}`}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowJsonImportModal(false);
                  setJsonInput('');
                }}
                className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleJsonImport}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
              >
                불러오기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;
