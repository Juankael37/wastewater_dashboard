import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Camera, Save, Eye, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { measurementsApi, plantsApi } from '../../services/api'

interface InputFormData {
  plantId: string
  type: 'influent' | 'effluent'
  ph: string
  cod: string
  bod: string
  tss: string
  ammonia: string
  nitrate: string
  phosphate: string
  temperature: string
  flow: string
}

const InputPage: React.FC = () => {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [capturedImages, setCapturedImages] = useState<Record<string, string>>({})
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<InputFormData | null>(null)
  const [plants, setPlants] = useState<Array<{ id: string; name: string }>>([])

  const {
    register,
    handleSubmit,
    watch
  } = useForm<InputFormData>()

  React.useEffect(() => {
    const loadPlants = async () => {
      try {
        const plantData = await plantsApi.getAll()
        setPlants(plantData)
      } catch (error) {
        console.error('Failed to load plants:', error)
        toast.error('Unable to load plants from cloud API')
      }
    }
    loadPlants()
  }, [])

  const parametersWithCamera = ['cod', 'bod', 'ammonia', 'nitrate', 'phosphate']

  const standards = {
    ph: { min: 6.0, max: 9.5, unit: '' },
    cod: { min: 0, max: 100, unit: 'mg/L' },
    bod: { min: 0, max: 50, unit: 'mg/L' },
    tss: { min: 0, max: 100, unit: 'mg/L' },
    ammonia: { min: 0, max: 0.5, unit: 'mg/L' },
    nitrate: { min: 0, max: 14, unit: 'mg/L' },
    phosphate: { min: 0, max: 1, unit: 'mg/L' },
    temperature: { min: 10, max: 40, unit: '°C' },
    flow: { min: 0, max: 5000, unit: 'L/min' }
  }

  const validateParameter = (param: string, value: string) => {
    const standard = standards[param as keyof typeof standards]
    if (!standard || !value) return null

    const numValue = parseFloat(value)
    if (isNaN(numValue)) return null

    if (numValue < standard.min || numValue > standard.max) {
      return {
        valid: false,
        message: `Exceeds limit (${standard.min}-${standard.max} ${standard.unit})`
      }
    }

    const warningThreshold = standard.max * 0.9
    if (numValue > warningThreshold) {
      return {
        valid: true,
        warning: true,
        message: `Approaching limit (${standard.max} ${standard.unit})`
      }
    }

    return { valid: true }
  }

  const captureImage = async (parameter: string) => {
    try {
      // Simulate camera capture - in real app, use device camera API
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            setCapturedImages(prev => ({
              ...prev,
              [parameter]: e.target?.result as string
            }))
            toast.success(`${parameter.toUpperCase()} image captured`)
          }
          reader.readAsDataURL(file)
        }
      }
      input.click()
    } catch (error) {
      toast.error('Failed to capture image')
    }
  }

  const onSubmit = (data: InputFormData) => {
    console.log('📤 Form submitted with data:', data);
    setPreviewData(data)
    setShowPreview(true)
  }

  const confirmSubmit = async () => {
    if (!previewData) {
      toast.error('Please fill out the form first')
      return
    }
    
    setIsSubmitting(true)
    try {
      console.log('🚀 Starting measurement submission...')
      const measurementData = {
        timestamp: new Date().toISOString(),
        ph: parseFloat(previewData.ph) || null,
        cod: parseFloat(previewData.cod) || null,
        bod: parseFloat(previewData.bod) || null,
        tss: parseFloat(previewData.tss) || null,
        ammonia: parseFloat(previewData.ammonia) || null,
        nitrate: parseFloat(previewData.nitrate) || null,
        phosphate: parseFloat(previewData.phosphate) || null,
        temperature: parseFloat(previewData.temperature) || null,
        flow: parseFloat(previewData.flow) || null,
        type: previewData.type,
        plant_id: previewData.plantId,
        notes: `Images captured: ${Object.keys(capturedImages).join(', ')}`
      }
      
      console.log('📡 Sending measurement data:', measurementData)
      
      const result = await measurementsApi.create(measurementData)
      console.log('✅ API Response:', result)
      
      toast.success('Measurement submitted successfully!')
      setShowPreview(false)
      navigate('/dashboard')
    } catch (error: any) {
      console.error('❌ Submission error:', error)
      toast.error(`Failed to submit measurement: ${error.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderParameterInput = (param: keyof InputFormData, label: string) => {
    const value = watch(param)
    const validation = value ? validateParameter(param, value) : null
    const hasCamera = parametersWithCamera.includes(param)

    return (
      <div key={param} className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {label} ({standards[param as keyof typeof standards]?.unit})
        </label>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="number"
              step="0.01"
              {...register(param, { required: true })}
              className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                validation?.valid === false
                  ? 'border-red-500 bg-red-50'
                  : validation?.warning
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-300'
              }`}
              placeholder={`Enter ${label}`}
            />
            {validation && (
              <div className={`mt-2 text-sm flex items-center ${
                validation.valid === false ? 'text-red-600' : 'text-yellow-600'
              }`}>
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{validation.message}</span>
              </div>
            )}
          </div>
          {hasCamera && (
            <button
              type="button"
              onClick={() => captureImage(param)}
              className={`px-4 py-3 rounded-lg border-2 min-w-[48px] min-h-[48px] flex items-center justify-center ${
                capturedImages[param]
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {capturedImages[param] ? (
                <Eye className="w-6 h-6" />
              ) : (
                <Camera className="w-6 h-6" />
              )}
            </button>
          )}
        </div>
        {capturedImages[param] && (
          <div className="mt-3">
            <img
              src={capturedImages[param]}
              alt={`${param} capture`}
              className="h-24 w-24 object-cover rounded-lg border-2 border-gray-300"
            />
          </div>
        )}
      </div>
    )
  }

  if (showPreview && previewData) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-6 text-center">Preview Submission</h2>

          <div className="space-y-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-gray-800">Plant Information</h3>
              <div className="space-y-2 text-sm">
                <p><strong className="text-gray-600">Plant:</strong> {plants.find(p => p.id === previewData.plantId)?.name || previewData.plantId}</p>
                <p><strong className="text-gray-600">Type:</strong> <span className="capitalize">{previewData.type}</span></p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-gray-800">Parameter Values</h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                {Object.entries(previewData).map(([key, value]) => {
                  if (key === 'plantId' || key === 'type') return null
                  const standard = standards[key as keyof typeof standards]
                  return (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{key}:</span>
                      <span className="font-medium">{value} {standard?.unit}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {Object.keys(capturedImages).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-gray-800">Captured Images</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(capturedImages).map(([param, image]) => (
                    <div key={param} className="text-center">
                      <img
                        src={image}
                        alt={param}
                        className="h-20 w-20 object-cover rounded-lg border-2 border-gray-300 mx-auto"
                      />
                      <p className="text-xs mt-2 text-gray-600 capitalize">{param}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={confirmSubmit}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-lg font-medium"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'Submitting...' : 'Confirm Submit'}</span>
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="w-full px-6 py-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-lg font-medium"
            >
              Back to Edit
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Data Input</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Plant Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Plant/Location *
              </label>
              <select
                {...register('plantId', { required: true })}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select Plant</option>
                {plants.map((plant) => (
                  <option key={plant.id} value={plant.id}>
                    {plant.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Sample Type *
              </label>
              <select
                {...register('type', { required: true })}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select Type</option>
                <option value="influent">Influent (Raw Wastewater)</option>
                <option value="effluent">Effluent (Treated Water)</option>
              </select>
            </div>
          </div>

          {/* Parameter Inputs */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Parameters</h2>

            {renderParameterInput('ph', 'pH')}
            {renderParameterInput('temperature', 'Temperature')}
            {renderParameterInput('flow', 'Flow Rate')}
            {renderParameterInput('cod', 'COD')}
            {renderParameterInput('bod', 'BOD')}
            {renderParameterInput('tss', 'TSS')}
            {renderParameterInput('ammonia', 'Ammonia')}
            {renderParameterInput('nitrate', 'Nitrate')}
            {renderParameterInput('phosphate', 'Phosphate')}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-medium"
            >
              <Eye className="w-5 h-5" />
              <span>Preview Submission</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InputPage
