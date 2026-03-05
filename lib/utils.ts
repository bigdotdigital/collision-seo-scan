export const toWebsiteUrl = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const normalizeSpace = (value: string): string => value.replace(/\s+/g, ' ').trim();

export const textContainsAny = (text: string, terms: string[]): boolean => {
  const t = text.toLowerCase();
  return terms.some((term) => t.includes(term.toLowerCase()));
};

export const formatDateTime = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
