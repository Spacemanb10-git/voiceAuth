import { useCallback, useEffect, useRef, useState } from 'react'

const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
]

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  return PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}

/**
 * Records microphone audio with MediaRecorder.
 *
 * start()  – asks for the mic and begins recording
 * stop()   – stops recording and resolves with the audio Blob
 * level    – 0..1 input loudness, for the live visualiser
 * elapsed  – seconds since recording started
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState(null)

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const audioCtxRef = useRef(null)
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const stopResolverRef = useRef(null)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    setLevel(0)
  }, [])

  useEffect(() => cleanup, [cleanup])

  const start = useCallback(async () => {
    if (recorderRef.current?.state === 'recording') return
    setError(null)

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Audio recording is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream

      // Live input level for the visualiser
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(analyser)
      audioCtxRef.current = ctx
      const data = new Uint8Array(analyser.fftSize)
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4))
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()

      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        })
        cleanup()
        setIsRecording(false)
        stopResolverRef.current?.(blob)
        stopResolverRef.current = null
      }

      recorder.start(250)
      recorderRef.current = recorder

      const startedAt = Date.now()
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000))
      }, 250)

      setIsRecording(true)
    } catch (err) {
      cleanup()
      setError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied.'
          : 'Could not access the microphone.',
      )
    }
  }, [cleanup])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return Promise.resolve(null)
    return new Promise((resolve) => {
      stopResolverRef.current = resolve
      recorder.stop()
    })
  }, [])

  return { isRecording, elapsed, level, error, start, stop }
}
