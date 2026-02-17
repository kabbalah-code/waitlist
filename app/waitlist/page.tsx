import WaitlistPageV2 from '@/components/waitlist/waitlist-page-v2'

// Disable static generation for this page (requires client-side rendering)
export const dynamic = 'force-dynamic'

export default function WaitlistPage() {
  return <WaitlistPageV2 />
}
