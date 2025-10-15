import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://asia-bitcoin-treasuries.vercel.app';
  
  // Static pages with their priorities and change frequencies
  const staticPages = [
    {
      route: '',
      priority: 1.0,
      changeFrequency: 'daily' as const,
    },
    {
      route: '/methodology',
      priority: 0.8,
      changeFrequency: 'monthly' as const,
    },
    {
      route: '/regions',
      priority: 0.9,
      changeFrequency: 'weekly' as const,
    },
    {
      route: '/singapore',
      priority: 0.7,
      changeFrequency: 'daily' as const,
    },
    {
      route: '/japan',
      priority: 0.7,
      changeFrequency: 'daily' as const,
    },
    {
      route: '/south-korea',
      priority: 0.7,
      changeFrequency: 'daily' as const,
    },
    {
      route: '/thailand',
      priority: 0.7,
      changeFrequency: 'daily' as const,
    },
    {
      route: '/pipeline',
      priority: 0.6,
      changeFrequency: 'weekly' as const,
    },
  ];

  const routes = staticPages.map(({ route, priority, changeFrequency }) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency,
    priority,
  }));

  // TODO: Add dynamic company pages when implemented
  // Example:
  // const companies = await fetchCompanies();
  // const companyPages = companies.map((company) => ({
  //   url: `${baseUrl}/company/${company.slug}`,
  //   lastModified: company.updatedAt,
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.6,
  // }));
  // return [...routes, ...companyPages];

  return routes;
}

