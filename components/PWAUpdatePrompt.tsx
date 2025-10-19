import { useState, useEffect } from 'react';

interface PWAUpdatePromptProps {
  onUpdate?: () => void;
  onDismiss?: () => void;
}

/**
 * PWA 업데이트 알림 컴포넌트
 *
 * 새 버전의 Service Worker가 준비되었을 때 사용자에게 알리고
 * 업데이트를 수락하거나 거절할 수 있도록 함
 *
 * 사용법: App.tsx에 <PWAUpdatePrompt /> 추가
 */
export default function PWAUpdatePrompt({ onUpdate, onDismiss }: PWAUpdatePromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // vite-plugin-pwa가 등록한 전역 업데이트 함수 확인
    const updateSW = (window as any).__PWA_UPDATE__;

    if (updateSW) {
      // 업데이트가 필요할 때 알림 표시
      // 이는 Service Worker가 새 버전을 감지했을 때 호출됨
      console.log('PWA 업데이트 시스템 초기화됨');
    }

    // 온라인 상태 변경 감지
    window.addEventListener('online', () => {
      console.log('온라인 상태로 복구됨');
      // 업데이트 체크
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
      }
    });

    return () => {
      window.removeEventListener('online', () => {});
    };
  }, []);

  // Service Worker 메시지 수신 대기
  useEffect(() => {
    let messageListener: (event: MessageEvent) => void;

    if ('serviceWorker' in navigator) {
      messageListener = (event: MessageEvent) => {
        // 업데이트 가능 신호
        if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
          setShowPrompt(true);
        }
      };

      navigator.serviceWorker.addEventListener('message', messageListener);
    }

    return () => {
      if (messageListener && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', messageListener);
      }
    };
  }, []);

  const handleUpdate = () => {
    const updateSW = (window as any).__PWA_UPDATE__;

    if (updateSW) {
      // 업데이트 실행
      updateSW();
      onUpdate?.();
      setShowPrompt(false);

      // 약간의 지연 후 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-50 animate-slide-up">
      {/* 반투명 배경 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 md:hidden"
        onClick={handleDismiss}
      />

      {/* 알림 카드 */}
      <div className="relative bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl shadow-xl p-6 text-white border border-sky-400">
        {/* 닫기 버튼 */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          aria-label="닫기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 내용 */}
        <div className="pr-8">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="font-semibold text-lg">업데이트 준비 완료</h3>
          </div>
          <p className="text-sm text-sky-100 mb-4">
            새로운 버전의 쭈꾹 가계부가 준비되었습니다. 지금 업데이트하시겠습니까?
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleUpdate}
            className="flex-1 bg-white text-sky-600 font-semibold py-2 rounded-lg hover:bg-sky-50 transition-colors"
          >
            지금 업데이트
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 bg-sky-700 text-white font-semibold py-2 rounded-lg hover:bg-sky-800 transition-colors"
          >
            나중에
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
