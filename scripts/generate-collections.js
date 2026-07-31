#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const SITE_URL = 'https://axrnovi.github.io/wallpapers-archive';
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/axrnovi/axrnovi-wallpapers@main/';

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveUrl(relativePath) {
  return CDN_BASE + relativePath;
}

function optimizedUrl(url, width) {
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=75&output=webp`;
}

const KNOWN_BRAND_LABELS = { apple: 'Apple', google: 'Google', samsung: 'Samsung', xiaomi: 'Xiaomi' };
function getBrandLabel(brand) {
  if (!brand) return '';
  if (KNOWN_BRAND_LABELS[brand]) return KNOWN_BRAND_LABELS[brand];
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function parseDateSafe(dateStr) {
  const t = Date.parse(dateStr);
  return isNaN(t) ? 0 : t;
}

function getSimilarItems(item, allData, limit) {
  if (!item.brand) return [];
  const targetTime = parseDateSafe(item.date);
  return allData
    .filter((other) => other !== item && other.brand === item.brand)
    .sort((a, b) => Math.abs(parseDateSafe(a.date) - targetTime) - Math.abs(parseDateSafe(b.date) - targetTime))
    .slice(0, limit);
}

function renderSimilarCard(other) {
  const slug = slugify(other.title);
  const brandLabel = getBrandLabel(other.brand);
  const firstImage = (other.images && other.images[0]) ? resolveUrl(other.images[0]) : '';
  return `
        <a href="${slug}.html" class="wallpaper-card">
          <div class="card-media-wrapper">
            <div class="card-slider"><img src="${escapeHtml(optimizedUrl(firstImage, 500))}" class="active" loading="lazy" decoding="async" alt="${escapeHtml(other.title)} wallpaper preview"></div>
            <span class="badge">${escapeHtml(brandLabel)}</span>
          </div>
          <div class="card-info">
            <h3 class="card-title">${escapeHtml(other.title)}</h3>
          </div>
        </a>`;
}

function renderCollectionPage(item, slug, allData) {
  const title = escapeHtml(item.title);
  const brandLabel = getBrandLabel(item.brand);
  const pageTitle = `${item.title} Wallpapers — Stock Wallpapers Archive`;
  const description = `Download free ${item.title} stock wallpapers${brandLabel ? ` from ${brandLabel}` : ''}. Free, ad-free archive by @axrnovi.`;
  const pageUrl = `${SITE_URL}/collections/${slug}.html`;

  const itemsHtml = (item.images || []).map((relativePath, index) => {
    const imgUrl = resolveUrl(relativePath);
    const ext = relativePath.includes('.') ? relativePath.split('.').pop() : 'jpg';
    const filename = `${item.title}-${index + 1}.${ext}`;
    return `
        <div class="modal-item-wrapper">
          <img src="${escapeHtml(optimizedUrl(imgUrl, 600))}" alt="${title}" loading="lazy" decoding="async">
          <button type="button" class="download-single-btn" data-url="${escapeHtml(imgUrl)}" data-filename="${escapeHtml(filename)}">Download</button>
        </div>`;
  }).join('');

  const similarItems = getSimilarItems(item, allData, 4);
  const similarHtml = similarItems.map(renderSimilarCard).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <title>${pageTitle}</title>

  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet">

  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${SITE_URL}/pix/preview.png">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="description" content="${description}">

  <link rel="icon" type="image/svg+xml" href="../pix/icons/swaicon.svg">
  <link rel="alternate icon" type="image/png" href="../pix/icons/swaicon32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="../pix/icons/apple-touch-icon.png">

  <link rel="stylesheet" href="../style.css">
  <link rel="manifest" href="../manifest.json">

  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

  <script data-goatcounter="https://axrnovi.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
</head>
<body>

<div class="archive-wrapper">
  <div class="modal-inner modal-inner-wide">
    <div class="modal-header">
      <a href="../index.html" class="modal-back" aria-label="Back to all wallpapers">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="21" y1="12" x2="5" y2="12"></line>
          <polyline points="12 18 5 12 12 6"></polyline>
        </svg>
      </a>
      <span class="modal-header-spacer" aria-hidden="true"></span>
    </div>
    <div class="collection-hero">
      <h1 class="modal-title">${title}</h1>
      ${item.date ? `<div class="modal-date">${escapeHtml(item.date)}</div>` : ''}
      ${item.description ? `<p class="collection-description">${escapeHtml(item.description)}</p>` : ''}
      <button type="button" class="download-all-btn" id="downloadAllBtn">Download All</button>
    </div>
    <div class="modal-grid">${itemsHtml}
    </div>
    ${similarHtml ? `
    <h2 class="similar-heading">Similar Collections</h2>
    <div class="wallpaper-grid similar-grid">${similarHtml}
    </div>` : ''}
  </div>
</div>

<script src="../utils.js" defer></script>
<script>
  document.querySelectorAll('.download-single-btn').forEach((btn) => {
    btn.addEventListener('click', () => downloadImage(btn.dataset.url, btn.dataset.filename));
  });

  const collectionImages = ${JSON.stringify((item.images || []).map((relativePath) => resolveUrl(relativePath)))};
  document.getElementById('downloadAllBtn').addEventListener('click', () => {
    downloadCollection(collectionImages, ${JSON.stringify(item.title)});
  });
</script>

</body>
</html>
`;
}

function generateSitemap(items) {
  const urls = [
    `${SITE_URL}/`,
    `${SITE_URL}/about.html`,
    ...items.map((item) => `${SITE_URL}/collections/${slugify(item.title)}.html`)
  ];
  const body = urls.map((u) => `  <url>\n    <loc>${u}</loc>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function main() {
  const wallpapersPath = path.join(DOCS_DIR, 'wallpapers.json');
  const data = JSON.parse(fs.readFileSync(wallpapersPath, 'utf8'));

  const collectionsDir = path.join(DOCS_DIR, 'collections');
  fs.mkdirSync(collectionsDir, { recursive: true });

  const seenSlugs = new Set();

  data.forEach((item) => {
    const slug = slugify(item.title);
    if (seenSlugs.has(slug)) {
      console.warn(`Warning: duplicate slug "${slug}" for title "${item.title}" — this page will overwrite a previous one.`);
    }
    seenSlugs.add(slug);

    const html = renderCollectionPage(item, slug, data);
    fs.writeFileSync(path.join(collectionsDir, `${slug}.html`), html, 'utf8');
  });

  const sitemap = generateSitemap(data);
  fs.writeFileSync(path.join(DOCS_DIR, 'sitemap.xml'), sitemap, 'utf8');

  console.log(`Generated ${data.length} collection pages and updated sitemap.xml.`);
}

main();
