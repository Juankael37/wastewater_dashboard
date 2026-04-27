import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi, type User } from '../../services/api'
import CloudSettingsNotice from './components/CloudSettingsNotice'
import type { SettingsCapabilities } from './types'

const UserManagementSection: React.FC<{ capabilities: SettingsCapabilities }> = ({ capabilities }) => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', confirmPassword: '', role: 'operator' as 'admin' | 'operator' | 'client' })
  const [addingUser, setAddingUser] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!capabilities.supportsUserList) {
      setLoading(false)
      return
    }
    fetchUsers()
  }, [capabilities.supportsUserList])

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

  if (!capabilities.supportsUserList) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">User Management</h2>
          <p className="text-gray-500 dark:text-slate-400">Cloud deployment</p>
        </div>
        <CloudSettingsNotice title="Managed in Supabase Authentication">
          <p>User accounts are created via the app Register page or in the Supabase Dashboard (Authentication → Users).</p>
          <p className="pt-1">Listing and deleting users from this screen are disabled because the current backend capability flags do not permit them.</p>
        </CloudSettingsNotice>
      </div>
    )
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
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">User Management</h2>
          <p className="text-gray-500 dark:text-slate-400">Manage system users and their permissions</p>
        </div>
        <button 
          disabled={!capabilities.supportsUserCreate}
          onClick={() => setShowAddUser(!showAddUser)}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-gray-900 dark:text-white rounded-lg font-semibold transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      {/* Add User Form */}
      {capabilities.supportsUserCreate && showAddUser && (
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-6 border border-gray-300 dark:border-slate-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white pr-10"
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newUser.confirmPassword}
                  onChange={(e) => setNewUser({...newUser, confirmPassword: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white pr-10"
                  placeholder="Re-enter password"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value as 'admin' | 'operator' | 'client'})}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
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
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-gray-900 dark:text-white rounded-lg disabled:opacity-50 transition"
            >
              {addingUser ? 'Creating...' : 'Create User'}
            </button>
            <button
              onClick={() => setShowAddUser(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-slate-500 text-gray-900 dark:text-white rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-300 font-semibold">User</th>
              <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-300 font-semibold">Role</th>
              <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-300 font-semibold">Access Level</th>
              <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-300 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-slate-400">Loading users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-slate-400">No users found</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="border-t border-gray-200 dark:border-slate-700/50 hover:bg-white dark:bg-slate-700/20 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center">
                        <span className="text-teal-400 font-semibold">{user.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-gray-900 dark:text-white">{user.username}</span>
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
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      {user.role === 'admin' ? 'Full access to all dashboards & settings' :
                       user.role === 'client' ? 'View-only monitoring dashboard' :
                       'Data input & monitoring (no settings)'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      {user.role !== 'admin' && capabilities.supportsUserDelete ? (
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

export default UserManagementSection
