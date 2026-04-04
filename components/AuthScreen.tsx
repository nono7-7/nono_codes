'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { registerUser, loginUser, resetPassword } from '@/lib/firebase';

type Mode = 'login' | 'register' | 'reset';

export default function AuthScreen({ isDark }: { isDark: boolean }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const inputClass = `w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none border ${
    isDark
      ? 'bg-dark-card border-dark-border text-white placeholder:text-muted'
      : 'bg-white border-light-border text-zinc-900 placeholder:text-muted'
  }`;

  const formatError = (code: string) => {
    switch (code) {
      case 'auth/email-already-in-use': return 'An account with this email already exists.';
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      case 'auth/invalid-credential': return 'Invalid email or password.';
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/wrong-password': return 'Incorrect password.';
      case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
      default: return 'Something went wrong. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        await registerUser(email, password);
      } else if (mode === 'login') {
        await loginUser(email, password);
      } else if (mode === 'reset') {
        await resetPassword(email);
        setResetSent(true);
        setLoading(false);
        return;
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      setError(formatError(code));
    }
    setLoading(false);
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError('');
    setResetSent(false);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-6 ${isDark ? 'bg-dark-bg' : 'bg-light-bg'}`}>
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className={`font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            InTouch
          </h1>
          <p className="text-muted text-sm mt-2">
            {mode === 'login' && 'Your network, always within reach.'}
            {mode === 'register' && 'Create your account.'}
            {mode === 'reset' && 'Reset your password.'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleSubmit}
            className="space-y-3"
          >
            {/* Email */}
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className={inputClass}
                autoComplete="email"
              />
            </div>

            {/* Password (not for reset) */}
            {mode !== 'reset' && (
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  className={`${inputClass} pr-10`}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}

            {/* Confirm Password (register only) */}
            {mode === 'register' && (
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                  minLength={6}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-red-400 text-xs px-1">{error}</p>
            )}

            {/* Reset sent */}
            {resetSent && (
              <p className="text-accent text-xs px-1">Reset link sent! Check your email.</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg text-sm font-semibold font-[family-name:var(--font-outfit)] flex items-center justify-center gap-2 transition-all ${
                loading
                  ? 'bg-muted/20 text-muted cursor-not-allowed'
                  : 'bg-accent text-dark-bg active:scale-[0.98]'
              }`}
            >
              {loading ? (
                'Please wait...'
              ) : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'reset' && 'Send Reset Link'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </motion.form>
        </AnimatePresence>

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          {mode === 'login' && (
            <>
              <button onClick={() => switchMode('reset')} className="text-xs text-muted hover:text-accent transition-colors block mx-auto">
                Forgot password?
              </button>
              <p className="text-xs text-muted">
                Don&apos;t have an account?{' '}
                <button onClick={() => switchMode('register')} className="text-accent font-medium">
                  Sign up
                </button>
              </p>
            </>
          )}
          {mode === 'register' && (
            <p className="text-xs text-muted">
              Already have an account?{' '}
              <button onClick={() => switchMode('login')} className="text-accent font-medium">
                Sign in
              </button>
            </p>
          )}
          {mode === 'reset' && (
            <button onClick={() => switchMode('login')} className="text-xs text-accent font-medium">
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
