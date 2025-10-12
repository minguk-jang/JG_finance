
import React from 'react';
import { Currency } from '../types';

interface HeaderProps {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  onQuickAdd?: () => void;
}

const Header: React.FC<HeaderProps> = ({ currency, setCurrency, theme, setTheme, onQuickAdd }) => {
  const toggleCurrency = () => {
    setCurrency(currency === 'KRW' ? 'USD' : 'KRW');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const labelColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const trackBaseClass = theme === 'dark' ? 'bg-gray-700' : 'bg-slate-200';
  const headerBgClass =
    theme === 'dark'
      ? 'bg-gray-800 text-gray-200'
      : 'bg-white text-gray-700 border-b border-slate-200';

  return (
    <header className={`${headerBgClass} p-4 flex justify-end items-center shadow-md`}>
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <span className={labelColor}>테마</span>
          <div
            onClick={toggleTheme}
            className={`relative flex items-center w-24 h-8 rounded-full px-1 cursor-pointer select-none ${trackBaseClass}`}
          >
            <div
              className={`absolute top-1 bottom-1 w-1/2 rounded-full bg-amber-400 transition-transform duration-300 ease-in-out ${
                theme === 'light' ? 'translate-x-full' : ''
              }`}
            />
            <span
              className={`relative flex-1 text-center text-xs font-semibold transition-colors ${
                theme === 'dark' ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              Dark
            </span>
            <span
              className={`relative flex-1 text-center text-xs font-semibold transition-colors ${
                theme === 'light' ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              Light
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={labelColor}>통화</span>
          <div
            onClick={toggleCurrency}
            className={`relative flex items-center w-24 h-8 rounded-full px-1 cursor-pointer select-none ${trackBaseClass}`}
          >
            <div
              className={`absolute top-1 bottom-1 w-1/2 rounded-full bg-sky-500 transition-transform duration-300 ease-in-out ${
                currency === 'USD' ? 'translate-x-full' : ''
              }`}
            />
            <span
              className={`relative flex-1 text-center text-xs font-semibold transition-colors ${
                currency === 'KRW' ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              KRW
            </span>
            <span
              className={`relative flex-1 text-center text-xs font-semibold transition-colors ${
                currency === 'USD' ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              USD
            </span>
          </div>
        </div>

        {onQuickAdd && (
          <button
            onClick={onQuickAdd}
            className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition"
          >
            빠른 추가
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
