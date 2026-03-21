import Link from 'next/link';

export function PublicPoweredByFooter({
  className = ''
}: {
  className?: string;
}) {
  return (
    <footer className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-400">
        <p>
          Powered by{' '}
          <a
            href="https://www.bigdotdigital.com/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-amber-300 underline"
          >
            Big Dot
          </a>
        </p>
        <Link href="/about" className="text-slate-300 underline">
          About Shop SEO Scan
        </Link>
      </div>
    </footer>
  );
}
