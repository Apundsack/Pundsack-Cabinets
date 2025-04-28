const { SitemapStream, streamToPromise } = require('sitemap');
const { createGzip } = require('zlib');
const fs = require('fs');
const path = require('path');
const app = require('./app');

async function generateSitemap() {
  const links = [];

  function extractRoutes(middlewareStack, prefix = '') {
    middlewareStack.forEach(middleware => {
      if (middleware.route) {
        const routePath = prefix + middleware.route.path;
        // Skip parameterized routes (you might need more specific logic here)
        if (!routePath.includes('/:')) {
          let changefreq = 'weekly';
          let priority = 0.7;

          // Adjust changefreq/priority based on the route path (example)
          if (routePath === '/') {
            changefreq = 'daily';
            priority = 1.0;
          } else if (routePath.startsWith('/blog')) {
            changefreq = 'monthly';
            priority = 0.6;
          }

          links.push({ url: routePath, changefreq, priority });
        }
      } else if (middleware.handle && middleware.handle.stack) {
        let newPrefix = prefix;
        if (middleware.regexp) {
          const match = middleware.regexp.toString().match(/^\/\^(\/[^$]+?)\/\$/);
          if (match && match[1]) {
            newPrefix += match[1];
          } else if (middleware.path) {
            newPrefix += middleware.path;
          }
        }
        extractRoutes(middleware.handle.stack, newPrefix);
      } else if (middleware.path) {
        links.push({ url: prefix + middleware.path, changefreq: 'weekly', priority: 0.5 });
      }
    });
  }

  extractRoutes(app._router.stack);

  // Add specific static routes (you might not need these if your dynamic extraction is comprehensive)
  links.push(
    { url: '/gallery', changefreq: 'weekly', priority: 0.8 },
    { url: '/contact', changefreq: 'monthly', priority: 0.5 },
    { url: '/about', changefreq: 'monthly', priority: 0.7 }
  );

  const hostname = 'https://pundsackcabinets.com';
  const outputDir = path.join(__dirname, 'public');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const stream = new SitemapStream({ hostname });
  const pipeline = stream.pipe(createGzip()).pipe(fs.createWriteStream(path.join(outputDir, 'sitemap.xml.gz')));

  const uniqueLinks = Array.from(new Set(links.map(a => a.url)))
    .map(url => links.find(a => a.url === url))
    .filter(link => link.url !== '/sitemap.xml.gz'); // Exclude the sitemap itself

  uniqueLinks.forEach(link => stream.write(link));
  stream.end();

  try {
    await streamToPromise(stream);
    console.log('Sitemap generated successfully from routes!');
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }
}

generateSitemap();