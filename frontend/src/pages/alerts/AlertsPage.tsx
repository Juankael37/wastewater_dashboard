import React from 'react'
import { AlertTriangle, CheckCircle, XCircle, Bell } from 'lucide-react'
import { alertsApi, type Alert } from '../../services/api'

const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = React.useState<Alert[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true)
        const data = await alertsApi.getAll()
        setAlerts(data)
      } catch (error) {
        console.error('Failed to fetch alerts:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [])

  const criticalCount = alerts.filter((a) => (a.severity || a.status) === 'critical').length
  const warningCount = alerts.filter((a) => (a.severity || a.status) === 'warning').length
  const infoCount = alerts.filter((a) => (a.severity || a.status) === 'info').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
      case 'warning': return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400'
      case 'info': return 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400'
      default: return 'bg-gray-50 dark:bg-slate-500/10 border-gray-200 dark:border-slate-500/20 text-gray-600 dark:text-slate-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <XCircle className="w-5 h-5" />
      case 'warning': return <AlertTriangle className="w-5 h-5" />
      case 'info': return <Bell className="w-5 h-5" />
      default: return <CheckCircle className="w-5 h-5" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">Alerts</h1>
              <p className="text-sm text-gray-500 dark:text-slate-300">Monitor water quality alerts</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="px-3 py-2 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-slate-300">Total:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{alerts.length}</span>
              </div>
              <button className="px-3 py-2 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-lg font-semibold transition text-sm w-full sm:w-auto">
                Mark All Read
              </button>
            </div>
          </div>
        </div>

        {/* Alert Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-200 dark:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 md:p-3 bg-red-50 dark:bg-red-500/10 rounded-lg">
                <XCircle className="w-5 h-5 md:w-8 md:h-8 text-red-500" />
              </div>
              <span className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{criticalCount}</span>
            </div>
            <h3 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-white">Critical</h3>
            <p className="text-xs text-gray-500 dark:text-slate-300 hidden md:block">Requires immediate attention</p>
          </div>

          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-200 dark:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 md:p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 md:w-8 md:h-8 text-amber-500" />
              </div>
              <span className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{warningCount}</span>
            </div>
            <h3 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-white">Warnings</h3>
            <p className="text-xs text-gray-500 dark:text-slate-300 hidden md:block">Approaching limits</p>
          </div>

          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-200 dark:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 md:p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                <Bell className="w-5 h-5 md:w-8 md:h-8 text-blue-500" />
              </div>
              <span className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{infoCount}</span>
            </div>
            <h3 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-white">Info</h3>
            <p className="text-xs text-gray-500 dark:text-slate-300 hidden md:block">Monitoring alerts</p>
          </div>

          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-200 dark:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 md:p-3 bg-teal-50 dark:bg-teal-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 md:w-8 md:h-8 text-teal-500" />
              </div>
              <span className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">24h</span>
            </div>
            <h3 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-white">Response</h3>
            <p className="text-xs text-gray-500 dark:text-slate-300 hidden md:block">Average resolution</p>
          </div>
        </div>

        {/* Alerts List - Mobile Friendly */}
        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors">
          <div className="p-4 md:p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">Recent Alerts</h2>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
            {alerts.map(alert => (
              <div key={alert.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/20 transition">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${getStatusColor(alert.severity || alert.status)}`}>
                    {getStatusIcon(alert.severity || alert.status)}
                    <span className="capitalize">{alert.severity || alert.status}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                    {alert.time || alert.timestamp}
                  </span>
                </div>
                <div className="space-y-1 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{alert.parameter}</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{alert.value}</span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      {alert.parameter === 'Temperature' ? '°C' : alert.parameter === 'pH' ? '' : 'mg/L'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-2">
                    {alert.message || `${alert.parameter}: ${alert.status}`}
                  </p>
                  {alert.plant && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">Plant: {alert.plant}</p>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="flex-1 px-3 py-2 bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded text-sm font-medium hover:bg-teal-100 dark:hover:bg-teal-500/30 transition">
                    Acknowledge
                  </button>
                  <button className="flex-1 px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                    Details
                  </button>
                </div>
              </div>
            ))}
            {loading && (
              <div className="p-6 text-center text-gray-500 dark:text-slate-300">Loading alerts...</div>
            )}
            {!loading && alerts.length === 0 && (
              <div className="p-6 text-center text-gray-500 dark:text-slate-300">No alerts found</div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="text-gray-600 dark:text-slate-300">
                Showing <span className="font-semibold text-gray-900 dark:text-white">5</span> of <span className="font-semibold text-gray-900 dark:text-white">24</span> alerts
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                  Previous
                </button>
                <button className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Settings */}
        <div className="mt-6 md:mt-8 bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-200 dark:border-slate-700 transition-colors">
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-6">Alert Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">Notifications</h3>
              <div className="space-y-3 md:space-y-4">
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex-1 pr-3">
                    <span className="text-gray-900 dark:text-white text-sm">Email</span>
                    <p className="text-xs text-gray-500 dark:text-slate-300">Receive via email</p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex-1 pr-3">
                    <span className="text-gray-900 dark:text-white text-sm">Push</span>
                    <p className="text-xs text-gray-500 dark:text-slate-300">Mobile notifications</p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex-1 pr-3">
                    <span className="text-gray-900 dark:text-white text-sm">SMS</span>
                    <p className="text-xs text-gray-500 dark:text-slate-300">Critical alerts</p>
                  </div>
                  <input type="checkbox" className="toggle" />
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">Thresholds</h3>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Critical Level</label>
                  <select className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-gray-900 dark:text-white text-sm">
                    <option value="immediate">Immediate (Exceeds limits)</option>
                    <option value="high">High (80% of limit)</option>
                    <option value="medium">Medium (60% of limit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Alert Frequency</label>
                  <select className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white">
                    <option value="immediate">Immediate</option>
                    <option value="hourly">Hourly Summary</option>
                    <option value="daily">Daily Digest</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlertsPage