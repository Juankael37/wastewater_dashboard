import React from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Droplets,
  Thermometer,
  Gauge,
  Beaker
} from 'lucide-react'

const DashboardPage: React.FC = () => {
  // Mock data for demonstration
  const parameters = [
    { name: 'pH', value: 7.2, unit: '', status: 'good', trend: 'stable', standard: '6.0-9.0' },
    { name: 'COD', value: 85, unit: 'mg/L', status: 'good', trend: 'down', standard: '≤100 mg/L' },
    { name: 'BOD', value: 42, unit: 'mg/L', status: 'good', trend: 'down', standard: '≤50 mg/L' },
    { name: 'Ammonia', value: 0.3, unit: 'mg/L', status: 'good', trend: 'stable', standard: '≤0.5 mg/L' },
    { name: 'Nitrate', value: 12, unit: 'mg/L', status: 'good', trend: 'up', standard: '≤14 mg/L' },
    { name: 'Phosphate', value: 0.8, unit: 'mg/L', status: 'good', trend: 'stable', standard: '≤1.0 mg/L' },
    { name: 'TSS', value: 95, unit: 'mg/L', status: 'warning', trend: 'up', standard: '≤100 mg/L' },
    { name: 'Temperature', value: 25.5, unit: '°C', status: 'good', trend: 'stable', standard: '≤30°C' },
  ]

  const recentAlerts = [
    { id: 1, parameter: 'TSS', message: 'Approaching limit (95/100 mg/L)', time: '2 hours ago', severity: 'warning' },
    { id: 2, parameter: 'pH', message: 'Slight fluctuation detected', time: '5 hours ago', severity: 'info' },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />
      default: return <CheckCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />
      case 'down': return <TrendingDown className="w-4 h-4 text-green-500" />
      default: return <span className="w-4 h-4 text-gray-400">—</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Real-time monitoring of wastewater treatment parameters</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Compliance Rate</p>
              <p className="text-2xl font-bold text-gray-900">94%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">2</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Readings</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
            <Droplets className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Plant Efficiency</p>
              <p className="text-2xl font-bold text-gray-900">87%</p>
            </div>
            <Gauge className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Parameters Grid */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Current Parameters</h2>
          <p className="text-sm text-gray-500">Latest measurements with compliance status</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Standard</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {parameters.map((param) => (
                <tr key={param.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {param.name === 'Temperature' ? <Thermometer className="w-5 h-5 text-gray-400" /> :
                         param.name === 'pH' ? <Beaker className="w-5 h-5 text-gray-400" /> :
                         <Droplets className="w-5 h-5 text-gray-400" />}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{param.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-semibold">
                      {param.value} <span className="text-gray-500">{param.unit}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {param.standard}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(param.status)}
                      <span className="ml-2 text-sm capitalize">{param.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getTrendIcon(param.trend)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
          <p className="text-sm text-gray-500">Notifications requiring attention</p>
        </div>
        
        <div className="p-6">
          {recentAlerts.length > 0 ? (
            <div className="space-y-4">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start p-4 border border-gray-200 rounded-lg">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    alert.severity === 'warning' ? 'text-amber-500' :
                    alert.severity === 'critical' ? 'text-red-500' : 'text-blue-500'
                  }`} />
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between">
                      <h3 className="text-sm font-medium text-gray-900">{alert.parameter}</h3>
                      <span className="text-xs text-gray-500">{alert.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="mt-2 text-gray-500">No active alerts. All parameters are within standards.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage