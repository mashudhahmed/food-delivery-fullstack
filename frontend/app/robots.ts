import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/owner/',
        '/agent/',
        '/api/',
        '/login',
        '/register',
        '/reset-password',
        '/checkout',
      ],
    },
    sitemap: 'https://quickbite.com/sitemap.xml',
  };
}