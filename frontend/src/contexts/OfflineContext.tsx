import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { initDatabase, measurementService, syncService, Measurement } from '../services/offline/database'
import { measurementsApi } from '../services/api'

interface OfflineContextType {
  isOnline: boolean
  pendingSyncCount: number
  syncQueue: any[]
  measurements: Measurement[]
  addMeasurement: (data: Omit<Measurement, 'id' | 'synced' | 'createdAt' | 'updatedAt'>) => Promise<number>
  getMeasurements: () => Promise<Measurement[]>
  processSyncQueue: () => Promise<void>
  clearSyncQueue: () => Promise<void>
  retryFailedSyncs: () => Promise<void>
  databaseInitialized: boolean
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncQueue, setSyncQueue] = useState<any[]>([])
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [databaseInitialized, setDatabaseInitialized] = useState(false)
  const isSyncingRef = useRef(false)

  // Initialize database
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDatabase()
        setDatabaseInitialized(true)
        
        // Load initial data
        const pendingItems = await syncService.getPendingSyncItems()
        setSyncQueue(pendingItems)
        setPendingSyncCount(pendingItems.length)
        
        const recentMeasurements = await measurementService.getAllMeasurements(50)
        setMeasurements(recentMeasurements)
      } catch (error) {
        console.error('Failed to initialize offline database:', error)
      }
    }
    
    initialize()
  }, [])

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && databaseInitialized && pendingSyncCount > 0) {
      processSyncQueue()
    }
  }, [isOnline, databaseInitialized, pendingSyncCount])

  // Update sync queue count when queue changes
  useEffect(() => {
    const updateQueue = async () => {
      if (databaseInitialized) {
        const pendingItems = await syncService.getPendingSyncItems()
        setSyncQueue(pendingItems)
        setPendingSyncCount(pendingItems.length)
      }
    }
    
    updateQueue()
  }, [databaseInitialized])

  const refreshOfflineState = useCallback(async () => {
    if (!databaseInitialized) return
    const [pendingItems, updatedMeasurements] = await Promise.all([
      syncService.getPendingSyncItems(),
      measurementService.getAllMeasurements(50),
    ])
    setSyncQueue(pendingItems)
    setPendingSyncCount(pendingItems.length)
    setMeasurements(updatedMeasurements)
  }, [databaseInitialized])

  const addMeasurement = useCallback(async (data: Omit<Measurement, 'id' | 'synced' | 'createdAt' | 'updatedAt'>): Promise<number> => {
    if (!databaseInitialized) {
      throw new Error('Database not initialized')
    }
    
    try {
      const id = await measurementService.saveMeasurement(data)
      
      // Update local state
      const newMeasurement: Measurement = {
        ...data,
        id,
        synced: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      setMeasurements(prev => [newMeasurement, ...prev])
      
      await refreshOfflineState()
      
      // If online, try to sync immediately
      if (isOnline) {
        processSyncQueue()
      }
      
      return id
    } catch (error) {
      console.error('Failed to save measurement:', error)
      throw error
    }
  }, [databaseInitialized, isOnline, refreshOfflineState])

  const getMeasurements = useCallback(async (): Promise<Measurement[]> => {
    if (!databaseInitialized) {
      return []
    }
    
    const measurements = await measurementService.getAllMeasurements(100)
    setMeasurements(measurements)
    return measurements
  }, [databaseInitialized])

  const processSyncQueue = useCallback(async () => {
    if (!databaseInitialized || !isOnline || isSyncingRef.current) return

    isSyncingRef.current = true
    console.log('Processing sync queue...')

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    const toNumberOrNull = (value: unknown) => {
      if (value === null || value === undefined || value === '') return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    try {
      let pendingItems = await syncService.getPendingSyncItems()

      for (const item of pendingItems) {
        try {
          await syncService.markAsProcessing(item.id!)

          if (item.action === 'create') {
            const measurement = await measurementService.getMeasurement(item.measurementId)
            if (!measurement) {
              await syncService.markAsCompleted(item.id!)
              continue
            }

            // Replay offline payload through the same API contract used by the form.
            await measurementsApi.create({
              timestamp: measurement.timestamp,
              ph: toNumberOrNull(measurement.ph),
              cod: toNumberOrNull(measurement.cod),
              bod: toNumberOrNull(measurement.bod),
              tss: toNumberOrNull(measurement.tss),
              ammonia: toNumberOrNull(measurement.ammonia),
              nitrate: toNumberOrNull(measurement.nitrate),
              phosphate: toNumberOrNull(measurement.phosphate),
              temperature: toNumberOrNull(measurement.temperature),
              flow: toNumberOrNull(measurement.flow),
              type: measurement.type || 'effluent',
              plant_id: String(
                (measurement as any).plant_id ||
                (measurement as any).plantId ||
                measurement.plant ||
                ''
              ),
              notes: (measurement as any).notes || 'Synced from offline queue',
            })

            await measurementService.markAsSynced(item.measurementId)
          } else if (item.action === 'delete') {
            // Delete replay is not implemented yet in Worker API.
            throw new Error('Delete sync action is not supported by current API')
          } else {
            // Unsupported action for this build - mark completed to avoid deadlock.
            await syncService.markAsCompleted(item.id!)
            continue
          }

          await syncService.markAsCompleted(item.id!)
          console.log(`Successfully synced item ${item.id}`)
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error)
          await syncService.markAsFailed(item.id!)

          // Basic exponential backoff to avoid burst retries.
          const retriesSoFar = (item.retries || 0) + 1
          const backoffMs = Math.min(1000 * (2 ** (retriesSoFar - 1)), 8000)
          await sleep(backoffMs)
        }

        // Refresh queue snapshot after each item to reflect latest statuses.
        pendingItems = await syncService.getPendingSyncItems()
      }
    } finally {
      isSyncingRef.current = false
      await refreshOfflineState()
      console.log('Sync queue processing completed')
    }
  }, [databaseInitialized, isOnline, refreshOfflineState])

  const clearSyncQueue = useCallback(async () => {
    if (!databaseInitialized) return
    
    // In a real app, you might want to be more selective
    // For now, we'll just clear completed items
    await syncService.clearCompletedItems()
    
    await refreshOfflineState()
  }, [databaseInitialized, refreshOfflineState])

  const retryFailedSyncs = useCallback(async () => {
    if (!databaseInitialized) return
    
    await syncService.retryFailedItems()
    
    await refreshOfflineState()
    
    // Process the retried items
    if (isOnline) {
      processSyncQueue()
    }
  }, [databaseInitialized, isOnline, processSyncQueue, refreshOfflineState])

  const value = {
    isOnline,
    pendingSyncCount,
    syncQueue,
    measurements,
    addMeasurement,
    getMeasurements,
    processSyncQueue,
    clearSyncQueue,
    retryFailedSyncs,
    databaseInitialized
  }

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  )
}

export const useOffline = () => {
  const context = useContext(OfflineContext)
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider')
  }
  return context
}