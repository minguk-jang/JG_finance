import React, { useState, useEffect } from 'react';

interface PWAInstallPromptProps {
  theme: 'dark' | 'light';
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Prompt Component
 *
 * Displays a banner prompting users to install the app to their home screen.
 * Respects user preferences and shows/hides banner based on install state.
 */
const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ theme }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const installed = window.localStorage.getItem('pwa-installed');
      if (installed) {
        setIsInstalled(true);
        setShowPrompt(false);
        return;
      }

      // Check if running as PWA
      if (window.navigator.standalone === true) {
        window.localStorage.setItem('pwa-installed', 'true');
        setIsInstalled(true);
        setShowPrompt(false);
      }
    };

    checkInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const evt = e as BeforeInstallPromptEvent;
      // Prevent the mini-infobar from appearing on mobile
      evt.preventDefault();

      // Store the event for later use
      setDeferredPrompt(evt);

      // Show install prompt unless user has dismissed it
      const dismissed = window.localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }

      console.log('[PWA] Install prompt ready');
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      console.log('[PWA] App installed');
      window.localStorage.setItem('pwa-installed', 'true');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User response: ${outcome}`);

      // Clear the deferred prompt
      setDeferredPrompt(null);
      setShowPrompt(false);

      if (outcome === 'accepted') {
        window.localStorage.setItem('pwa-installed', 'true');
        setIsInstalled(true);
      }
    } catch (error) {
      console.error('[PWA] Installation failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    window.localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if not available or already installed
  if (!showPrompt || isInstalled || !deferredPrompt) {
    return null;
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const buttonBgColor = isDark ? 'bg-sky-600 hover:bg-sky-700' : 'bg-sky-500 hover:bg-sky-600';

  return (
    <div
      className={`
        fixed bottom-4 left-4 right-4 sm:left-6 sm:right-6 md:left-auto md:right-6 md:w-96
        ${bgColor} border ${borderColor}
        rounded-lg shadow-lg p-4 sm:p-6
        z-50 animate-in fade-in slide-in-from-bottom-4 duration-300
      `}
      role="alert"
      aria-live="polite"
      aria-label="Install app prompt"
    >
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className={`absolute top-2 right-2 text-gray-500 hover:text-gray-700 p-1 md:p-2 transition-colors`}
        aria-label="Close install prompt"
      >
        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="pr-6">
        {/* Header */}
        <div className="mb-3 md:mb-4">
          <h3 className={`text-lg md:text-xl font-semibold ${textColor} flex items-center gap-2`}>
            <svg className="w-6 h-6 md:w-7 md:h-7 text-sky-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            쭈꾹 가계부를 설치하세요
          </h3>
        </div>

        {/* Description */}
        <p className={`text-sm md:text-base mb-4 md:mb-6 ${textColor} opacity-80`}>
          홈 화면에 앱을 추가하여 언제 어디서나 빠르게 접근할 수 있습니다.
          오프라인 상태에서도 이전 데이터를 볼 수 있습니다.
        </p>

        {/* Features */}
        <ul className={`text-xs md:text-sm space-y-2 mb-4 md:mb-6 ${textColor} opacity-75`}>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>빠른 로딩 속도</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>오프라인 지원</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>인터넷 없이도 사용 가능</span>
          </li>
        </ul>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <button
            onClick={handleInstall}
            className={`
              flex-1 px-4 py-2 md:py-3
              ${buttonBgColor}
              text-white font-semibold rounded-lg
              transition-colors duration-200
              text-sm md:text-base
              active:scale-95 transform
            `}
            aria-label="Install app"
          >
            지금 설치
          </button>
          <button
            onClick={handleDismiss}
            className={`
              flex-1 px-4 py-2 md:py-3
              ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}
              ${isDark ? 'text-gray-100' : 'text-gray-900'}
              font-semibold rounded-lg
              transition-colors duration-200
              text-sm md:text-base
              active:scale-95 transform
            `}
            aria-label="Dismiss install prompt"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
