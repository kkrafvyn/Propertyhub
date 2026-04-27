import React from 'react';
import {
  CreditCard,
  LifeBuoy,
  LogOut,
  Menu,
  LockKeyhole,
  Settings,
} from 'lucide-react';
import type { AppState, User } from '../types';
import { BrandMark } from './BrandMark';
import { InAppNotificationInbox } from './InAppNotificationInbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  getHomeStateForRole,
  getPrimaryNavigation,
  isNavigationItemActive,
} from '../utils/appNavigation';
import { getRoleWorkspace } from '../utils/roleCapabilities';

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
  onLogout,
}) => {
  const navigationItems = React.useMemo(
    () => getPrimaryNavigation(currentUser?.role),
    [currentUser?.role]
  );

  const homeState = React.useMemo(
    () => getHomeStateForRole(currentUser?.role),
    [currentUser?.role]
  );
  const roleWorkspace = React.useMemo(
    () => getRoleWorkspace(currentUser),
    [currentUser]
  );
  const accountStateActive = React.useMemo(
    () => new Set<AppState>(['profile-settings', 'billing', 'privacy', 'help']).has(appState),
    [appState]
  );

  if (!currentUser) return null;

  return (
    <header className="safe-area-pt safe-area-px sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="wire-navbar mx-auto flex max-w-7xl items-center gap-3 rounded-[28px] border border-border/70 px-3 py-2.5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-4">
          <button
            type="button"
            onClick={() => onNavigation(homeState)}
            className="flex min-w-0 flex-1 items-center gap-3 bg-transparent p-0 text-left"
            title="Go to primary view"
          >
            <BrandMark className="h-11 w-11 rounded-[18px] shadow-[0_10px_24px_rgba(0,0,0,0.12)]" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">PropertyHub</h1>
              <p className="wire-navbar-subtle text-xs">
                Modern leasing and sales, minus the noise
              </p>
            </div>
          </button>

          <div className="ml-auto flex items-center justify-end gap-2">
            <InAppNotificationInbox />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`theme-panel-soft flex h-14 items-center gap-2 rounded-full border border-border/70 px-2 py-2 shadow-[0_16px_32px_rgba(15,23,42,0.08)] transition-all ${
                    accountStateActive
                      ? 'bg-secondary/85'
                      : 'hover:bg-secondary/70 hover:shadow-[0_20px_42px_rgba(15,23,42,0.1)]'
                  }`}
                  title="Account menu"
                  aria-label="Open navigation and account menu"
                >
                  <span className="theme-panel-soft flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground">
                    <Menu className="h-4 w-4" />
                  </span>

                  <div className="theme-panel-soft flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/90">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-[color:var(--panel-strong-foreground)] text-sm font-semibold">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="theme-panel-soft w-[min(22rem,calc(100vw-1.25rem))] rounded-[28px] border bg-card/95 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
              >
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="flex items-center gap-3 rounded-[22px] border border-border/70 bg-background/80 px-3 py-3">
                    <div className="theme-panel-soft flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/90">
                      {currentUser.avatar ? (
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.name}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-[color:var(--panel-strong-foreground)] text-sm font-semibold">
                          {currentUser.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{currentUser.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
                    </div>

                    <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {roleWorkspace.label}
                    </span>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Navigation
                </DropdownMenuLabel>

                <DropdownMenuGroup>
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isNavigationItemActive(appState, item.id);

                    return (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => onNavigation(item.id)}
                        className={`cursor-pointer rounded-2xl px-3 py-3 ${
                          isActive ? 'bg-secondary/80' : ''
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex flex-1 items-center justify-between gap-3">
                          <span>{item.label}</span>
                          {isActive ? (
                            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                              Open
                            </span>
                          ) : null}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => onNavigation('profile-settings')}
                  className={`cursor-pointer rounded-2xl px-3 py-3 ${
                    appState === 'profile-settings' ? 'bg-secondary/80' : ''
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onNavigation('billing')}
                  className={`cursor-pointer rounded-2xl px-3 py-3 ${
                    appState === 'billing' ? 'bg-secondary/80' : ''
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Billing
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onNavigation('privacy')}
                  className={`cursor-pointer rounded-2xl px-3 py-3 ${
                    appState === 'privacy' ? 'bg-secondary/80' : ''
                  }`}
                >
                  <LockKeyhole className="h-4 w-4" />
                  Privacy
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onNavigation('help')}
                  className={`cursor-pointer rounded-2xl px-3 py-3 ${
                    appState === 'help' ? 'bg-secondary/80' : ''
                  }`}
                >
                  <LifeBuoy className="h-4 w-4" />
                  Help
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={onLogout}
                  className="cursor-pointer rounded-2xl px-3 py-3 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </div>
    </header>
  );
};

export default AppHeader;
