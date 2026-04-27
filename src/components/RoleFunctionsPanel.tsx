import React from 'react';
import type { AppState, User } from '../types';
import { getRoleWorkspace } from '../utils/roleCapabilities';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { cn } from './ui/utils';

interface RoleFunctionsPanelProps {
  currentUser: User;
  onNavigate?: (state: AppState) => void;
  className?: string;
  maxItems?: number;
  compact?: boolean;
  title?: string;
  description?: string;
}

export function RoleFunctionsPanel({
  currentUser,
  onNavigate,
  className,
  maxItems,
  compact = false,
  title,
  description,
}: RoleFunctionsPanelProps) {
  const workspace = React.useMemo(() => getRoleWorkspace(currentUser), [currentUser]);
  const items = React.useMemo(
    () => workspace.functions.slice(0, maxItems ?? workspace.functions.length),
    [maxItems, workspace.functions],
  );

  return (
    <Card
      className={cn(
        'rounded-[32px] border border-border bg-card shadow-[0_20px_48px_rgba(15,23,42,0.06)]',
        className,
      )}
    >
      <CardHeader className={compact ? 'gap-3' : undefined}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="rounded-full border-border px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
              {workspace.label}
            </Badge>
            <div className="space-y-2">
              <CardTitle className={compact ? 'text-xl font-semibold' : 'text-2xl font-semibold'}>
                {title || workspace.workspaceTitle}
              </CardTitle>
              <CardDescription className={compact ? 'max-w-2xl text-sm' : 'max-w-3xl text-sm sm:text-base'}>
                {description || workspace.workspaceDescription}
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {workspace.highlights.map((highlight) => (
              <Badge
                key={highlight}
                variant="secondary"
                className="rounded-full border border-transparent bg-secondary/80 px-3 py-1.5 text-xs"
              >
                {highlight}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className={cn('grid gap-4', compact ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-4')}>
          {items.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className="rounded-[26px] border border-border/80 bg-background/95 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/85 text-foreground shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge
                    variant={index === 0 ? 'default' : 'outline'}
                    className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]"
                  >
                    Core
                  </Badge>
                </div>

                <div className="mt-4 space-y-2">
                  <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>

                {onNavigate ? (
                  <Button
                    variant={index === 0 ? 'default' : 'outline'}
                    size="sm"
                    className="mt-5"
                    onClick={() => onNavigate(item.state)}
                  >
                    {item.cta}
                  </Button>
                ) : (
                  <div className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {item.cta}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default RoleFunctionsPanel;
