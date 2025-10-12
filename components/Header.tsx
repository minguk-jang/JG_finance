
import React from 'react';
import { Currency } from '../types';

interface HeaderProps {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  onQuickAdd?: () => void;
}

const Header: React.FC<HeaderProps> = ({ currency, setCurrency, onQuickAdd }) => {
  const toggleCurrency = () => {
    setCurrency(currency === 'KRW' ? 'USD' : 'KRW');
  };

  return (
    <header className="bg-gray-800 p-4 flex justify-end items-center shadow-md">
      <div className="flex items-center space-x-4">
         <span className="text-gray-400">통화</span>
         <div onClick={toggleCurrency} className="w-14 h-7 flex items-center bg-gray-600 rounded-full p-1 cursor-pointer">
          <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${currency === 'USD' ? 'translate-x-7' : ''}`}></div>
          <span className="absolute right-10 font-bold text-xs text-sky-400">{`KRW`}</span>
          <span className="absolute right-5 font-bold text-xs text-sky-400">{`USD`}</span>
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
