
import React from 'react';
import { Currency } from '../types';
import { useAuth } from '../lib/auth';

interface HeaderProps {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  onQuickAdd?: () => void;
  onMenuToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currency,
  setCurrency,
  theme,
  setTheme,
  onQuickAdd,
  onMenuToggle,
}) => {
  const { canEdit } = useAuth();
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
  const selectBgClass = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-slate-300 text-gray-700';

  // SVG Icons
  const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );

  // SVG Plus Icon for Quick Add button
  const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );

  return (
    <header className={`${headerBgClass} p-2 sm:p-3 md:p-4 flex justify-between md:justify-end items-center shadow-md overflow-x-auto`}>
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded hover:bg-gray-700 transition-colors flex-shrink-0"
          aria-label="Toggle menu"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
      )}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-6 flex-1 md:flex-none md:justify-end">
        {/* Theme Toggle */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <span className={`${labelColor} hidden sm:inline text-xs md:text-sm`}>테마</span>
          <div
            onClick={toggleTheme}
            className={`relative flex items-center w-14 sm:w-18 md:w-24 h-7 sm:h-8 md:h-8 rounded-full px-1 cursor-pointer select-none flex-shrink-0 transition-colors ${trackBaseClass}`}
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="테마 토글 (다크/라이트)"
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
              D
            </span>
            <span
              className={`relative flex-1 text-center text-xs font-semibold transition-colors ${
                theme === 'light' ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              L
            </span>
          </div>
        </div>

        {/* Currency Toggle */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <span className={`${labelColor} hidden sm:inline text-xs md:text-sm`}>통화</span>
          <div
            onClick={toggleCurrency}
            className={`relative flex items-center w-14 sm:w-18 md:w-24 h-7 sm:h-8 md:h-8 rounded-full px-1 cursor-pointer select-none flex-shrink-0 transition-colors ${trackBaseClass}`}
            role="switch"
            aria-checked={currency === 'USD'}
            aria-label="통화 토글 (KRW/USD)"
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

        {/* Quick Add Button - Positioned at the end */}
        {onQuickAdd && canEdit() && (
          <button
            onClick={onQuickAdd}
            className="ml-auto bg-sky-600 text-white p-1.5 sm:px-2.5 sm:py-1.5 md:px-4 md:py-2 rounded-lg hover:bg-sky-700 active:bg-sky-800 transition text-xs sm:text-sm md:text-base font-medium flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-1 min-h-8 sm:min-h-9"
            aria-label="Quick add"
            title="빠른 추가"
          >
            <span className="sm:hidden">
              <PlusIcon />
            </span>
            <span className="hidden sm:inline lg:hidden">추가</span>
            <span className="hidden lg:inline">빠른추가</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
