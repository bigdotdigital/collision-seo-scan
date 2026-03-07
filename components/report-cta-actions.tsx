'use client';

type Props = {
  scanId: string;
  calendlyUrl: string;
  salesPhone: string;
  reportUrl?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  mobileSticky?: boolean;
  trackBooked?: boolean;
};

function markBooked(scanId: string) {
  fetch(`/api/scan/${scanId}/booked`, {
    method: 'POST',
    keepalive: true
  }).catch(() => {
    // no-op: booking click tracking should never block navigation
  });
}

export function ReportCtaActions({
  scanId,
  calendlyUrl,
  salesPhone,
  reportUrl,
  primaryLabel = 'Book my SEO audit',
  secondaryLabel = 'Text us for the plan',
  mobileSticky = false,
  trackBooked = true
}: Props) {
  const containerClass = mobileSticky
    ? 'report-mobile-cta fixed inset-x-0 bottom-0 z-30 p-3 md:hidden'
    : '';

  const innerClass = mobileSticky
    ? 'mx-auto flex max-w-3xl gap-2'
    : 'mt-4 hidden flex-col gap-3 sm:flex sm:flex-row';

  const external = /^https?:\/\//i.test(calendlyUrl);
  const smsBody = reportUrl
    ? `Here is my shop's SEO report: ${reportUrl}. We'd love to chat about improving our SEO.`
    : `We'd love to chat about improving our SEO.`;
  const smsUrl = `sms:${salesPhone}?body=${encodeURIComponent(smsBody)}`;

  return (
    <div className={containerClass}>
      <div className={innerClass}>
        <a
          href={calendlyUrl}
          target={external ? '_blank' : undefined}
          rel={external ? 'noreferrer' : undefined}
          onClick={() => {
            if (trackBooked) markBooked(scanId);
          }}
          className="btn-variant-primary inline-flex flex-1 items-center justify-center px-4 py-2 text-center"
        >
          {primaryLabel}
        </a>
        <a
          href={smsUrl}
          className="btn-variant-secondary inline-flex items-center justify-center px-4 py-2"
        >
          {secondaryLabel}
        </a>
      </div>
    </div>
  );
}

export function ReportShareActions({ reportUrl }: { reportUrl: string }) {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reportUrl);
      alert('Report link copied');
    } catch {
      alert('Unable to copy link');
    }
  };

  const downloadPdf = () => {
    window.print();
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copyLink}
        className="btn-variant-ghost px-3 py-2 text-sm font-medium"
      >
        Copy report link
      </button>
      <button
        type="button"
        onClick={downloadPdf}
        className="btn-variant-ghost px-3 py-2 text-sm font-medium"
      >
        Download PDF
      </button>
    </div>
  );
}
