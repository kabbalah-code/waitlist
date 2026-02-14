'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Gift, Sparkles } from 'lucide-react';

interface WaitlistSectionProps {
  onJoinClick: () => void;
}

export function WaitlistSection({ onJoinClick }: WaitlistSectionProps) {
  return (
    <section id="waitlist" className="relative py-20 px-4 overflow-hidden bg-gradient-to-b from-black/20 to-gray-900/30">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF9500] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="flex items-center gap-2 bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-full px-4 py-2">
              <Sparkles className="w-4 h-4 text-[#FF9500]" />
              <span className="text-[#FF9500] font-semibold text-sm uppercase tracking-wide">
                Early Access
              </span>
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-serif">
            <span className="text-[#FF9500] drop-shadow-lg">Join the Mystical </span>
            <span className="text-white drop-shadow-lg">Waitlist</span>
          </h2>

          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-12">
            Be among the first to experience Kabbalah Code. Early members receive exclusive rewards and priority access.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF9500]/20 to-orange-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-gradient-to-br from-black/30 to-gray-900/30 backdrop-blur-sm border-2 border-[#FF9500]/30 rounded-xl p-8 text-center hover:border-[#FF9500]/70 transition-all overflow-hidden">
              {/* Decorative corners */}
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#FF9500]/50" />
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[#FF9500]/50" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[#FF9500]/50" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#FF9500]/50" />
              
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#FF9500] to-orange-500 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-serif">Priority Access</h3>
              <p className="text-white/70">
                Be first to explore the platform when we launch
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF9500]/20 to-orange-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-gradient-to-br from-black/30 to-gray-900/30 backdrop-blur-sm border-2 border-[#FF9500]/30 rounded-xl p-8 text-center hover:border-[#FF9500]/70 transition-all overflow-hidden">
              {/* Decorative corners */}
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#FF9500]/50" />
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[#FF9500]/50" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[#FF9500]/50" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#FF9500]/50" />
              
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#FF9500] to-orange-500 rounded-full flex items-center justify-center">
                <Gift className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-serif">Bonus $KCODE</h3>
              <p className="text-white/70">
                Earn $KCODE tokens for each friend you refer
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF9500]/20 to-orange-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-gradient-to-br from-black/30 to-gray-900/30 backdrop-blur-sm border-2 border-[#FF9500]/30 rounded-xl p-8 text-center hover:border-[#FF9500]/70 transition-all overflow-hidden">
              {/* Decorative corners */}
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#FF9500]/50" />
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[#FF9500]/50" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[#FF9500]/50" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#FF9500]/50" />
              
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#FF9500] to-orange-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-serif">Free NFT Pass</h3>
              <p className="text-white/70">
                Mint a free testnet NFT pass for exclusive benefits
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="relative inline-block">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#FF9500] via-orange-500 to-[#FF9500] rounded-xl opacity-75 blur-lg animate-pulse" />
            <Button
              onClick={onJoinClick}
              className="relative px-12 py-6 bg-gradient-to-r from-[#FF9500] to-orange-500 hover:from-[#FF9500]/80 hover:to-orange-400 text-black text-lg font-bold rounded-xl"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Join Waitlist Now
                <Sparkles className="w-5 h-5" />
              </span>
            </Button>
          </div>
          <p className="text-white/50 text-sm mt-4">
            Limited spots available
          </p>
        </div>
      </div>
    </section>
  );
}
