export default {
  async fetch(request, env, ctx) {
    const response = await fetch(request);
    const newResponse = new Response(response.body, response);
    
    // Add security headers
    newResponse.headers.set('X-Frame-Options', 'DENY');
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    newResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    newResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    newResponse.headers.set('X-DNS-Prefetch-Control', 'on');
    
    // Content Security Policy with Google Analytics support
    newResponse.headers.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://va.vercel-scripts.com https://static.cloudflareinsights.com https://vercel.live https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com; " +
      "script-src-elem 'self' 'unsafe-inline' https://challenges.cloudflare.com https://va.vercel-scripts.com https://static.cloudflareinsights.com https://vercel.live https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob: https://api.web3modal.org https://api.web3modal.com https://www.google-analytics.com https://ssl.google-analytics.com; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' https://*.supabase.co https://*.vercel-insights.com https://*.vercel-analytics.com wss://*.supabase.co https://challenges.cloudflare.com https://polygon-rpc.com https://rpc.ankr.com https://cloudflareinsights.com https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://rpc.walletconnect.com https://rpc.walletconnect.org https://relay.walletconnect.com https://pulse.walletconnect.com https://pulse.walletconnect.org https://api.web3modal.com https://api.web3modal.org https://rpc-amoy.polygon.technology https://cca-lite.coinbase.com https://*.coinbase.com https://keys.coinbase.com https://vercel.live https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://stats.g.doubleclick.net https://region1.google-analytics.com; " +
      "frame-src 'self' https://challenges.cloudflare.com https://verify.walletconnect.com https://verify.walletconnect.org https://secure.walletconnect.com https://secure.walletconnect.org; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none'; " +
      "upgrade-insecure-requests"
    );
    
    return newResponse;
  },
};
