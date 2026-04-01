import React, { createContext, useContext, useEffect, useState } from 'react'

interface OfflineContextType {
  isOnline: boolean
  pendingSyncCount: number
  syncQueue: any[]
  addToSyncQueue: (data: any) => void
  processSyncQueue: () => Promise<void>
  clearSyncQueue: () => void
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncQueue, setSyncQueue] = useState<any[]>([])
  const [pendingSyncCount, setPendingSyncCount] = useState(0)

  // Load sync queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('wastewater_sync_queue')
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue)
        setSyncQueue(parsed)
        setPendingSyncCount(parsed.length)
      } catch (error) {
        console.error('Failed to parse sync queue:', error)
      }
    }
  }, [])

  // Save sync queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('wastewater_sync_queue', JSON.stringify(syncQueue))
    setPendingSyncCount(syncQueue.length)
  }, [syncQueue])

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
    if (isOnline && syncQueue.length > 0) {
      processSyncQueue()
    }
  }, [isOnline])

  const addToSyncQueue = (data: any) => {
    setSyncQueue(prev => [...prev, { ...data, timestamp: new Date().toISOString() }])
  }

  const processSyncQueue = async () => {
    if (syncQueue.length === 0) return

    console.log('Processing sync queue...')
    
    // In a real implementation, this would send data to your API
    // For now, we'll simulate successful sync after a delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Clear the queue after "successful" sync
    setSyncQueue([])
    console.log('Sync completed successfully')
  }

  const clearSyncQueue = () => {
    setSyncQueue([])
  }

  const value = {
    isOnline,
    pendingSyncCount,
    syncQueue,
    addToSyncQueue,
    processSyncQueue,
    clearSyncQueue,
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