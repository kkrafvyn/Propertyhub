/**
 * Fallback Components
 * 
 * Simple fallback components to prevent import errors and circular dependencies
 */

import React from 'react';
import type { User, Property } from '../types';

// Simple Header Fallback
export const SimpleHeader = ({ currentUser, onLogout }: { currentUser: User | null; onLogout: () => void }) => (
  <header className="fixed top-0 left-0 right-0 bg-background border-b z-50">
    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="text-2xl">🏠</div>
        <h1 className="text-xl font-bold">PropertyHub</h1>
      </div>
      
      {currentUser ? (
        <div className="flex items-center space-x-4">
          <span className="hidden md:inline">Welcome, {currentUser.name}!</span>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="text-muted-foreground">Please log in</div>
      )}
    </div>
  </header>
);

// Simple Dashboard Fallback
export const SimpleDashboard = ({ currentUser }: { currentUser: User }) => (
  <div className="min-h-screen bg-background pt-16">
    <div className="container mx-auto px-4 py-6">
      <div className="text-center space-y-6">
        <div className="text-6xl">📊</div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {currentUser.name}!</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-card rounded-lg p-6 border">
            <h3 className="text-lg font-semibold mb-2">Properties</h3>
            <p className="text-2xl font-bold text-primary">0</p>
          </div>
          <div className="bg-card rounded-lg p-6 border">
            <h3 className="text-lg font-semibold mb-2">Bookings</h3>
            <p className="text-2xl font-bold text-green-600">0</p>
          </div>
          <div className="bg-card rounded-lg p-6 border">
            <h3 className="text-lg font-semibold mb-2">Messages</h3>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Simple Property Details Fallback
export const SimplePropertyDetails = ({ 
  property, 
  currentUser, 
  onBack 
}: { 
  property: Property; 
  currentUser: User; 
  onBack: () => void; 
}) => (
  <div className="min-h-screen bg-background pt-16">
    <div className="container mx-auto px-4 py-6">
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center"
      >
        ← Back
      </button>
      
      <div className="max-w-4xl mx-auto">
        {/* Property Image */}
        <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-6">
          {(property.images?.[0] || property.media?.[0]?.url) && (
            <img
              src={property.images?.[0] || property.media?.[0]?.url}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Property Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold mb-4">{property.title}</h1>
            <p className="text-muted-foreground mb-6">{property.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {(property.bedrooms || property.features?.bedrooms) && (
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl mb-2">🛏️</div>
                  <div className="font-semibold">{property.bedrooms || property.features?.bedrooms}</div>
                  <div className="text-sm text-muted-foreground">Bedrooms</div>
                </div>
              )}
              {(property.bathrooms || property.features?.bathrooms) && (
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl mb-2">🚿</div>
                  <div className="font-semibold">{property.bathrooms || property.features?.bathrooms}</div>
                  <div className="text-sm text-muted-foreground">Bathrooms</div>
                </div>
              )}
              {(property.area || property.features?.area) && (
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl mb-2">📏</div>
                  <div className="font-semibold">{property.area || property.features?.area}m²</div>
                  <div className="text-sm text-muted-foreground">Area</div>
                </div>
              )}
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl mb-2">⭐</div>
                <div className="font-semibold">{property.rating || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">Rating</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg p-6 border sticky top-24">
              <div className="text-3xl font-bold mb-4">
                {property.pricing?.currency || property.currency || '₦'} {(property.pricing?.amount || property.price || 0).toLocaleString()}
              </div>
              
              <button className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 mb-4">
                Contact Owner
              </button>
              
              <button className="w-full py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80">
                Save Property
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Simple Notification Center Fallback
export const SimpleNotificationCenter = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="w-full max-w-md bg-background h-full shadow-xl">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Notifications</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-4">🔔</div>
            <p>No new notifications</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default {
  SimpleHeader,
  SimpleDashboard,
  SimplePropertyDetails,
  SimpleNotificationCenter
};