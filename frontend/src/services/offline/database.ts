import Dexie, { Table } from 'dexie'

export interface Measurement {
  id?: number
  plant: string
  location: string
  timestamp: string
  type: 'influent' | 'effluent'
  ph: number | null
  cod: number | null
  bod: number | null
  tss: number | null
  ammonia: number | null
  nitrate: number | null
  phosphate: number | null
  temperature: number | null
  flow: number | null
  images?: string[]
  synced: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SyncQueueItem {
  id?: number
  measurementId: number
  action: 'create' | 'update' | 'delete'
  data: any
  retries: number
  status: 'pending' | 'processing' | 'failed' | 'completed'
  createdAt: Date
  lastAttempt: Date | null
}

export interface OfflineCache {
  id?: number
  key: string
  value: any
  expiresAt: Date | null
  createdAt: Date
}

class WastewaterDatabase extends Dexie {
  measurements!: Table<Measurement>
  syncQueue!: Table<SyncQueueItem>
  offlineCache!: Table<OfflineCache>

  constructor() {
    super('WastewaterDatabase')
    
    this.version(1).stores({
      measurements: '++id, plant, timestamp, type, synced',
      syncQueue: '++id, measurementId, action, status, createdAt',
      offlineCache: '++id, key, expiresAt'
    })
    
    this.version(2).stores({
      measurements: '++id, plant, timestamp, type, synced, [plant+timestamp]',
      syncQueue: '++id, measurementId, action, status, createdAt, [status+createdAt]',
      offlineCache: '++id, key, expiresAt'
    }).upgrade(trans => {
      // Migration logic if needed
    })
  }
}

export const db = new WastewaterDatabase()

// Database initialization helper
export const initDatabase = async () => {
  try {
    await db.open()
    console.log('IndexedDB database initialized successfully')
    
    // Create some indexes for better performance
    await db.measurements.where('synced').equals(false).count()
    await db.syncQueue.where('status').equals('pending').count()
    
    return db
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error)
    throw error
  }
}

// Measurement operations
export const measurementService = {
  async saveMeasurement(measurement: Omit<Measurement, 'id' | 'synced' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date()
    const fullMeasurement: Measurement = {
      ...measurement,
      synced: false,
      createdAt: now,
      updatedAt: now
    }
    
    const id = await db.measurements.add(fullMeasurement)
    
    // Add to sync queue
    await db.syncQueue.add({
      measurementId: id as number,
      action: 'create',
      data: fullMeasurement,
      retries: 0,
      status: 'pending',
      createdAt: now,
      lastAttempt: null
    })
    
    return id as number
  },
  
  async getPendingMeasurements(): Promise<Measurement[]> {
    return await db.measurements
      .where('synced')
      .equals(false)
      .sortBy('timestamp')
  },
  
  async getMeasurement(id: number): Promise<Measurement | undefined> {
    return await db.measurements.get(id)
  },
  
  async getAllMeasurements(limit = 100): Promise<Measurement[]> {
    return await db.measurements
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray()
  },
  
  async markAsSynced(id: number): Promise<void> {
    await db.measurements.update(id, { synced: true, updatedAt: new Date() })
    
    // Remove from sync queue
    await db.syncQueue
      .where('measurementId')
      .equals(id)
      .and(item => item.action === 'create')
      .delete()
  },
  
  async deleteMeasurement(id: number): Promise<void> {
    await db.measurements.delete(id)
    
    // Add delete action to sync queue if it was synced
    const measurement = await db.measurements.get(id)
    if (measurement?.synced) {
      await db.syncQueue.add({
        measurementId: id,
        action: 'delete',
        data: { id },
        retries: 0,
        status: 'pending',
        createdAt: new Date(),
        lastAttempt: null
      })
    }
  }
}

// Sync queue operations
export const syncService = {
  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    return await db.syncQueue
      .where('status')
      .equals('pending')
      .sortBy('createdAt')
  },
  
  async markAsProcessing(id: number): Promise<void> {
    await db.syncQueue.update(id, { 
      status: 'processing',
      lastAttempt: new Date()
    })
  },
  
  async markAsCompleted(id: number): Promise<void> {
    await db.syncQueue.update(id, { 
      status: 'completed',
      lastAttempt: new Date()
    })
  },
  
  async markAsFailed(id: number, retryIncrement = true): Promise<void> {
    const item = await db.syncQueue.get(id)
    if (!item) return
    
    const updates: Partial<SyncQueueItem> = {
      status: 'failed',
      lastAttempt: new Date()
    }
    
    if (retryIncrement) {
      updates.retries = item.retries + 1
    }
    
    await db.syncQueue.update(id, updates)
  },
  
  async retryFailedItems(): Promise<void> {
    const failedItems = await db.syncQueue
      .where('status')
      .equals('failed')
      .and(item => item.retries < 3) // Max 3 retries
      .toArray()
    
    for (const item of failedItems) {
      await db.syncQueue.update(item.id!, { 
        status: 'pending',
        lastAttempt: null
      })
    }
  },
  
  async clearCompletedItems(): Promise<void> {
    await db.syncQueue
      .where('status')
      .equals('completed')
      .delete()
  }
}

// Offline cache operations
export const cacheService = {
  async set(key: string, value: any, ttlMinutes?: number): Promise<void> {
    const expiresAt = ttlMinutes 
      ? new Date(Date.now() + ttlMinutes * 60 * 1000)
      : null
    
    // Check if key exists
    const existing = await db.offlineCache.where('key').equals(key).first()
    
    if (existing) {
      await db.offlineCache.update(existing.id!, { value, expiresAt, createdAt: new Date() })
    } else {
      await db.offlineCache.add({
        key,
        value,
        expiresAt,
        createdAt: new Date()
      })
    }
  },
  
  async get<T = any>(key: string): Promise<T | null> {
    const item = await db.offlineCache.where('key').equals(key).first()
    
    if (!item) return null
    
    // Check if expired
    if (item.expiresAt && item.expiresAt < new Date()) {
      await db.offlineCache.delete(item.id!)
      return null
    }
    
    return item.value as T
  },
  
  async delete(key: string): Promise<void> {
    const item = await db.offlineCache.where('key').equals(key).first()
    if (item) {
      await db.offlineCache.delete(item.id!)
    }
  },
  
  async clearExpired(): Promise<void> {
    const now = new Date()
    const expired = await db.offlineCache
      .filter(item => item.expiresAt && item.expiresAt < now)
      .toArray()
    
    for (const item of expired) {
      await db.offlineCache.delete(item.id!)
    }
  }
}

// Export database instance and services
export default db