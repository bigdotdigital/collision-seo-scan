'use client';

import Link from 'next/link';

export function StickyBookingCta({ scanId, salesPhone }: { scanId: string; salesPhone: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-3xl gap-2">
        <Link
          href={`/thanks/${scanId}?book=1`}
          className="flex-1 rounded-md bg-teal-700 px-3 py-2 text-center text-sm font-semibold text-white"
        >
          Book 15-min teardown
        </Link>
        <a
          href={`sms:${salesPhone}`}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
        >
          Text plan
        </a>
      </div>
    </div>
  );
}
