'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const notificationIcons = {
  reply: '💬',
  like: '❤️',
  follow: '👥',
  purchase: '💰',
  badge: '🏆',
  system: '📢',
};

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const recentNotifications = notifications.slice(0, 5);

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleViewAll = () => {
    router.push('/notifications');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
            data-testid="button-notification-bell"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span 
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                data-testid="badge-notification-count"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {isConnected && (
              <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="end">
          <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs"
                data-testid="button-mark-all-read"
              >
                Mark all read
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : recentNotifications.length > 0 ? (
            <ScrollArea className="h-[300px]">
              {recentNotifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`cursor-pointer p-3 ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex gap-3 w-full">
                    <div className="flex-shrink-0 text-xl">
                      {notificationIcons[notification.type as keyof typeof notificationIcons] || '🔔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">
                        {notification.title}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 bg-blue-500 rounded-full" />
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleViewAll}
            className="text-center justify-center font-medium"
            data-testid="button-view-all-notifications"
          >
            View all notifications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}