import React, { useState, useEffect } from 'react'
import { Users, Database, Shield, Mail } from 'lucide-react'
import { getBackendCapabilities } from '../../services/api'
import UserManagementSection from './UserManagementSection'
import ParameterManagementSection from './ParameterManagementSection'
import DataManagementSection from './DataManagementSection'
import type { SettingsCapabilities } from './types'
import ReportSettingsSection from './ReportSettingsSection'

type TabId = 'users' | 'parameters' | 'data' | 'reports'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" /> },
  { id: 'parameters', label: 'Parameters', icon: <Shield className="w-5 h-5" /> },
  { id: 'data', label: 'Data', icon: <Database className="w-5 h-5" /> },
  { id: 'reports', label: 'Reports', icon: <Mail className="w-5 h-5" /> },
]

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('users')
  const [capabilities, setCapabilities] = useState<SettingsCapabilities>({
    supportsUserList: false,
    supportsUserCreate: false,
    supportsUserDelete: false,
    supportsParameterWrite: false,
    supportsDataCount: false,
    supportsDataClear: false,
  })

  useEffect(() => {
    const loadCapabilities = async () => {
      try {
        const caps = await getBackendCapabilities()
        setCapabilities({
          supportsUserList: !!caps.supportsLegacyUserListApi,
          supportsUserCreate: !!caps.supportsLegacyUserCreateApi,
          supportsUserDelete: !!caps.supportsLegacyUserDeleteApi,
          supportsParameterWrite: !!caps.supportsLegacyParameterWriteApi,
          supportsDataCount: !!caps.supportsLegacyDataCountApi,
          supportsDataClear: !!caps.supportsLegacyDataClearApi,
        })
      } catch (error) {
        console.error('Failed to load capabilities:', error)
      }
    }
    loadCapabilities()
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Manage users, parameters, and system data</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-slate-700 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition ${
              activeTab === tab.id
                ? 'bg-teal-500/20 text-teal-400 border-b-2 border-teal-400'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700/30'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <UserManagementSection capabilities={capabilities} />}
      {activeTab === 'parameters' && <ParameterManagementSection capabilities={capabilities} />}
      {activeTab === 'data' && <DataManagementSection capabilities={capabilities} />}
      {activeTab === 'reports' && <ReportSettingsSection />}
    </div>
  )
}

export default SettingsPage
