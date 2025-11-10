import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

interface Notification {
  id: string;
  type: 'reply' | 'like' | 'follow' | 'purchase' | 'badge' | 'system';
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', { limit: 100 }],
    enabled: isAuthenticated,
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: isAuthenticated,
  });

  const unreadCount = unreadData?.count ?? 0;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest('POST', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Show toast notification
  const showToastNotification = useCallback((notification: Notification) => {
    const iconMap = {
      reply: '💬',
      like: '❤️',
      follow: '👥',
      purchase: '💰',
      badge: '🏆',
      system: '📢',
    };

    const icon = iconMap[notification.type] || '🔔';

    toast(notification.title, {
      description: notification.message,
      icon,
      duration: 5000,
      action: notification.actionUrl ? {
        label: 'View',
        onClick: () => {
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
        },
      } : undefined,
      onDismiss: () => {
        if (!notification.isRead) {
          markAsReadMutation.mutate(notification.id);
        }
      },
    });
  }, [markAsReadMutation]);

  // WebSocket connection
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    // Connect to the dashboard WebSocket namespace
    const socketInstance = io('/dashboard', {
      transports: ['websocket'],
      upgrade: false,
      auth: {
        userId: user.id,
      },
    });

    socketInstance.on('connect', () => {
      console.log('[Notifications] WebSocket connected');
      setIsConnected(true);
      
      // Join user's room for notifications
      socketInstance.emit('join-user-room', user.id);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Notifications] WebSocket disconnected');
      setIsConnected(false);
    });

    // Listen for new notifications
    socketInstance.on('notification', (notification: Notification) => {
      console.log('[Notifications] New notification received:', notification);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      
      // Show toast notification
      showToastNotification(notification);
      
      // Play notification sound if enabled
      const soundEnabled = localStorage.getItem('notificationSound') !== 'false';
      if (soundEnabled) {
        playNotificationSound();
      }
    });

    // Listen for unread count updates
    socketInstance.on('notification:unread-update', (data: { increment?: number; count?: number }) => {
      if (data.count !== undefined) {
        queryClient.setQueryData(['/api/notifications/unread-count'], { count: data.count });
      } else if (data.increment) {
        queryClient.setQueryData(['/api/notifications/unread-count'], (old: { count: number } | undefined) => ({
          count: (old?.count ?? 0) + data.increment!,
        }));
      }
    });

    // Listen for notification marked as read
    socketInstance.on('notification:read', (data: { notificationId: string }) => {
      queryClient.setQueryData(['/api/notifications'], (old: Notification[] | undefined) => {
        if (!old) return old;
        return old.map((n) =>
          n.id === data.notificationId ? { ...n, isRead: true } : n
        );
      });
      
      // Update unread count
      queryClient.setQueryData(['/api/notifications/unread-count'], (old: { count: number } | undefined) => ({
        count: Math.max(0, (old?.count ?? 1) - 1),
      }));
    });

    // Listen for all notifications marked as read
    socketInstance.on('notification:all-read', () => {
      queryClient.setQueryData(['/api/notifications'], (old: Notification[] | undefined) => {
        if (!old) return old;
        return old.map((n) => ({ ...n, isRead: true }));
      });
      
      queryClient.setQueryData(['/api/notifications/unread-count'], { count: 0 });
    });

    setSocket(socketInstance);

    // Cleanup
    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [isAuthenticated, user?.id, queryClient, showToastNotification]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch((err) => {
        console.warn('[Notifications] Could not play sound:', err);
      });
    } catch (error) {
      console.warn('[Notifications] Sound playback failed:', error);
    }
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('[Notifications] Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: Notification) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const options: NotificationOptions = {
      body: notification.message,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: notification.id,
      requireInteraction: false,
      silent: false,
    };

    const browserNotification = new Notification(notification.title, options);

    browserNotification.onclick = () => {
      window.focus();
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl;
      }
      browserNotification.close();
    };
  }, []);

  return {
    notifications: notifications ?? [],
    unreadCount,
    isLoading,
    isConnected,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    requestNotificationPermission,
    showBrowserNotification,
    showToastNotification,
  };
}