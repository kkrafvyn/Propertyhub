import React from 'react';
import { Settings } from 'lucide-react';
import type { AppState, User } from '../types';
import {
  getPrimaryNavigation,
  isNavigationItemActive,
} from '../utils/appNavigation';

interface BottomNavProps {
  currentUser: User;
  appState: AppState;
  onNavigation: (state: AppState) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentUser, appState, onNavigation }) => {
  const navItems = React.useMemo(
    () => [
      ...getPrimaryNavigation(currentUser.role),
      { id: 'profile-settings' as AppState, label: 'Settings', icon: Settings },
    ],
    [currentUser.role]
  );

  return (
    <nav className="mobile-bottom-offset safe-area-pb fixed inset-x-3 z-50 mx-auto max-w-[42rem] overflow-hidden rounded-[32px] border border-border/70 bg-card/92 shadow-[0_24px_44px_rgba(15,23,42,0.12)] lg:hidden">
      <div className="wire-nav-shell flex items-stretch justify-between gap-1 px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavigationItemActive(appState, item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigation(item.id)}
              aria-label={item.label}
              title={item.label}
              className={`touch-target flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[22px] px-2 py-2.5 text-[11px] font-medium transition-all ${
                isActive
                  ? 'bg-background text-foreground shadow-[0_10px_18px_rgba(15,23,42,0.08)]'
                  : 'text-muted-foreground hover:bg-secondary/85 hover:text-foreground'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="truncate leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
