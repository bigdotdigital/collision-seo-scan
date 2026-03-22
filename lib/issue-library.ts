import type { Issue } from '@/lib/types';
import { getVerticalConfig, type VerticalSlug } from '@/lib/verticals';

function genericServicePhrase(vertical: VerticalSlug) {
  if (vertical === 'hvac') return 'heating and cooling';
  if (vertical === 'plumbing') return 'plumbing';
  if (vertical === 'roofing') return 'roofing';
  return 'collision repair';
}

function specialtySignalCopy(vertical: VerticalSlug) {
  if (vertical === 'hvac') {
    return {
      title: 'HVAC trust signals are not visible',
      why: 'Emergency availability, maintenance plans, financing, and equipment specialties help HVAC buyers trust the company faster.',
      fix: 'Create visible sections for emergency service, maintenance agreements, financing, and core equipment specialties.'
    };
  }
  if (vertical === 'plumbing') {
    return {
      title: 'Plumbing trust signals are not visible',
      why: 'Emergency-service language, licensing, and specialty-service proof help homeowners trust a plumber faster.',
      fix: 'Create visible sections for emergency service, licensing, and core specialties like drains, water heaters, leaks, and sewer work.'
    };
  }
  if (vertical === 'roofing') {
    return {
      title: 'Roofing trust signals are not visible',
      why: 'Inspection offers, storm guidance, financing, warranties, and manufacturer credentials help property owners choose a roofer faster.',
      fix: 'Create visible sections for inspections, storm and insurance help, financing, warranties, and manufacturer or product credentials.'
    };
  }
  return {
    title: 'OEM certification intent not visible',
    why: 'OEM pages drive high-value, high-intent searches.',
    fix: 'Create OEM certification sections for your supported brands.'
  };
}

function specialtyServiceCopy(vertical: VerticalSlug) {
  if (vertical === 'hvac') {
    return {
      title: 'High-value HVAC specialties are not visible',
      why: 'Specialty pages for repairs, replacements, heat pumps, and indoor air quality expand profitable search coverage.',
      fix: 'Add distinct pages or sections for repair, replacement, maintenance, heat pumps, and indoor air quality.'
    };
  }
  if (vertical === 'plumbing') {
    return {
      title: 'High-value plumbing specialties are not visible',
      why: 'Distinct pages for drain cleaning, leaks, water heaters, and sewer work help match the actual services people search for.',
      fix: 'Add distinct pages or sections for drain cleaning, leak detection, water heaters, sewer work, and emergency calls.'
    };
  }
  if (vertical === 'roofing') {
    return {
      title: 'High-value roofing specialties are not visible',
      why: 'Distinct pages for repair, replacement, inspections, storm damage, and hail work help match the real services people search for.',
      fix: 'Add distinct pages or sections for roof repair, replacement, inspection, storm damage, and hail-related work.'
    };
  }
  return {
    title: 'Fleet van terms missing',
    why: 'Commercial van terms can unlock profitable local traffic.',
    fix: 'Add Sprinter/ProMaster/Transit service content blocks.'
  };
}

function urgencyCopy(vertical: VerticalSlug) {
  if (vertical === 'hvac') {
    return {
      title: 'Urgent service language is weak or missing',
      why: 'HVAC buyers often search under time pressure during outages or extreme weather.',
      fix: 'Add same-day, emergency, and request-service messaging near the hero, nav, and contact sections.'
    };
  }
  if (vertical === 'plumbing') {
    return {
      title: 'Emergency plumbing language is weak or missing',
      why: 'Plumbing demand often starts with leaks, clogs, or failures that need a fast response.',
      fix: 'Add 24/7, same-day, and emergency-service guidance near the hero, nav, and contact sections.'
    };
  }
  if (vertical === 'roofing') {
    return {
      title: 'Storm / insurance guidance is weak or missing',
      why: 'Roofing buyers often need confidence about inspection, storm damage, and insurance-related next steps.',
      fix: 'Add storm damage, hail, insurance-claim, and inspection guidance on the homepage and service pages.'
    };
  }
  return {
    title: 'Insurance/claims language missing',
    why: 'Post-accident users search for insurance and claims help.',
    fix: 'Add insurance claim and deductible guidance copy on key pages.'
  };
}

export function getIssueLibrary(vertical?: string | null): Record<string, Issue> {
  const cfg = getVerticalConfig(vertical);
  const servicePhrase = genericServicePhrase(cfg.slug);
  const specialtyTrust = specialtySignalCopy(cfg.slug);
  const specialtyServices = specialtyServiceCopy(cfg.slug);
  const urgencySignals = urgencyCopy(cfg.slug);

  return {
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
      why: `You are less likely to rank for local ${servicePhrase} terms.`,
      fix: `Include city and core ${servicePhrase} terms in the homepage title.`
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
      fix: `Add one descriptive H1 focused on ${servicePhrase} in your city.`
    },
    weak_h1_intent: {
      id: 'weak_h1_intent',
      severity: 'Med',
      title: 'H1 lacks local service wording',
      why: 'Weak on-page intent can reduce local visibility.',
      fix: `Rewrite H1 to include ${servicePhrase} and location wording.`
    },
    missing_nap: {
      id: 'missing_nap',
      severity: 'High',
      title: 'NAP signals are weak or missing',
      why: 'Local SEO depends on clear name/address/phone consistency.',
      fix: 'Add business name, full address, and phone in footer/contact blocks.'
    },
    missing_estimate_cta: {
      id: 'missing_estimate_cta',
      severity: 'High',
      title: `No clear ${cfg.primaryCtaLabel.toLowerCase()} CTA`,
      why: `Without a clear ${cfg.primaryCtaLabel.toLowerCase()} path, conversion intent is lost.`,
      fix: `Add a prominent “${cfg.primaryCtaLabel}” button in the hero and nav.`
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
      why: 'Business profile linkage strengthens local trust and direction signals.',
      fix: 'Link your Google Business Profile in the header, footer, or contact page.'
    },
    missing_map_embed: {
      id: 'missing_map_embed',
      severity: 'Low',
      title: 'No embedded map found',
      why: 'Map embeds reinforce geographic relevance to users and crawlers.',
      fix: 'Embed a Google map on contact or location pages.'
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
      title: specialtyTrust.title,
      why: specialtyTrust.why,
      fix: specialtyTrust.fix
    },
    no_fleet_signals: {
      id: 'no_fleet_signals',
      severity: 'Med',
      title: specialtyServices.title,
      why: specialtyServices.why,
      fix: specialtyServices.fix
    },
    no_insurance_signals: {
      id: 'no_insurance_signals',
      severity: 'Med',
      title: urgencySignals.title,
      why: urgencySignals.why,
      fix: urgencySignals.fix
    }
  };
}
