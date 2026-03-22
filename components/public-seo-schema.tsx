type FaqItem = {
  question: string;
  answer: string;
};

export function PublicSeoSchema({
  title,
  description,
  path,
  faq
}: {
  title: string;
  description: string;
  path: string;
  faq?: FaqItem[];
}) {
  const baseUrl = 'https://shopseoscan.com';
  const pageUrl = `${baseUrl}${path}`;

  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: pageUrl,
      isPartOf: {
        '@type': 'WebSite',
        name: 'Shop SEO Scan',
        url: baseUrl
      }
    },
    ...(faq && faq.length > 0
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer
              }
            }))
          }
        ]
      : [])
  ];

  return (
    <>
      {data.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
