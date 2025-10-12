
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

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');
  const [currency, setCurrency] = useState<Currency>('KRW');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const expensesRef = useRef<ExpensesHandle>(null);
  const incomeRef = useRef<IncomeHandle>(null);

  useEffect(() => {
    const body = document.body;
    body.classList.remove('theme-dark', 'theme-light');
    body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
  }, [theme]);

  const handleQuickAdd = () => {
    const openExpenseModal = () => expensesRef.current?.openAddModal();
    const openIncomeModal = () => incomeRef.current?.openAddModal();

    if (currentPage === 'Income') {
      openIncomeModal();
      return;
    }

    if (currentPage === 'Expenses') {
      openExpenseModal();
      return;
    }

    setCurrentPage('Expenses');
    setTimeout(openExpenseModal, 100);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'Dashboard':
        return <Dashboard currency={currency} />;
      case 'Expenses':
        return <Expenses ref={expensesRef} currency={currency} />;
      case 'Income':
        return <Income ref={incomeRef} currency={currency} />;
      case 'Investments':
        return <Investments currency={currency} />;
      case 'Issues':
        return <Issues currency={currency} />;
      case 'Settings':
        return <Settings />;
      default:
        return <Dashboard currency={currency} />;
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
    </div>
  );
};

export default App;
