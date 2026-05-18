import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Thermometer,
  Gauge,
  Beaker,
  Activity,
  Wind,
  RefreshCw,
  AlertCircle,
  Shield,
  BarChart3,
} from 'lucide-react'
import { dashboardApi, type Alert as AlertDTO } from '../../services/api'
import { nowLocalTime } from '../../utils/timezone'

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

  const paramConfig: Record<string, { unit: string; icon: React.ReactNode; color: string; min: number; max: number }> = {
    ph: { unit: '', icon: <Beaker className="w-4 h-4" />, color: '#3b82f6', min: 6.0, max: 9.5 },
    cod: { unit: 'mg/L', icon: <Droplets className="w-4 h-4" />, color: '#ef4444', min: 0, max: 100 },
    bod: { unit: 'mg/L', icon: <Droplets className="w-4 h-4" />, color: '#f97316', min: 0, max: 50 },
    tss: { unit: 'mg/L', icon: <Droplets className="w-4 h-4" />, color: '#8b5cf6', min: 0, max: 100 },
    ammonia: { unit: 'mg/L', icon: <Beaker className="w-4 h-4" />, color: '#06b6d4', min: 0, max: 0.5 },
    nitrate: { unit: 'mg/L', icon: <Beaker className="w-4 h-4" />, color: '#10b981', min: 0, max: 14 },
    phosphate: { unit: 'mg/L', icon: <Beaker className="w-4 h-4" />, color: '#84cc16', min: 0, max: 1 },
    temperature: { unit: '°C', icon: <Thermometer className="w-4 h-4" />, color: '#f43f5e', min: 10, max: 40 },
    flow: { unit: 'm³/h', icon: <Wind className="w-4 h-4" />, color: '#6366f1', min: 0, max: 5000 }
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
        icon: paramConfig[param.key]?.icon || <Activity className="w-4 h-4" />,
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
      case 'good': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />
      default: return <CheckCircle2 className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good': return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
      case 'warning': return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
      case 'critical': return 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
      default: return 'bg-gray-50 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-500/20'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Real-time monitoring overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <div className="text-xs text-gray-500 dark:text-slate-400">
            <span className="block">Updated: {lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
              {complianceRate >= 95 ? 'Excellent' : complianceRate >= 80 ? 'Good' : 'Attention'}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{complianceRate}%</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Compliance Rate</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            {recentAlerts.length > 0 && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-full">
                Active
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{recentAlerts.length}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Active Alerts</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalReadings}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Total Readings</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-500/10">
              <Gauge className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">9</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Parameters Monitored</p>
        </div>
      </div>

      {/* Parameters Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Effluent Parameters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Effluent Parameters</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Treated water quality</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-gray-500 dark:text-slate-400">Live</span>
            </div>
          </div>
          
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {parameters.map((param) => (
              <div 
                key={param.name} 
                className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ color: param.color }}>{param.icon}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{param.name}</span>
                  </div>
                  {getStatusIcon(param.status)}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{param.effluentValue}</span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">{param.unit}</span>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadge(param.status)}`}>
                    Limit: {param.standard} {param.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Influent Parameters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Influent Parameters</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Incoming raw wastewater</p>
            </div>
          </div>
          
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {parameters.map((param) => (
              <div 
                key={param.name + '-influent'} 
                className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ color: param.color }}>{param.icon}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{param.name}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{param.influentValue}</span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">{param.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Alerts</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Notifications requiring attention</p>
        </div>
        
        <div className="p-4">
          {recentAlerts.length > 0 ? (
            <div className="space-y-2">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/30 border border-gray-200 dark:border-slate-700">
                  <div className={`mt-0.5 p-1.5 rounded-md ${
                    alert.severity === 'critical' ? 'bg-red-100 dark:bg-red-500/20' :
                    alert.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20' :
                    'bg-blue-100 dark:bg-blue-500/20'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${
                      alert.severity === 'critical' ? 'text-red-600 dark:text-red-400' :
                      alert.severity === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{alert.parameter}</span>
                      <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">{alert.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mt-0.5">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">All parameters within standards</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
