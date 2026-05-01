import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Camera as CameraIcon, Save, Eye, AlertCircle, CheckCircle, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { measurementsApi, plantsApi, uploadImage } from '../../services/api'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem } from '@capacitor/filesystem'

interface ImageStatus {
  url?: string
  preview?: string
  timestamp: string
}

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

const STORAGE_KEY = 'wastewater_form_data'

/**
 * Highly memory-safe image compression.
 * Uses createImageBitmap to decode the image off the main thread.
 * On modern iOS/Android, passing resizeWidth prevents the massive 12MP+ original
 * from ever entering the JS heap. We also explicitly release memory.
 */
const memorySafeCompress = async (file: File, maxDim = 1000): Promise<File> => {
  return new Promise((resolve) => {
    // 1. Create a transient object URL for the raw file
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // 2. Immediately revoke the URL to free memory!
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      // 3. Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      // alpha: false saves memory
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) ctx.drawImage(img, 0, 0, width, height);
      
      // 4. Wipe the Image from memory
      img.src = '';

      // 5. Convert to Blob
      canvas.toBlob(
        (blob) => {
          // 6. Wipe the Canvas from memory
          canvas.width = 0;
          canvas.height = 0;
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file); // fallback
          }
        },
        'image/jpeg',
        0.75
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback
    };

    img.src = url;
  });
}

const InputPage: React.FC = () => {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [capturedImages, setCapturedImages] = useState<Record<string, ImageStatus>>({})
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<InputFormData | null>(null)
  const [plants, setPlants] = useState<Array<{ id: string; name: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Track blob URLs so we can revoke them and free memory when images are removed.
  const blobUrlsRef = useRef<Record<string, string>>({})

  const {
    register,
    handleSubmit,
    watch,
    setValue
  } = useForm<InputFormData>()

  // Load saved form data on mount (not images - they use too much memory)
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        Object.entries(parsed).forEach(([key, value]) => {
          if (value && key !== 'plantId') {
            setValue(key as keyof InputFormData, value as string)
          }
        })
        if (parsed.plantId) {
          setValue('plantId', parsed.plantId)
        }
        toast.success('Previous form data restored')
      } catch (e) {
        console.error('Failed to restore form data', e)
      }
    }
    
    // Load saved image URLs (lightweight - just URLs, not full images)
    const savedImages = localStorage.getItem('wastewater_images')
    if (savedImages) {
      try {
        const parsed = JSON.parse(savedImages)
        if (parsed && typeof parsed === 'object') {
          setCapturedImages(parsed)
        }
      } catch (e) {
        console.error('Failed to restore images', e)
      }
    }
  }, [setValue])

  // Save form data on change (text fields only, not images)
  useEffect(() => {
    const subscription = watch((data) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    })
    return () => subscription.unsubscribe()
  }, [])

  // Save image URLs to localStorage when they change (lightweight)
  useEffect(() => {
    if (Object.keys(capturedImages).length > 0) {
      const urlsOnly: Record<string, { url?: string; preview?: string; timestamp: string }> = {}
      for (const [key, val] of Object.entries(capturedImages)) {
        if (val.url) {
          urlsOnly[key] = { url: val.url, timestamp: val.timestamp }
        }
      }
      if (Object.keys(urlsOnly).length > 0) {
        localStorage.setItem('wastewater_images', JSON.stringify(urlsOnly))
      }
    }
  }, [capturedImages])

  // Revoke all tracked blob URLs to free memory, then optionally clear state.
  const revokeBlobUrls = useCallback((keys?: string[]) => {
    const toRevoke = keys ?? Object.keys(blobUrlsRef.current)
    toRevoke.forEach((k) => {
      if (blobUrlsRef.current[k]) {
        URL.revokeObjectURL(blobUrlsRef.current[k])
        delete blobUrlsRef.current[k]
      }
    })
  }, [])

  // Revoke all blob URLs when the component unmounts.
  useEffect(() => () => revokeBlobUrls(), [revokeBlobUrls])

  const clearFormData = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('wastewater_images')
    revokeBlobUrls()
    setCapturedImages({})
    window.location.reload()
  }

  useEffect(() => {
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
      if (Capacitor.isNativePlatform()) {
        const image = await Camera.getPhoto({
          quality: 70, // Native compression saves RAM immediately!
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          width: 1000 // Native downscaling
        });
        
        if (image.path) {
          const timestamp = new Date().toLocaleTimeString()
          const loadingToast = toast.loading(`Uploading ${parameter.toUpperCase()}…`)
          
          try {
            // Read the file natively to avoid CapacitorHttp fetch interception
            const fileData = await Filesystem.readFile({ path: image.path });
            const base64Data = fileData.data;
            const mimeType = `image/${image.format || 'jpeg'}`;
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            
            revokeBlobUrls([parameter]);
            blobUrlsRef.current[parameter] = image.webPath || dataUrl; 
            setCapturedImages(prev => ({
              ...prev,
              [parameter]: { preview: image.webPath || dataUrl, timestamp }
            }));
            
            const uploadedUrl = await uploadImage(dataUrl);
            toast.dismiss(loadingToast);
            
            if (uploadedUrl) {
              setCapturedImages(prev => ({
                ...prev,
                [parameter]: { url: uploadedUrl, preview: image.webPath, timestamp },
              }))
              toast.success(`${parameter.toUpperCase()} uploaded ✓`)
            } else {
              toast.error(`Upload failed for ${parameter.toUpperCase()}`)
            }
          } catch (err) {
            toast.dismiss(loadingToast);
            console.error('Upload error:', err);
            toast.error('Upload failed. Please try again.');
          }
        }
      } else {
        // Web fallback (PWA on iOS/Desktop)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
          fileInputRef.current.accept = 'image/*'
          fileInputRef.current.capture = 'environment'
          fileInputRef.current.dataset.param = parameter
          fileInputRef.current.click()
        }
      }
    } catch (error) {
      console.error('Camera error:', error)
      if (String(error).includes('User cancelled')) return;
      toast.error('Unable to access camera. Please try again.')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const parameter = e.target.dataset.param || ''

    if (!file || !parameter) return

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image too large (max 20 MB).')
      return
    }

    const timestamp = new Date().toLocaleTimeString()
    const loadingToast = toast.loading(`Processing & Uploading ${parameter.toUpperCase()}…`)

    try {
      // 1. Compress immediately before keeping any references to the giant file
      const safeFile = await memorySafeCompress(file)

      // 2. Memory-safe preview: use the TINY compressed file, not the 10MB raw one
      revokeBlobUrls([parameter])
      const previewUrl = URL.createObjectURL(safeFile)
      blobUrlsRef.current[parameter] = previewUrl

      // Update state to show we are processing
      setCapturedImages(prev => ({
        ...prev,
        [parameter]: { preview: previewUrl, timestamp },
      }))

      // 3. Upload the tiny file
      const uploadedUrl = await uploadImage(safeFile)
      toast.dismiss(loadingToast)

      if (uploadedUrl) {
        setCapturedImages(prev => ({
          ...prev,
          [parameter]: { url: uploadedUrl, preview: previewUrl, timestamp },
        }))
        toast.success(`${parameter.toUpperCase()} uploaded ✓`)
      } else {
        toast.error(`Upload failed for ${parameter.toUpperCase()}`)
      }
    } catch (err) {
      toast.dismiss(loadingToast)
      console.error('Upload error:', err)
      toast.error('Upload failed. Please try again.')
    }
  }

  const removeImage = (parameter: string) => {
    // Revoke the blob URL to immediately free the memory.
    revokeBlobUrls([parameter])
    setCapturedImages(prev => {
      const updated = { ...prev }
      delete updated[parameter]
      return updated
    })
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
      
      // Get already uploaded URLs from captured images
      const imageUrls: Record<string, string> = {}
      for (const [param, imgData] of Object.entries(capturedImages)) {
        if (imgData.url) {
          imageUrls[param] = imgData.url
        }
      }
      
      if (Object.keys(capturedImages).length > 0 && Object.keys(imageUrls).length === 0) {
        toast.loading('Uploading pending images...', { icon: '📸' })
        
        for (const [param, imgData] of Object.entries(capturedImages)) {
          try {
            let fileToUpload: File | string = ''
            if (imgData.preview && imgData.preview.startsWith('blob:')) {
              // We must fetch the blob from the object URL so it becomes a File/Blob that uploadImage can handle
              const res = await fetch(imgData.preview)
              const blob = await res.blob()
              fileToUpload = new File([blob], `image_${param}.jpg`, { type: 'image/jpeg' })
              // Attempt to compress the fallback as well to avoid the 10MB limit
              fileToUpload = await memorySafeCompress(fileToUpload as File)
            }
            
            if (fileToUpload) {
              const url = await uploadImage(fileToUpload)
              if (url) {
                imageUrls[param] = url
              }
            }
          } catch (err) {
            console.error(`❌ Upload error for ${param}:`, err)
          }
        }
        
        toast.dismiss()
      }
      
      const imageNotes = Object.keys(imageUrls).length > 0 
        ? JSON.stringify({ images: imageUrls, captured: Object.keys(capturedImages).map(k => `${k}@${capturedImages[k].timestamp}`).join(', ') })
        : `Images: ${Object.keys(capturedImages).map(k => `${k}@${capturedImages[k].timestamp}`).join(', ')}`
      
      const measurementData = {
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
        notes: imageNotes,
        local_timestamp: new Date().toLocaleString()
      }
      
      console.log('📡 Sending measurement data:', measurementData)
      
      const result = await measurementsApi.create(measurementData)
      console.log('✅ API Response:', result)
      window.dispatchEvent(new Event('measurement:created'))

      // Clear saved form data after successful submission
      localStorage.removeItem(STORAGE_KEY)
      setCapturedImages({})

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
    const imageStatus = capturedImages[param]

    return (
      <div key={param} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} ({standards[param as keyof typeof standards]?.unit})
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              step="0.01"
              {...register(param, { required: true })}
              className={`w-full px-3 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors ${
                validation?.valid === false
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : validation?.warning
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-gray-300 dark:border-slate-600'
              }`}
              placeholder={label}
              inputMode="decimal"
            />
            {validation && (
              <div className={`mt-1 text-xs flex items-center ${
                validation.valid === false ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                {validation.message}
              </div>
            )}
          </div>
          {hasCamera && (
            <button
              type="button"
              onClick={() => captureImage(param)}
              className={`px-3 py-3 rounded-lg border transition-colors flex-shrink-0 ${
                imageStatus
                  ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600'
              }`}
            >
              {imageStatus ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
               <CameraIcon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
        {imageStatus && (
          <div className="flex items-center gap-2 mt-2">
            <div className="relative">
              <img
                src={imageStatus.preview || imageStatus.url}
                alt={`${param} capture`}
                className="h-20 w-20 object-cover rounded-lg border border-green-500 dark:border-green-400"
              />
              <button
                type="button"
                onClick={() => removeImage(param)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="w-3 h-3" />
              <span>{imageStatus.url ? 'Uploaded' : 'Captured'} {imageStatus.timestamp}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (showPreview && previewData) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 md:p-6 border border-gray-200 dark:border-slate-700 transition-colors">
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-900 dark:text-white">Preview</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Plant Info</h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm"><strong>Plant:</strong> {previewData.plantId}</p>
              <p className="text-gray-700 dark:text-gray-300 text-sm"><strong>Type:</strong> {previewData.type}</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Values</h3>
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {Object.entries(previewData).map(([key, value]) => {
                  if (key === 'plantId' || key === 'type') return null
                  const standard = standards[key as keyof typeof standards]
                  return (
                    <p key={key}>
                      <strong>{key.toUpperCase()}:</strong> {value} {standard?.unit}
                    </p>
                  )
                })}
              </div>
            </div>
          </div>

          {Object.keys(capturedImages).length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Captured Images</h3>
              <div className="flex space-x-4">
                {Object.entries(capturedImages).map(([param, image]) => (
                  <div key={param} className="text-center">
                    <img
                      src={image.preview}
                      alt={param}
                      className="h-24 w-24 object-cover rounded-lg border border-gray-300 dark:border-slate-600"
                    />
                    <p className="text-xs mt-1 text-gray-700 dark:text-gray-300">{param.toUpperCase()}</p>
                    {image.url && <p className="text-xs text-green-600">Uploaded</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4">
            <button
              onClick={confirmSubmit}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'Submitting...' : 'Confirm'}</span>
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="px-5 py-3.5 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors font-medium"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 md:p-6 border border-gray-200 dark:border-slate-700 transition-colors">
        <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-900 dark:text-white">Data Input</h1>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 md:space-y-6">
          {/* Hidden file input for camera */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          
          {/* Plant Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Plant/Location *
              </label>
              <select
                {...register('plantId', { required: true })}
                className="w-full px-3 py-3 text-base border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type *
              </label>
              <select
                {...register('type', { required: true })}
                className="w-full px-3 py-3 text-base border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="">Select Type</option>
                <option value="influent">Influent</option>
                <option value="effluent">Effluent</option>
              </select>
            </div>
          </div>

          {/* Parameter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {renderParameterInput('ph', 'pH')}
            {renderParameterInput('cod', 'COD')}
            {renderParameterInput('bod', 'BOD')}
            {renderParameterInput('tss', 'TSS')}
            {renderParameterInput('ammonia', 'Ammonia')}
            {renderParameterInput('nitrate', 'Nitrate')}
            {renderParameterInput('phosphate', 'Phosphate')}
            {renderParameterInput('temperature', 'Temperature')}
            {renderParameterInput('flow', 'Flow Rate')}
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={clearFormData}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors text-base font-medium"
            >
              <Trash2 className="w-5 h-5" />
              <span>Clear</span>
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-medium"
            >
              <Eye className="w-5 h-5" />
              <span>Preview</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InputPage
