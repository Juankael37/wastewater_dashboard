import React, { useState, useEffect } from 'react'
import { Plus, Edit, Save, X, Trash2, Beaker, Thermometer, Wind, Droplets } from 'lucide-react'
import toast from 'react-hot-toast'
import { parametersApi, type Parameter } from '../../services/api'
import CloudSettingsNotice from './components/CloudSettingsNotice'
import type { SettingsCapabilities } from './types'

const CORE_PARAMS = ['ph','cod','bod','tss','ammonia','nitrate','phosphate','temperature','flow']
const ICONS: Record<string, React.ReactNode> = {
  ph:<Beaker className="w-5 h-5"/>,cod:<Droplets className="w-5 h-5"/>,bod:<Droplets className="w-5 h-5"/>,
  tss:<Droplets className="w-5 h-5"/>,ammonia:<Beaker className="w-5 h-5"/>,nitrate:<Beaker className="w-5 h-5"/>,
  phosphate:<Beaker className="w-5 h-5"/>,temperature:<Thermometer className="w-5 h-5"/>,flow:<Wind className="w-5 h-5"/>,
}
const COLORS: Record<string,string> = {
  ph:'text-teal-400',cod:'text-red-400',bod:'text-green-400',tss:'text-orange-400',
  ammonia:'text-cyan-400',nitrate:'text-emerald-400',phosphate:'text-lime-400',
  temperature:'text-rose-400',flow:'text-indigo-400',
}

const ParameterManagementSection: React.FC<{capabilities:SettingsCapabilities}> = ({capabilities}) => {
  const canWrite = capabilities.supportsParameterWrite
  const [parameters,setParameters] = useState<Parameter[]>([])
  const [loading,setLoading] = useState(true)
  const [editingParam,setEditingParam] = useState<string|null>(null)
  const [editValues,setEditValues] = useState({min_limit:0,max_limit:0})
  const [showAdd,setShowAdd] = useState(false)
  const [newParam,setNewParam] = useState({parameter:'',min_limit:0,max_limit:0})
  const [adding,setAdding] = useState(false)

  useEffect(()=>{fetchParams()},[])

  const fetchParams = async()=>{
    try{setLoading(true);setParameters(await parametersApi.getAll())}
    catch(e){console.error(e);toast.error('Failed to load parameters')}
    finally{setLoading(false)}
  }
  const handleSave = async(name:string)=>{
    try{await parametersApi.update(name,editValues);toast.success(`Updated ${name}`);setEditingParam(null);fetchParams()}
    catch{toast.error('Failed to update')}
  }
  const handleAdd = async()=>{
    if(!newParam.parameter){toast.error('Name required');return}
    if(newParam.min_limit>=newParam.max_limit){toast.error('Min must be < Max');return}
    setAdding(true)
    try{await parametersApi.create(newParam.parameter,newParam.min_limit,newParam.max_limit);toast.success('Added');setNewParam({parameter:'',min_limit:0,max_limit:0});setShowAdd(false);fetchParams()}
    catch(e:any){toast.error(e.message||'Failed')}finally{setAdding(false)}
  }
  const handleDelete = async(name:string)=>{
    if(!confirm(`Delete "${name}"?`))return
    try{await parametersApi.delete(name);toast.success('Deleted');fetchParams()}catch(e:any){toast.error(e.message||'Failed')}
  }

  return (
    <div className="space-y-6">
      {!canWrite&&<CloudSettingsNotice title="Read-only on cloud API"><p>Parameters loaded from Supabase. Write actions require backend support.</p></CloudSettingsNotice>}
      <div className="flex justify-between items-center">
        <div><h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Parameter Management</h2><p className="text-gray-500 dark:text-slate-400">Configure water quality standards</p></div>
        {canWrite&&<button onClick={()=>setShowAdd(!showAdd)} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-gray-900 dark:text-white rounded-lg font-semibold transition flex items-center gap-2"><Plus className="w-4 h-4"/>Add Parameter</button>}
      </div>
      {canWrite&&showAdd&&(
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-6 border border-gray-300 dark:border-slate-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Parameter</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">Name</label><input type="text" value={newParam.parameter} onChange={e=>setNewParam({...newParam,parameter:e.target.value.toLowerCase()})} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white" placeholder="e.g., turbidity"/></div>
            <div><label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">Min</label><input type="number" step="0.01" value={newParam.min_limit} onChange={e=>setNewParam({...newParam,min_limit:parseFloat(e.target.value)||0})} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"/></div>
            <div><label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">Max</label><input type="number" step="0.01" value={newParam.max_limit} onChange={e=>setNewParam({...newParam,max_limit:parseFloat(e.target.value)||0})} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"/></div>
            <div className="flex items-end gap-2"><button onClick={handleAdd} disabled={adding} className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-gray-900 dark:text-white rounded-lg disabled:opacity-50 transition">{adding?'Adding...':'Add'}</button><button onClick={()=>setShowAdd(false)} className="px-4 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-slate-500 text-gray-900 dark:text-white rounded-lg transition">Cancel</button></div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading?<div className="col-span-full py-8 text-center text-gray-500 dark:text-slate-400">Loading...</div>:
        parameters.map(p=>(
          <div key={p.id} className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 border border-gray-300 dark:border-slate-600">
            <div className="flex items-center justify-between mb-3">
              <div className={`flex items-center gap-2 ${COLORS[p.parameter]||'text-gray-500 dark:text-slate-400'}`}>{ICONS[p.parameter]||<Beaker className="w-5 h-5"/>}<span className="font-semibold text-gray-900 dark:text-white capitalize">{p.parameter}</span></div>
              {canWrite&&(editingParam===p.parameter?<button onClick={()=>setEditingParam(null)} className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white"><X className="w-4 h-4"/></button>:<button onClick={()=>{setEditingParam(p.parameter);setEditValues({min_limit:p.min_limit||0,max_limit:p.max_limit||0})}} className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white"><Edit className="w-4 h-4"/></button>)}
            </div>
            {editingParam===p.parameter?(
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Min</label><input type="number" step="0.01" value={editValues.min_limit} onChange={e=>setEditValues({...editValues,min_limit:parseFloat(e.target.value)||0})} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-gray-900 dark:text-white text-sm"/></div>
                  <div><label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Max</label><input type="number" step="0.01" value={editValues.max_limit} onChange={e=>setEditValues({...editValues,max_limit:parseFloat(e.target.value)||0})} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-gray-900 dark:text-white text-sm"/></div>
                </div>
                <button onClick={()=>handleSave(p.parameter)} className="w-full px-3 py-2 bg-teal-500 hover:bg-teal-600 text-gray-900 dark:text-white rounded text-sm transition flex items-center justify-center gap-2"><Save className="w-3 h-3"/>Save</button>
              </div>
            ):<div className="text-sm text-gray-600 dark:text-slate-300"><p>Standard: <span className="text-gray-900 dark:text-white font-medium">{p.min_limit} - {p.max_limit}</span></p></div>}
            {canWrite&&!CORE_PARAMS.includes(p.parameter.toLowerCase())&&<button onClick={()=>handleDelete(p.parameter)} className="mt-2 w-full px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition flex items-center justify-center gap-1"><Trash2 className="w-3 h-3"/>Delete</button>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ParameterManagementSection
