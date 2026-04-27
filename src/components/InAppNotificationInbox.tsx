import React from 'react';
import {
  Bell,
  CheckCheck,
  LoaderCircle,
  MessageCircle,
  Trash2,
} from 'lucide-react';
import { usePushNotifications, type InboxNotification } from './PushNotificationService';
import { useMobile } from '../hooks/useMobile';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';

const formatNotificationTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now';
  }

  const elapsedMs = Date.now() - parsed.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}d ago`;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
};

const dispatchNotificationNavigation = (notification: InboxNotification): void => {
  if (typeof window === 'undefined') return;

  const roomId = notification.data.roomId;
  if (typeof roomId === 'string' && roomId) {
    window.dispatchEvent(new CustomEvent('navigate-to-chat', { detail: { roomId } }));
    return;
  }

  const propertyId = notification.data.propertyId;
  if (typeof propertyId === 'string' && propertyId) {
    window.dispatchEvent(
      new CustomEvent('navigate-to-property', { detail: { propertyId } }),
    );
  }
};

const NotificationList = ({
  loadingNotifications,
  notifications,
  onDelete,
  onMarkAllRead,
  onOpen,
  unreadCount,
}: {
  loadingNotifications: boolean;
  notifications: InboxNotification[];
  onDelete: (notificationId: string) => void;
  onMarkAllRead: () => void;
  onOpen: (notification: InboxNotification) => void;
  unreadCount: number;
}) => (
  <div className="flex h-full min-h-0 flex-col">
    <div className="flex items-center justify-between gap-3 border-b border-border px-1 pb-4">
      <div>
        <h3 className="text-lg font-semibold">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Booking, message, and account updates in one place.
        </p>
      </div>

      {unreadCount > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onMarkAllRead}
          className="rounded-full"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      ) : null}
    </div>

    <ScrollArea className="mt-4 flex-1">
      <div className="space-y-3 pr-3">
        {loadingNotifications ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-secondary/35 px-5 py-10 text-center">
            <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No notifications yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New messages, bookings, and alerts will show up here.
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => onOpen(notification)}
              className={`w-full rounded-[24px] border px-4 py-4 text-left transition-colors hover:bg-secondary/60 ${
                notification.read
                  ? 'border-border bg-background'
                  : 'border-primary/20 bg-primary/5'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="theme-accent-icon mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px]">
                  <MessageCircle className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{notification.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {notification.body}
                      </p>
                    </div>

                    {!notification.read ? (
                      <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {notification.type.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(notification.id);
                      }}
                      className="h-8 rounded-full px-2 text-muted-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </ScrollArea>
  </div>
);

export function InAppNotificationInbox() {
  const {
    deleteNotification,
    loadingNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    notifications,
    refreshNotificationInbox,
    unreadCount,
  } = usePushNotifications();
  const isMobile = useMobile();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      void refreshNotificationInbox();
    }
  }, [open, refreshNotificationInbox]);

  const handleOpenNotification = async (notification: InboxNotification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }

    dispatchNotificationNavigation(notification);
    setOpen(false);
  };

  const trigger = (
    <button
      type="button"
      className="theme-panel-soft relative flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground shadow-[0_16px_32px_rgba(15,23,42,0.08)] transition-all hover:bg-secondary/70 hover:text-foreground"
      title="Open notifications"
      aria-label="Open notifications"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span className="absolute right-0 top-0 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </button>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-none border-0 bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-none sm:max-w-2xl sm:border sm:px-6 sm:pb-6 sm:pt-6">
          <DialogHeader className="sr-only">
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>View recent PropertyHub alerts.</DialogDescription>
          </DialogHeader>
          <NotificationList
            loadingNotifications={loadingNotifications}
            notifications={notifications}
            onDelete={(notificationId) => {
              void deleteNotification(notificationId);
            }}
            onMarkAllRead={() => {
              void markAllNotificationsAsRead();
            }}
            onOpen={(notification) => {
              void handleOpenNotification(notification);
            }}
            unreadCount={unreadCount}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="theme-panel-soft w-[min(26rem,calc(100vw-1.25rem))] rounded-[28px] border bg-card/95 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
      >
        <NotificationList
          loadingNotifications={loadingNotifications}
          notifications={notifications}
          onDelete={(notificationId) => {
            void deleteNotification(notificationId);
          }}
          onMarkAllRead={() => {
            void markAllNotificationsAsRead();
          }}
          onOpen={(notification) => {
            void handleOpenNotification(notification);
          }}
          unreadCount={unreadCount}
        />
      </PopoverContent>
    </Popover>
  );
}

export default InAppNotificationInbox;
