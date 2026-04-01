import React from 'react'
import { Users, Settings as SettingsIcon, Database, Bell, Shield, Download } from 'lucide-react'

const SettingsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-300">Configure system settings and manage users</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Settings Menu</h2>
              <nav className="space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">User Management</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-700/50 rounded-lg transition">
                  <SettingsIcon className="w-5 h-5" />
                  <span>System Settings</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-700/50 rounded-lg transition">
                  <Database className="w-5 h-5" />
                  <span>Parameter Management</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-700/50 rounded-lg transition">
                  <Bell className="w-5 h-5" />
                  <span>Notification Settings</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-700/50 rounded-lg transition">
                  <Shield className="w-5 h-5" />
                  <span>Security & Permissions</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-700/50 rounded-lg transition">
                  <Download className="w-5 h-5" />
                  <span>Data Management</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content - User Management */}
          <div className="lg:col-span-2 space-y-8">
            {/* User Management Section */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-white">User Management</h2>
                  <p className="text-slate-300">Manage system users and their permissions</p>
                </div>
                <button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition">
                  Add New User
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">User</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Role</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 1, name: 'John Smith', email: 'john@example.com', role: 'Admin', status: 'Active' },
                      { id: 2, name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Operator', status: 'Active' },
                      { id: 3, name: 'Mike Chen', email: 'mike@example.com', role: 'User', status: 'Active' },
                      { id: 4, name: 'Emma Wilson', email: 'emma@example.com', role: 'Operator', status: 'Inactive' },
                      { id: 5, name: 'Alex Rivera', email: 'alex@example.com', role: 'User', status: 'Active' },
                    ].map(user => (
                      <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center">
                              <span className="text-teal-400 font-semibold">{user.name.charAt(0)}</span>
                            </div>
                            <span className="text-white">{user.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-300">{user.email}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            user.role === 'Admin' ? 'bg-purple-500/20 text-purple-400' :
                            user.role === 'Operator' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            user.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600 transition">
                              Edit
                            </button>
                            <button className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30 transition">
                              {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* System Settings Section */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <h2 className="text-2xl font-semibold text-white mb-6">System Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Default Plant</label>
                      <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white">
                        <option value="plant-a">Plant A</option>
                        <option value="plant-b">Plant B</option>
                        <option value="plant-c">Plant C</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Time Zone</label>
                      <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white">
                        <option value="utc+8">UTC+8 (Philippine Time)</option>
                        <option value="utc+0">UTC+0 (GMT)</option>
                        <option value="utc-5">UTC-5 (Eastern Time)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Date Format</label>
                      <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white">
                        <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                        <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                        <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Units System</label>
                      <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white">
                        <option value="metric">Metric (mg/L, °C)</option>
                        <option value="imperial">Imperial (ppm, °F)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Data Retention</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Raw Data Retention</label>
                      <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white">
                        <option value="1year">1 Year</option>
                        <option value="2years">2 Years</option>
                        <option value="5years">5 Years</option>
                        <option value="forever">Indefinitely</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Backup Frequency</label>
                      <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Security Settings</h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between">
                      <div>
                        <span className="text-white">Two-Factor Authentication</span>
                        <p className="text-sm text-slate-300">Require 2FA for all admin users</p>
                      </div>
                      <input type="checkbox" className="toggle" />
                    </label>
                    <label className="flex items-center justify-between">
                      <div>
                        <span className="text-white">Session Timeout</span>
                        <p className="text-sm text-slate-300">Auto-logout after inactivity</p>
                      </div>
                      <input type="checkbox" className="toggle" defaultChecked />
                    </label>
                    <label className="flex items-center justify-between">
                      <div>
                        <span className="text-white">IP Whitelisting</span>
                        <p className="text-sm text-slate-300">Restrict access to specific IPs</p>
                      </div>
                      <input type="checkbox" className="toggle" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button className="px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-semibold hover:opacity-90 transition">
                  Save All Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage