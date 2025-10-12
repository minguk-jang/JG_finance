import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Currency, Page, User } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Expenses, { ExpensesHandle } from './components/Expenses';
import Income, { IncomeHandle } from './components/Income';
import Investments from './components/Investments';
import Issues from './components/Issues';
import Settings from './components/Settings';
import QuickAddVoiceModal from './components/QuickAddVoiceModal';
import { DEFAULT_USD_KRW_EXCHANGE_RATE } from './constants';
import { api } from './lib/api';

const resolveStoredMemberId = (): number => {
  if (typeof window === 'undefined') return -1;
  const storedId = window.localStorage.getItem('activeMemberId');
  if (!storedId) return -1;
  const parsed = parseInt(storedId, 10);
  return Number.isFinite(parsed) ? parsed : -1;
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');
  const [currency, setCurrency] = useState<Currency>('KRW');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const expensesRef = useRef<ExpensesHandle>(null);
  const incomeRef = useRef<IncomeHandle>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_USD_KRW_EXCHANGE_RATE);
  const [members, setMembers] = useState<User[]>([]);
  const [activeMemberId, setActiveMemberId] = useState<number>(() => resolveStoredMemberId());

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
    try {
      const data = await api.getUsers();
      setMembers(data);
      setActiveMemberId(prev => {
        if (data.length === 0) {
          return -1;
        }
        if (data.some(user => user.id === prev && prev > 0)) {
          return prev;
        }
        return data[0].id;
      });
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeMemberId > 0) {
      window.localStorage.setItem('activeMemberId', activeMemberId.toString());
    } else {
      window.localStorage.removeItem('activeMemberId');
    }
  }, [activeMemberId]);

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

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-900'}`}>
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} theme={theme} />
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
        />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {renderContent()}
        </main>
      </div>
      <QuickAddVoiceModal
        isOpen={isQuickAddOpen}
        onClose={handleCloseQuickAdd}
        currency={currency}
        theme={theme}
        activeMemberId={activeMemberId}
        onExpenseCreated={handleExpenseCreated}
      />
    </div>
  );
};

export default App;
