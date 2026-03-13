'use client';

import { useFormStatus } from 'react-dom';

export function RefreshDashboardButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="dashboard-button-primary"
      title="Run a fresh scan using the current workspace name, website, city, and address."
    >
      {pending ? 'Refreshing…' : 'Refresh data'}
    </button>
  );
}
