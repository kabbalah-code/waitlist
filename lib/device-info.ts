export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const nav = navigator as any;
  
  return {
    // Screen
    screenWidth: screen.width,
    screenHeight: screen.height,
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    
    // Device
    platform: nav.platform || 'unknown',
    vendor: nav.vendor || 'unknown',
    hardwareConcurrency: nav.hardwareConcurrency || 0,
    deviceMemory: nav.deviceMemory || 0,
    maxTouchPoints: nav.maxTouchPoints || 0,
    
    // Browser
    userAgent: nav.userAgent || 'unknown',
    language: nav.language || 'unknown',
    languages: nav.languages?.join(',') || '',
    cookieEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack || null,
    
    // Location
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    
    // Features
    touchSupport: 'ontouchstart' in window,
    webgl: !!document.createElement('canvas').getContext('webgl'),
    webrtc: !!(nav.mediaDevices && nav.mediaDevices.getUserMedia),
    
    // Calculated
    isMobile: /Mobile|Android|iPhone/i.test(nav.userAgent),
    isTablet: /Tablet|iPad/i.test(nav.userAgent),
    isDesktop: !/Mobile|Android|iPhone|Tablet|iPad/i.test(nav.userAgent)
  };
}

export function getDeviceScore(deviceInfo: ReturnType<typeof getDeviceInfo>): number {
  if (!deviceInfo) return 50;
  
  let score = 50; // Базовый score
  
  // Реальное устройство имеет эти параметры
  if (deviceInfo.hardwareConcurrency > 0) score += 10;
  if (deviceInfo.deviceMemory > 0) score += 10;
  if (deviceInfo.webgl) score += 10;
  if (deviceInfo.cookieEnabled) score += 5;
  
  // Подозрительные признаки
  if (deviceInfo.hardwareConcurrency > 16) score -= 10; // Слишком мощный (сервер?)
  if (deviceInfo.languages === '') score -= 15; // Нет языков (бот)
  if (deviceInfo.platform === 'unknown') score -= 15; // Нет платформы (бот)
  
  // Headless browser detection
  if ((navigator as any).webdriver) score -= 30;
  if (!deviceInfo.webgl) score -= 15;
  
  return Math.max(0, Math.min(100, score));
}
