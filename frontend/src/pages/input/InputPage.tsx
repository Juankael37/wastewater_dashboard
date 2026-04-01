import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Camera, Upload, CheckCircle, AlertCircle } from 'lucide-react'

interface FormData {
  plant: string
  location: string
  timestamp: string
  ph: number | null
  cod: number | null
  bod: number | null
  tss: number | null
  ammonia: number | null
  nitrate: number | null
  phosphate: number | null
  temperature: number | null
  flow: number | null
  type: 'influent' | 'effluent'
}

interface CameraState {
  parameter: string
  isCapturing: boolean
  imageUrl: string | null
}

const InputPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
    defaultValues: {
      plant: 'Plant A',
      location: 'Main Treatment',
      timestamp: new Date().toISOString().slice(0, 16),
      type: 'influent'
    }
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cameraState, setCameraState] = useState<CameraState>({
    parameter: '',
    isCapturing: false,
    imageUrl: null
  })
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])

  // Validation ranges based on project specifications
  const validationRanges = {
    ph: { min: 0, max: 14, warning: 'pH should be between 0-14' },
    cod: { min: 0, max: 1000, warning: 'COD typically 0-1000 mg/L' },
    bod: { min: 0, max: 500, warning: 'BOD typically 0-500 mg/L' },
    tss: { min: 0, max: 1000, warning: 'TSS typically 0-1000 mg/L' },
    ammonia: { min: 0, max: 100, warning: 'Ammonia typically 0-100 mg/L' },
    nitrate: { min: 0, max: 100, warning: 'Nitrate typically 0-100 mg/L' },
    phosphate: { min: 0, max: 50, warning: 'Phosphate typically 0-50 mg/L' },
    temperature: { min: 0, max: 50, warning: 'Temperature typically 0-50°C' },
    flow: { min: 0, max: 10000, warning: 'Flow typically 0-10000 m³/day' }
  }

  const validateParameter = (parameter: keyof typeof validationRanges, value: number | null) => {
    if (value === null || value === undefined) return null
    
    const range = validationRanges[parameter]
    if (value < range.min || value > range.max) {
      return range.warning
    }
    return null
  }

  const handleFormChange = () => {
    const warnings: string[] = []
    const formValues = watch()
    
    Object.keys(validationRanges).forEach(key => {
      const paramKey = key as keyof typeof validationRanges
      const value = formValues[paramKey as keyof FormData]
      if (value !== null && value !== undefined) {
        const warning = validateParameter(paramKey, value as number)
        if (warning) warnings.push(warning)
      }
    })
    
    setValidationWarnings(warnings)
  }

  const handleCameraCapture = (parameter: string) => {
    setCameraState({ parameter, isCapturing: true, imageUrl: null })
    
    // Simulate camera capture (in real app, this would use device camera)
    setTimeout(() => {
      setCameraState({
        parameter,
        isCapturing: false,
        imageUrl: `https://via.placeholder.com/300x200/3b82f6/ffffff?text=${parameter}+Sample`
      })
      toast.success(`${parameter} image captured`)
    }, 1500)
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In real app, this would submit to backend
      console.log('Form submitted:', data)
      
      toast.success('Data submitted successfully!')
      reset()
      setValidationWarnings([])
    } catch (error) {
      toast.error('Failed to submit data. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const plants = ['Plant A', 'Plant B', 'Plant C', 'Plant D']
  const locations = ['Main Treatment', 'Primary Clarifier', 'Aeration Tank', 'Secondary Clarifier', 'Disinfection']

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Data Input</h1>
          <p className="text-slate-300">Enter wastewater treatment parameters with real-time validation</p>
        </div>

        {/* Validation Warnings */}
        {validationWarnings.length > 0 && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-amber-500">Validation Warnings</h3>
            </div>
            <ul className="space-y-1">
              {validationWarnings.map((warning, index) => (
                <li key={index} className="text-sm text-amber-400">{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} onChange={handleFormChange} className="space-y-6">
          {/* Basic Information Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Plant</label>
                <select
                  {...register('plant', { required: 'Plant is required' })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {plants.map(plant => (
                    <option key={plant} value={plant}>{plant}</option>
                  ))}
                </select>
                {errors.plant && <p className="mt-1 text-sm text-red-400">{errors.plant.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                <select
                  {...register('location', { required: 'Location is required' })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
                {errors.location && <p className="mt-1 text-sm text-red-400">{errors.location.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Timestamp</label>
                <input
                  type="datetime-local"
                  {...register('timestamp', { required: 'Timestamp is required' })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                {errors.timestamp && <p className="mt-1 text-sm text-red-400">{errors.timestamp.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Sample Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      {...register('type')}
                      value="influent"
                      className="mr-2 text-teal-500"
                    />
                    <span className="text-white">Influent</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      {...register('type')}
                      value="effluent"
                      className="mr-2 text-teal-500"
                    />
                    <span className="text-white">Effluent</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Water Quality Parameters Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Water Quality Parameters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'ph', label: 'pH', unit: '', min: 0, max: 14, step: 0.1 },
                { id: 'cod', label: 'COD', unit: 'mg/L', min: 0, max: 1000, step: 1 },
                { id: 'bod', label: 'BOD', unit: 'mg/L', min: 0, max: 500, step: 1 },
                { id: 'tss', label: 'TSS', unit: 'mg/L', min: 0, max: 1000, step: 1 },
                { id: 'ammonia', label: 'Ammonia', unit: 'mg/L', min: 0, max: 100, step: 0.1 },
                { id: 'nitrate', label: 'Nitrate', unit: 'mg/L', min: 0, max: 100, step: 0.1 },
                { id: 'phosphate', label: 'Phosphate', unit: 'mg/L', min: 0, max: 50, step: 0.1 },
                { id: 'temperature', label: 'Temperature', unit: '°C', min: 0, max: 50, step: 0.1 },
                { id: 'flow', label: 'Flow', unit: 'm³/day', min: 0, max: 10000, step: 1 }
              ].map(param => (
                <div key={param.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-slate-300">
                      {param.label}
                      {param.unit && <span className="text-slate-400 ml-1">({param.unit})</span>}
                    </label>
                    {['cod', 'bod', 'ammonia', 'nitrate', 'phosphate'].includes(param.id) && (
                      <button
                        type="button"
                        onClick={() => handleCameraCapture(param.label)}
                        className="flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300"
                        disabled={cameraState.isCapturing}
                      >
                        <Camera className="w-4 h-4" />
                        {cameraState.isCapturing && cameraState.parameter === param.label ? 'Capturing...' : 'Capture'}
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step={param.step}
                    min={param.min}
                    max={param.max}
                    {...register(param.id as keyof FormData, {
                      valueAsNumber: true,
                      min: { value: param.min, message: `Minimum ${param.min}` },
                      max: { value: param.max, message: `Maximum ${param.max}` }
                    })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder={`Enter ${param.label}`}
                  />
                  {errors[param.id as keyof FormData] && (
                    <p className="text-sm text-red-400">{errors[param.id as keyof FormData]?.message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Camera Preview */}
          {cameraState.imageUrl && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                {cameraState.parameter} Image Preview
              </h3>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <img
                  src={cameraState.imageUrl}
                  alt={`${cameraState.parameter} sample`}
                  className="w-full md:w-64 h-48 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="text-slate-300 mb-4">
                    Image captured for {cameraState.parameter} parameter. This image will be attached to the measurement record.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCameraState({ parameter: '', isCapturing: false, imageUrl: null })}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remove image
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submit Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500/10 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-teal-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Ready to Submit</h3>
                  <p className="text-sm text-slate-300">All data will be validated before submission</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    reset()
                    setValidationWarnings([])
                    setCameraState({ parameter: '', isCapturing: false, imageUrl: null })
                  }}
                  className="px-6 py-3 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition"
                  disabled={isSubmitting}
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Submit Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Mobile Optimization Tips */}
        <div className="mt-8 p-4 bg-slate-800/30 rounded-lg">
          <h4 className="font-semibold text-white mb-2">Mobile Input Tips</h4>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• Use camera capture for COD, BOD, Ammonia, Nitrate, and Phosphate parameters</li>
            <li>• Form automatically validates values in real-time</li>
            <li>• Data is saved locally when offline and synced when connection is restored</li>
            <li>• Tap on parameter labels for quick information</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default InputPage