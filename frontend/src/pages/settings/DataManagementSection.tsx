import React, { useState, useEffect } from 'react'
import { Trash2, AlertTriangle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { dataManagementApi } from '../../services/api'
import CloudSettingsNotice from './components/CloudSettingsNotice'
import type { SettingsCapabilities } from './types'

const DataManagementSection: React.FC<{ capabilities: SettingsCapabilities }> = ({ capabilities }) => {
  const canCount = capabilities.supportsDataCount
  const canClear = capabilities.supportsDataClear
  const enabled = canCount || canClear
  const [dataCount, setDataCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => { if (canCount) fetchDataCount() }, [canCount])

  const fetchDataCount = async () => {
    try { const r = await dataManagementApi.getCount(); setDataCount(r.count) }
    catch (e) { console.error('Failed to fetch data count:', e) }
  }

  if (!enabled) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Data Management</h2><p className="text-gray-500 dark:text-slate-400">Cloud deployment</p></div>
        <CloudSettingsNotice title="Not available on Worker API yet"><p>Bulk counts and clear actions are disabled. Use the Supabase Table Editor if needed.</p></CloudSettingsNotice>
      </div>
    )
  }

  const handleClearAll = async () => {
    if (!dataCount || dataCount === 0) { toast.error('No data to clear'); return }
    setLoading(true)
    try { const r = await dataManagementApi.clearAll(); toast.success(r.message); setDataCount(0); setShowClearConfirm(false) }
    catch { toast.error('Failed to clear data') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Data Management</h2><p className="text-gray-500 dark:text-slate-400">Manage measurement data and backups</p></div>
      <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Data Status</h3><div className="flex items-center gap-4 mt-2"><span className="text-gray-500 dark:text-slate-400">Total Measurements:</span><span className="text-3xl font-bold text-gray-900 dark:text-white">{loading ? '...' : dataCount || 0}</span></div></div>
          <button onClick={fetchDataCount} className="p-2 bg-gray-200 dark:bg-slate-600 hover:bg-slate-500 rounded-lg transition"><RefreshCw className="w-5 h-5 text-gray-900 dark:text-white" /></button>
        </div>
      </div>
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-400 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Danger Zone</h3>
            <p className="text-red-300 text-sm mb-4">Clearing all data will permanently delete all measurement records. This action cannot be undone.</p>
            {!showClearConfirm ? (
              <button onClick={() => setShowClearConfirm(true)} disabled={loading || !canClear || !dataCount || dataCount === 0} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-gray-900 dark:text-white rounded-lg disabled:opacity-50 transition flex items-center gap-2"><Trash2 className="w-4 h-4" />Clear All Data</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleClearAll} disabled={loading} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-gray-900 dark:text-white rounded-lg disabled:opacity-50 transition">{loading ? 'Clearing...' : `Yes, Delete ${dataCount} Records`}</button>
                <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-slate-500 text-gray-900 dark:text-white rounded-lg transition">Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataManagementSection
