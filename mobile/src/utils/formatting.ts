/**
 * PropertyHub Mobile - Formatting Utilities
 * 
 * This module provides utility functions for formatting various data types
 * including prices, areas, distances, dates, and other display values.
 */

import { format, formatDistanceToNow, parseISO, isToday, isYesterday } from 'date-fns';

// Currency and number formatting
const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
  EUR: '€',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
};

/**
 * Format price with currency symbol and appropriate decimal places
 */
export function formatPrice(
  price: number, 
  currency: string = 'NGN',
  compact: boolean = false
): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  
  if (compact && price >= 1000000) {
    const millions = price / 1000000;
    return `${symbol}${millions.toFixed(millions >= 10 ? 0 : 1)}M`;
  }
  
  if (compact && price >= 1000) {
    const thousands = price / 1000;
    return `${symbol}${thousands.toFixed(thousands >= 10 ? 0 : 1)}K`;
  }
  
  return `${symbol}${price.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Format area with unit
 */
export function formatArea(area: number, unit: string = 'sqm'): string {
  const formattedArea = area.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  const unitDisplay = unit === 'sqm' ? 'm²' : unit === 'sqft' ? 'ft²' : unit;
  
  return `${formattedArea} ${unitDisplay}`;
}

/**
 * Calculate and format distance between two coordinates
 */
export function formatDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km

  if (distance < 1) {
    return `${Math.round(distance * 1000)}m away`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km away`;
  } else {
    return `${Math.round(distance)}km away`;
  }
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format date for display
 */
export function formatDate(
  date: string | Date,
  options: {
    includeTime?: boolean;
    relative?: boolean;
    short?: boolean;
  } = {}
): string {
  const { includeTime = false, relative = false, short = false } = options;
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (relative) {
      if (isToday(dateObj)) {
        return includeTime ? format(dateObj, 'h:mm a') : 'Today';
      } else if (isYesterday(dateObj)) {
        return includeTime ? `Yesterday ${format(dateObj, 'h:mm a')}` : 'Yesterday';
      } else {
        return formatDistanceToNow(dateObj, { addSuffix: true });
      }
    }
    
    if (short) {
      return includeTime ? format(dateObj, 'MMM d, h:mm a') : format(dateObj, 'MMM d');
    }
    
    const dateFormat = includeTime ? 'MMMM d, yyyy \'at\' h:mm a' : 'MMMM d, yyyy';
    return format(dateObj, dateFormat);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return 'Invalid date';
  }
}

/**
 * Format time for chat messages
 */
export function formatChatTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (isToday(dateObj)) {
      return format(dateObj, 'h:mm a');
    } else if (isYesterday(dateObj)) {
      return 'Yesterday';
    } else {
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays < 7) {
        return format(dateObj, 'EEEE'); // Day name
      } else {
        return format(dateObj, 'MMM d');
      }
    }
  } catch (error) {
    console.warn('Chat time formatting error:', error);
    return '';
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format duration for voice messages
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `0:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a Nigerian number
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    const formatted = cleaned.replace(/^234(\d{3})(\d{3})(\d{4})$/, '+234 $1 $2 $3');
    return formatted;
  }
  
  // US/Canada format
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.replace(/^1(\d{3})(\d{3})(\d{4})$/, '+1 ($1) $2-$3');
  }
  
  // International format (fallback)
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  
  return phoneNumber; // Return original if can't format
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format rating
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/**
 * Format address for display
 */
export function formatAddress(address: {
  address?: string;
  city: string;
  state: string;
  country?: string;
}, compact: boolean = false): string {
  if (compact) {
    return `${address.city}, ${address.state}`;
  }
  
  const parts = [
    address.address,
    address.city,
    address.state,
    address.country,
  ].filter(Boolean);
  
  return parts.join(', ');
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format property features list
 */
export function formatFeatures(features: string[], maxCount: number = 3): string {
  if (features.length === 0) return '';
  
  if (features.length <= maxCount) {
    return features.join(' • ');
  }
  
  const visible = features.slice(0, maxCount);
  const remaining = features.length - maxCount;
  
  return `${visible.join(' • ')} • +${remaining} more`;
}

/**
 * Format boolean value for display
 */
export function formatBoolean(value: boolean, trueText: string = 'Yes', falseText: string = 'No'): string {
  return value ? trueText : falseText;
}

/**
 * Format property type for display
 */
export function formatPropertyType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/[_-]/g, ' ');
}

/**
 * Format availability status
 */
export function formatAvailabilityStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'available': 'Available',
    'occupied': 'Occupied',
    'maintenance': 'Under Maintenance',
    'reserved': 'Reserved',
    'sold': 'Sold',
    'rented': 'Rented',
  };
  
  return statusMap[status] || formatPropertyType(status);
}

/**
 * Format listing type
 */
export function formatListingType(type: string): string {
  const typeMap: Record<string, string> = {
    'sale': 'Sale',
    'rent': 'Rent',
    'lease': 'Lease',
    'auction': 'Auction',
  };
  
  return typeMap[type] || formatPropertyType(type);
}

/**
 * Format user role
 */
export function formatUserRole(role: string): string {
  const roleMap: Record<string, string> = {
    'user': 'User',
    'host': 'Property Host',
    'manager': 'Property Manager',
    'admin': 'Administrator',
  };
  
  return roleMap[role] || formatPropertyType(role);
}

/**
 * Format notification type
 */
export function formatNotificationType(type: string): string {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Format search query for display
 */
export function formatSearchQuery(query: string, maxLength: number = 30): string {
  const trimmed = query.trim();
  if (!trimmed) return 'Search properties...';
  
  return truncateText(trimmed, maxLength);
}

/**
 * Format count with suffix (K, M, B)
 */
export function formatCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  if (count < 1000000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${(count / 1000000000).toFixed(1)}B`;
}