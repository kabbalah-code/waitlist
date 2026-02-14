import { Suspense } from "react"
import KabbalahLanding from "@/components/kabbalah-landing"

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-[#FF9500] font-bold text-3xl font-serif animate-pulse">KABBALAH CODE</h1>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <KabbalahLanding />
    </Suspense>
  )
}
