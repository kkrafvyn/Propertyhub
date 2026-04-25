import React from 'react';
import { ChevronDown, LogOut, Menu, Settings } from 'lucide-react';
import type { AppState, User } from '../types';
import { BrandMark } from './BrandMark';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface AppHeaderProps {
  currentUser: User | null;
  appState: AppState;
  onNavigation: (state: AppState) => void;
  onLogout: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  currentUser, 
  appState, 
  onNavigation, 
  onLogout 
}) => {

  const navigationItems = React.useMemo(() => {
    const baseItems = [
      { id: 'main', label: 'Home' },
      { id: 'marketplace', label: 'Properties' },
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'chat', label: 'Messages' },
    ];

    if (currentUser?.role === 'admin' || currentUser?.role === 'host') {
      baseItems.splice(4, 0, { id: 'property-management', label: 'Manage Properties' });
    }

    if (currentUser?.role === 'admin') {
      baseItems.splice(5, 0, { id: 'admin', label: 'Admin' });
    }

    return baseItems;
  }, [currentUser?.role]);

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl safe-area-inset">
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => onNavigation('main')}
            className="flex min-w-0 items-center gap-3 bg-transparent p-0 text-left"
            title="Home"
          >
            <BrandMark className="h-10 w-10 rounded-2xl shadow-[0_10px_24px_rgba(0,0,0,0.12)]" />
            <div className="hidden min-w-0 sm:block">
              <h1 className="truncate text-lg font-semibold tracking-tight">PropertyHub</h1>
            </div>
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
            <nav className="wire-nav-shell hidden items-center gap-1.5 border bg-card/92 p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] xl:flex">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigation(item.id as AppState)}
                  className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                    appState === item.id
                      ? 'wire-nav-link wire-nav-link-active'
                      : 'wire-nav-link'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`theme-panel-soft flex max-w-full items-center gap-3 rounded-full border px-2 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-colors ${
                    appState === 'profile-settings' ? 'bg-secondary/90' : 'hover:bg-secondary/70'
                  }`}
                  title="Account menu"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <Menu className="h-4 w-4" />
                  </span>

                  <div className="hidden min-w-0 text-left lg:block">
                    <p className="truncate text-sm font-medium">Account</p>
                    <p className="wire-navbar-subtle truncate text-xs capitalize">
                      {currentUser.role}
                    </p>
                  </div>

                  <div className="theme-panel-soft flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-[color:var(--panel-strong-foreground)] text-sm font-semibold">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground xl:block" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="theme-panel-soft w-64 rounded-2xl border bg-card/95 p-2 shadow-[0_14px_28px_rgba(15,23,42,0.12)]"
              >
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="truncate text-sm font-medium">{currentUser.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => onNavigation('profile-settings')}
                  className={`cursor-pointer rounded-xl px-3 py-2 ${appState === 'profile-settings' ? 'bg-secondary/70' : ''}`}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={onLogout}
                  className="cursor-pointer rounded-xl px-3 py-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
