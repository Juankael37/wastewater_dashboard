import React, { useState, useEffect } from 'react'
import {
  Users,
  Database,
  Bell,
  Shield,
  Download,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Edit,
  Save,
  X,
  Beaker,
  Thermometer,
  Wind,
  Droplets
} from 'lucide-react'
import toast from 'react-hot-toast'
import { dataManagementApi, usersApi, parametersApi, type User, type Parameter } from '../../services/api'

// User Management Component
const UserManagementSection: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', confirmPassword: '', role: 'operator' as 'admin' | 'operator' | 'client' })
  const [addingUser, setAddingUser] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await usersApi.getAll()
      setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast.error('Username and password are required')
      return
    }
    if (newUser.password !== newUser.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setAddingUser(true)
    try {
      await usersApi.create(newUser.username, newUser.password, newUser.role)
      toast.success(`User "${newUser.username}" created successfully with ${newUser.role} role`)
      setNewUser({ username: '', password: '', confirmPassword: '', role: 'operator' })
      setShowAddUser(false)
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user')
    } finally {
      setAddingUser(false)
    }
  }

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return
    
    try {
      await usersApi.delete(userId)
      toast.success(`User "${username}" deleted`)
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white">User Management</h2>
          <p className="text-slate-400">Manage system users and their permissions</p>
        </div>
        <button 
          onClick={() => setShowAddUser(!showAddUser)}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      {/* Add User Form */}
      {showAddUser && (
        <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
          <h3 className="text-lg font-semibold text-white mb-4">Add New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Confirm Password</label>
              <input
                type="password"
                value={newUser.confirmPassword}
                onChange={(e) => setNewUser({...newUser, confirmPassword: e.target.value})}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                placeholder="Re-enter password"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value as 'admin' | 'operator' | 'client'})}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
                <option value="client">Client/Owner</option>
              </select>
            </div>
          </div>
          {/* Role Descriptions */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-500">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded p-2">
              <strong className="text-purple-400">Admin:</strong> Full access to all dashboards and settings
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
              <strong className="text-blue-400">Operator:</strong> Data input and monitoring (no settings access)
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
              <strong className="text-green-400">Client/Owner:</strong> View-only access to monitoring dashboard
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddUser}
              disabled={addingUser}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg disabled:opacity-50 transition"
            >
              {addingUser ? 'Creating...' : 'Create User'}
            </button>
            <button
              onClick={() => setShowAddUser(false)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-700/30 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="text-left py-3 px-4 text-slate-300 font-semibold">User</th>
              <th className="text-left py-3 px-4 text-slate-300 font-semibold">Role</th>
              <th className="text-left py-3 px-4 text-slate-300 font-semibold">Access Level</th>
              <th className="text-left py-3 px-4 text-slate-300 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">Loading users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">No users found</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="border-t border-slate-700/50 hover:bg-slate-700/20 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center">
                        <span className="text-teal-400 font-semibold">{user.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-white">{user.username}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      user.role === 'client' ? 'bg-green-500/20 text-green-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-400">
                      {user.role === 'admin' ? 'Full access to all dashboards & settings' :
                       user.role === 'client' ? 'View-only monitoring dashboard' :
                       'Data input & monitoring (no settings)'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      {user.role !== 'admin' ? (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Protected</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Parameter Management Component
const ParameterManagementSection: React.FC = () => {
  const [parameters, setParameters] = useState<Parameter[]>([])
  const [loading, setLoading] = useState(true)
  const [editingParam, setEditingParam] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ min_limit: 0, max_limit: 0 })
  const [showAddParam, setShowAddParam] = useState(false)
  const [newParam, setNewParam] = useState({ parameter: '', min_limit: 0, max_limit: 0 })
  const [addingParam, setAddingParam] = useState(false)

  const paramIcons: Record<string, React.ReactNode> = {
    ph: <Beaker className="w-5 h-5" />,
    cod: <Droplets className="w-5 h-5" />,
    bod: <Droplets className="w-5 h-5" />,
    tss: <Droplets className="w-5 h-5" />,
    ammonia: <Beaker className="w-5 h-5" />,
    nitrate: <Beaker className="w-5 h-5" />,
    phosphate: <Beaker className="w-5 h-5" />,
    temperature: <Thermometer className="w-5 h-5" />,
    flow: <Wind className="w-5 h-5" />
  }

  const paramColors: Record<string, string> = {
    ph: 'text-teal-400',
    cod: 'text-red-400',
    bod: 'text-green-400',
    tss: 'text-orange-400',
    ammonia: 'text-cyan-400',
    nitrate: 'text-emerald-400',
    phosphate: 'text-lime-400',
    temperature: 'text-rose-400',
    flow: 'text-indigo-400'
  }

  useEffect(() => {
    fetchParameters()
  }, [])

  const fetchParameters = async () => {
    try {
      setLoading(true)
      const data = await parametersApi.getAll()
      setParameters(data)
    } catch (error) {
      console.error('Failed to fetch parameters:', error)
      toast.error('Failed to load parameters')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (paramName: string) => {
    try {
      await parametersApi.update(paramName, editValues)
      toast.success(`Updated ${paramName} standards`)
      setEditingParam(null)
      fetchParameters()
    } catch (error) {
      toast.error('Failed to update parameter')
    }
  }

  const handleAddParameter = async () => {
    if (!newParam.parameter || newParam.min_limit === undefined || newParam.max_limit === undefined) {
      toast.error('All fields are required')
      return
    }
    if (newParam.min_limit >= newParam.max_limit) {
      toast.error('Min limit must be less than max limit')
      return
    }

    setAddingParam(true)
    try {
      await parametersApi.create(newParam.parameter, newParam.min_limit, newParam.max_limit)
      toast.success(`Parameter "${newParam.parameter}" added successfully`)
      setNewParam({ parameter: '', min_limit: 0, max_limit: 0 })
      setShowAddParam(false)
      fetchParameters()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add parameter')
    } finally {
      setAddingParam(false)
    }
  }

  const handleDeleteParameter = async (paramName: string) => {
    if (!confirm(`Are you sure you want to delete parameter "${paramName}"?`)) return
    
    try {
      await parametersApi.delete(paramName)
      toast.success(`Parameter "${paramName}" deleted`)
      fetchParameters()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete parameter')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white">Parameter Management</h2>
          <p className="text-slate-400">Configure water quality standards for all parameters</p>
        </div>
        <button
          onClick={() => setShowAddParam(!showAddParam)}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Parameter
        </button>
      </div>

      {/* Add Parameter Form */}
      {showAddParam && (
        <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Parameter</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Parameter Name</label>
              <input
                type="text"
                value={newParam.parameter}
                onChange={(e) => setNewParam({...newParam, parameter: e.target.value.toLowerCase()})}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                placeholder="e.g., turbidity"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Min Limit</label>
              <input
                type="number"
                step="0.01"
                value={newParam.min_limit}
                onChange={(e) => setNewParam({...newParam, min_limit: parseFloat(e.target.value) || 0})}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Max Limit</label>
              <input
                type="number"
                step="0.01"
                value={newParam.max_limit}
                onChange={(e) => setNewParam({...newParam, max_limit: parseFloat(e.target.value) || 0})}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
                placeholder="100"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleAddParameter}
                disabled={addingParam}
                className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg disabled:opacity-50 transition"
              >
                {addingParam ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => setShowAddParam(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-8 text-center text-slate-400">Loading parameters...</div>
        ) : (
          parameters.map(param => (
            <div key={param.id} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-2 ${paramColors[param.parameter] || 'text-slate-400'}`}>
                  {paramIcons[param.parameter] || <Beaker className="w-5 h-5" />}
                  <span className="font-semibold text-white capitalize">{param.parameter}</span>
                </div>
                {editingParam === param.parameter ? (
                  <button onClick={() => setEditingParam(null)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => { setEditingParam(param.parameter); setEditValues({ min_limit: param.min_limit || 0, max_limit: param.max_limit || 0 }) }} className="text-slate-400 hover:text-white">
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>

              {editingParam === param.parameter ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Min</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editValues.min_limit}
                        onChange={(e) => setEditValues({...editValues, min_limit: parseFloat(e.target.value) || 0})}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Max</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editValues.max_limit}
                        onChange={(e) => setEditValues({...editValues, max_limit: parseFloat(e.target.value) || 0})}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleSave(param.parameter)}
                    className="w-full px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded text-sm transition flex items-center justify-center gap-2"
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                </div>
              ) : (
                <div className="text-sm text-slate-300">
                  <p>Standard: <span className="text-white font-medium">{param.min_limit} - {param.max_limit}</span></p>
                </div>
              )}
              
              {/* Delete button for custom parameters */}
              {!['ph', 'cod', 'bod', 'tss', 'ammonia', 'nitrate', 'phosphate', 'temperature', 'flow'].includes(param.parameter.toLowerCase()) && (
                <button
                  onClick={() => handleDeleteParameter(param.parameter)}
                  className="mt-2 w-full px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Data Management Component
const DataManagementSection: React.FC = () => {
  const [dataCount, setDataCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    fetchDataCount()
  }, [])

  const fetchDataCount = async () => {
    try {
      const result = await dataManagementApi.getCount()
      setDataCount(result.count)
    } catch (error) {
      console.error('Failed to fetch data count:', error)
    }
  }

  const handleClearAllData = async () => {
    if (!dataCount || dataCount === 0) {
      toast.error('No data to clear')
      return
    }

    setLoading(true)
    try {
      const result = await dataManagementApi.clearAll()
      toast.success(result.message)
      setDataCount(0)
      setShowClearConfirm(false)
    } catch (error) {
      toast.error('Failed to clear data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Data Management</h2>
        <p className="text-slate-400">Manage measurement data and backups</p>
      </div>

      <div className="bg-slate-700/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Current Data Status</h3>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-slate-400">Total Measurements:</span>
              <span className="text-3xl font-bold text-white">
                {loading ? '...' : dataCount || 0}
              </span>
            </div>
          </div>
          <button
            onClick={fetchDataCount}
            className="p-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition"
          >
            <RefreshCw className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-400 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Danger Zone</h3>
            <p className="text-red-300 text-sm mb-4">
              Clearing all data will permanently delete all measurement records. This action cannot be undone.
            </p>
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={loading || !dataCount || dataCount === 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Data
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleClearAllData}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition"
                >
                  {loading ? 'Clearing...' : `Yes, Delete ${dataCount} Records`}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Settings Page
type SettingsTab = 'users' | 'parameters' | 'data' | 'notifications' | 'security'

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('users')

  const tabs = [
    { id: 'users' as SettingsTab, label: 'User Management', icon: <Users className="w-5 h-5" /> },
    { id: 'parameters' as SettingsTab, label: 'Parameter Management', icon: <Database className="w-5 h-5" /> },
    { id: 'data' as SettingsTab, label: 'Data Management', icon: <Download className="w-5 h-5" /> },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    { id: 'security' as SettingsTab, label: 'Security', icon: <Shield className="w-5 h-5" /> },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagementSection />
      case 'parameters':
        return <ParameterManagementSection />
      case 'data':
        return <DataManagementSection />
      case 'notifications':
        return (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Notification Settings</h3>
            <p className="text-slate-400">Configure email and push notifications for alerts and reports.</p>
            <p className="text-slate-500 text-sm mt-4">Coming soon...</p>
          </div>
        )
      case 'security':
        return (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Security Settings</h3>
            <p className="text-slate-400">Manage password policies, session timeouts, and access controls.</p>
            <p className="text-slate-500 text-sm mt-4">Coming soon...</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Configure system settings and manage users</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
              <nav className="space-y-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      activeTab === tab.id 
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
