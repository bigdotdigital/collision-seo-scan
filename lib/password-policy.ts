const MIN_PASSWORD_LENGTH = 10;

export function getPasswordPolicyError(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[A-Z]/.test(password)) {
    return 'Add at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Add at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Add at least one number.';
  }
  return null;
}

export function passwordPolicyHint(password: string) {
  return getPasswordPolicyError(password) || 'Strong password';
}
