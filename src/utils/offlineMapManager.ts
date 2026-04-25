import { Property } from '../types';

interface OfflineMapArea {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  radius: number; // in kilometers
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  downloadDate: string;
  lastUsed: string;
  sizeEstimate: number; // in MB
  status: 'downloading' | 'completed' | 'failed' | 'expired';
  properties: string[]; // Property IDs in this area
  tiles: MapTile[];
}

interface MapTile {
  x: number;
  y: number;
  z: number; // zoom level
  url: string;
  data?: Blob;
  downloadDate: string;
}

interface OfflineMapStats {
  totalAreas: number;
  totalSize: number; // in MB
  availableStorage: number; // in MB
  lastCleanup: string;
}

class OfflineMapManager {
  private static instance: OfflineMapManager;
  private dbName = 'PropertyHubMaps';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private maxStorageSize = 500; // MB
  private tileExpiryDays = 30;

  private constructor() {
    this.initializeDB();
  }

  static getInstance(): OfflineMapManager {
    if (!OfflineMapManager.instance) {
      OfflineMapManager.instance = new OfflineMapManager();
    }
    return OfflineMapManager.instance;
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('mapAreas')) {
          const areasStore = db.createObjectStore('mapAreas', { keyPath: 'id' });
          areasStore.createIndex('status', 'status', { unique: false });
          areasStore.createIndex('lastUsed', 'lastUsed', { unique: false });
        }

        if (!db.objectStoreNames.contains('mapTiles')) {
          const tilesStore = db.createObjectStore('mapTiles', { keyPath: ['x', 'y', 'z'] });
          tilesStore.createIndex('downloadDate', 'downloadDate', { unique: false });
        }

        if (!db.objectStoreNames.contains('mapStats')) {
          db.createObjectStore('mapStats', { keyPath: 'id' });
        }
      };
    });
  }

  async downloadAreaAroundProperty(property: Property, radiusKm: number = 5): Promise<string> {
    const areaId = `property-${property.id}-${radiusKm}km`;
    const center = {
      lat: property.coordinates[0],
      lng: property.coordinates[1],
    };

    const area: OfflineMapArea = {
      id: areaId,
      name: `${property.title} Area`,
      center,
      radius: radiusKm,
      bounds: this.calculateBounds(center, radiusKm),
      downloadDate: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      sizeEstimate: this.estimateAreaSize(radiusKm),
      status: 'downloading',
      properties: [property.id],
      tiles: [],
    };

    // Save area to database
    await this.saveMapArea(area);

    // Start downloading tiles
    this.downloadAreaTiles(area).catch(console.error);

    return areaId;
  }

  async downloadMultipleProperties(properties: Property[], radiusKm: number = 3): Promise<string> {
    // Calculate center point of all properties
    const centerLat = properties.reduce((sum, p) => sum + p.coordinates[0], 0) / properties.length;
    const centerLng = properties.reduce((sum, p) => sum + p.coordinates[1], 0) / properties.length;
    
    const center = { lat: centerLat, lng: centerLng };
    
    // Calculate radius to encompass all properties plus buffer
    const maxDistance = Math.max(
      ...properties.map(p => 
        this.calculateDistance(center, { lat: p.coordinates[0], lng: p.coordinates[1] })
      )
    );
    
    const totalRadius = Math.max(maxDistance + radiusKm, radiusKm * 2);
    
    const areaId = `multi-property-${Date.now()}`;
    const area: OfflineMapArea = {
      id: areaId,
      name: `${properties.length} Properties Area`,
      center,
      radius: totalRadius,
      bounds: this.calculateBounds(center, totalRadius),
      downloadDate: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      sizeEstimate: this.estimateAreaSize(totalRadius),
      status: 'downloading',
      properties: properties.map(p => p.id),
      tiles: [],
    };

    await this.saveMapArea(area);
    this.downloadAreaTiles(area).catch(console.error);

    return areaId;
  }

  private async downloadAreaTiles(area: OfflineMapArea): Promise<void> {
    try {
      const tiles = this.generateTileList(area.bounds, [10, 12, 14, 16]); // Multiple zoom levels
      const totalTiles = tiles.length;
      let downloadedTiles = 0;

      // Download tiles in batches to avoid overwhelming the browser
      const batchSize = 10;
      for (let i = 0; i < tiles.length; i += batchSize) {
        const batch = tiles.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (tile) => {
            try {
              const tileData = await this.downloadTile(tile);
              if (tileData) {
                tile.data = tileData;
                tile.downloadDate = new Date().toISOString();
                await this.saveTile(tile);
                downloadedTiles++;
              }
            } catch (error) {
              console.warn(`Failed to download tile ${tile.x},${tile.y},${tile.z}:`, error);
            }
          })
        );

        // Update progress
        const progress = (downloadedTiles / totalTiles) * 100;
        this.notifyDownloadProgress(area.id, progress);

        // Small delay between batches to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update area status
      area.status = downloadedTiles > 0 ? 'completed' : 'failed';
      area.tiles = tiles.filter(t => t.data);
      await this.saveMapArea(area);

      this.notifyDownloadComplete(area.id, area.status);
    } catch (error) {
      console.error('Error downloading area tiles:', error);
      area.status = 'failed';
      await this.saveMapArea(area);
      this.notifyDownloadComplete(area.id, 'failed');
    }
  }

  private generateTileList(bounds: any, zoomLevels: number[]): MapTile[] {
    const tiles: MapTile[] = [];

    zoomLevels.forEach(zoom => {
      const { minX, maxX, minY, maxY } = this.boundsToTileCoords(bounds, zoom);
      
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          tiles.push({
            x,
            y,
            z: zoom,
            url: this.getTileUrl(x, y, zoom),
            downloadDate: '',
          });
        }
      }
    });

    return tiles;
  }

  private boundsToTileCoords(bounds: any, zoom: number): { minX: number; maxX: number; minY: number; maxY: number } {
    const minTile = this.latLngToTileCoord(bounds.south, bounds.west, zoom);
    const maxTile = this.latLngToTileCoord(bounds.north, bounds.east, zoom);
    
    return {
      minX: Math.min(minTile.x, maxTile.x),
      maxX: Math.max(minTile.x, maxTile.x),
      minY: Math.min(minTile.y, maxTile.y),
      maxY: Math.max(minTile.y, maxTile.y),
    };
  }

  private latLngToTileCoord(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const latRad = lat * Math.PI / 180;
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);
    
    return { x, y };
  }

  private getTileUrl(x: number, y: number, z: number): string {
    // Use OpenStreetMap tiles as fallback (Google Maps tiles require special licensing)
    return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }

  private async downloadTile(tile: MapTile): Promise<Blob | null> {
    try {
      const response = await fetch(tile.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.blob();
    } catch (error) {
      console.warn(`Failed to download tile: ${tile.url}`, error);
      return null;
    }
  }

  async getOfflineTile(x: number, y: number, z: number): Promise<Blob | null> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['mapTiles'], 'readonly');
      const store = transaction.objectStore('mapTiles');
      const request = store.get([x, y, z]);

      request.onsuccess = () => {
        const tile = request.result;
        if (tile && tile.data) {
          // Check if tile is not expired
          const tileAge = Date.now() - new Date(tile.downloadDate).getTime();
          const maxAge = this.tileExpiryDays * 24 * 60 * 60 * 1000;
          
          if (tileAge < maxAge) {
            resolve(tile.data);
          } else {
            resolve(null); // Tile expired
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  async getDownloadedAreas(): Promise<OfflineMapArea[]> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mapAreas'], 'readonly');
      const store = transaction.objectStore('mapAreas');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get downloaded areas'));
      };
    });
  }

  async deleteArea(areaId: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    const area = await this.getMapArea(areaId);
    if (!area) return;

    // Delete all tiles for this area
    for (const tile of area.tiles) {
      await this.deleteTile(tile.x, tile.y, tile.z);
    }

    // Delete the area
    const transaction = this.db!.transaction(['mapAreas'], 'readwrite');
    const store = transaction.objectStore('mapAreas');
    await store.delete(areaId);
  }

  async cleanupExpiredTiles(): Promise<void> {
    if (!this.db) await this.initializeDB();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.tileExpiryDays);

    const transaction = this.db!.transaction(['mapTiles'], 'readwrite');
    const store = transaction.objectStore('mapTiles');
    const index = store.index('downloadDate');
    const range = IDBKeyRange.upperBound(cutoffDate.toISOString());

    const request = index.openCursor(range);
    
    return new Promise((resolve) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  async getStorageStats(): Promise<OfflineMapStats> {
    const areas = await this.getDownloadedAreas();
    const totalSize = areas.reduce((sum, area) => sum + area.sizeEstimate, 0);
    
    // Estimate available storage (this is approximate)
    const estimatedAvailable = Math.max(0, this.maxStorageSize - totalSize);

    return {
      totalAreas: areas.length,
      totalSize,
      availableStorage: estimatedAvailable,
      lastCleanup: new Date().toISOString(),
    };
  }

  async isAreaAvailableOffline(propertyId: string): Promise<boolean> {
    const areas = await this.getDownloadedAreas();
    return areas.some(area => 
      area.properties.includes(propertyId) && 
      area.status === 'completed'
    );
  }

  private calculateBounds(center: { lat: number; lng: number }, radiusKm: number) {
    const latOffset = radiusKm / 111; // 1 degree lat ≈ 111 km
    const lngOffset = radiusKm / (111 * Math.cos(center.lat * Math.PI / 180));

    return {
      north: center.lat + latOffset,
      south: center.lat - latOffset,
      east: center.lng + lngOffset,
      west: center.lng - lngOffset,
    };
  }

  private calculateDistance(pos1: { lat: number; lng: number }, pos2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(pos2.lat - pos1.lat);
    const dLon = this.deg2rad(pos2.lng - pos1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(pos1.lat)) *
        Math.cos(this.deg2rad(pos2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private estimateAreaSize(radiusKm: number): number {
    // Rough estimate: each square km needs about 2-5MB for multiple zoom levels
    const area = Math.PI * radiusKm * radiusKm;
    return area * 3.5; // MB
  }

  private async saveMapArea(area: OfflineMapArea): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mapAreas'], 'readwrite');
      const store = transaction.objectStore('mapAreas');
      const request = store.put(area);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save map area'));
    });
  }

  private async getMapArea(areaId: string): Promise<OfflineMapArea | null> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['mapAreas'], 'readonly');
      const store = transaction.objectStore('mapAreas');
      const request = store.get(areaId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  private async saveTile(tile: MapTile): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mapTiles'], 'readwrite');
      const store = transaction.objectStore('mapTiles');
      const request = store.put(tile);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save tile'));
    });
  }

  private async deleteTile(x: number, y: number, z: number): Promise<void> {
    if (!this.db) await this.initializeDB();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['mapTiles'], 'readwrite');
      const store = transaction.objectStore('mapTiles');
      const request = store.delete([x, y, z]);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve(); // Don't fail if tile doesn't exist
    });
  }

  private notifyDownloadProgress(areaId: string, progress: number): void {
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('mapDownloadProgress', {
      detail: { areaId, progress }
    }));
  }

  private notifyDownloadComplete(areaId: string, status: string): void {
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('mapDownloadComplete', {
      detail: { areaId, status }
    }));
  }
}

export const offlineMapManager = OfflineMapManager.getInstance();

// Utility functions
export const formatMapSize = (sizeInMB: number): string => {
  if (sizeInMB < 1) {
    return `${Math.round(sizeInMB * 1024)} KB`;
  }
  return `${sizeInMB.toFixed(1)} MB`;
};

export const getNetworkStatus = (): 'online' | 'offline' | 'slow' => {
  if (!navigator.onLine) return 'offline';
  
  // Check connection quality if available
  const connection = (navigator as any).connection;
  if (connection) {
    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      return 'slow';
    }
  }
  
  return 'online';
};