import { PublicPoweredByFooter } from '@/components/public-powered-by-footer';

export const metadata = {
  title: 'Terms Overview | Shop SEO Scan',
  description: 'Terms overview for Shop SEO Scan and related services.'
};

const sections = [
  {
    title: '1. What this tool does',
    body:
      'Shop SEO Scan provides website scans, benchmarking views, market comparisons, and related marketing diagnostics for local service businesses. The tool is meant to help owners, operators, and marketers understand visibility, conversion, and competitive gaps.'
  },
  {
    title: '2. Public and provided data',
    body:
      'By using the scanner, you confirm that you have the right to submit the website and contact information you provide. You also understand that the product may collect and store public-facing website information, publicly observable business data, and scanner-derived observations for benchmarking, product improvement, and service delivery.'
  },
  {
    title: '3. Benchmarking and product improvement',
    body:
      'You agree that scan inputs, scan outputs, issue patterns, and aggregated market observations may be used internally by Big Dot Digital to improve reports, dashboards, benchmarking models, and related products. We do not sell your contact information to third parties.'
  },
  {
    title: '4. No guaranteed rankings or business results',
    body:
      'Marketing, SEO, paid media, and website performance involve many variables outside our control. Shop SEO Scan, Big Dot Digital, and related materials do not guarantee rankings, leads, revenue, or any specific business outcome.'
  },
  {
    title: '5. Estimates and modeled values',
    body:
      'Some insights, opportunity calculations, and market comparisons are modeled or estimated from available data. They are provided for planning and prioritization, not as guaranteed forecasts or promises of financial performance.'
  },
  {
    title: '6. As-is information',
    body:
      'The scanner, reports, and dashboards are provided on an as-is and as-available basis. We work to make them useful and accurate, but we do not warrant that every report, benchmark, or source observation will always be complete, current, or error-free.'
  },
  {
    title: '7. Not legal, financial, or compliance advice',
    body:
      'Nothing in Shop SEO Scan or Big Dot Digital materials should be treated as legal, financial, tax, insurance, or regulatory advice. You are responsible for consulting your own professional advisors where needed.'
  },
  {
    title: '8. Communications',
    body:
      'If you provide contact information, you agree that Big Dot Digital may contact you about your scan, related services, onboarding, support, and account activity. You can ask us to stop non-essential outreach at any time.'
  },
  {
    title: '9. Limitation of liability',
    body:
      'To the fullest extent permitted by law, Big Dot Digital and its operators will not be liable for indirect, incidental, special, consequential, exemplary, or lost-profit damages arising from the use of this tool, its reports, or related services.'
  },
  {
    title: '10. Updates',
    body:
      'We may update this terms overview as the product evolves. Continued use of the scanner, reports, or dashboard after changes means you accept the updated version.'
  }
];

export default function TermsPage() {
  return (
    <main className="diagnostic-page relative overflow-hidden py-16 md:py-20">
      <div className="diagnostic-bg-rings" />

      <section className="container-shell relative z-10">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">Terms Overview</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-100 md:text-6xl">
            Shop SEO Scan terms for scans, benchmarking, and related services.
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
            This overview is meant to make the key rules clear in plain language. It applies to the public scanner,
            reports, dashboards, and related services provided by Big Dot Digital through Shop SEO Scan.
          </p>

          <div className="mt-10 space-y-4">
            {sections.map((section) => (
              <article key={section.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <h2 className="text-lg font-semibold text-slate-100">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">{section.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
            <p className="text-sm leading-7 text-slate-200">
              Questions about these terms or about how scan data is used? Contact{' '}
              <a href="https://www.bigdotdigital.com/" target="_blank" rel="noreferrer" className="font-semibold text-amber-300 underline">
                Big Dot Digital
              </a>.
            </p>
          </div>

          <PublicPoweredByFooter className="mt-10" />
        </div>
      </section>
    </main>
  );
}
