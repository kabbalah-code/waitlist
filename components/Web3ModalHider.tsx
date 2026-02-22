'use client'

import { useEffect } from 'react'

export function Web3ModalHider() {
  useEffect(() => {
    console.log('[Web3ModalHider] Starting...')
    
    // Function to hide social logins
    const hideSocialLogins = () => {
      try {
        // Find all possible modal elements
        const modals = [
          ...Array.from(document.querySelectorAll('w3m-modal')),
          ...Array.from(document.querySelectorAll('wcm-modal')),
          ...Array.from(document.querySelectorAll('w3m-connect-button')),
        ]

        if (modals.length === 0) return

        modals.forEach((modal) => {
          if (!modal.shadowRoot) return

          const shadowRoot = modal.shadowRoot

          // Find and hide all buttons containing social network names
          const hideButtons = (selector: string) => {
            const buttons = shadowRoot.querySelectorAll(selector)
            buttons.forEach((btn) => {
              const text = btn.textContent?.toLowerCase() || ''
              const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || ''
              
              // Check if it's a social login button
              const isSocial = 
                text.includes('google') ||
                text.includes('facebook') ||
                text.includes('twitter') ||
                text.includes('discord') ||
                text.includes('github') ||
                text.includes('apple') ||
                text.includes('continue with') ||
                ariaLabel.includes('google') ||
                ariaLabel.includes('facebook') ||
                ariaLabel.includes('twitter') ||
                ariaLabel.includes('discord') ||
                ariaLabel.includes('github') ||
                ariaLabel.includes('apple')

              if (isSocial) {
                ;(btn as HTMLElement).style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;'
                console.log('[Web3ModalHider] Hidden button:', text || ariaLabel)
                
                // Hide parent container
                let parent = btn.parentElement
                let depth = 0
                while (parent && depth < 3) {
                  if (parent.children.length === 1) {
                    parent.style.cssText = 'display: none !important;'
                  }
                  parent = parent.parentElement
                  depth++
                }
              }
            })
          }

          // Hide all buttons
          hideButtons('button')
          hideButtons('wui-button')
          hideButtons('[role="button"]')

          // Hide email inputs
          const inputs = shadowRoot.querySelectorAll('input[type="email"], input[placeholder*="mail"], input[placeholder*="Email"]')
          inputs.forEach((input) => {
            ;(input as HTMLElement).style.cssText = 'display: none !important;'
            console.log('[Web3ModalHider] Hidden email input')
            
            // Hide parent containers
            let parent = input.parentElement
            let depth = 0
            while (parent && depth < 5) {
              const tagName = parent.tagName.toLowerCase()
              if (tagName.includes('flex') || tagName.includes('wui') || tagName.includes('form')) {
                parent.style.cssText = 'display: none !important;'
              }
              parent = parent.parentElement
              depth++
            }
          })

          // Hide separators with "or"
          const allElements = shadowRoot.querySelectorAll('*')
          allElements.forEach((el) => {
            const text = el.textContent?.trim().toLowerCase()
            if (text === 'or' || text === 'or continue with') {
              ;(el as HTMLElement).style.cssText = 'display: none !important;'
              console.log('[Web3ModalHider] Hidden separator')
            }
          })

          // Hide by tag names
          const socialTags = [
            'wui-email-input',
            'wui-social-button',
            'w3m-email-login-widget',
            'w3m-social-login-widget',
          ]
          
          socialTags.forEach((tag) => {
            const elements = shadowRoot.querySelectorAll(tag)
            elements.forEach((el) => {
              ;(el as HTMLElement).style.cssText = 'display: none !important;'
              console.log('[Web3ModalHider] Hidden tag:', tag)
            })
          })
        })
      } catch (error) {
        console.error('[Web3ModalHider] Error:', error)
      }
    }

    // Run immediately
    hideSocialLogins()

    // Run on interval to catch dynamically loaded content
    const interval = setInterval(hideSocialLogins, 50)

    // Observer for modal changes
    const observer = new MutationObserver(() => {
      hideSocialLogins()
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    })

    // Cleanup
    return () => {
      clearInterval(interval)
      observer.disconnect()
      console.log('[Web3ModalHider] Stopped')
    }
  }, [])

  return null
}
