import { useState, useEffect, useCallback } from 'react';
import { AppState, User, AppView, Property, PendingBooking } from '../types';

export function useAppState() {
  const [appState, setAppState] = useState<AppState>('splash');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('marketplace');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      const savedUser = localStorage.getItem('propertyHubUser');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setAppState('main');
          
          // Simulate some notifications and unread chats for demo
          setNotificationCount(Math.floor(Math.random() * 5));
          setUnreadChats(Math.floor(Math.random() * 3));
        } catch (error) {
          console.error('Failed to parse saved user:', error);
          localStorage.removeItem('propertyHubUser');
          setAppState('auth-landing');
        }
      } else {
        // Add delay for splash screen
        setTimeout(() => {
          setAppState('auth-landing');
        }, 2000);
      }
    };

    checkSession();
  }, []);

  // Save user to localStorage and update state
  const saveUser = useCallback((user: User) => {
    setCurrentUser(user);
    localStorage.setItem('propertyHubUser', JSON.stringify(user));
  }, []);

  // Update user data
  const updateUser = useCallback((updates: Partial<User>) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      localStorage.setItem('propertyHubUser', JSON.stringify(updatedUser));
    }
  }, [currentUser]);

  // Logout user
  const logout = useCallback(() => {
    setCurrentUser(null);
    setCurrentView('marketplace');
    setSelectedProperty(null);
    setPendingBooking(null);
    setNotificationCount(0);
    setUnreadChats(0);
    localStorage.removeItem('propertyHubUser');
    setAppState('auth-landing');
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotificationCount(0);
  }, []);

  // Mark chats as read
  const markChatsRead = useCallback(() => {
    setUnreadChats(0);
  }, []);

  // Handle view changes with role-based access
  const handleViewChange = useCallback((view: AppView) => {
    if (!currentUser) return;

    // Check if user has access to this view
    if (view === 'admin' && currentUser.role !== 'admin') {
      return;
    }

    setCurrentView(view);
  }, [currentUser]);

  return {
    // State
    appState,
    currentUser,
    currentView,
    selectedProperty,
    pendingBooking,
    notificationCount,
    unreadChats,
    
    // Setters
    setAppState,
    setCurrentUser,
    setCurrentView: handleViewChange,
    setSelectedProperty,
    setPendingBooking,
    
    // Actions
    saveUser,
    updateUser,
    logout,
    clearNotifications,
    markChatsRead
  };
}