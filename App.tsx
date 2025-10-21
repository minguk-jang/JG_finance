import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Currency, Page, User, UserRole } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Expenses, { ExpensesHandle } from './components/Expenses';
import Income, { IncomeHandle } from './components/Income';
import Investments from './components/Investments';
import Issues from './components/Issues';
import Settings from './components/Settings';
import QuickAddVoiceModal from './components/QuickAddVoiceModal';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import AuthModal from './components/AuthModal';
import { DEFAULT_USD_KRW_EXCHANGE_RATE } from './constants';
import { api } from './lib/api';
import { useAuth } from './lib/auth';

const resolveStoredMemberId = (): string => {
  if (typeof window === 'undefined') return '';
  const storedId = window.localStorage.getItem('activeMemberId');
  return storedId || '';
};

const App: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');
  const [currency, setCurrency] = useState<Currency>('KRW');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const expensesRef = useRef<ExpensesHandle>(null);
  const incomeRef = useRef<IncomeHandle>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_USD_KRW_EXCHANGE_RATE);
  const [members, setMembers] = useState<User[]>([]);
  const storedMemberIdRef = useRef<string>(resolveStoredMemberId());
  const [activeMemberId, setActiveMemberId] = useState<string>(() => '');
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Show auth modal if user is not authenticated (after loading completes)
  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true);
    } else if (user) {
      // User is logged in, close modal
      setShowAuthModal(false);
    }
  }, [loading, user]);

  // Register Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          swRegistrationRef.current = registration;
          console.log('[App] Service Worker registered:', registration);

          // Check for updates periodically
          setInterval(() => {
            registration.update().catch((err) => {
              console.warn('[App] Service Worker update check failed:', err);
            });
          }, 3600000); // Check every hour

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New Service Worker is ready
                console.log('[App] Service Worker update available');
                setShowUpdatePrompt(true);
              }
            });
          });
        } catch (error) {
          console.error('[App] Service Worker registration failed:', error);
        }
      });
    }
  }, []);

  // Handle Service Worker update
  const handleUpdateApp = () => {
    if (!swRegistrationRef.current?.waiting) return;

    swRegistrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
    setShowUpdatePrompt(false);

    // Reload after waiting SW is activated
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  };

  useEffect(() => {
    const body = document.body;
    body.classList.remove('theme-dark', 'theme-light');
    body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedRate = window.localStorage.getItem('usdKrwExchangeRate');
    if (!storedRate) return;
    const parsed = parseFloat(storedRate);
    if (Number.isFinite(parsed) && parsed > 0) {
      setExchangeRate(parsed);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('usdKrwExchangeRate', exchangeRate.toString());
  }, [exchangeRate]);

  const loadMembers = useCallback(async () => {
    if (!user) {
      setMembers([]);
      setActiveMemberId('');
      storedMemberIdRef.current = '';
      return;
    }

    try {
      const apiUsers = await api.getUsers();
      let nextMembers: User[] = Array.isArray(apiUsers) ? apiUsers : [];

      if (nextMembers.length === 0) {
        if (profile) {
          nextMembers = [
            {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role as UserRole,
              avatar: profile.avatar,
            },
          ];
        } else if (user) {
          const fallbackName =
            (user.user_metadata && (user.user_metadata.name as string | undefined)) ||
            user.email?.split('@')[0] ||
            'User';

          nextMembers = [
            {
              id: user.id,
              name: fallbackName,
              email: user.email ?? '',
              role: UserRole.Viewer,
              avatar:
                (user.user_metadata && (user.user_metadata.avatar_url as string | undefined)) ??
                null,
            },
          ];
        }
      }

      setMembers(nextMembers);
      setActiveMemberId(prev => {
        if (!Array.isArray(nextMembers) || nextMembers.length === 0) {
          storedMemberIdRef.current = '';
          return '';
        }

        const candidateIds = [
          storedMemberIdRef.current,
          prev,
        ].filter((id): id is string => typeof id === 'string' && id.length > 0);

        const matchedId = candidateIds.find(id =>
          nextMembers.some(member => member.id === id)
        );

        const nextId = matchedId ?? nextMembers[0].id;
        storedMemberIdRef.current = nextId;
        return nextId;
      });
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  }, [profile, user]);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (user) {
      loadMembers();
    } else {
      setMembers([]);
      setActiveMemberId('');
      storedMemberIdRef.current = '';
    }
  }, [loading, user, loadMembers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeMemberId && activeMemberId.length > 0) {
      storedMemberIdRef.current = activeMemberId;
      window.localStorage.setItem('activeMemberId', activeMemberId);
    } else {
      storedMemberIdRef.current = '';
      window.localStorage.removeItem('activeMemberId');
    }
  }, [activeMemberId]);

  const handlePageChange = (page: Page) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  const handleQuickAdd = () => {
    setIsQuickAddOpen(true);
  };

  const handleCloseQuickAdd = () => {
    setIsQuickAddOpen(false);
  };

  const handleExpenseCreated = () => {
    if (currentPage !== 'Expenses') {
      setCurrentPage('Expenses');
    }
    expensesRef.current?.refresh?.();
  };

  const renderSettings = () => (
    <Settings
      exchangeRate={exchangeRate}
      onExchangeRateChange={setExchangeRate}
      onUsersRefresh={loadMembers}
    />
  );

  const activeMemberValid = activeMemberId.length > 0 && members.some(member => member.id === activeMemberId);

  const renderContent = () => {
    switch (currentPage) {
      case 'Dashboard':
        return <Dashboard currency={currency} exchangeRate={exchangeRate} />;
      case 'Expenses':
        return (
          <Expenses
            ref={expensesRef}
            currency={currency}
            exchangeRate={exchangeRate}
            activeMemberId={activeMemberId}
            members={members}
            activeMemberValid={activeMemberValid}
          />
        );
      case 'Income':
        return (
          <Income
            ref={incomeRef}
            currency={currency}
            exchangeRate={exchangeRate}
            activeMemberId={activeMemberId}
            members={members}
            activeMemberValid={activeMemberValid}
          />
        );
      case 'Investments':
        return <Investments currency={currency} exchangeRate={exchangeRate} />;
      case 'Issues':
        return <Issues currency={currency} />;
      case 'Settings':
        return renderSettings();
      default:
        return <Dashboard currency={currency} exchangeRate={exchangeRate} />;
    }
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className={`flex h-screen items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-900'}`}>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={handlePageChange}
        theme={theme}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          currency={currency}
          setCurrency={setCurrency}
          theme={theme}
          setTheme={setTheme}
          members={members}
          activeMemberId={activeMemberId}
          onActiveMemberChange={setActiveMemberId}
          onQuickAdd={handleQuickAdd}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {renderContent()}
        </main>
      </div>

      <QuickAddVoiceModal
        isOpen={isQuickAddOpen}
        onClose={handleCloseQuickAdd}
        currency={currency}
        theme={theme}
        onExpenseCreated={handleExpenseCreated}
      />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt theme={theme} />

      {/* Service Worker Update Prompt */}
      {showUpdatePrompt && (
        <div
          className={`
            fixed bottom-4 left-4 right-4 sm:left-6 sm:right-6 md:left-auto md:right-6 md:w-96
            ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border
            rounded-lg shadow-lg p-4 sm:p-6
            z-50 animate-in fade-in slide-in-from-bottom-4 duration-300
          `}
          role="alert"
          aria-live="polite"
          aria-label="App update available"
        >
          <button
            onClick={() => setShowUpdatePrompt(false)}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 p-1 md:p-2"
            aria-label="Close update prompt"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="pr-6">
            <h3 className={`text-lg md:text-xl font-semibold mb-2 md:mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
              <svg className="w-6 h-6 md:w-7 md:h-7 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
              </svg>
              새로운 버전이 있습니다
            </h3>
            <p className={`text-sm md:text-base mb-4 md:mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              새로운 기능과 개선 사항이 포함된 최신 버전으로 업데이트하세요.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <button
                onClick={handleUpdateApp}
                className="flex-1 px-4 py-2 md:py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors duration-200 text-sm md:text-base active:scale-95 transform"
                aria-label="Update app"
              >
                지금 업데이트
              </button>
              <button
                onClick={() => setShowUpdatePrompt(false)}
                className={`
                  flex-1 px-4 py-2 md:py-3
                  ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-100' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}
                  font-semibold rounded-lg transition-colors duration-200 text-sm md:text-base active:scale-95 transform
                `}
                aria-label="Dismiss update prompt"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};

export default App;
