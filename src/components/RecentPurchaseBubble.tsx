import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Church } from 'lucide-react';
import { RECENT_PARISH_PURCHASES } from '../data/parishes';
import { ActivityNotification } from '../types';

interface RecentPurchaseBubbleProps {
  onOpenReservation?: () => void;
}

export const RecentPurchaseBubble: React.FC<RecentPurchaseBubbleProps> = ({
  onOpenReservation
}) => {
  const [currentNotification, setCurrentNotification] = useState<ActivityNotification | null>(null);

  useEffect(() => {
    // Primera notificación tras 3 segundos
    const initialTimer = setTimeout(() => {
      showNext(0);
    }, 3000);

    return () => clearTimeout(initialTimer);
  }, []);

  const showNext = (idx: number) => {
    const item = RECENT_PARISH_PURCHASES[idx % RECENT_PARISH_PURCHASES.length];
    setCurrentNotification(item);

    // Desvanecer a los 4.5 segundos
    const hideTimer = setTimeout(() => {
      setCurrentNotification(null);

      // Esperar 15 a 22 segundos para la siguiente
      const nextDelay = 15000 + Math.floor(Math.random() * 7000);
      const nextTimer = setTimeout(() => {
        showNext(idx + 1);
      }, nextDelay);

      return () => clearTimeout(nextTimer);
    }, 4500);

    return () => clearTimeout(hideTimer);
  };

  if (!currentNotification) return null;

  return (
    <div className="fixed bottom-4 left-4 z-30 max-w-[290px] sm:max-w-xs pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10, transition: { duration: 0.25 } }}
          className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-lg border border-stone-200/80 text-stone-800 text-xs flex items-start gap-2.5 relative"
        >
          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
            <Church className="w-3.5 h-3.5" />
          </div>

          <div className="flex-1 min-w-0 pr-3">
            <p className="font-semibold text-stone-900 truncate">
              {currentNotification.personName}
            </p>
            <p className="text-[11px] text-stone-700 truncate">
              {currentNotification.parishName.replace(/\s*\(.*?\)\s*/g, '')}
            </p>
            <p className="text-[11px] font-medium text-amber-800 mt-0.5">
              Reservó {currentNotification.itemsPurchased}
            </p>
          </div>

          <button
            onClick={() => setCurrentNotification(null)}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-md"
            aria-label="Cerrar aviso"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
