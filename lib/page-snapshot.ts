import { assertPublicHostname, normalizeWebsiteUrl } from '@/lib/security/url';

export type PageSnapshotCapture = {
  screenshotUrl: string | null;
  captureSource: 'live' | 'fallback';
  metadata: {
    title: string | null;
    metaDescription: string | null;
    url: string;
    statusCode: number | null;
    responseTimeMs: number | null;
    fileSizeBytes: number | null;
    wordCount: number | null;
  };
};

export async function capturePageSnapshot(url: string): Promise<PageSnapshotCapture> {
  const normalizedUrl = normalizeWebsiteUrl(url);

  const fallbackPreviewUrl = (() => {
    try {
      if (!normalizedUrl) return null;
      // Keep the URL readable in the path so thum.io can reliably resolve it.
      return `https://image.thum.io/get/width/1440/crop/900/noanimate/${normalizedUrl}`;
    } catch {
      return null;
    }
  })();

  const fallback: PageSnapshotCapture = {
    screenshotUrl: fallbackPreviewUrl,
    captureSource: 'fallback',
    metadata: {
      title: null,
      metaDescription: null,
      url,
      statusCode: null,
      responseTimeMs: null,
      fileSizeBytes: null,
      wordCount: null
    }
  };

  try {
    if (!normalizedUrl) return fallback;

    await assertPublicHostname(normalizedUrl);

    let chromium: { launch: (opts: Record<string, unknown>) => Promise<any> } | null = null;
    try {
      const runtimeImport = new Function('m', 'return import(m)') as (
        moduleName: string
      ) => Promise<any>;
      const mod = await runtimeImport('playwright');
      chromium = mod.chromium;
    } catch (error) {
      console.warn('[snapshot:capture:playwright-import-failed]', {
        url,
        error: error instanceof Error ? error.message : 'unknown_import_error'
      });
      return fallback;
    }
    if (!chromium) return fallback;

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
        userAgent:
          'Mozilla/5.0 (compatible; CollisionSEOScan/2.0; +https://shopseoscan.com)'
      });

      const started = Date.now();
      let response = await page.goto(normalizedUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      const firstStatus = response?.status?.() ?? null;
      if (firstStatus === 403 || firstStatus === 404) {
        const retryUrl = (() => {
          try {
            const parsed = new URL(normalizedUrl);
            const nakedHost = parsed.hostname.replace(/^www\./, '');
            if (parsed.hostname === nakedHost) {
              parsed.hostname = `www.${nakedHost}`;
            } else {
              parsed.hostname = nakedHost;
            }
            return parsed.toString();
          } catch {
            return null;
          }
        })();
        if (retryUrl) {
          response = await page.goto(retryUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });
        }
      }
      await page.waitForTimeout(1200);
      const responseTimeMs = Date.now() - started;

      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 58,
        fullPage: false
      });
      const screenshotUrl = `data:image/jpeg;base64,${screenshot.toString('base64')}`;

      const pageMeta = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="description"]');
        const text = (document.body?.innerText || '').trim();
        const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
        return {
          title: document.title || null,
          metaDescription: meta?.getAttribute('content') || null,
          wordCount
        };
      });

      return {
        screenshotUrl,
        captureSource: 'live',
        metadata: {
          title: pageMeta.title,
          metaDescription: pageMeta.metaDescription,
          url: page.url() || normalizedUrl,
          statusCode: response?.status?.() ?? null,
          responseTimeMs,
          fileSizeBytes: Number(response?.headers?.()['content-length'] || 0) || null,
          wordCount: pageMeta.wordCount ?? null
        }
      };
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch (error) {
    console.warn('[snapshot:capture:failed]', {
      url,
      error: error instanceof Error ? error.message : 'unknown_capture_error'
    });
    return fallback;
  }
}
