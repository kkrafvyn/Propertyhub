/**
 * PropertyHub Enhanced Header Component
 * Navigation and user management
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Building2, Home, BarChart3, MessageCircle, Settings, Shield, Bell, CheckCircle, X
} from 'lucide-react';
import type { AppState, User } from '../types';

interface HeaderProps {
  currentUser: User;
  appState: AppState;
  onNavigation: (state: AppState) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, appState, onNavigation, onLogout }) => {
  const [showNotifications, setShowNotifications] = React.useState(false);

  const navigationItems = [
    { id: 'main', label: 'Home', icon: Home },
    { id: 'marketplace', label: 'Properties', icon: Building2 },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'chat', label: 'Messages', icon: MessageCircle },
  ];

  if (currentUser.role === 'admin' || currentUser.role === 'host') {
    navigationItems.push({ id: 'property-management', label: 'Manage', icon: Settings });
  }

  if (currentUser.role === 'admin') {
    navigationItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => onNavigation('main')}
          >
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center animate-pulse3d">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold gradient-text">PropertyHub</span>
          </motion.div>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navigationItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigation(item.id as AppState)}
                className={`nav-item flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                  appState === item.id
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </motion.button>
            ))}
          </nav>
          
          {/* User Section */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-3 hover:bg-muted rounded-xl transition-colors"
            >
              <Bell className="w-5 h-5" />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"
              />
            </motion.button>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <div className="font-medium">{currentUser.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{currentUser.role}</div>
              </div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center overflow-hidden border-2 border-background shadow-lg">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary-foreground font-semibold">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {currentUser.verified && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background flex items-center justify-center"
                  >
                    <CheckCircle className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </motion.div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLogout}
                className="btn-primary px-5 py-2 text-sm rounded-xl"
              >
                Logout
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t bg-background">
        <div className="flex items-center justify-around py-2">
          {navigationItems.slice(0, 4).map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigation(item.id as AppState)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl transition-colors touch-target ${
                appState === item.id
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-full right-4 w-80 bg-card border rounded-2xl shadow-2xl z-50 mt-2"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Notifications</h3>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowNotifications(false)}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
            
            <div className="space-y-3">
              {[
                { title: 'New Property Match', message: 'Found 3 properties matching your criteria', time: '2 min ago' },
                { title: 'Message from Host', message: 'Kwame replied to your inquiry', time: '1 hour ago' },
                { title: 'Booking Confirmed', message: 'Your booking for Apartment in East Legon is confirmed', time: '3 hours ago' }
              ].map((notification, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-3 hover:bg-muted rounded-xl transition-colors cursor-pointer"
                >
                  <div className="font-medium text-sm">{notification.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{notification.message}</div>
                  <div className="text-xs text-primary mt-1">{notification.time}</div>
                </motion.div>
              ))}
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              View All Notifications
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};

export default Header;
