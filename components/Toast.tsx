'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function Toast({
  message,
  visible,
}: {
  message: string;
  visible: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] bg-accent text-dark-bg px-5 py-2.5 rounded-lg text-sm font-medium font-[family-name:var(--font-outfit)] shadow-sm"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
