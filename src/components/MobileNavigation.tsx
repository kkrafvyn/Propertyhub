import React from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Home, Grid3x3, MessageCircle, User, Bell, Shield } from 'lucide-react';
import { ExtendedAppState as AppView, User as UserType } from '../types';

interface MobileNavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  currentUser: UserType;
  notificationCount: number;
}

export function MobileNavigation({ 
  currentView, 
  onNavigate, 
  currentUser, 
  notificationCount 
}: MobileNavigationProps) {
  const navigationItems = [
    { id: 'marketplace', label: 'Home', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: Grid3x3 },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    ...(currentUser.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant={currentView === item.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onNavigate(item.id as AppView)}
              className="flex flex-col items-center space-y-1 h-auto py-2 px-3 relative"
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
              {item.id === 'chat' && notificationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                >
                  {notificationCount}
                </Badge>
              )}
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}