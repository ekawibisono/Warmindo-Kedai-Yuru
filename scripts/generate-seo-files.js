// scripts/generate-seo-files.js
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://kedaiyuru.click';
const OUTPUT_DIR = path.join(__dirname, '../public');

// =============================================
// 1. GENERATE SITEMAP.XML
// =============================================
async function generateSitemap() {
  const links = [
    { url: '/', changefreq: 'daily', priority: 1.0, lastmod: new Date().toISOString() },
    { url: '/menu', changefreq: 'daily', priority: 0.9, lastmod: new Date().toISOString() },
    { url: '/track', changefreq: 'weekly', priority: 0.7, lastmod: new Date().toISOString() },
  ];

  const stream = new SitemapStream({ hostname: DOMAIN });

  const data = await streamToPromise(Readable.from(links).pipe(stream));
  const sitemapPath = path.join(OUTPUT_DIR, 'sitemap.xml');
  
  fs.writeFileSync(sitemapPath, data.toString());
  console.log('✅ sitemap.xml generated');
}

// =============================================
// 2. GENERATE ROBOTS.TXT
// =============================================
function generateRobotsTxt() {
  const content = `# Kedai Yuru - Robots.txt
# ${DOMAIN}

User-agent: *
Allow: /
Allow: /menu
Allow: /track
Disallow: /admin/
Disallow: /login

# Sitemap
Sitemap: ${DOMAIN}/sitemap.xml

# Crawl-delay
Crawl-delay: 10
`;

  const robotsPath = path.join(OUTPUT_DIR, 'robots.txt');
  fs.writeFileSync(robotsPath, content);
  console.log('✅ robots.txt generated');
}

// =============================================
// 3. GENERATE MANIFEST.JSON
// =============================================
function generateManifest() {
  const manifest = {
    short_name: 'Kedai Yuru',
    name: 'Kedai Yuru - Pesan Makanan Online',
    description: 'Pesan makanan dan minuman favorit Anda secara online. Layanan delivery dan pickup tersedia.',
    icons: [
      {
        src: 'favicon.ico',
        sizes: '64x64 32x32 24x24 16x16',
        type: 'image/x-icon',
      },
      {
        src: 'logo192.png',
        type: 'image/png',
        sizes: '192x192',
      },
      {
        src: 'logo512.png',
        type: 'image/png',
        sizes: '512x512',
      },
    ],
    start_url: '.',
    display: 'standalone',
    theme_color: '#0ea5e9',
    background_color: '#ffffff',
    orientation: 'portrait-primary',
    scope: '/',
    categories: ['food', 'restaurant', 'shopping'],
  };

  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ manifest.json generated');
}

// =============================================
// RUN ALL
// =============================================
async function main() {
  console.log('🚀 Generating SEO files...\n');
  
  try {
    await generateSitemap();
    generateRobotsTxt();
    generateManifest();
    
    console.log('\n✅ All SEO files generated successfully!');
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('❌ Error generating SEO files:', error);
    process.exit(1);
  }
}

main();
