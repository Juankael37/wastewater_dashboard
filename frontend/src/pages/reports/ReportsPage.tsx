import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { reportsApi } from '../../services/api/management'
import { Download, Calendar, Loader2 } from 'lucide-react'

const PARAM_LIST = ['Ammonia', 'COD', 'BOD', 'TSS', 'Nitrate', 'Phosphate', 'pH', 'Temperature', 'Flow']

const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null)

  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [weeklyStart, setWeeklyStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })
  const [weeklyEnd, setWeeklyEnd] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [monthlyYear, setMonthlyYear] = useState(() => new Date().getFullYear())
  const [monthlyMonth, setMonthlyMonth] = useState(() => new Date().getMonth() + 1)

  const handleWeeklyStartChange = (value: string) => {
    setWeeklyStart(value)
    const startDate = new Date(value)
    startDate.setDate(startDate.getDate() + 6)
    setWeeklyEnd(startDate.toISOString().slice(0, 10))
  }

  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [customParams, setCustomParams] = useState<string[]>(PARAM_LIST)
  const [customFormat, setCustomFormat] = useState<'pdf' | 'csv'>('pdf')

  const handleDownloadDaily = async () => {
    setLoading('daily')
    try {
      const start = dailyDate
      const end = dailyDate
      const blob = await reportsApi.generateRichPDF({ start, end })
      downloadBlob(blob, `daily_report_${start}.pdf`)
      toast.success('Daily report downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download daily report')
    } finally {
      setLoading(null)
    }
  }

  const handleDownloadWeekly = async () => {
    setLoading('weekly')
    try {
      const blob = await reportsApi.generateRichPDF({ start: weeklyStart, end: weeklyEnd })
      downloadBlob(blob, `weekly_report_${weeklyStart}_to_${weeklyEnd}.pdf`)
      toast.success('Weekly report downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download weekly report')
    } finally {
      setLoading(null)
    }
  }

  const handleDownloadMonthly = async () => {
    setLoading('monthly')
    try {
      const startDate = new Date(monthlyYear, monthlyMonth - 1, 1)
      const endDate = new Date(monthlyYear, monthlyMonth, 0)
      const start = startDate.toISOString().slice(0, 10)
      const end = endDate.toISOString().slice(0, 10)
      const blob = await reportsApi.generateRichPDF({ start, end })
      const monthName = startDate.toLocaleString('default', { month: 'long' })
      downloadBlob(blob, `monthly_report_${monthName}_${monthlyYear}.pdf`)
      toast.success('Monthly report downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download monthly report')
    } finally {
      setLoading(null)
    }
  }

  const handleDownloadCustom = async () => {
    setLoading('custom')
    try {
      const blob = await reportsApi.generateRichPDF({ 
        start: customStart, 
        end: customEnd
      })
      downloadBlob(blob, `custom_report_${customStart}_to_${customEnd}.pdf`)
      toast.success('Custom report downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download custom report')
    } finally {
      setLoading(null)
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleParam = (param: string) => {
    setCustomParams(prev => 
      prev.includes(param) 
        ? prev.filter(p => p !== param)
        : [...prev, param]
    )
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ]

  return (
    <div className="space-y-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reports</h1>
          <p className="text-gray-500 dark:text-slate-300">Generate and download wastewater treatment reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Daily Report Card */}
          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Daily Report</h3>
              <span className="px-3 py-1 bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-full text-sm">Single Day</span>
            </div>
            <p className="text-gray-600 dark:text-slate-300 mb-4">Select a specific date to download that day's full report</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Select Date</label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              />
            </div>
            
            <button 
              onClick={handleDownloadDaily}
              disabled={loading === 'daily' || !dailyDate}
              className="w-full bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading === 'daily' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              Download PDF
            </button>
          </div>

          {/* Weekly Report Card */}
          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Weekly Report</h3>
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-sm">7 Days</span>
            </div>
            <p className="text-gray-600 dark:text-slate-300 mb-4">Select date range (start and end) for the week</p>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={weeklyStart}
                  onChange={(e) => handleWeeklyStartChange(e.target.value)}
                  className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">End Date</label>
                <input
                  type="date"
                  value={weeklyEnd}
                  onChange={(e) => setWeeklyEnd(e.target.value)}
                  className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <button 
              onClick={handleDownloadWeekly}
              disabled={loading === 'weekly' || !weeklyStart || !weeklyEnd}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading === 'weekly' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
              Generate Report
            </button>
          </div>

          {/* Monthly Report Card */}
          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Monthly Report</h3>
              <span className="px-3 py-1 bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full text-sm">Full Month</span>
            </div>
            <p className="text-gray-600 dark:text-slate-300 mb-4">Select a specific month to download that month's full report</p>
            
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Year</label>
                <select
                  value={monthlyYear}
                  onChange={(e) => setMonthlyYear(parseInt(e.target.value))}
                  className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Month</label>
                <select
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(parseInt(e.target.value))}
                  className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label.slice(0, 3)}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <button 
              onClick={handleDownloadMonthly}
              disabled={loading === 'monthly'}
              className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading === 'monthly' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Custom Report Generator */}
        <div className="mt-8 bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Custom Report Generator</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Date Range</label>
              <div className="flex gap-4">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
                />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Parameters</label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {PARAM_LIST.map(param => (
                  <label key={param} className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={customParams.includes(param)}
                      onChange={() => toggleParam(param)}
                      className="mr-2 text-teal-600 dark:text-teal-500" 
                    />
                    <span className="text-gray-900 dark:text-white text-sm">{param}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Report Format</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="format" 
                    value="pdf" 
                    checked={customFormat === 'pdf'}
                    onChange={() => setCustomFormat('pdf')}
                    className="mr-2 text-teal-600 dark:text-teal-500" 
                  />
                  <span className="text-gray-900 dark:text-white">PDF Document</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="format" 
                    value="csv" 
                    checked={customFormat === 'csv'}
                    onChange={() => setCustomFormat('csv')}
                    className="mr-2 text-teal-600 dark:text-teal-500" 
                  />
                  <span className="text-gray-900 dark:text-white">CSV Data</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleDownloadCustom}
              disabled={loading === 'custom' || !customStart || !customEnd}
              className="px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold hover:opacity-90 transition-colors flex items-center gap-2"
            >
              {loading === 'custom' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              Generate Custom Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage