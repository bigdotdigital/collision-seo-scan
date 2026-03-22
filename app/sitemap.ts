import type { MetadataRoute } from 'next';

const BASE_URL = 'https://shopseoscan.com';
const CITY_MARKET_PATHS = [
  '/markets/co/denver',
  '/markets/co/denver/collision-seo',
  '/markets/co/colorado-springs',
  '/markets/co/colorado-springs/collision-seo',
  '/markets/co/fort-collins',
  '/markets/co/fort-collins/collision-seo',
  '/markets/co/boulder',
  '/markets/co/boulder/collision-seo',
  '/markets/co/lakewood',
  '/markets/co/lakewood/collision-seo'
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: `${BASE_URL}/collision`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9
    },
    {
      url: `${BASE_URL}/free-seo-scan`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85
    },
    {
      url: `${BASE_URL}/free-collision-seo-scan`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85
    },
    {
      url: `${BASE_URL}/collision-seo`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.84
    },
    {
      url: `${BASE_URL}/collision-repair-seo`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.84
    },
    {
      url: `${BASE_URL}/auto-body-seo`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.82
    },
    {
      url: `${BASE_URL}/free-auto-body-seo-tool`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.84
    },
    {
      url: `${BASE_URL}/demo`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${BASE_URL}/monitoring`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4
    },
    {
      url: `${BASE_URL}/hvac`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6
    },
    {
      url: `${BASE_URL}/hvac-seo`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${BASE_URL}/free-hvac-seo-scan`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${BASE_URL}/roofing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6
    },
    {
      url: `${BASE_URL}/roofing-seo`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${BASE_URL}/free-roofing-seo-scan`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${BASE_URL}/plumbing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6
    },
    {
      url: `${BASE_URL}/plumbing-seo`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${BASE_URL}/free-plumbing-seo-scan`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    }
  ];

  const marketRoutes: MetadataRoute.Sitemap = CITY_MARKET_PATHS.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path.endsWith('/collision-seo') ? 0.72 : 0.68
  }));

  return [...staticRoutes, ...marketRoutes];
}
