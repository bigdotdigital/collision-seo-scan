'use client';

type PublicProfileActionButtonProps = {
  action: 'claim' | 'update' | 'rescan' | 'opt_out';
  shopId: string;
  scanId: string;
  label: string;
};

export function PublicProfileActionButton({
  action,
  shopId,
  scanId,
  label
}: PublicProfileActionButtonProps) {
  async function handleSubmit() {
    await fetch('/api/public-shop-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action,
        shopId,
        scanId
      })
    });
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleSubmit();
      }}
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
    >
      {label}
    </button>
  );
}
