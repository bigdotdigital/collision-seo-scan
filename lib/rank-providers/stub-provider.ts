import type { RankProvider, RankProviderInput, RankProviderOutput } from '@/lib/rank-providers/provider';

function hash(value: string): number {
  let out = 0;
  for (let i = 0; i < value.length; i += 1) {
    out = (out << 5) - out + value.charCodeAt(i);
    out |= 0;
  }
  return Math.abs(out);
}

function positionFromSeed(seed: string): number {
  return 1 + (hash(seed) % 35);
}

export class StubRankProvider implements RankProvider {
  async getKeywordRanks(input: RankProviderInput): Promise<RankProviderOutput> {
    const scope = `${input.location.city || ''}-${input.location.state || ''}`;

    const rows = input.keywords.flatMap((keyword) => {
      const ownRow = {
        keywordId: keyword.id,
        keyword: keyword.term,
        competitorId: null,
        competitorName: null,
        rankPosition: positionFromSeed(`${scope}:${keyword.term}:shop`)
      };

      const competitorRows = input.competitors.map((competitor) => ({
        keywordId: keyword.id,
        keyword: keyword.term,
        competitorId: competitor.id,
        competitorName: competitor.name,
        rankPosition: positionFromSeed(`${scope}:${keyword.term}:${competitor.name}`)
      }));

      return [ownRow, ...competitorRows];
    });

    return {
      source: 'stub',
      collectedAt: new Date(),
      rows,
      raw: { mode: 'deterministic_stub' }
    };
  }
}

