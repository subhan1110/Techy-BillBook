import React from 'react';
import { motion } from 'motion/react';
import { useBillBook } from '../../context/BillBookContext';

export const SplashScreen: React.FC = () => {
  const { language, t } = useBillBook();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0F294A] text-white px-6 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center max-w-md"
      >
        <div className="w-20 h-20 rounded-3xl bg-white p-2.5 shadow-xl shadow-black/25 flex items-center justify-center">
          <img
            src="/icon.svg"
            alt="Techy BillBook Logo"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        <h1 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight text-white">
          {t.appName}
        </h1>

        <p className="mt-2.5 text-sm sm:text-base font-medium text-blue-100/90">
          Smart Billing for Your Business
        </p>

        {language === 'gu' && (
          <p className="mt-1 text-xs text-blue-200/80">
            તમારા વ્યવસાય માટે સ્માર્ટ બિલિંગ
          </p>
        )}

        <div className="mt-10 w-8 h-1 rounded-full bg-white/20 overflow-hidden">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
            className="w-full h-full bg-blue-400 rounded-full"
          />
        </div>
      </motion.div>
    </div>
  );
};
