"use client"

import { useState, useEffect } from "react"
import { Menu, X, LogOut, Send, Twitter } from "lucide-react"
import { formatAddress } from "@/lib/web3/ethereum"
import Link from "next/link"
import Image from "next/image"

interface NavigationProps {
  walletAddress: string | null
  onConnectClick: () => void
  onDisconnect: () => void
}

export function Navigation({ walletAddress, onConnectClick, onDisconnect }: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { href: "#solution", label: "Features" },
    { href: "#journey", label: "Journey" },
    { href: "#roadmap", label: "Roadmap" },
    { href: "#faq", label: "FAQ" },
  ]
  
  const socialLinks = [
    { href: "https://t.me/kabbalah_code", icon: Send, label: "Telegram" },
    { href: "https://x.com/KabbalahCode", icon: Twitter, label: "Twitter" },
  ]

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-black/95 backdrop-blur-md border-b border-[#FF9500]/20" : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="Kabbalah Code" 
              width={180} 
              height={50}
              className="h-8 md:h-10 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-white/70 hover:text-[#FF9500] transition-colors text-sm font-medium uppercase tracking-wide"
              >
                {link.label}
              </button>
            ))}
            {socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-[#FF9500] transition-colors"
                aria-label={link.label}
              >
                <link.icon className="w-5 h-5" />
              </a>
            ))}
          </div>

          {/* Connect/Dashboard Button */}
          <div className="hidden md:flex items-center gap-4">
            {walletAddress ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 border border-[#FF9500]/50 text-[#FF9500] text-sm font-mono hover:bg-[#FF9500]/10 transition-colors"
                >
                  {formatAddress(walletAddress)}
                </Link>
                <button
                  onClick={onDisconnect}
                  className="p-2 text-white/50 hover:text-red-400 transition-colors"
                  aria-label="Disconnect wallet"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={onConnectClick}
                className="px-6 py-2.5 bg-[#FF9500] text-black font-bold text-sm uppercase tracking-wide hover:bg-[#FFB340] transition-colors"
              >
                Join Waitlist
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#FF9500]/20 bg-black/95">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-white/70 hover:text-[#FF9500] transition-colors text-sm font-medium uppercase tracking-wide text-left py-2"
                >
                  {link.label}
                </button>
              ))}
              <div className="flex gap-4 py-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/70 hover:text-[#FF9500] transition-colors"
                    aria-label={link.label}
                  >
                    <link.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
              {walletAddress ? (
                <div className="flex items-center gap-2 mt-2">
                  <Link
                    href="/dashboard"
                    className="flex-1 px-6 py-3 bg-[#FF9500] text-black font-bold text-sm uppercase tracking-wide text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      onDisconnect()
                      setIsMobileMenuOpen(false)
                    }}
                    className="p-3 border border-red-500/50 text-red-400"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onConnectClick()
                    setIsMobileMenuOpen(false)
                  }}
                  className="mt-2 px-6 py-3 bg-[#FF9500] text-black font-bold text-sm uppercase tracking-wide"
                >
                  Join Waitlist
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}