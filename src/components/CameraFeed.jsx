import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

function Corner({ className }) {
  return (
    <span
      className={`pointer-events-none absolute size-7 border-lime/80 ${className}`}
      aria-hidden="true"
    />
  )
}

/**
 * Live camera preview with rounded corners.
 * The parent can call ref.current.captureFrame() to get a JPEG Blob of the
 * current frame (used when submitting a check-in).
 */
const CameraFeed = forwardRef(function CameraFeed(_props, ref) {
  const videoRef = useRef(null)
  const [status, setStatus] = useState('starting') // starting | live | error
  const [errorMsg, setErrorMsg] = useState('')
  const [now, setNow] = useState(() => new Date())

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

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useImperativeHandle(ref, () => ({
    captureFrame() {
      const video = videoRef.current
      if (!video || status !== 'live' || !video.videoWidth) return Promise.resolve(null)
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    },
  }))

  return (
    <div className="relative">
      {/* glow behind the frame */}
      <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-lime/40 via-cyan/20 to-transparent opacity-60 blur-2xl" />

      <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 ring-1 ring-white/5">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full -scale-x-100 object-cover transition-opacity duration-700 ${
            status === 'live' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {status === 'live' && (
          <>
            {/* scanning line */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="h-1/3 w-full animate-scan bg-gradient-to-b from-transparent via-lime/10 to-transparent" />
            </div>
            <Corner className="top-4 left-4 rounded-tl-xl border-t-2 border-l-2" />
            <Corner className="top-4 right-4 rounded-tr-xl border-t-2 border-r-2" />
            <Corner className="bottom-4 left-4 rounded-bl-xl border-b-2 border-l-2" />
            <Corner className="right-4 bottom-4 rounded-br-xl border-r-2 border-b-2" />
          </>
        )}

        {/* top-left badge */}
        <div className="absolute top-5 left-14 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 backdrop-blur-md">
          <span
            className={`size-2 rounded-full ${
              status === 'live' ? 'animate-pulse bg-rose' : 'bg-zinc-500'
            }`}
          />
          <span className="font-mono text-[11px] tracking-widest text-white/90 uppercase">
            {status === 'live' ? 'Live' : status === 'starting' ? 'Connecting' : 'Offline'}
          </span>
        </div>

        {/* bottom-right timestamp */}
        <div className="absolute right-14 bottom-5 rounded-full bg-black/50 px-3 py-1 font-mono text-[11px] text-white/80 backdrop-blur-md">
          GATE-01 · {now.toLocaleTimeString([], { hour12: false })}
        </div>

        {status === 'starting' && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="size-10 animate-spin rounded-full border-2 border-white/10 border-t-lime" />
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 grid place-items-center p-8 text-center">
            <div>
              <p className="text-lg font-semibold text-white">Camera unavailable</p>
              <p className="mt-1 text-sm text-zinc-400">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default CameraFeed
