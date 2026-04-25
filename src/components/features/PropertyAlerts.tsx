import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, Trash2, Plus, MapPin, DollarSign, Edit2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

export interface PropertyAlert {
  id: string;
  name: string;
  criteria: {
    minPrice?: number;
    maxPrice?: number;
    location?: string;
    propertyType?: string[];
    minBedrooms?: number;
    minBathrooms?: number;
    keywords?: string[];
  };
  frequency: 'instant' | 'daily' | 'weekly';
  enabled: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  matchCount: number;
  email?: string;
  pushNotifications: boolean;
}

const ALERTS_STORAGE_KEY = 'realestate_property_alerts';

export const usePropertyAlerts = () => {
  const [alerts, setAlerts] = useState<PropertyAlert[]>([]);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (saved) {
      setAlerts(JSON.parse(saved));
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  const createAlert = (name: string, criteria: PropertyAlert['criteria'], options = {}) => {
    const newAlert: PropertyAlert = {
      id: `alert_${Date.now()}`,
      name,
      criteria,
      frequency: (options as any).frequency || 'daily',
      enabled: true,
      createdAt: new Date(),
      matchCount: 0,
      pushNotifications: (options as any).pushNotifications !== false,
    };
    setAlerts([...alerts, newAlert]);
    toast.success(`Alert "${name}" created`);
    return newAlert;
  };

  const updateAlert = (alertId: string, updates: Partial<PropertyAlert>) => {
    setAlerts(alerts.map(a => {
      if (a.id === alertId) {
        return { ...a, ...updates };
      }
      return a;
    }));
    toast.success('Alert updated');
  };

  const deleteAlert = (alertId: string) => {
    setAlerts(alerts.filter(a => a.id !== alertId));
    toast.success('Alert deleted');
  };

  const toggleAlert = (alertId: string) => {
    updateAlert(alertId, {
      enabled: !alerts.find(a => a.id === alertId)?.enabled,
    });
  };

  const checkAlerts = (property: any) => {
    const triggeredAlerts: string[] = [];

    alerts.forEach(alert => {
      if (!alert.enabled) return;

      let matches = true;

      if (alert.criteria.minPrice && property.price < alert.criteria.minPrice) {
        matches = false;
      }
      if (alert.criteria.maxPrice && property.price > alert.criteria.maxPrice) {
        matches = false;
      }
      if (alert.criteria.location && 
          !property.location?.toLowerCase().includes(alert.criteria.location.toLowerCase())) {
        matches = false;
      }
      if (alert.criteria.propertyType && 
          !alert.criteria.propertyType.includes(property.type)) {
        matches = false;
      }
      if (alert.criteria.minBedrooms && property.bedrooms < alert.criteria.minBedrooms) {
        matches = false;
      }
      if (alert.criteria.minBathrooms && property.bathrooms < alert.criteria.minBathrooms) {
        matches = false;
      }

      if (matches) {
        triggeredAlerts.push(alert.id);
        updateAlert(alert.id, {
          matchCount: (alert.matchCount || 0) + 1,
          lastTriggered: new Date(),
        });
      }
    });

    return triggeredAlerts;
  };

  return {
    alerts,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
    checkAlerts,
  };
};

// Alert Creation Form Component
export const AlertCreationForm: React.FC<{
  onCreateAlert: (name: string, criteria: PropertyAlert['criteria'], options: any) => void;
  onCancel?: () => void;
}> = ({ onCreateAlert, onCancel }) => {
  const [name, setName] = useState('');
  const [criteria, setCriteria] = useState<PropertyAlert['criteria']>({});
  const [frequency, setFrequency] = useState<'instant' | 'daily' | 'weekly'>('daily');
  const [pushNotifications, setPushNotifications] = useState(true);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Please enter an alert name');
      return;
    }

    onCreateAlert(name, criteria, { frequency, pushNotifications });
    setName('');
    setCriteria({});
    setFrequency('daily');
    setPushNotifications(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Property Alert</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Alert Name</label>
          <input
            type="text"
            placeholder="e.g., 'Affordable Apartments in Lagos'"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Min Price</label>
            <input
              type="number"
              placeholder="0"
              value={criteria.minPrice || ''}
              onChange={(e) =>
                setCriteria({ ...criteria, minPrice: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Price</label>
            <input
              type="number"
              placeholder="1000000"
              value={criteria.maxPrice || ''}
              onChange={(e) =>
                setCriteria({ ...criteria, maxPrice: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <input
            type="text"
            placeholder="e.g., Lagos, Accra"
            value={criteria.location || ''}
            onChange={(e) =>
              setCriteria({ ...criteria, location: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="instant">Instant</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="pushNotifications"
            checked={pushNotifications}
            onChange={(e) => setPushNotifications(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="pushNotifications" className="ml-2 text-sm">
            Send push notifications
          </label>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit} className="flex-1">
            Create Alert
          </Button>
          {onCancel && (
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Alerts Display Component
export const PropertyAlertsPanel: React.FC<{
  alerts: PropertyAlert[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (alert: PropertyAlert) => void;
}> = ({ alerts, onToggle, onDelete, onEdit }) => {
  return (
    <div className="space-y-4">
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No alerts created yet</p>
            <p className="text-sm text-gray-400 mt-2">Create an alert to get notified about new properties</p>
          </CardContent>
        </Card>
      ) : (
        alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className={!alert.enabled ? 'opacity-60' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{alert.name}</h3>
                      <Badge variant={alert.enabled ? 'default' : 'secondary'}>
                        {alert.enabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {alert.matchCount} matches found
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(alert)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(alert.id)}
                      className="p-2 hover:bg-red-100 rounded-lg text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  {alert.criteria.minPrice && (
                    <div>
                      <span className="text-gray-600">Min Price:</span>
                      <p className="font-medium">GHS {alert.criteria.minPrice.toLocaleString()}</p>
                    </div>
                  )}
                  {alert.criteria.maxPrice && (
                    <div>
                      <span className="text-gray-600">Max Price:</span>
                      <p className="font-medium">GHS {alert.criteria.maxPrice.toLocaleString()}</p>
                    </div>
                  )}
                  {alert.criteria.location && (
                    <div className="flex items-start gap-1">
                      <MapPin className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <p className="font-medium">{alert.criteria.location}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Frequency:</span>
                    <p className="font-medium capitalize">{alert.frequency}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={alert.enabled}
                      onChange={() => onToggle(alert.id)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="ml-2 text-sm font-medium">Enable alert</span>
                  </label>
                  {alert.lastTriggered && (
                    <span className="text-xs text-gray-500">
                      Last: {new Date(alert.lastTriggered).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
};
