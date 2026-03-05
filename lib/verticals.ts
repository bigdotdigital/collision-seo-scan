export const VERTICALS = {
  collision: {
    slug: 'collision',
    label: 'Collision Repair',
    title: 'Instant Local SEO report for collision repair shops.',
    subtitle:
      'Enter your shop info and get a scored audit with top leaks, money keywords, competitor snapshot, and a 30-day plan.'
  },
  hvac: {
    slug: 'hvac',
    label: 'HVAC',
    title: 'Instant Local SEO report for HVAC companies.',
    subtitle:
      'See where local visibility is leaking and what to fix first in your city.'
  },
  roofing: {
    slug: 'roofing',
    label: 'Roofing',
    title: 'Instant Local SEO report for roofing contractors.',
    subtitle:
      'Get a practical SEO baseline, competitor snapshot, and action plan for local lead growth.'
  },
  plumbing: {
    slug: 'plumbing',
    label: 'Plumbing',
    title: 'Instant Local SEO report for plumbing businesses.',
    subtitle:
      'Understand rank gaps, conversion leaks, and next-step actions in your market.'
  }
} as const;

export type VerticalSlug = keyof typeof VERTICALS;

export const DEFAULT_VERTICAL: VerticalSlug = 'collision';

export function isVerticalSlug(value: string): value is VerticalSlug {
  return value in VERTICALS;
}
