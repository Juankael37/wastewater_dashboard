import React, { useState } from 'react'
import { Bell, Mail, Smartphone, AlertTriangle, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const AlertSettingsSection: React.FC = () => {
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [criticalLevel, setCriticalLevel] = useState('immediate')
  const [alertFrequency, setAlertFrequency] = useState('immediate')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success('Alert settings saved successfully!')
    }, 500)
  }

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-teal-500/10 rounded-lg">
            <Bell className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Channels</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Configure how you receive alerts</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Email */}
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <span className="text-gray-900 dark:text-white font-medium">Email Notifications</span>
                <p className="text-xs text-gray-500 dark:text-slate-400">Receive alerts via email</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-teal-500 focus:ring-teal-500"
            />
          </label>

          {/* Push */}
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <span className="text-gray-900 dark:text-white font-medium">Push Notifications</span>
                <p className="text-xs text-gray-500 dark:text-slate-400">Mobile push notifications</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={(e) => setPushEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-teal-500 focus:ring-teal-500"
            />
          </label>

          {/* SMS */}
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <span className="text-gray-900 dark:text-white font-medium">SMS Alerts</span>
                <p className="text-xs text-gray-500 dark:text-slate-400">Critical alerts via SMS</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={(e) => setSmsEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-teal-500 focus:ring-teal-500"
            />
          </label>
        </div>
      </div>

      {/* Alert Thresholds */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Alert Thresholds</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Configure when alerts are triggered</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Critical Alert Level
            </label>
            <select
              value={criticalLevel}
              onChange={(e) => setCriticalLevel(e.target.value)}
              className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            >
              <option value="immediate">Immediate (Exceeds limits)</option>
              <option value="high">High (80% of limit)</option>
              <option value="medium">Medium (60% of limit)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Alert Frequency
            </label>
            <select
              value={alertFrequency}
              onChange={(e) => setAlertFrequency(e.target.value)}
              className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            >
              <option value="immediate">Immediate</option>
              <option value="hourly">Hourly Summary</option>
              <option value="daily">Daily Digest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default AlertSettingsSection