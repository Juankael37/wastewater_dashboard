import React from 'react'

const ReportsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reports</h1>
          <p className="text-slate-300">Generate and download wastewater treatment reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Daily Report Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Daily Report</h3>
              <span className="px-3 py-1 bg-teal-500/20 text-teal-400 rounded-full text-sm">Auto-generated</span>
            </div>
            <p className="text-slate-300 mb-6">Summary of daily measurements and compliance status</p>
            <button className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-lg font-semibold transition">
              Download PDF
            </button>
          </div>

          {/* Weekly Report Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Weekly Report</h3>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">Trend Analysis</span>
            </div>
            <p className="text-slate-300 mb-6">Weekly trends and performance analysis</p>
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition">
              Generate Report
            </button>
          </div>

          {/* Monthly Report Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Monthly Report</h3>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">Comprehensive</span>
            </div>
            <p className="text-slate-300 mb-6">Monthly compliance and regulatory reporting</p>
            <button className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-semibold transition">
              Schedule Email
            </button>
          </div>
        </div>

        {/* Custom Report Generator */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-2xl font-semibold text-white mb-6">Custom Report Generator</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Date Range</label>
              <div className="flex gap-4">
                <input
                  type="date"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
                />
                <input
                  type="date"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Plant</label>
              <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white">
                <option value="all">All Plants</option>
                <option value="plant-a">Plant A</option>
                <option value="plant-b">Plant B</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Parameters</label>
              <div className="space-y-2">
                {['pH', 'COD', 'BOD', 'TSS', 'Ammonia', 'Nitrate', 'Phosphate', 'Temperature', 'Flow'].map(param => (
                  <label key={param} className="flex items-center">
                    <input type="checkbox" className="mr-2 text-teal-500" defaultChecked />
                    <span className="text-white">{param}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Report Format</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="radio" name="format" value="pdf" className="mr-2 text-teal-500" defaultChecked />
                  <span className="text-white">PDF Document</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="format" value="csv" className="mr-2 text-teal-500" />
                  <span className="text-white">CSV Data</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="format" value="excel" className="mr-2 text-teal-500" />
                  <span className="text-white">Excel Spreadsheet</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button className="px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-semibold hover:opacity-90 transition">
              Generate Custom Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage