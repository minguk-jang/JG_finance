
import React, { useState, useRef } from 'react';
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
  const expensesRef = useRef<ExpensesHandle>(null);
  const incomeRef = useRef<IncomeHandle>(null);

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
    <div className="flex h-screen bg-gray-900 text-gray-200">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currency={currency} setCurrency={setCurrency} onQuickAdd={handleQuickAdd} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
