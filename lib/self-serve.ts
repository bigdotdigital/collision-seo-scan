function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

export function createOrganizationSlug(name: string) {
  return `${slugify(name) || 'shop'}-${Math.random().toString(36).slice(2, 8)}`;
}

export function seededKeywordsFromJson(moneyKeywordsJson: string) {
  try {
    const parsed = JSON.parse(moneyKeywordsJson || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({ keyword: typeof row?.keyword === 'string' ? row.keyword : '' }))
      .filter((row) => row.keyword);
  } catch {
    return [];
  }
}

export function seededCompetitorsFromJson(competitorsJson: string) {
  try {
    const parsed = JSON.parse(competitorsJson || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        name: typeof row?.name === 'string' ? row.name : '',
        url: typeof row?.url === 'string' ? row.url : ''
      }))
      .filter((row) => row.name);
  } catch {
    return [];
  }
}
