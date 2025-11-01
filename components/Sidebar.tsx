import React from 'react';
import { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  theme: 'dark' | 'light';
  isOpen?: boolean;
  onToggle?: () => void;
}

// FIX: Changed type of 'icon' prop from JSX.Element to React.ReactElement to resolve "Cannot find namespace 'JSX'".
const NavItem: React.FC<{
  pageName: Page;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  icon: React.ReactElement;
  theme: 'dark' | 'light';
  children: React.ReactNode;
}> = ({ pageName, currentPage, setCurrentPage, icon, children, theme }) => {
  const isActive = currentPage === pageName;
  const activeClass = theme === 'dark' ? 'bg-sky-600 text-white' : 'bg-sky-500 text-white';
  const inactiveClass =
    theme === 'dark'
      ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
      : 'text-gray-600 hover:bg-slate-100 hover:text-sky-600';
  return (
    <li
      className={`flex items-center p-2 sm:p-3 my-1 rounded-lg cursor-pointer transition-colors ${
        isActive ? activeClass : inactiveClass
      }`}
      onClick={() => setCurrentPage(pageName)}
    >
      {icon}
      <span className="ml-2 sm:ml-3 text-sm sm:text-base">{children}</span>
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, theme, isOpen = false, onToggle }) => {
  const iconClasses = "w-6 h-6";
  const asideClass =
    theme === 'dark'
      ? 'bg-gray-800 text-gray-200'
      : 'bg-white text-gray-700 border-r border-slate-200';

  return (
    <aside
      className={`fixed md:static w-64 h-screen md:h-auto p-3 sm:p-4 flex flex-col flex-shrink-0 z-40 transition-transform duration-300 ease-in-out ${asideClass} ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
      style={{ top: 0, left: 0 }}
    >
      <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center cursor-pointer flex-1" onClick={() => setCurrentPage('Dashboard')}>
          <span className="text-lg sm:text-xl md:text-2xl font-bold hover:text-sky-400 transition-colors truncate">
            JG 가계부
          </span>
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            className="md:hidden ml-2 p-1.5 sm:p-2 rounded hover:bg-gray-700 transition-colors flex-shrink-0"
            aria-label="Close menu"
          >
            <CloseIcon className="w-5 sm:w-6 h-5 sm:h-6" />
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul>
          <NavItem pageName="Dashboard" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<DashboardIcon className={iconClasses} />} theme={theme}>
            대시보드
          </NavItem>
          <NavItem pageName="Income" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<IncomeIcon className={iconClasses} />} theme={theme}>
            수익
          </NavItem>
          <NavItem pageName="Expenses" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<ExpensesIcon className={iconClasses} />} theme={theme}>
            지출
          </NavItem>
          <NavItem pageName="Investments" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<InvestmentsIcon className={iconClasses} />} theme={theme}>
            투자
          </NavItem>
          <NavItem pageName="FixedCosts" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<FixedCostsIcon className={iconClasses} />} theme={theme}>
            고정비
          </NavItem>
          <NavItem pageName="Notes" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<NotesIcon className={iconClasses} />} theme={theme}>
            간단 노트
          </NavItem>
          <NavItem pageName="Schedule" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<ScheduleIcon className={iconClasses} />} theme={theme}>
            일정
          </NavItem>
          <NavItem pageName="Issues" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<IssuesIcon className={iconClasses} />} theme={theme}>
            이슈
          </NavItem>
          <li
            className={`my-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-slate-200'}`}
          ></li>
          <NavItem pageName="Settings" currentPage={currentPage} setCurrentPage={setCurrentPage} icon={<SettingsIcon className={iconClasses} />} theme={theme}>
            설정
          </NavItem>
        </ul>
      </nav>
    </aside>
  );
};

// SVG Icons
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DashboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const IncomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V6m0 0l-4 4m4-4l4 4M5 19h14" />
  </svg>
);

const ExpensesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const InvestmentsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const FixedCostsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const NotesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const IssuesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
);

const ScheduleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);


export default Sidebar;
