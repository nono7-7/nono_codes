'use client';

import { useEffect, useState } from 'react';
import { X, Bell, Download, CheckCircle2, MoreVertical, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function NotificationHelpModal({
  isOpen,
  onClose,
  isDark,
  installPrompt,
  onInstall,
  onEnableNotifications,
}: {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  installPrompt?: BeforeInstallPromptEvent | null;
  onInstall?: () => void;
  onEnableNotifications?: () => Promise<boolean>;
}) {
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notifState, setNotifState] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [installDone, setInstallDone] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent));
    setIsInstalled(
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    );
    if ('Notification' in window && Notification.permission === 'granted') setNotifState('granted');
    else if ('Notification' in window && Notification.permission === 'denied') setNotifState('denied');
    else setNotifState('idle');
  }, [isOpen]);

  const stepCard = isDark ? 'bg-dark-bg border border-dark-border' : 'bg-gray-50 border border-light-border';
  const innerCard = isDark ? 'bg-dark-card border border-dark-border' : 'bg-white border border-light-border';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />

          <motion.div
            className={`relative w-full max-w-md rounded-t-2xl ${isDark ? 'bg-dark-card' : 'bg-white'} px-5 pt-5 pb-10 z-10 max-h-[90vh] overflow-y-auto`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className={`mx-auto mb-4 w-10 h-1 rounded-full ${isDark ? 'bg-dark-border' : 'bg-gray-200'}`} />

            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={onClose} className={`flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-lg ${isDark ? 'text-muted hover:text-primary' : 'text-muted hover:text-primary'}`}>
                <ArrowLeft size={16} />
                Back
              </button>
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-accent" />
                <h2 className="font-semibold text-sm">Push notifications setup</h2>
              </div>
              <button type="button" onClick={onClose} className="p-1 text-muted">
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-muted mb-4 leading-relaxed">
              Push notifications let InTouch remind you about planned interactions — even when the app is closed. Two steps required.
            </p>

            {/* Step 1 */}
            <div className={`rounded-xl p-4 mb-3 ${stepCard}`}>
              <p className="text-xs font-bold text-accent uppercase tracking-wide mb-3">Step 1 — Add to Home Screen</p>

              {isInstalled ? (
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 size={16} />
                  Already installed on your home screen
                </div>
              ) : isIOS ? (
                <div className="space-y-3 text-sm">
                  <p className="text-muted leading-relaxed">
                    On iPhone/iPad, push notifications only work from the home screen version of InTouch — not directly from Safari.
                  </p>
                  <div className={`rounded-lg p-3 space-y-3 text-[13px] ${innerCard}`}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                      <p>In <strong>Safari</strong>, tap the <strong>Share</strong> button <svg width="12" height="14" viewBox="0 0 12 14" fill="none" className="inline mx-0.5 -mt-0.5 align-middle" xmlns="http://www.w3.org/2000/svg"><path d="M6 9V1M6 1L3 4M6 1L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 7v5a1 1 0 001 1h8a1 1 0 001-1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> at the bottom of the screen.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                      <p>Scroll down and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                      <p>Open <strong>InTouch from your home screen</strong> (not Safari) — come back to Settings to complete Step 2.</p>
                    </div>
                  </div>
                </div>
              ) : installPrompt ? (
                <div className="space-y-3 text-sm">
                  <p className="text-muted leading-relaxed">Install InTouch on your home screen to receive push notifications when the app is closed.</p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!installPrompt) return;
                      await installPrompt.prompt();
                      const { outcome } = await installPrompt.userChoice;
                      if (outcome === 'accepted') {
                        setInstallDone(true);
                        onInstall?.();
                      }
                    }}
                    disabled={installDone}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      installDone
                        ? 'bg-green-500/15 border border-green-500/30 text-green-500'
                        : 'bg-accent/15 border border-accent/30 text-accent active:scale-[0.98]'
                    }`}
                  >
                    {installDone ? <CheckCircle2 size={18} /> : <Download size={18} />}
                    {installDone ? 'Added to home screen' : 'Add to home screen'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted leading-relaxed">
                  On Android Chrome, tap the <strong>menu</strong> <MoreVertical size={12} className="inline mx-0.5 -mt-0.5" /> in the top-right corner, then tap <strong>Add to Home screen</strong>.
                </p>
              )}
            </div>

            {/* Step 2 */}
            <div className={`rounded-xl p-4 mb-5 ${stepCard}`}>
              <p className="text-xs font-bold text-accent uppercase tracking-wide mb-3">Step 2 — Enable Notifications</p>
              {notifState === 'granted' ? (
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 size={16} />
                  Notifications are already enabled
                </div>
              ) : notifState === 'denied' ? (
                <p className="text-sm text-muted leading-relaxed">
                  Notifications are blocked by your browser. Go to your <strong>device Settings → Safari / Chrome → Notifications</strong> and allow InTouch, then try again.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted leading-relaxed">
                    {isIOS && !isInstalled
                      ? 'Complete Step 1 first. Then open InTouch from your home screen and tap Enable below.'
                      : 'Allow InTouch to send you push notifications.'}
                  </p>
                  {onEnableNotifications && (
                    <button
                      type="button"
                      disabled={isIOS && !isInstalled}
                      onClick={async () => {
                        const ok = await onEnableNotifications();
                        setNotifState(ok ? 'granted' : 'denied');
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        isIOS && !isInstalled
                          ? 'opacity-40 bg-accent/10 border border-accent/20 text-accent cursor-not-allowed'
                          : 'bg-accent/15 border border-accent/30 text-accent active:scale-[0.98]'
                      }`}
                    >
                      <Bell size={18} />
                      Enable push notifications
                    </button>
                  )}
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted text-center mb-4">
              Reminders are sent at 9 AM UTC for interactions due today or in 2 days.
            </p>

            <button
              type="button"
              onClick={onClose}
              className={`w-full py-3 rounded-xl text-sm font-semibold border transition-colors ${isDark ? 'border-dark-border text-muted hover:text-primary' : 'border-light-border text-muted hover:text-primary'}`}
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
