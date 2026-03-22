type CityMarketCopy = {
  headline: string;
  summary: string;
  whyItMatters: string;
  priorityAreas: string[];
  faq: Array<{ question: string; answer: string }>;
};

const COLORADO_CITY_COPY: Record<string, CityMarketCopy> = {
  denver: {
    headline: 'Dense competition and a bigger trust gap',
    summary:
      'Denver is the deepest collision market in our current dataset, which makes trust, review proof, specialty visibility, and estimate flow matter more than generic SEO activity.',
    whyItMatters:
      'In a dense metro market, shops lose faster when their service pages, Google profile trust, or estimate conversion are even a little weaker than nearby competitors.',
    priorityAreas: ['Maps and review trust', 'Estimate CTA visibility', 'Hail and specialty page coverage'],
    faq: [
      {
        question: 'Why is collision SEO in Denver more competitive?',
        answer:
          'Denver has one of the densest collision markets we have scanned so far, which means body shops have to compete harder on reviews, trust signals, local intent pages, and estimate conversion.'
      },
      {
        question: 'What matters most for Denver collision SEO?',
        answer:
          'In Denver, the biggest levers are usually maps visibility, review proof, estimate flow, service-page depth, and the specialty signals that make one shop feel more credible than another.'
      }
    ]
  },
  'colorado-springs': {
    headline: 'Strong local intent with room to look more credible',
    summary:
      'Colorado Springs collision SEO is often less about beating a giant field and more about looking like the clearer, more trustworthy local choice.',
    whyItMatters:
      'Shops in Springs can win faster when they combine clean local service coverage with strong review proof and a visible estimate path.',
    priorityAreas: ['Local service pages', 'Trust proof and reviews', 'Estimate conversion flow'],
    faq: [
      {
        question: 'What should collision shops in Colorado Springs prioritize first?',
        answer:
          'Most should start with local service pages, visible estimate CTAs, and stronger trust proof before spending heavily on broader content.'
      }
    ]
  },
  'fort-collins': {
    headline: 'Smaller market, clearer opportunity',
    summary:
      'Fort Collins gives collision shops a chance to stand out with cleaner service coverage and stronger local trust without needing a huge content footprint.',
    whyItMatters:
      'In smaller but still competitive city markets, body shops can outperform faster when the site is locally relevant and the conversion path is obvious.',
    priorityAreas: ['Core collision service pages', 'Google profile strength', 'Conversion-first site structure'],
    faq: [
      {
        question: 'Is Fort Collins collision SEO more manageable than Denver?',
        answer:
          'Usually yes. The market is smaller, which means cleaner local relevance, stronger reviews, and better estimate flow can have outsized impact.'
      }
    ]
  },
  boulder: {
    headline: 'Premium-trust presentation matters more',
    summary:
      'Boulder collision SEO often rewards shops that present as more specialized, more trustworthy, and easier to choose quickly.',
    whyItMatters:
      'Higher-trust markets usually punish vague service messaging and weak credibility cues more than they punish a lack of broad content.',
    priorityAreas: ['Specialty and authority proof', 'Premium trust signals', 'High-clarity service pages'],
    faq: [
      {
        question: 'What makes Boulder collision SEO different?',
        answer:
          'Boulder shops often benefit from stronger specialty proof, cleaner trust presentation, and clearer service messaging because buyers compare credibility quickly.'
      }
    ]
  },
  lakewood: {
    headline: 'Metro adjacency without full Denver saturation',
    summary:
      'Lakewood sits close enough to Denver to feel real competitive pressure, but the local opportunity still comes from owning neighborhood-level intent and making the estimate path obvious.',
    whyItMatters:
      'Body shops here need to balance metro-level trust expectations with cleaner, simpler local relevance.',
    priorityAreas: ['Neighborhood-local relevance', 'Maps trust and reviews', 'Estimate-first conversion'],
    faq: [
      {
        question: 'What should Lakewood body shops focus on in SEO?',
        answer:
          'The biggest wins are often local service intent, stronger maps trust, and a more visible estimate path instead of broad generic SEO work.'
      }
    ]
  }
};

function normalizeKey(value: string) {
  return decodeURIComponent(value).trim().toLowerCase();
}

export function getCollisionCityMarketCopy(city: string): CityMarketCopy {
  const key = normalizeKey(city);
  return (
    COLORADO_CITY_COPY[key] || {
      headline: 'Local trust and estimate flow decide faster than generic SEO noise',
      summary:
        'Collision SEO usually works best when a shop has strong local service coverage, visible trust proof, and a clear estimate path instead of generic content bloat.',
      whyItMatters:
        'Body shops win locally when nearby drivers understand what the shop does, why it is credible, and how to start the estimate process quickly.',
      priorityAreas: ['Service-page depth', 'Review and trust proof', 'Clear estimate conversion'],
      faq: [
        {
          question: `What matters most for collision SEO in ${decodeURIComponent(city).replace(/-/g, ' ')}?`,
          answer:
            'The biggest levers are usually local relevance, review trust, service-page depth, and a clear estimate path that helps nearby drivers choose the shop quickly.'
        }
      ]
    }
  );
}
