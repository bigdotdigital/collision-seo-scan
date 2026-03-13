import Link from 'next/link';

const PLANS = [
  {
    name: 'Free to Start',
    price: '$0',
    period: 'free forever',
    badge: 'Best way to try it',
    accent: 'light',
    ctaLabel: 'Run your first free scan',
    ctaHref: '/#scan-form',
    subcopy: 'Three scans per month. No credit card. No setup call required.',
    features: [
      '3 scans per month',
      'Example report access',
      'Basic local SEO issues',
      'Email capture for follow-up',
      'No billing required'
    ]
  },
  {
    name: 'Shop Manager',
    price: '$49',
    period: '/month',
    badge: '30-day free trial',
    accent: 'lime',
    ctaLabel: 'Start monitoring free',
    ctaHref: '/monitoring',
    subcopy: 'Built for owners and managers who want a simple weekly visibility dashboard.',
    features: [
      '30-day free trial',
      'Monitoring dashboard',
      'Keyword tracking',
      'Competitor watchlist',
      'AI search visibility basics',
      'Alerts + scan history',
      'Free setup call included'
    ]
  },
  {
    name: 'Pro Agency',
    price: '$199',
    period: '/month',
    badge: 'Upgrade ready',
    accent: 'dark',
    ctaLabel: 'Talk about Pro',
    ctaHref: '/monitoring',
    subcopy: 'For shops and operators who want stronger visibility in Google and AI-driven answers, with deeper strategic guidance.',
    features: [
      'Everything in Shop Manager',
      'More keywords and competitors',
      'AI Search Visibility',
      'ChatGPT / Gemini answer readiness',
      'AI answer gap analysis',
      'Priority refreshes',
      'White-label style reporting',
      'Agency-ready billing path',
      'Hands-on strategy support'
    ]
  }
] as const;

const COMPARE_ROWS = [
  ['Monthly price', '$0', '$49', '$199'],
  ['Free scans', '3/mo', 'Unlimited during trial, then monitoring', 'Included'],
  ['Trial period', 'n/a', '30 days', 'Custom / included'],
  ['Monitoring dashboard', 'No', 'Yes', 'Yes'],
  ['Keyword tracking', 'No', 'Core set', 'Expanded'],
  ['Competitor tracking', 'No', 'Yes', 'Expanded'],
  ['AI search visibility', 'No', 'Basics', 'Full module'],
  ['Alert feed', 'No', 'Yes', 'Yes'],
  ['Reports & history', 'Basic report only', 'Yes', 'Yes'],
  ['Setup call', 'Optional', 'Included', 'Included'],
  ['Best for', 'Trying the scanner', 'Owner / shop manager', 'Growth / agency mode']
] as const;

const FAQS = [
  {
    q: 'Do I need a credit card to start?',
    a: 'No. The free plan does not require billing. The Shop Manager plan starts with a free trial, and billing can be added later.'
  },
  {
    q: 'What happens after the free trial?',
    a: 'You keep your dashboard and can decide whether to activate paid monitoring, contact billing manually, or book a setup call with Big Dot.'
  },
  {
    q: 'Can you help customize the dashboard for my shop?',
    a: 'Yes. The paid monitoring plans include a free setup call, and ongoing consult support is available if you want hands-on help.'
  },
  {
    q: 'What is AI Search Visibility?',
    a: 'It means helping your shop show up more clearly when people ask ChatGPT, Gemini, Google, or other AI-powered search tools where to get collision work done. The $49 plan includes the basics. The $199 plan includes deeper answer-readiness and competitor gap analysis.'
  },
  {
    q: 'Is this only for collision repair shops?',
    a: 'The product is being built for collision first. The language, fixes, and signals are tuned to how collision shops win calls from Google.'
  }
] as const;

export default function PricingPage() {
  return (
    <main className="monitor-page pricing-page">
      <section className="monitor-container">
        <header className="pricing-topbar">
          <div className="monitor-header">
            <span className="monitor-logo-dot" />
            <span className="monitor-logo-text">Big Dot Monitoring</span>
          </div>
          <div className="pricing-top-links">
            <Link href="/">Scanner</Link>
            <Link href="/monitoring">Monitoring</Link>
            <Link href="/login">Login</Link>
          </div>
        </header>

        <section className="pricing-hero">
          <p className="pricing-kicker">Pricing</p>
          <h1 className="pricing-title">Free to start. Upgrade when the dashboard starts paying for itself.</h1>
          <p className="pricing-copy">
            Start with free scans, move into monitoring when you want recurring visibility, and
            step up to Pro when you need stronger AI search visibility, deeper reporting, and more hands-on support.
          </p>
        </section>

        <section className="pricing-plan-grid">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`pricing-plan-card pricing-plan-card-${plan.accent}`}
            >
              <div>
                <span className="pricing-plan-badge">{plan.badge}</span>
                <h2 className="pricing-plan-name">{plan.name}</h2>
                <p className="pricing-plan-price">
                  {plan.price}
                  <span>{plan.period}</span>
                </p>
                <p className="pricing-plan-subcopy">{plan.subcopy}</p>
              </div>

              <ul className="pricing-feature-list">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span className="pricing-check">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={plan.ctaHref} className="pricing-plan-cta">
                {plan.ctaLabel}
              </Link>
            </article>
          ))}
        </section>

        <section className="pricing-compare-card">
          <div className="pricing-section-head">
            <div>
              <p className="pricing-kicker">Compare plans</p>
              <h2 className="pricing-section-title">What you get at each level</h2>
            </div>
          </div>

          <div className="pricing-compare-wrap">
            <table className="pricing-compare-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Free</th>
                  <th>Shop Manager</th>
                  <th>Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row[0]}>
                    <td>{row[0]}</td>
                    <td>{row[1]}</td>
                    <td>{row[2]}</td>
                    <td>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="pricing-faq-grid">
          <div className="pricing-faq-card">
            <p className="pricing-kicker">FAQ</p>
            <h2 className="pricing-section-title">Questions shops usually ask before signing up</h2>
          </div>
          {FAQS.map((item) => (
            <article key={item.q} className="pricing-faq-card">
              <h3 className="pricing-faq-question">{item.q}</h3>
              <p className="pricing-faq-answer">{item.a}</p>
            </article>
          ))}
        </section>

        <section className="pricing-bottom-cta">
          <p className="pricing-kicker">Start now</p>
          <h2 className="pricing-title pricing-title-sm">Start monitoring free</h2>
          <p className="pricing-copy pricing-copy-tight">
            No credit card. No API keys. No call required. Get your account live fast, then bring
            Big Dot in when you want help customizing the dashboard.
          </p>
          <div className="pricing-cta-row">
            <Link href="/monitoring" className="pricing-plan-cta">
              Start free trial
            </Link>
            <Link href="/#scan-form" className="pricing-secondary-cta">
              Run free scan first
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
