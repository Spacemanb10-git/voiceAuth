import { useRef } from 'react'
import CameraFeed from './components/CameraFeed.jsx'

export default function App() {
  const cameraRef = useRef(null)

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-32 size-[520px] animate-blob rounded-full bg-lime/20 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
        <header className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-10" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Voice<span className="bg-gradient-to-r from-lime to-cyan bg-clip-text text-transparent">Auth</span>
            </h1>
            <p className="eyebrow">Campus gate · delivery check-in</p>
          </div>
        </header>

        <main className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <section>
            <p className="eyebrow">Camera</p>
            <h2 className="mb-3 text-lg font-semibold">Look into the camera</h2>
            <CameraFeed ref={cameraRef} />
          </section>
          <aside className="glass p-8" />
        </main>
      </div>
    </div>
  )
}
