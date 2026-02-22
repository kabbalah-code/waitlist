import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="text-center max-w-2xl">
        {/* Mystical 404 Design */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF9500]/20 via-orange-500/30 to-[#FF9500]/20 rounded-full blur-3xl" />
          <h1 className="relative text-9xl font-bold text-[#FF9500] font-serif" style={{ textShadow: '0 0 30px rgba(255, 149, 0, 0.6)' }}>
            404
          </h1>
        </div>

        <h2 className="text-3xl font-bold mb-4 font-serif">
          Lost in the Mystical Void
        </h2>
        
        <p className="text-white/70 text-lg mb-8 max-w-md mx-auto">
          The path you seek does not exist in this realm. Perhaps the Tree of Life can guide you back to the sacred journey.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-8 py-4 bg-gradient-to-r from-[#FF9500] to-orange-500 hover:from-[#FF9500]/80 hover:to-orange-400 text-black font-bold text-lg uppercase tracking-wide transition-all duration-300 transform hover:scale-105 rounded-xl"
          >
            Return Home
          </Link>
          
          <Link
            href="https://twitter.com/KabbalahCode"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 border-2 border-[#FF9500] text-[#FF9500] font-bold text-lg uppercase tracking-wide hover:bg-[#FF9500]/10 transition-colors rounded-xl"
          >
            Contact Support
          </Link>
        </div>

        {/* Mystical decoration */}
        <div className="mt-12 text-[#FF9500]/30 text-sm">
          <p>Error Code: 404 | Page Not Found</p>
        </div>
      </div>
    </div>
  )
}
