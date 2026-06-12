import React, { useState, useEffect } from 'react'
import { Mail, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Send, Clock, Info } from 'lucide-react'
import { apiRequest } from '../../services/api/client'
import toast from 'react-hot-toast'
import { detectTimezone, getTimezoneAbbr, getUtcOffset } from '../../utils/timezone'

interface ReportSetting {
  id: string
  email: string
  is_active: boolean
  frequency: string
  send_time?: string
  day_of_week?: number
  day_of_month?: number
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
]

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => ({
  value: i + 1,
  label: i === 0 ? '1st (First day)' : i === 27 ? '28th (Last day)' : `${i + 1}${getSuffix(i + 1)}`
}))

function getSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

function getFrequencyDescription(frequency: string, sendTime: string, dayOfWeek?: number, dayOfMonth?: number): string {
  const timeStr = sendTime ? ` at ${sendTime}` : ' at 08:00'
  
  switch (frequency) {
    case 'daily':
      return `Every day${timeStr}`
    case 'weekly':
      const day = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)
      return `Every ${day?.label || 'Monday'}${timeStr}`
    case 'monthly':
      const monthDay = dayOfMonth || 1
      return `${monthDay}${getSuffix(monthDay)} of month${timeStr}`
    default:
      return `Every ${frequency}${timeStr}`
  }
}

const ReportSettingsSection: React.FC = () => {
  const [settings, setSettings] = useState<ReportSetting[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newFrequency, setNewFrequency] = useState('daily')
  const [newSendTime, setNewSendTime] = useState('08:00')
  const [newDayOfWeek, setNewDayOfWeek] = useState(1)
  const [newDayOfMonth, setNewDayOfMonth] = useState(1)
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
        body: JSON.stringify({ 
          email: newEmail, 
          frequency: newFrequency,
          send_time: newSendTime,
          day_of_week: newFrequency === 'weekly' ? newDayOfWeek : null,
          day_of_month: newFrequency === 'monthly' ? newDayOfMonth : null
        })
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
          Configure automated reports. Emails are sent from noreply@ortuma.site via Resend (Free tier: 3,000 emails/month).
        </p>

        <form onSubmit={handleAddRecipient} className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Frequency</label>
              <select
                value={newFrequency}
                onChange={(e) => setNewFrequency(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition dark:text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Time ({getTimezoneAbbr()})</label>
              <input
                type="time"
                value={newSendTime}
                onChange={(e) => setNewSendTime(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition dark:text-white"
              />
            </div>
            <div>
              {newFrequency === 'weekly' ? (
                <>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Day</label>
                  <select
                    value={newDayOfWeek}
                    onChange={(e) => setNewDayOfWeek(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition dark:text-white"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </>
              ) : newFrequency === 'monthly' ? (
                <>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Day of Month</label>
                  <select
                    value={newDayOfMonth}
                    onChange={(e) => setNewDayOfMonth(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition dark:text-white"
                  >
                    {DAYS_OF_MONTH.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </>
              ) : (
                <div className="h-[42px] flex items-center text-sm text-gray-400">
                  <Clock className="w-4 h-4 mr-1" />
                  Daily
                </div>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 text-white rounded-lg flex items-center gap-2 transition"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Recipient
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
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{s.email}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-500">
                      {getFrequencyDescription(s.frequency, s.send_time || '08:00', s.day_of_week, s.day_of_month)}
                    </div>
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

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Schedule Information</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Detected timezone: <strong>{detectTimezone()}</strong> ({getTimezoneAbbr()} / {getUtcOffset()})</li>
              <li>Reports are sent at the configured time in your local timezone</li>
              <li>Weekly reports are sent on the selected day</li>
              <li>Monthly reports are sent on the selected day of each month</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportSettingsSection