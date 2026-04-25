import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download,
  HardDrive,
  MapPin,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  WifiOff,
  Wifi,
  Activity,
  Info,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { Property, User as UserType } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { offlineMapManager, formatMapSize, getNetworkStatus } from '../utils/offlineMapManager';
import { getLocationLabel } from '../utils/location';
import { toast } from "sonner";

interface OfflineMapManagerProps {
  currentUser: UserType;
  properties?: Property[];
  userBookings?: any[];
  selectedProperty?: Property | null;
  onBack: () => void;
}

interface OfflineArea {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  radius: number;
  downloadDate: string;
  lastUsed: string;
  sizeEstimate: number;
  status: 'downloading' | 'completed' | 'failed' | 'expired';
  properties: string[];
}

interface MapStats {
  totalAreas: number;
  totalSize: number;
  availableStorage: number;
  lastCleanup: string;
}

export function OfflineMapManager({ currentUser, properties, userBookings, selectedProperty, onBack }: OfflineMapManagerProps) {
  const [offlineAreas, setOfflineAreas] = useState<OfflineArea[]>([]);
  const [mapStats, setMapStats] = useState<MapStats | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'slow'>('online');
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  const [settings, setSettings] = useState({
    autoDownload: true,
    wifiOnly: true,
    maxStorageSize: 500, // MB
    autoCleanup: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOfflineData();
    setupEventListeners();
    checkNetworkStatus();

    // Periodic network status check
    const networkInterval = setInterval(checkNetworkStatus, 5000);

    return () => {
      clearInterval(networkInterval);
      window.removeEventListener('mapDownloadProgress', handleDownloadProgress);
      window.removeEventListener('mapDownloadComplete', handleDownloadComplete);
    };
  }, []);

  const loadOfflineData = async () => {
    try {
      const [areas, stats] = await Promise.all([
        offlineMapManager.getDownloadedAreas(),
        offlineMapManager.getStorageStats(),
      ]);
      
      setOfflineAreas(areas);
      setMapStats(stats);
    } catch (error) {
      console.error('Error loading offline data:', error);
      toast.error('Failed to load offline map data');
    } finally {
      setIsLoading(false);
    }
  };

  const setupEventListeners = () => {
    window.addEventListener('mapDownloadProgress', handleDownloadProgress);
    window.addEventListener('mapDownloadComplete', handleDownloadComplete);
  };

  const handleDownloadProgress = (event: any) => {
    const { areaId, progress } = event.detail;
    setDownloadProgress(prev => ({ ...prev, [areaId]: progress }));
  };

  const handleDownloadComplete = (event: any) => {
    const { areaId, status } = event.detail;
    setDownloadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[areaId];
      return newProgress;
    });
    
    if (status === 'completed') {
      toast.success('Map area downloaded successfully!');
    } else {
      toast.error('Map download failed. Please try again.');
    }
    
    loadOfflineData(); // Refresh data
  };

  const checkNetworkStatus = () => {
    setNetworkStatus(getNetworkStatus());
  };

  const downloadPropertyArea = async (property: Property, radius: number = 3) => {
    if (networkStatus === 'offline') {
      toast.error('Cannot download maps while offline');
      return;
    }

    if (settings.wifiOnly && networkStatus === 'slow') {
      toast.error('Slow connection detected. Enable cellular downloads in settings to continue.');
      return;
    }

    try {
      const areaId = await offlineMapManager.downloadAreaAroundProperty(property, radius);
      toast.info(`Started downloading map area around ${property.title}`);
    } catch (error) {
      console.error('Error starting download:', error);
      toast.error('Failed to start map download');
    }
  };

  const downloadMultipleProperties = async (propertyIds: string[], radius: number = 5) => {
    const selectedProperties = properties.filter(p => propertyIds.includes(p.id));
    
    if (selectedProperties.length === 0) return;

    try {
      const areaId = await offlineMapManager.downloadMultipleProperties(selectedProperties, radius);
      toast.info(`Started downloading map area for ${selectedProperties.length} properties`);
    } catch (error) {
      console.error('Error starting bulk download:', error);
      toast.error('Failed to start bulk map download');
    }
  };

  const deleteArea = async (areaId: string) => {
    try {
      await offlineMapManager.deleteArea(areaId);
      toast.success('Offline map area deleted');
      loadOfflineData();
    } catch (error) {
      console.error('Error deleting area:', error);
      toast.error('Failed to delete map area');
    }
  };

  const cleanupExpiredMaps = async () => {
    try {
      await offlineMapManager.cleanupExpiredTiles();
      toast.success('Expired maps cleaned up');
      loadOfflineData();
    } catch (error) {
      console.error('Error cleaning up maps:', error);
      toast.error('Failed to cleanup expired maps');
    }
  };

  const getBookedProperties = () => {
    return properties.filter(property => 
      userBookings.some(booking => 
        booking.propertyId === property.id && 
        booking.status === 'active'
      )
    );
  };

  const getNetworkStatusIcon = () => {
    switch (networkStatus) {
      case 'offline': return <WifiOff className="w-4 h-4 text-red-500" />;
      case 'slow': return <Activity className="w-4 h-4 text-orange-500" />;
      default: return <Wifi className="w-4 h-4 text-green-500" />;
    }
  };

  const getNetworkStatusText = () => {
    switch (networkStatus) {
      case 'offline': return 'Offline';
      case 'slow': return 'Slow Connection';
      default: return 'Online';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'downloading': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading offline maps data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header 
        className="bg-card/80 backdrop-blur-lg border-b border-border p-4 sticky top-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Offline Maps</h1>
              <p className="text-sm text-muted-foreground">Download maps for areas with poor connectivity</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {getNetworkStatusIcon()}
              <span className="text-sm font-medium">{getNetworkStatusText()}</span>
            </div>
            <Badge variant="outline">
              <HardDrive className="w-3 h-3 mr-1" />
              {mapStats ? formatMapSize(mapStats.totalSize) : '0 MB'} used
            </Badge>
          </div>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Storage Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HardDrive className="w-5 h-5 mr-2" />
                Storage Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mapStats && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{mapStats.totalAreas}</div>
                      <div className="text-sm text-muted-foreground">Downloaded Areas</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{formatMapSize(mapStats.totalSize)}</div>
                      <div className="text-sm text-muted-foreground">Storage Used</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{formatMapSize(mapStats.availableStorage)}</div>
                      <div className="text-sm text-muted-foreground">Available</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Storage Usage</span>
                      <span>{Math.round((mapStats.totalSize / settings.maxStorageSize) * 100)}%</span>
                    </div>
                    <Progress 
                      value={(mapStats.totalSize / settings.maxStorageSize) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Download Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="w-5 h-5 mr-2" />
                Quick Downloads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Download Booked Properties */}
              {getBookedProperties().length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-blue-900 dark:text-blue-100">Your Booked Properties</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Download maps for {getBookedProperties().length} properties you've booked
                      </p>
                    </div>
                    <Button 
                      onClick={() => downloadMultipleProperties(getBookedProperties().map(p => p.id))}
                      disabled={networkStatus === 'offline'}
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download All
                    </Button>
                  </div>
                </div>
              )}

              {/* Download Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="wifi-only">Wi-Fi Only Downloads</Label>
                    <p className="text-xs text-muted-foreground">Only download on Wi-Fi to save data</p>
                  </div>
                  <Switch
                    id="wifi-only"
                    checked={settings.wifiOnly}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, wifiOnly: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-cleanup">Auto Cleanup</Label>
                    <p className="text-xs text-muted-foreground">Automatically delete expired maps</p>
                  </div>
                  <Switch
                    id="auto-cleanup"
                    checked={settings.autoCleanup}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoCleanup: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Downloaded Areas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Downloaded Areas
                </CardTitle>
                {offlineAreas.length > 0 && (
                  <Button variant="outline" size="sm" onClick={cleanupExpiredMaps}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Cleanup
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {offlineAreas.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Offline Maps Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Download map areas to access them without internet connection
                  </p>
                  <Button onClick={() => toast.info('Select a property to download its area')}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Your First Map
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {offlineAreas.map((area) => (
                    <motion.div
                      key={area.id}
                      className="border border-border rounded-lg p-4"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium">{area.name}</h3>
                            <Badge className={getStatusColor(area.status)}>
                              {area.status === 'downloading' && downloadProgress[area.id] && (
                                <span className="mr-1">{Math.round(downloadProgress[area.id])}%</span>
                              )}
                              {area.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Size:</span> {formatMapSize(area.sizeEstimate)}
                            </div>
                            <div>
                              <span className="font-medium">Radius:</span> {area.radius}km
                            </div>
                            <div>
                              <span className="font-medium">Properties:</span> {area.properties.length}
                            </div>
                            <div>
                              <span className="font-medium">Downloaded:</span> {new Date(area.downloadDate).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Download Progress */}
                          {area.status === 'downloading' && downloadProgress[area.id] && (
                            <div className="mt-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span>Downloading...</span>
                                <span>{Math.round(downloadProgress[area.id])}%</span>
                              </div>
                              <Progress value={downloadProgress[area.id]} className="h-2" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {area.status === 'completed' && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                          {area.status === 'failed' && (
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          )}
                          <Button variant="outline" size="sm" onClick={() => deleteArea(area.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Properties List for Individual Downloads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Download Individual Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties.slice(0, 6).map((property) => (
                  <div key={property.id} className="border border-border rounded-lg p-3">
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-3">
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-medium text-sm mb-1 truncate">{property.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3 truncate">{getLocationLabel(property.location)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">~{formatMapSize(Math.PI * 9)}</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => downloadPropertyArea(property)}
                        disabled={networkStatus === 'offline'}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Network Status Warning */}
        {networkStatus !== 'online' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-orange-800 dark:text-orange-200">
                      {networkStatus === 'offline' ? 'Offline Mode' : 'Slow Connection Detected'}
                    </h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      {networkStatus === 'offline' 
                        ? 'You can still view downloaded offline maps. Connect to internet to download new areas.'
                        : 'Map downloads may be slower. Consider connecting to Wi-Fi for better performance.'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
