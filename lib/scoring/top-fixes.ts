import type { Issue, PrioritizedFix } from '@/lib/types';

export function buildTopFixes(input: {
  issues: Issue[];
  missingSignals: string[];
  missingPages: string[];
  hasPerformanceData: boolean;
}): PrioritizedFix[] {
  const fixes: PrioritizedFix[] = [];

  const severe = input.issues.filter((i) => i.severity === 'High').slice(0, 2);
  for (const issue of severe) {
    fixes.push({
      title: issue.title,
      why: issue.why,
      impact: 'High',
      steps: [
        issue.fix,
        'Apply on homepage first, then replicate on top service pages.',
        'Re-run scan to validate score change.'
      ]
    });
  }

  if (input.missingSignals.length > 0) {
    fixes.push({
      title: 'Close certification and capability visibility gaps',
      why: 'Collision buyers and insurers trust verifiable certifications and modern repair capabilities.',
      impact: 'High',
      steps: [
        `Publish dedicated sections/pages for: ${input.missingSignals.slice(0, 5).join(', ')}.`,
        'Add these signals to homepage and certification page above the fold.',
        'Include internal links from service pages and estimate CTA blocks.'
      ]
    });
  }

  if (fixes.length < 3 && input.missingPages.length > 0) {
    fixes.push({
      title: 'Publish missing high-intent pages',
      why: 'Missing intent pages reduce visibility for collision and conversion queries.',
      impact: 'Med',
      steps: [
        `Create pages: ${input.missingPages.join(', ')}.`,
        'Add city + service intent in title/H1/meta for each page.',
        'Link each page from nav and footer.'
      ]
    });
  }

  if (fixes.length < 3) {
    fixes.push({
      title: 'Improve speed and mobile conversion flow',
      why: input.hasPerformanceData
        ? 'Performance directly affects ranking and estimate conversion rate.'
        : 'Speed not measured this run; optimize proactively to reduce friction.',
      impact: 'Med',
      steps: [
        'Compress hero media and defer non-critical scripts.',
        'Reduce third-party widgets on landing pages.',
        'Keep estimate CTA visible above the fold on mobile.'
      ]
    });
  }

  while (fixes.length < 3) {
    fixes.push({
      title: 'Opportunity: tighten local trust signals',
      why: 'Consistent trust modules improve map pack and conversion confidence.',
      impact: 'Low',
      steps: ['Add review proof near CTAs.', 'Refresh before/after project examples.', 'Re-scan in 2 weeks.']
    });
  }

  return fixes.slice(0, 3);
}
