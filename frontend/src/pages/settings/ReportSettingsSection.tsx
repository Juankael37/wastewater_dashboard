import React, { useState, useEffect } from 'react'
import { Mail, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Send } from 'lucide-react'
import { apiRequest } from '../../services/api/client'
import toast from 'react-hot-toast'

interface ReportSetting {
  id: string
  email: string
  is_active: boolean
  frequency: string
}

const ReportSettingsSection: React.FC = () => {
  const [settings, setSettings] = useState<ReportSetting[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newFrequency, setNewFrequency] = useState('daily')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const fetchSettings = async () => {
    try {
      const data = await apiRequest<ReportSetting[]>('/api/settings/reports')
      setSettings(data)
    } catch (error) {
      console.error('Failed to fetch report settings:', error)
      toast.error('Failed to load report settings')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail) return

    setIsSubmitting(true)
    try {
      await apiRequest('/api/settings/reports', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail, frequency: newFrequency })
      })
      toast.success('Recipient added successfully')
      setNewEmail('')
      fetchSettings()
    } catch (error) {
      toast.error('Failed to add recipient')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await apiRequest(`/api/settings/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentStatus })
      })
      setSettings(settings.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s))
      toast.success('Status updated')
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleDeleteRecipient = async (id: string) => {
    if (!confirm('Are you sure you want to remove this recipient?')) return

    try {
      await apiRequest(`/api/settings/reports/${id}`, { method: 'DELETE' })
      setSettings(settings.filter(s => s.id !== id))
      toast.success('Recipient removed')
    } catch (error) {
      toast.error('Failed to remove recipient')
    }
  }

  const handleSendTestReport = async () => {
    if (settings.filter(s => s.is_active).length === 0) {
      toast.error('Please activate at least one recipient first')
      return
    }

    setIsTesting(true)
    try {
      await apiRequest('/api/settings/reports/test', { method: 'POST' })
      toast.success('Test report sent successfully!')
    } catch (error: any) {
      toast.error('Failed to send test report')
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-teal-500" />
            Automated Email Reports
          </div>
          <button
            onClick={handleSendTestReport}
            disabled={isTesting || settings.length === 0}
            className="text-sm px-3 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send Test Report
          </button>
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
          Configure who receives daily automated reports. Emails are sent via Resend (Free).
        </p>

        <form onSubmit={handleAddRecipient} className="flex gap-2 mb-8">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Add recipient email..."
            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition dark:text-white"
            required
          />
          <select
            value={newFrequency}
            onChange={(e) => setNewFrequency(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition dark:text-white"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 text-white rounded-lg flex items-center gap-2 transition"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </form>

        <div className="space-y-3">
          {settings.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-slate-500 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl">
              No recipients configured yet.
            </div>
          ) : (
            settings.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{s.email}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-500 capitalize">{s.frequency} report</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(s.id, s.is_active)}
                    className={`p-2 rounded-lg transition ${s.is_active ? 'text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-500/10' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                    title={s.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {s.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                  <button
                    onClick={() => handleDeleteRecipient(s.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                    title="Remove"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default ReportSettingsSection
