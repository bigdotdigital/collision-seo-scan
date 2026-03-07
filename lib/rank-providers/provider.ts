export type RankProviderInput = {
  location: {
    city?: string | null;
    state?: string | null;
  };
  keywords: Array<{
    id: string;
    term: string;
  }>;
  competitors: Array<{
    id: string;
    name: string;
  }>;
};

export type RankProviderRow = {
  keywordId: string;
  keyword: string;
  competitorId?: string | null;
  competitorName?: string | null;
  rankPosition: number | null;
};

export type RankProviderOutput = {
  source: string;
  collectedAt: Date;
  rows: RankProviderRow[];
  raw?: unknown;
};

export interface RankProvider {
  getKeywordRanks(input: RankProviderInput): Promise<RankProviderOutput>;
}

