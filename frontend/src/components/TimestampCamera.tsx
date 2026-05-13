/**
 * TimestampCamera — A custom full-screen camera component with a live
 * date/time overlay baked into captured images.
 *
 * Uses navigator.mediaDevices.getUserMedia() instead of the native camera
 * so we have full control over the UI and can overlay a real-time timestamp.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react'
import { X, Camera, RotateCcw } from 'lucide-react'
import { formatStampDateTime, getTimezoneAbbr, detectTimezone } from '../utils/timezone'

interface TimestampCameraProps {
  /** Which parameter this capture is for (e.g. "cod", "ph") */
  parameter: string
  /** Called with the final stamped data-URL on capture */
  onCapture: (dataUrl: string) => void
  /** Called when the user dismisses the camera */
  onClose: () => void
}

const TimestampCamera: React.FC<TimestampCameraProps> = ({ parameter, onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)

  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [clockText, setClockText] = useState('')

  // Update clock every second
  useEffect(() => {
    const update = () => {
      const tz = detectTimezone()
      const now = new Date()
      const dateStr = formatStampDateTime(now, tz)
      const tzAbbr = getTimezoneAbbr(tz)
      setClockText(`${dateStr}  ${tzAbbr}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  // Start camera stream
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsReady(true)
        setError(null)
      }
    } catch (err: any) {
      console.error('[camera] Failed to start:', err)
      setError(err.message || 'Camera access denied')
    }
  }, [])

  useEffect(() => {
    startCamera(facingMode)

    return () => {
      // Cleanup: stop stream and animation frame
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [facingMode, startCamera])

  const handleFlip = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return

    canvas.width = vw
    canvas.height = vh
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    // 1. Draw the video frame
    ctx.drawImage(video, 0, 0, vw, vh)

    // 2. Draw timestamp bar
    const tz = detectTimezone()
    const now = new Date()
    const dateStr = formatStampDateTime(now, tz)
    const tzAbbr = getTimezoneAbbr(tz)
    const stampText = `${parameter.toUpperCase()}  |  ${dateStr}  ${tzAbbr}`

    const fontSize = Math.max(16, Math.min(40, Math.round(vw * 0.035)))
    const pad = Math.round(fontSize * 0.7)
    const barH = fontSize + pad * 2

    // Dark bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
    ctx.fillRect(0, vh - barH, vw, barH)

    // Teal accent
    ctx.fillStyle = 'rgba(16, 185, 129, 0.9)'
    ctx.fillRect(0, vh - barH, vw, 3)

    // Text
    ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 2
    ctx.fillText(stampText, pad, vh - barH / 2)
    ctx.shadowColor = 'transparent'

    // 3. Export
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }

    onCapture(dataUrl)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Camera viewfinder */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Live timestamp overlay (visual only — the real stamp is drawn on capture) */}
        {isReady && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            borderTop: '3px solid rgba(16, 185, 129, 0.9)',
            padding: '10px 14px',
          }}>
            <span style={{
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily: 'Arial, Helvetica, sans-serif',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              letterSpacing: '0.3px',
            }}>
              {parameter.toUpperCase()}  |  {clockText}
            </span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#fff',
            textAlign: 'center',
            padding: '20px',
          }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>Camera Error</p>
            <p style={{ fontSize: '13px', opacity: 0.7 }}>{error}</p>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '20px 30px',
        paddingBottom: '36px',
        backgroundColor: '#111',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            width: 48, height: 48,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)',
            backgroundColor: 'transparent',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={22} />
        </button>

        {/* Capture button */}
        <button
          onClick={handleCapture}
          disabled={!isReady}
          style={{
            width: 72, height: 72,
            borderRadius: '50%',
            border: '4px solid #fff',
            backgroundColor: isReady ? '#fff' : 'rgba(255,255,255,0.3)',
            cursor: isReady ? 'pointer' : 'default',
            transition: 'transform 0.1s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onTouchStart={(e) => {
            if (isReady) (e.currentTarget as HTMLElement).style.transform = 'scale(0.9)'
          }}
          onTouchEnd={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          }}
        >
          <Camera size={28} color="#111" />
        </button>

        {/* Flip camera */}
        <button
          onClick={handleFlip}
          style={{
            width: 48, height: 48,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)',
            backgroundColor: 'transparent',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default TimestampCamera
