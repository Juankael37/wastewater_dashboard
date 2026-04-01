import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { db, initDatabase, measurementService, syncService, cacheService, Measurement } from '../services/offline/database'

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
  }, [isOnline, databaseInitialized])

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
      
      // Update sync queue
      const pendingItems = await syncService.getPendingSyncItems()
      setSyncQueue(pendingItems)
      setPendingSyncCount(pendingItems.length)
      
      // If online, try to sync immediately
      if (isOnline) {
        processSyncQueue()
      }
      
      return id
    } catch (error) {
      console.error('Failed to save measurement:', error)
      throw error
    }
  }, [databaseInitialized, isOnline])

  const getMeasurements = useCallback(async (): Promise<Measurement[]> => {
    if (!databaseInitialized) {
      return []
    }
    
    const measurements = await measurementService.getAllMeasurements(100)
    setMeasurements(measurements)
    return measurements
  }, [databaseInitialized])

  const processSyncQueue = useCallback(async () => {
    if (!databaseInitialized || syncQueue.length === 0) return

    console.log('Processing sync queue...')
    
    const pendingItems = await syncService.getPendingSyncItems()
    
    for (const item of pendingItems) {
      try {
        // Mark as processing
        await syncService.markAsProcessing(item.id!)
        
        // In a real implementation, this would send data to your API
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Simulate successful sync
        if (item.action === 'create' && item.measurementId) {
          await measurementService.markAsSynced(item.measurementId)
        }
        
        // Mark as completed
        await syncService.markAsCompleted(item.id!)
        
        console.log(`Successfully synced item ${item.id}`)
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error)
        await syncService.markAsFailed(item.id!)
      }
    }
    
    // Update state
    const updatedPendingItems = await syncService.getPendingSyncItems()
    setSyncQueue(updatedPendingItems)
    setPendingSyncCount(updatedPendingItems.length)
    
    // Refresh measurements
    const updatedMeasurements = await measurementService.getAllMeasurements(50)
    setMeasurements(updatedMeasurements)
    
    console.log('Sync queue processing completed')
  }, [databaseInitialized, syncQueue.length])

  const clearSyncQueue = useCallback(async () => {
    if (!databaseInitialized) return
    
    // In a real app, you might want to be more selective
    // For now, we'll just clear completed items
    await syncService.clearCompletedItems()
    
    const pendingItems = await syncService.getPendingSyncItems()
    setSyncQueue(pendingItems)
    setPendingSyncCount(pendingItems.length)
  }, [databaseInitialized])

  const retryFailedSyncs = useCallback(async () => {
    if (!databaseInitialized) return
    
    await syncService.retryFailedItems()
    
    const pendingItems = await syncService.getPendingSyncItems()
    setSyncQueue(pendingItems)
    setPendingSyncCount(pendingItems.length)
    
    // Process the retried items
    if (isOnline) {
      processSyncQueue()
    }
  }, [databaseInitialized, isOnline, processSyncQueue])

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