/**
 * Structured Data (JSON-LD) Component
 * Adds schema.org markup for better SEO
 */

interface StructuredDataProps {
  type?: 'website' | 'organization' | 'dataset';
  data?: Record<string, string | number | boolean | object>;
}

export function StructuredData({ type = 'website', data }: StructuredDataProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://asia-bitcoin-treasuries.vercel.app';
  
  const defaultData = {
    '@context': 'https://schema.org',
    '@type': type === 'website' ? 'WebSite' : type === 'organization' ? 'Organization' : 'Dataset',
    ...(type === 'website' && {
      name: 'Asia Bitcoin Treasuries',
      description: 'Track corporate Bitcoin holdings from HKEX-listed companies and Asian exchanges',
      url: baseUrl,
      author: {
        '@type': 'Organization',
        name: 'UTXO 210K',
      },
      publisher: {
        '@type': 'Organization',
        name: 'UTXO 210K',
      },
    }),
    ...(type === 'dataset' && {
      name: 'Asia Corporate Bitcoin Holdings',
      description: 'Comprehensive database of Bitcoin holdings by public companies in Asia',
      url: baseUrl,
      keywords: ['Bitcoin', 'Corporate Treasury', 'Asia', 'Hong Kong', 'HKEX'],
      license: 'https://creativecommons.org/licenses/by/4.0/',
      isAccessibleForFree: true,
    }),
    ...data,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(defaultData) }}
    />
  );
}

/**
 * BreadcrumbList structured data
 */
export function BreadcrumbStructuredData({ items }: { items: Array<{ name: string; url: string }> }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://asia-bitcoin-treasuries.vercel.app';
  
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

