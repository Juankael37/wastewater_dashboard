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
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { dashboardApi, type Alert as AlertDTO } from '../../services/api'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ParameterData {
  name: string
  value: number
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

interface ChartData {
  labels: string[]
  influent: number[]
  effluent: number[]
}

const DashboardPage: React.FC = () => {
  const [parameters, setParameters] = useState<ParameterData[]>([])
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<Record<string, ChartData>>({})
  const [selectedParam, setSelectedParam] = useState<string>('ph')
  const [complianceRate, setComplianceRate] = useState<number>(0)
  const [totalReadings, setTotalReadings] = useState<number>(0)
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString())
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

  const paramLabels: Record<string, string> = {
    ph: 'pH',
    cod: 'COD',
    bod: 'BOD',
    tss: 'TSS',
    ammonia: 'Ammonia',
    nitrate: 'Nitrate',
    phosphate: 'Phosphate',
    temperature: 'Temperature',
    flow: 'Flow'
  }

  const fetchData = async (showLoader: boolean = false) => {
    try {
      if (showLoader) setLoading(true)
      // #region agent log
      fetch('http://127.0.0.1:7809/ingest/3c885fd4-432d-4e7e-bd86-81fe491894f6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1f49fc'},body:JSON.stringify({sessionId:'1f49fc',runId:'initial',hypothesisId:'H1',location:'pages/dashboard/DashboardPage.tsx:fetchData:start',message:'dashboard fetch start',data:{showLoader,selectedParam,currentLastUpdated:lastUpdated},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      const snapshot = await dashboardApi.getSnapshot()
      // #region agent log
      fetch('http://127.0.0.1:7809/ingest/3c885fd4-432d-4e7e-bd86-81fe491894f6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1f49fc'},body:JSON.stringify({sessionId:'1f49fc',runId:'initial',hypothesisId:'H1',location:'pages/dashboard/DashboardPage.tsx:fetchData:afterSnapshot',message:'dashboard snapshot received',data:{totalReadings:snapshot.totalReadings,latestMeasurementTimestamp:snapshot.latestMeasurementTimestamp||null,statusCount:snapshot.parameterStatuses.length,codStatus:snapshot.parameterStatuses.find((p)=>p.key==='cod')?.value??null,bodStatus:snapshot.parameterStatuses.find((p)=>p.key==='bod')?.value??null,tssStatus:snapshot.parameterStatuses.find((p)=>p.key==='tss')?.value??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      const processedParams: ParameterData[] = snapshot.parameterStatuses.map((param) => ({
        name: param.name,
        value: param.value,
        unit: param.unit,
        status: param.status,
        standard: param.standard,
        icon: paramConfig[param.key]?.icon || <Activity className="w-5 h-5" />,
        color: param.color,
      }))

      const processedChartData: Record<string, ChartData> = {}
      Object.entries(snapshot.chartSeries).forEach(([key, series]) => {
        processedChartData[key] = {
          labels: series.labels,
          influent: series.influent,
          effluent: series.effluent,
        }
      })
      // #region agent log
      fetch('http://127.0.0.1:7809/ingest/3c885fd4-432d-4e7e-bd86-81fe491894f6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1f49fc'},body:JSON.stringify({sessionId:'1f49fc',runId:'initial',hypothesisId:'H3',location:'pages/dashboard/DashboardPage.tsx:fetchData:chartPrepared',message:'chart data prepared for render',data:{codLabels:processedChartData.cod?.labels?.slice(-3)||[],codEffluent:processedChartData.cod?.effluent?.slice(-3)||[],selectedParam},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      const processedAlerts: Alert[] = (snapshot.recentAlerts as AlertDTO[]).map((alert) => ({
        id: Number(alert.id),
        parameter: alert.parameter,
        message: alert.message || `${alert.parameter}: ${alert.status} (${alert.value})`,
        time: alert.time || 'Just now',
        severity: (alert.severity as 'warning' | 'critical' | 'info') || 'info'
      }))

      setParameters(processedParams)
      setChartData(processedChartData)
      setRecentAlerts(processedAlerts)
      setComplianceRate(snapshot.complianceRate)
      setTotalReadings(snapshot.totalReadings)
      setLastUpdated(new Date().toLocaleTimeString())
      setLatestMeasurementAt(
        snapshot.latestMeasurementTimestamp
          ? `${new Date(snapshot.latestMeasurementTimestamp).toLocaleString()} (server UTC ${new Date(snapshot.latestMeasurementTimestamp).toISOString().slice(11, 16)})`
          : 'n/a'
      )
      // #region agent log
      fetch('http://127.0.0.1:7809/ingest/3c885fd4-432d-4e7e-bd86-81fe491894f6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1f49fc'},body:JSON.stringify({sessionId:'1f49fc',runId:'initial',hypothesisId:'H4',location:'pages/dashboard/DashboardPage.tsx:fetchData:stateSet',message:'dashboard state updated',data:{parameterCards:processedParams.filter((p)=>['COD','BOD','TSS'].includes(p.name)).map((p)=>({name:p.name,value:p.value,status:p.status})),totalReadings:snapshot.totalReadings,latestMeasurementTimestamp:snapshot.latestMeasurementTimestamp||null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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

  const getChartOptions = (paramKey: string) => {
    const config = paramConfig[paramKey]
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: { color: '#94a3b8' }
        },
        title: {
          display: true,
          text: `${paramLabels[paramKey]} - Influent vs Effluent`,
          color: '#e2e8f0',
          font: { size: 14 }
        }
      },
      scales: {
        y: {
          min: config.min,
          max: config.max,
          grid: { color: '#334155' },
          ticks: { color: '#94a3b8' }
        },
        x: {
          grid: { color: '#334155' },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  }

  const getChartData = (paramKey: string) => {
    const data = chartData[paramKey]
    if (!data) return { labels: [], datasets: [] }
    
    const config = paramConfig[paramKey]
    
    return {
      labels: data.labels,
      datasets: [
        {
          label: 'Influent',
          data: data.influent,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Effluent',
          data: data.effluent,
          borderColor: config.color,
          backgroundColor: `${config.color}20`,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Standard Max',
          data: Array(data.labels.length).fill(config.max),
          borderColor: '#ef4444',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400">Real-time monitoring of all 9 wastewater parameters</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(false)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <span className="text-sm text-gray-400">Last updated: {lastUpdated}</span>
          <span className="text-xs text-slate-500">Latest measurement: {latestMeasurementAt}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Compliance Rate</p>
                  <p className="text-3xl font-bold text-green-400">{complianceRate}%</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </div>
            
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Alerts</p>
                  <p className="text-3xl font-bold text-amber-400">{recentAlerts.length}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-amber-500" />
              </div>
            </div>
            
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Readings</p>
                  <p className="text-3xl font-bold text-blue-400">{totalReadings}</p>
                </div>
                <Activity className="w-10 h-10 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Parameters</p>
                  <p className="text-3xl font-bold text-purple-400">9</p>
                </div>
                <Gauge className="w-10 h-10 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Parameters Grid - All 9 Parameters */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Current Parameters</h2>
              <p className="text-sm text-gray-400">Latest measurements with compliance status</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
              {parameters.map((param) => (
                <div 
                  key={param.name} 
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:scale-105 ${
                    param.status === 'critical' ? 'bg-red-900/20 border-red-500/50' :
                    param.status === 'warning' ? 'bg-amber-900/20 border-amber-500/50' :
                    'bg-slate-700/50 border-slate-600'
                  }`}
                  onClick={() => setSelectedParam(Object.keys(paramConfig).find(k => paramLabels[k] === param.name) || 'ph')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2" style={{ color: param.color }}>
                      {param.icon}
                      <span className="font-medium text-white">{param.name}</span>
                    </div>
                    {getStatusIcon(param.status)}
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {param.value} <span className="text-sm text-gray-400">{param.unit}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Standard: {param.standard} {param.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Section - Influent vs Effluent Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Parameter Trends - Influent vs Effluent</h2>
                <div className="flex gap-2">
                  {Object.keys(paramConfig).slice(0, 5).map(key => (
                    <button
                      key={key}
                      onClick={() => setSelectedParam(key)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        selectedParam === key 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                      }`}
                    >
                      {paramLabels[key]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-80">
                <Line 
                  data={getChartData(selectedParam)} 
                  options={getChartOptions(selectedParam)} 
                />
              </div>
            </div>

            {/* Additional Parameter Charts */}
            {Object.keys(paramConfig).slice(5).map(key => (
              <div key={key} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">{paramLabels[key]} Trend</h3>
                <div className="h-48">
                  <Line 
                    data={getChartData(key)} 
                    options={{
                      ...getChartOptions(key),
                      plugins: {
                        ...getChartOptions(key).plugins,
                        title: { display: false },
                        legend: { display: false }
                      }
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Recent Alerts */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Recent Alerts</h2>
              <p className="text-sm text-gray-400">Notifications requiring attention</p>
            </div>
            
            <div className="p-6">
              {recentAlerts.length > 0 ? (
                <div className="space-y-3">
                  {recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                      <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        alert.severity === 'warning' ? 'text-amber-500' :
                        alert.severity === 'critical' ? 'text-red-500' : 'text-blue-500'
                      }`} />
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between">
                          <h3 className="text-sm font-medium text-white">{alert.parameter}</h3>
                          <span className="text-xs text-gray-400">{alert.time}</span>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="mt-2 text-gray-400">No active alerts. All parameters are within standards.</p>
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
