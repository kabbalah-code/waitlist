import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<any> | null = null;

export async function getBrowserFingerprint(): Promise<string> {
  try {
    if (!fpPromise) {
      fpPromise = FingerprintJS.load();
    }
    
    const fp = await fpPromise;
    const result = await fp.get();
    
    return result.visitorId;
  } catch (error) {
    console.error('Fingerprint error:', error);
    return 'unknown';
  }
}

export async function getDetailedFingerprint() {
  try {
    if (!fpPromise) {
      fpPromise = FingerprintJS.load();
    }
    
    const fp = await fpPromise;
    const result = await fp.get();
    
    return {
      visitorId: result.visitorId,
      confidence: result.confidence.score,
      components: {
        screen: result.components.screenResolution?.value || 'unknown',
        timezone: result.components.timezone?.value || 'unknown',
        language: result.components.languages?.value || [],
        platform: result.components.platform?.value || 'unknown',
        vendor: result.components.vendor?.value || 'unknown',
        colorDepth: result.components.colorDepth?.value || 0,
        deviceMemory: result.components.deviceMemory?.value || 0,
        hardwareConcurrency: result.components.hardwareConcurrency?.value || 0,
      }
    };
  } catch (error) {
    console.error('Detailed fingerprint error:', error);
    return {
      visitorId: 'unknown',
      confidence: 0,
      components: {
        screen: 'unknown',
        timezone: 'unknown',
        language: [],
        platform: 'unknown',
        vendor: 'unknown',
        colorDepth: 0,
        deviceMemory: 0,
        hardwareConcurrency: 0,
      }
    };
  }
}
