import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Search, MessageSquare, User as UserIcon, Settings, CreditCard } from 'lucide-react';

interface MobileNavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileNavigation({ currentTab, onTabChange }: MobileNavigationProps) {
  const tabs = [
    { id: 'main', label: 'Home', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'dashboard', label: 'Dashboard', icon: UserIcon },
    { id: 'profile', label: 'Profile', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border z-50">
      <div className="flex items-center justify-around py-2 safe-area-pb">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
              currentTab === tab.id
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}
            whileTap={{ scale: 0.9 }}
          >
            <tab.icon className={`w-5 h-5 mb-1 ${currentTab === tab.id ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium uppercase tracking-tighter">{tab.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

interface TouchGesturesProps {
  children: React.ReactNode;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function TouchGestures({ children, onDoubleTap, onLongPress }: TouchGesturesProps) {
  const [lastTap, setLastTap] = useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => {
      onLongPress?.();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    const now = Date.now();
    if (now - lastTap < 300) {
      onDoubleTap?.();
    }
    setLastTap(now);
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        const now = Date.now();
        if (now - lastTap < 300) {
          onDoubleTap?.();
        }
        setLastTap(now);
      }}
    >
      {children}
    </div>
  );
}

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
}

export function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-[32px] p-6 z-[70] shadow-2xl safe-area-pb border-t"
          >
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" onClick={onClose} />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}