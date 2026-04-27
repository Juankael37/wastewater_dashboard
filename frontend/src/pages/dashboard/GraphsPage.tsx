import React, { useState, useEffect, useMemo } from 'react'
import {
  Thermometer,
  Droplets,
  Beaker,
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
import { dashboardApi } from '../../services/api'

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

interface ChartData {
  labels: string[]
  influent: number[]
  effluent: number[]
}

const paramConfig: Record<string, { label: string, category: string, color: string, min: number, max: number }> = {
  ph: { label: 'pH', category: 'Physical', color: '#3b82f6', min: 6.0, max: 9.5 },
  temperature: { label: 'Temperature', category: 'Physical', color: '#f43f5e', min: 10, max: 40 },
  tss: { label: 'TSS', category: 'Physical', color: '#8b5cf6', min: 0, max: 100 },
  flow: { label: 'Flow', category: 'Physical', color: '#6366f1', min: 0, max: 5000 },
  cod: { label: 'COD', category: 'Chemical', color: '#ef4444', min: 0, max: 100 },
  bod: { label: 'BOD', category: 'Chemical', color: '#f97316', min: 0, max: 50 },
  ammonia: { label: 'Ammonia', category: 'Nutrients', color: '#06b6d4', min: 0, max: 0.5 },
  nitrate: { label: 'Nitrate', category: 'Nutrients', color: '#10b981', min: 0, max: 14 },
  phosphate: { label: 'Phosphate', category: 'Nutrients', color: '#84cc16', min: 0, max: 1 },
}

const GraphsPage: React.FC = () => {
  const [chartData, setChartData] = useState<Record<string, ChartData>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString())
  const [activeCategory, setActiveCategory] = useState<string>('Physical')

  const fetchData = async (showLoader: boolean = false) => {
    try {
      if (showLoader) setLoading(true)
      const snapshot = await dashboardApi.getSnapshot()
      
      const processedChartData: Record<string, ChartData> = {}
      Object.entries(snapshot.chartSeries).forEach(([key, series]) => {
        processedChartData[key] = {
          labels: series.labels,
          influent: series.influent,
          effluent: series.effluent,
        }
      })
      
      setChartData(processedChartData)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (error) {
      console.error('Failed to fetch graph data:', error)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
  }, [])

  const getChartOptions = (paramKey: string) => {
    const config = paramConfig[paramKey]
    if (!config) return {}
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: { color: '#64748b' } // Slate 500
        },
        title: {
          display: true,
          text: `${config.label} - Influent vs Effluent`,
          color: '#64748b',
          font: { size: 14 }
        }
      },
      scales: {
        y: {
          min: config.min,
          max: config.max,
          grid: { color: 'rgba(148, 163, 184, 0.1)' }, // Slate 400 with 0.1 opacity
          ticks: { color: '#64748b' }
        },
        x: {
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
          ticks: { color: '#64748b' }
        }
      }
    }
  }

  const getChartData = (paramKey: string) => {
    const data = chartData[paramKey]
    if (!data) return { labels: [], datasets: [] }
    
    const config = paramConfig[paramKey]
    if (!config) return { labels: [], datasets: [] }
    
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

  const categories = ['Physical', 'Chemical', 'Nutrients']
  
  const filteredParams = useMemo(() => {
    return Object.keys(paramConfig).filter(k => paramConfig[k].category === activeCategory)
  }, [activeCategory])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historical Trends</h1>
          <p className="text-gray-500 dark:text-gray-400">Detailed parameter analysis and historical comparisons</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(false)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Last updated: {lastUpdated}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading chart data...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">
          <div className="border-b border-gray-200 dark:border-slate-700">
            <nav className="flex px-4" aria-label="Tabs">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`${
                    activeCategory === category
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-slate-600'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors`}
                >
                  {category} Parameters
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {filteredParams.map(key => (
                <div key={key} className="bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 transition-colors">
                  <div className="h-80">
                    <Line 
                      data={getChartData(key)} 
                      options={getChartOptions(key)} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GraphsPage
