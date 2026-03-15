const INSURER_ALIASES: Record<string, string> = {
  'state farm': 'State Farm',
  statefarm: 'State Farm',
  geico: 'GEICO',
  progressive: 'Progressive',
  allstate: 'Allstate',
  farmers: 'Farmers',
  usaa: 'USAA',
  'liberty mutual': 'Liberty Mutual',
  libertymutual: 'Liberty Mutual',
  nationwide: 'Nationwide',
  travelers: 'Travelers',
  traveller: 'Travelers',
  travelersinsurance: 'Travelers',
  safeco: 'Safeco',
  mercury: 'Mercury',
  kemper: 'Kemper',
  esurance: 'Esurance',
  'american family': 'American Family',
  amfam: 'American Family',
  thehartford: 'The Hartford',
  hartford: 'The Hartford'
};

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function normalizeInsurerName(input: string | null | undefined) {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (INSURER_ALIASES[lower]) return INSURER_ALIASES[lower];

  const embedded = Object.entries(INSURER_ALIASES).find(([alias]) => {
    const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return pattern.test(raw);
  });
  if (embedded) return embedded[1];

  const compacted = compact(raw);
  const match = Object.entries(INSURER_ALIASES).find(([alias]) => compact(alias) === compacted);
  return match ? match[1] : null;
}

export function knownInsurerNames() {
  return [...new Set(Object.values(INSURER_ALIASES))];
}
