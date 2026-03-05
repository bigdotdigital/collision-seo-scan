import type { Issue } from '@/lib/types';

export const ISSUE_LIBRARY: Record<string, Issue> = {
  no_https: {
    id: 'no_https',
    severity: 'High',
    title: 'Website is not forcing HTTPS',
    why: 'Insecure pages reduce trust and can suppress rankings.',
    fix: 'Redirect all HTTP traffic to HTTPS at the server level.'
  },
  missing_title: {
    id: 'missing_title',
    severity: 'High',
    title: 'Missing page title',
    why: 'Search engines rely on title tags to classify intent.',
    fix: 'Add a clear title with service + city + brand.'
  },
  weak_title_intent: {
    id: 'weak_title_intent',
    severity: 'Med',
    title: 'Title lacks city or service intent',
    why: 'You are less likely to rank for local collision terms.',
    fix: 'Include city and collision/body shop terms in the homepage title.'
  },
  missing_meta: {
    id: 'missing_meta',
    severity: 'Low',
    title: 'Meta description missing',
    why: 'Missing snippets can lower click-through rates in SERPs.',
    fix: 'Write a 140-160 char meta description with offer + location.'
  },
  missing_h1: {
    id: 'missing_h1',
    severity: 'High',
    title: 'Missing H1 headline',
    why: 'H1 helps search engines and users understand primary page topic.',
    fix: 'Add one descriptive H1 focused on collision repair in your city.'
  },
  weak_h1_intent: {
    id: 'weak_h1_intent',
    severity: 'Med',
    title: 'H1 lacks local service wording',
    why: 'Weak on-page intent can reduce local visibility.',
    fix: 'Rewrite H1 to include collision/body service and location.'
  },
  missing_nap: {
    id: 'missing_nap',
    severity: 'High',
    title: 'NAP signals are weak or missing',
    why: 'Local SEO depends on clear name/address/phone consistency.',
    fix: 'Add shop name, full address, and phone in footer/contact blocks.'
  },
  missing_estimate_cta: {
    id: 'missing_estimate_cta',
    severity: 'High',
    title: 'No clear estimate CTA',
    why: 'Without an estimate CTA, conversion intent is lost.',
    fix: 'Add a prominent “Free Estimate” button in hero and nav.'
  },
  poor_mobile_perf: {
    id: 'poor_mobile_perf',
    severity: 'Med',
    title: 'Mobile performance looks poor',
    why: 'Slow pages hurt rankings and lead volume, especially on mobile.',
    fix: 'Compress images, defer scripts, and optimize server response time.'
  },
  missing_sitemap: {
    id: 'missing_sitemap',
    severity: 'Low',
    title: 'Sitemap not found',
    why: 'Sitemaps help crawlers discover and prioritize important pages.',
    fix: 'Generate `/sitemap.xml` and submit it in Google Search Console.'
  },
  missing_maps_link: {
    id: 'missing_maps_link',
    severity: 'Med',
    title: 'Google Maps profile link not detected',
    why: 'GBP linkage strengthens local trust and direction signals.',
    fix: 'Link your Google Business Profile in header/footer/contact page.'
  },
  missing_map_embed: {
    id: 'missing_map_embed',
    severity: 'Low',
    title: 'No embedded map found',
    why: 'Map embeds reinforce geographic relevance to users and crawlers.',
    fix: 'Embed a Google map on contact/location pages.'
  },
  missing_directions_reviews_cta: {
    id: 'missing_directions_reviews_cta',
    severity: 'Med',
    title: 'Directions/reviews CTA missing',
    why: 'Strong local CTAs can improve engagement and trust signals.',
    fix: 'Add “Get Directions” and “Read Reviews” links near key CTAs.'
  },
  missing_review_signals: {
    id: 'missing_review_signals',
    severity: 'Med',
    title: 'Review widget/schema signals missing',
    why: 'Review proof supports conversions and local quality signals.',
    fix: 'Add review snippets or AggregateRating schema markup.'
  },
  no_oem_signals: {
    id: 'no_oem_signals',
    severity: 'High',
    title: 'OEM certification intent not visible',
    why: 'OEM pages drive high-value, high-intent searches.',
    fix: 'Create OEM certification sections for your supported brands.'
  },
  no_fleet_signals: {
    id: 'no_fleet_signals',
    severity: 'Med',
    title: 'Fleet van terms missing',
    why: 'Commercial van terms can unlock profitable local traffic.',
    fix: 'Add Sprinter/ProMaster/Transit service content blocks.'
  },
  no_insurance_signals: {
    id: 'no_insurance_signals',
    severity: 'Med',
    title: 'Insurance/claims language missing',
    why: 'Post-accident users search for insurance and claims help.',
    fix: 'Add insurance claim and deductible guidance copy on key pages.'
  }
};
