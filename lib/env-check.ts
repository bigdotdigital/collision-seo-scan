const globalState = globalThis as typeof globalThis & {
  __envWarningsLogged?: boolean;
};

export function logEnvWarningsOnce(): void {
  if (process.env.NODE_ENV === 'production') return;
  if (globalState.__envWarningsLogged) return;
  globalState.__envWarningsLogged = true;

  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.RESEND_API_KEY && !process.env.SMTP_HOST) {
    missing.push('RESEND_API_KEY (or SMTP_*)');
  }
  if (
    !process.env.CALENDLY_LINK &&
    !process.env.CALENDLY_URL &&
    !process.env.BOOKING_LINK &&
    !process.env.NEXT_PUBLIC_CALENDLY_LINK
  ) {
    missing.push('CALENDLY_LINK (or CALENDLY_URL / BOOKING_LINK)');
  }

  if (missing.length > 0) {
    console.warn('[ENV_CHECK_WARNING]', `Missing env vars: ${missing.join(', ')}`);
  }
}
