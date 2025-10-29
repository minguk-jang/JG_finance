import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

interface AuthModalProps {
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Save rememberMe preference before login
    window.localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          // Check user approval status after successful login
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const users = await api.getUsers();
            const profile = users.find((u: any) => u.id === user.id);

            if (profile && profile.status !== 'approved') {
              // User is not approved - logout and show message
              await supabase.auth.signOut();
              if (profile.status === 'pending') {
                setError('관리자의 승인을 기다려주세요. 승인 후 로그인할 수 있습니다.');
              } else if (profile.status === 'rejected') {
                setError('계정이 거부되었습니다. 관리자에게 문의해주세요.');
              }
              setLoading(false);
              return;
            }
          }
          onClose();
        }
      } else {
        if (!name.trim()) {
          setError('이름을 입력해주세요');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, name);
        if (error) {
          setError(error.message);
        } else {
          // Inform user about approval requirement
          setError('회원가입이 완료되었습니다. 관리자의 승인을 기다려주세요.');
          setMode('signin'); // Switch to signin mode
          setPassword(''); // Clear password for security
        }
      }
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-[100] p-4">
      <div className="bg-[var(--card-bg)] rounded-lg shadow-2xl max-w-md w-full p-6 relative">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center">
            {mode === 'signin' ? '로그인' : '회원가입'}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] text-center mt-2">
            JG Finance에 오신 것을 환영합니다
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                required={mode === 'signup'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
              required
              minLength={6}
            />
            {mode === 'signup' && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                최소 6자 이상 (Supabase 정책)
              </p>
            )}
          </div>

          {/* 자동 로그인 체크박스 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-[var(--bg-primary)] border-[var(--border-color)] rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
            />
            <label
              htmlFor="rememberMe"
              className="ml-2 text-sm text-[var(--text-secondary)] cursor-pointer select-none"
            >
              자동 로그인 (브라우저를 닫아도 로그인 유지)
            </label>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? '처리 중...'
              : mode === 'signin'
              ? '로그인'
              : '회원가입'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            {mode === 'signin'
              ? '계정이 없으신가요? 회원가입'
              : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
