import { useEffect, useRef, useState } from 'react'

/** Live camera preview with rounded corners. */
export default function CameraFeed() {
  const videoRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        stream = s
        videoRef.current.srcObject = s
      })
      .catch(() => setError('Could not access the camera.'))

    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [])

  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full -scale-x-100 object-cover"
      />
      {error && (
        <div className="absolute inset-0 grid place-items-center text-sm text-zinc-400">{error}</div>
      )}
    </div>
  )
}
