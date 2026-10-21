import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

/**
 * Live camera preview with rounded corners.
 * The capture button on the feed grabs the current frame as a JPEG Blob and
 * passes it to onCapture. The parent can also call ref.current.captureFrame().
 */
const CameraFeed = forwardRef(function CameraFeed({ onCapture }, ref) {
  const videoRef = useRef(null)
  const [status, setStatus] = useState('starting') // starting | live | error
  const [errorMsg, setErrorMsg] = useState('')
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    let stream
    let cancelled = false

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error')
        setErrorMsg('Camera is not supported in this browser.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        videoRef.current.srcObject = stream
        setStatus('live')
      } catch (err) {
        setStatus('error')
        setErrorMsg(
          err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow it in the browser and reload.'
            : 'No camera found or it is in use by another app.',
        )
      }
    }

    startCamera()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function captureFrame() {
    const video = videoRef.current
    if (!video || status !== 'live' || !video.videoWidth) return Promise.resolve(null)
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    // The preview is mirrored; mirror the snapshot too so it matches what was seen
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  }

  useImperativeHandle(ref, () => ({ captureFrame }))

  async function handleCapture() {
    const blob = await captureFrame()
    if (!blob) return
    setFlash(true)
    setTimeout(() => setFlash(false), 150)
    onCapture?.(blob)
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full -scale-x-100 object-cover transition-opacity duration-300 ${
          status === 'live' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-150 ${
          flash ? 'opacity-60' : 'opacity-0'
        }`}
      />

      {status === 'live' && (
        <button
          type="button"
          onClick={handleCapture}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 active:scale-95"
        >
          Capture photo
        </button>
      )}

      {status === 'starting' && (
        <p className="absolute inset-0 grid place-items-center text-sm text-zinc-400">
          Starting camera…
        </p>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-8 text-center">
          <div>
            <p className="text-sm font-medium text-white">Camera unavailable</p>
            <p className="mt-1 text-sm text-zinc-400">{errorMsg}</p>
          </div>
        </div>
      )}
    </div>
  )
})

export default CameraFeed
