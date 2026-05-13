import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Droplets,
  Thermometer,
  Gauge,
  Beaker,
  Activity,
  Wind,
  RefreshCw,
} from 'lucide-react'
import { dashboardApi, type Alert as AlertDTO } from '../../services/api'
import { nowLocalTime, formatDateTime, getTimezoneAbbr } from '../../utils/timezone'

interface ParameterData {
  name: string
  influentValue: number
  effluentValue: number
  unit: string
  status: 'good' | 'warning' | 'critical'
  standard: string
  icon: React.ReactNode
  color: string
}

interface Alert {
  id: number
  parameter: string
  message: string
  time: string
  severity: 'warning' | 'critical' | 'info'
}

const DashboardPage: React.FC = () => {
  const [parameters, setParameters] = useState<ParameterData[]>([])
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [complianceRate, setComplianceRate] = useState<number>(0)
  const [totalReadings, setTotalReadings] = useState<number>(0)
  const [lastUpdated, setLastUpdated] = useState<string>(nowLocalTime())
  const [latestMeasurementAt, setLatestMeasurementAt] = useState<string>('n/a')

  // Parameter configuration with icons and colors
  const paramConfig: Record<string, { unit: string; icon: React.ReactNode; color: string; min: number; max: number }> = {
    ph: { unit: '', icon: <Beaker className="w-5 h-5" />, color: '#3b82f6', min: 6.0, max: 9.5 },
    cod: { unit: 'mg/L', icon: <Droplets className="w-5 h-5" />, color: '#ef4444', min: 0, max: 100 },
    bod: { unit: 'mg/L', icon: <Droplets className="w-5 h-5" />, color: '#f97316', min: 0, max: 50 },
    tss: { unit: 'mg/L', icon: <Droplets className="w-5 h-5" />, color: '#8b5cf6', min: 0, max: 100 },
    ammonia: { unit: 'mg/L', icon: <Beaker className="w-5 h-5" />, color: '#06b6d4', min: 0, max: 0.5 },
    nitrate: { unit: 'mg/L', icon: <Beaker className="w-5 h-5" />, color: '#10b981', min: 0, max: 14 },
    phosphate: { unit: 'mg/L', icon: <Beaker className="w-5 h-5" />, color: '#84cc16', min: 0, max: 1 },
    temperature: { unit: '°C', icon: <Thermometer className="w-5 h-5" />, color: '#f43f5e', min: 10, max: 40 },
    flow: { unit: 'm³/h', icon: <Wind className="w-5 h-5" />, color: '#6366f1', min: 0, max: 5000 }
  }

  const fetchData = async (showLoader: boolean = false) => {
    try {
      if (showLoader) setLoading(true)

      const snapshot = await dashboardApi.getSnapshot()

      const processedParams: ParameterData[] = snapshot.parameterStatuses.map((param) => ({
        name: param.name,
        influentValue: param.influentValue,
        effluentValue: param.effluentValue,
        unit: param.unit,
        status: param.status,
        standard: param.standard,
        icon: paramConfig[param.key]?.icon || <Activity className="w-5 h-5" />,
        color: param.color,
      }))


      const processedAlerts: Alert[] = (snapshot.recentAlerts as AlertDTO[]).map((alert) => ({
        id: Number(alert.id),
        parameter: alert.parameter,
        message: alert.message || `${alert.parameter}: ${alert.status} (${alert.value})`,
        time: alert.time || 'Just now',
        severity: (alert.severity as 'warning' | 'critical' | 'info') || 'info'
      }))

      setParameters(processedParams)
      setRecentAlerts(processedAlerts)
      setComplianceRate(snapshot.complianceRate)
      setTotalReadings(snapshot.totalReadings)
      setLastUpdated(nowLocalTime())
      setLatestMeasurementAt(() => {
        if (!snapshot.latestMeasurementTimestamp) return 'n/a';
        return `${formatDateTime(snapshot.latestMeasurementTimestamp)} ${getTimezoneAbbr()}`;
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchData(false)
      }
    }

    const handleMeasurementCreated = () => {
      fetchData(false)
    }

    const interval = window.setInterval(() => {
      fetchData(false)
    }, 15000)

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('measurement:created', handleMeasurementCreated as EventListener)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('measurement:created', handleMeasurementCreated as EventListener)
    }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />
      default: return <CheckCircle className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">Real-time monitoring of all 9 wastewater parameters</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => fetchData(false)}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="sm:hidden">Refresh</span>
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400 w-full sm:w-auto text-left">
            <span className="block">Updated: {lastUpdated}</span>
            <span className="block sm:inline">Latest: {latestMeasurementAt}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Compliance Rate</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{complianceRate}%</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Alerts</p>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{recentAlerts.length}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-amber-500" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Readings</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalReadings}</p>
                </div>
                <Activity className="w-10 h-10 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Parameters</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">9</p>
                </div>
                <Gauge className="w-10 h-10 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Effluent Parameters Grid */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Effluent Parameters</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Treated water quality with compliance status</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                {parameters.map((param) => (
                  <div 
                    key={param.name} 
                    className={`p-4 rounded-lg border transition-colors ${
                      param.status === 'critical' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-500/50' :
                      param.status === 'warning' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-500/50' :
                      'bg-gray-50 border-gray-200 dark:bg-slate-700/50 dark:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2" style={{ color: param.color }}>
                        {param.icon}
                        <span className="font-medium text-gray-900 dark:text-white">{param.name}</span>
                      </div>
                      {getStatusIcon(param.status)}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {param.effluentValue} <span className="text-sm text-gray-500 dark:text-gray-400">{param.unit}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Limit: {param.standard} {param.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Influent Parameters Grid */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Influent Parameters</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Incoming raw wastewater quality</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                {parameters.map((param) => (
                  <div 
                    key={param.name + '-influent'} 
                    className="p-4 rounded-lg border bg-gray-50 border-gray-200 dark:bg-slate-700/50 dark:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2" style={{ color: param.color }}>
                        {param.icon}
                        <span className="font-medium text-gray-900 dark:text-white">{param.name}</span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {param.influentValue} <span className="text-sm text-gray-500 dark:text-gray-400">{param.unit}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 opacity-0">
                      Placeholder
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Effluent Alerts</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Notifications requiring attention</p>
            </div>
            
            <div className="p-6">
              {recentAlerts.length > 0 ? (
                <div className="space-y-3">
                  {recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors">
                      <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        alert.severity === 'warning' ? 'text-amber-500' :
                        alert.severity === 'critical' ? 'text-red-500' : 'text-blue-500'
                      }`} />
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">{alert.parameter}</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{alert.time}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="mt-2 text-gray-500 dark:text-gray-400">No active alerts. All parameters are within standards.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DashboardPage
