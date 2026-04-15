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
      case 'critical': return 'bg-red-500/10 border-red-500/20 text-red-400'
      case 'warning': return 'bg-amber-500/10 border-amber-500/20 text-amber-400'
      case 'info': return 'bg-blue-500/10 border-blue-500/20 text-blue-400'
      default: return 'bg-slate-500/10 border-slate-500/20 text-slate-400'
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Alerts & Notifications</h1>
              <p className="text-slate-300">Monitor water quality alerts and compliance issues</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-slate-800 rounded-lg">
                <span className="text-slate-300">Active Alerts: </span>
                <span className="font-semibold text-white">{alerts.length}</span>
              </div>
              <button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition">
                Mark All as Read
              </button>
            </div>
          </div>
        </div>

        {/* Alert Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <span className="text-3xl font-bold text-white">{criticalCount}</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Critical Alerts</h3>
            <p className="text-slate-300 text-sm">Requires immediate attention</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <span className="text-3xl font-bold text-white">{warningCount}</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Warnings</h3>
            <p className="text-slate-300 text-sm">Approaching limits</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Bell className="w-8 h-8 text-blue-500" />
              </div>
              <span className="text-3xl font-bold text-white">{infoCount}</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Informational</h3>
            <p className="text-slate-300 text-sm">Monitoring alerts</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-teal-500/10 rounded-lg">
                <CheckCircle className="w-8 h-8 text-teal-500" />
              </div>
              <span className="text-3xl font-bold text-white">24h</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Response Time</h3>
            <p className="text-slate-300 text-sm">Average resolution</p>
          </div>
        </div>

        {/* Alerts Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-2xl font-semibold text-white">Recent Alerts</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Status</th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Parameter</th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Value</th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Message</th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Plant</th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Time</th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr key={alert.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition">
                    <td className="py-4 px-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(alert.severity || alert.status)}`}>
                        {getStatusIcon(alert.severity || alert.status)}
                        <span className="text-sm font-medium capitalize">{alert.severity || alert.status}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-white font-medium">{alert.parameter}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-white font-semibold">{alert.value}</span>
                      <span className="text-slate-400 text-sm ml-1">
                        {alert.parameter === 'Temperature' ? '°C' : alert.parameter === 'pH' ? '' : 'mg/L'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-300">{alert.message || `${alert.parameter}: ${alert.status}`}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-white">{alert.plant || '-'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-300">{alert.time || alert.timestamp}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-teal-500/20 text-teal-400 rounded text-sm hover:bg-teal-500/30 transition">
                          Acknowledge
                        </button>
                        <button className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600 transition">
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && (
              <div className="px-6 py-4 text-slate-300">Loading alerts...</div>
            )}
          </div>

          <div className="p-6 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div className="text-slate-300">
                Showing <span className="font-semibold text-white">5</span> of <span className="font-semibold text-white">24</span> alerts
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition">
                  Previous
                </button>
                <button className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Settings */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-2xl font-semibold text-white mb-6">Alert Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Notification Channels</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-white">Email Notifications</span>
                    <p className="text-sm text-slate-300">Receive alerts via email</p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-white">Push Notifications</span>
                    <p className="text-sm text-slate-300">Mobile push notifications</p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-white">SMS Alerts</span>
                    <p className="text-sm text-slate-300">Critical alerts via SMS</p>
                  </div>
                  <input type="checkbox" className="toggle" />
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Alert Thresholds</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Critical Alert Level</label>
                  <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white">
                    <option value="immediate">Immediate (Exceeds limits)</option>
                    <option value="high">High (80% of limit)</option>
                    <option value="medium">Medium (60% of limit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Alert Frequency</label>
                  <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white">
                    <option value="immediate">Immediate</option>
                    <option value="hourly">Hourly Summary</option>
                    <option value="daily">Daily Digest</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button className="px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-semibold hover:opacity-90 transition">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlertsPage