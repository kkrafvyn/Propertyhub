import React from 'react';
import { Home, Building, LayoutDashboard, MessageCircle, Settings } from 'lucide-react';
import type { AppState } from '../types';

interface BottomNavProps {
  appState: AppState;
  onNavigation: (state: AppState) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ appState, onNavigation }) => {
  const navItems = [
    { id: 'main', label: 'Home', icon: Home },
    { id: 'marketplace', label: 'Properties', icon: Building },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Messages', icon: MessageCircle },
    { id: 'profile-settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="wire-navbar fixed bottom-3 left-3 right-3 z-50 overflow-hidden rounded-[28px] safe-area-pb lg:hidden">
      <div className="flex items-center justify-around gap-1 px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = appState === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigation(item.id as AppState)}
              aria-label={item.label}
              title={item.label}
              className={`flex h-12 w-12 flex-none items-center justify-center rounded-[18px] p-0 transition-colors ${
                isActive
                  ? 'wire-nav-link wire-nav-link-active'
                  : 'wire-nav-link'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="sr-only">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
