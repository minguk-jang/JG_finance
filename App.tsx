
import React, { useState, useRef, useEffect } from 'react';
import { Currency, Page } from './types';
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

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');
  const [currency, setCurrency] = useState<Currency>('KRW');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const expensesRef = useRef<ExpensesHandle>(null);
  const incomeRef = useRef<IncomeHandle>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_USD_KRW_EXCHANGE_RATE);

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
    <Settings exchangeRate={exchangeRate} onExchangeRateChange={setExchangeRate} />
  );

  const renderContent = () => {
    switch (currentPage) {
      case 'Dashboard':
        return <Dashboard currency={currency} exchangeRate={exchangeRate} />;
      case 'Expenses':
        return <Expenses ref={expensesRef} currency={currency} exchangeRate={exchangeRate} />;
      case 'Income':
        return <Income ref={incomeRef} currency={currency} exchangeRate={exchangeRate} />;
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
        onExpenseCreated={handleExpenseCreated}
      />
    </div>
  );
};

export default App;
