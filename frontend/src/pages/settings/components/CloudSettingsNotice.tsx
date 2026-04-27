import React from 'react'

/** Reusable notice banner for cloud-deployment capability restrictions. */
const CloudSettingsNotice: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
    <p className="font-medium text-teal-300">{title}</p>
    <div className="mt-2 space-y-1 text-gray-500 dark:text-slate-400">{children}</div>
  </div>
)

export default CloudSettingsNotice
