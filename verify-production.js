#!/usr/bin/env node

/**
 * Production Verification Script
 * Проверяет, что Vercel deployment работает корректно
 */

const https = require('https');

const PRODUCTION_URL = 'https://www.kabbalahcode.space';

console.log('🔍 Verifying production deployment...\n');

// 1. Check CSP Headers
function checkCSPHeaders() {
  return new Promise((resolve, reject) => {
    console.log('1️⃣ Checking CSP headers...');
    
    https.get(PRODUCTION_URL, (res) => {
      const csp = res.headers['content-security-policy'];
      
      if (!csp) {
        console.log('❌ CSP header not found!');
        resolve(false);
        return;
      }
      
      console.log('✅ CSP header found');
      
      // Check for WalletConnect domains
      const requiredDomains = [
        'secure.walletconnect.org',
        'verify.walletconnect.com',
        'api.web3modal.com',
        'rpc-amoy.polygon.technology'
      ];
      
      const missingDomains = requiredDomains.filter(domain => !csp.includes(domain));
      
      if (missingDomains.length > 0) {
        console.log('❌ Missing domains in CSP:');
        missingDomains.forEach(domain => console.log(`   - ${domain}`));
        console.log('\n⚠️  CSP is being overridden!');
        console.log('🔍 Checking source...');
        
        // Check if it's Cloudflare Worker
        if (csp.includes('frame-src \'self\' https://challenges.cloudflare.com;')) {
          console.log('\n🎯 FOUND THE PROBLEM:');
          console.log('   Cloudflare Worker is overriding CSP headers!');
          console.log('\n📝 Solution:');
          console.log('   1. Update Cloudflare Worker code');
          console.log('   2. See FIX_NOW.md for quick instructions');
          console.log('   3. See CLOUDFLARE_WORKER_UPDATE.md for detailed guide');
        } else {
          console.log('\n⚠️  Vercel is still using OLD cached build!');
          console.log('📝 Follow instructions in VERCEL_CACHE_CLEAR_GUIDE.md');
        }
        resolve(false);
      } else {
        console.log('✅ All WalletConnect domains present in CSP');
        resolve(true);
      }
    }).on('error', (err) => {
      console.log('❌ Error fetching headers:', err.message);
      reject(err);
    });
  });
}

// 2. Check if site is accessible
function checkSiteAccessible() {
  return new Promise((resolve, reject) => {
    console.log('\n2️⃣ Checking site accessibility...');
    
    https.get(PRODUCTION_URL, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Site is accessible (200 OK)');
        resolve(true);
      } else {
        console.log(`⚠️  Site returned status code: ${res.statusCode}`);
        resolve(false);
      }
    }).on('error', (err) => {
      console.log('❌ Site is not accessible:', err.message);
      reject(err);
    });
  });
}

// 3. Check redirect from non-www to www
function checkRedirect() {
  return new Promise((resolve, reject) => {
    console.log('\n3️⃣ Checking www redirect...');
    
    https.get('https://kabbalahcode.space', { 
      followRedirect: false 
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 308) {
        const location = res.headers.location;
        if (location && location.includes('www.kabbalahcode.space')) {
          console.log('✅ Redirect from non-www to www is working');
          resolve(true);
        } else {
          console.log('⚠️  Redirect exists but points to:', location);
          resolve(false);
        }
      } else {
        console.log('⚠️  No redirect found (status:', res.statusCode + ')');
        resolve(false);
      }
    }).on('error', (err) => {
      console.log('❌ Error checking redirect:', err.message);
      reject(err);
    });
  });
}

// Run all checks
async function runChecks() {
  try {
    const cspOk = await checkCSPHeaders();
    const siteOk = await checkSiteAccessible();
    const redirectOk = await checkRedirect();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`CSP Headers:     ${cspOk ? '✅ OK' : '❌ FAILED'}`);
    console.log(`Site Access:     ${siteOk ? '✅ OK' : '❌ FAILED'}`);
    console.log(`WWW Redirect:    ${redirectOk ? '✅ OK' : '⚠️  WARNING'}`);
    console.log('='.repeat(50));
    
    if (cspOk && siteOk) {
      console.log('\n🎉 Production deployment is working correctly!');
      console.log('✅ WalletConnect should work now');
      console.log('\n📝 Next steps:');
      console.log('   1. Open https://www.kabbalahcode.space');
      console.log('   2. Click "Connect Wallet" button');
      console.log('   3. Select a wallet and connect');
      process.exit(0);
    } else {
      console.log('\n⚠️  Production deployment has issues');
      console.log('📝 Follow instructions in VERCEL_CACHE_CLEAR_GUIDE.md');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error running checks:', error.message);
    process.exit(1);
  }
}

runChecks();
