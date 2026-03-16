export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

export function isNonRetryableError(error: unknown) {
  return error instanceof NonRetryableError || (error instanceof Error && error.name === 'NonRetryableError');
}
