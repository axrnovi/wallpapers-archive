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

function getImageSrc(image) {
  return typeof image === 'object' ? image.src : image;
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
  const firstImage = (other.images && other.images[0]) ? resolveUrl(getImageSrc(other.images[0])) : '';
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

function getImageDevices(image) {
  if (typeof image === 'object' && Array.isArray(image.devices)) return image.devices;
  return ['phone'];
}

function renderImageCard(item, title, image, index, variant) {
  const relativePath = getImageSrc(image);
  const imgUrl = resolveUrl(relativePath);
  const ext = relativePath.includes('.') ? relativePath.split('.').pop() : 'jpg';
  const filename = `${item.title}-${index + 1}.${ext}`;
  const cls = variant === 'desktop' ? 'modal-item-wrapper desktop-item' : 'modal-item-wrapper';
  const width = variant === 'desktop' ? 800 : 600;
  return `
        <div class="${cls}">
          <img src="${escapeHtml(optimizedUrl(imgUrl, width))}" alt="${title}" loading="lazy" decoding="async">
          <button type="button" class="download-single-btn" data-url="${escapeHtml(imgUrl)}" data-filename="${escapeHtml(filename)}">
            <svg class="download-icon-arrow" viewBox="0 0 34 33" fill="none" aria-hidden="true"><path d="M32.5 29.5C33.3284 29.5 34 30.1716 34 31C33.9999 31.8284 33.3284 32.5 32.5 32.5H1.5C0.67161 32.5 6.08143e-05 31.8284 0 31C0 30.1716 0.671573 29.5 1.5 29.5H32.5ZM16.999 0C17.8275 0 18.499 0.671573 18.499 1.5V21.3789L25.4844 14.3936C26.0701 13.8078 27.0197 13.8078 27.6055 14.3936C28.1913 14.9793 28.1913 15.9289 27.6055 16.5146L18.0596 26.0605C17.4738 26.6463 16.5242 26.6463 15.9385 26.0605L6.39258 16.5146C5.80687 15.9289 5.80687 14.9793 6.39258 14.3936C6.97835 13.8078 7.92788 13.8078 8.51367 14.3936L15.499 21.3789V1.5C15.499 0.67161 16.1706 6.08143e-05 16.999 0Z" fill="currentColor"/></svg>
            <svg class="download-icon-spinner" viewBox="0 0 34 34" fill="none" aria-hidden="true"><path d="M9.22204 28.641C11.5243 30.1793 14.2314 31.0004 17.0004 31.0004L18.5002 31.0002C19.3287 31.0002 20.0004 31.6718 20.0004 32.5003C20.0004 33.3288 19.3288 34.0004 18.5003 34.0004H17.0004C13.6381 34.0004 10.3516 33.003 7.55602 31.1351C4.76044 29.2672 2.581 26.6125 1.2943 23.5062C0.00764072 20.3999 -0.329362 16.9816 0.326529 13.684C0.982478 10.3863 2.60236 7.35734 4.97985 4.97985C7.35734 2.60236 10.3863 0.982478 13.684 0.326529C16.9816 -0.329362 20.3999 0.00764048 23.5062 1.2943C26.6125 2.581 29.2672 4.76044 31.1351 7.55602C33.003 10.3516 34.0004 13.6381 34.0004 17.0004V18.5003C34.0004 19.3288 33.3288 20.0004 32.5003 20.0004C31.6718 20.0004 31.0002 19.3287 31.0002 18.5002L31.0004 17.0004C31.0004 14.4045 30.279 11.8631 28.9213 9.65856L28.641 9.22204C27.1026 6.91985 24.9159 5.12538 22.3578 4.06579C19.7997 3.00623 16.9846 2.72873 14.2689 3.26891C11.5532 3.80912 9.05886 5.14303 7.10094 7.10094L6.74157 7.47399C4.97966 9.37132 3.77538 11.7228 3.26891 14.2689C2.72873 16.9846 3.00623 19.7997 4.06579 22.3578C5.12538 24.9159 6.91985 27.1026 9.22204 28.641Z" fill="currentColor"/></svg>
            Download
          </button>
        </div>`;
}

function renderCollectionPage(item, slug, allData) {
  const title = escapeHtml(item.title);
  const brandLabel = getBrandLabel(item.brand);
  const pageTitle = `${item.title} Wallpapers — Stock Wallpapers Archive`;
  const description = `Download free ${item.title} stock wallpapers${brandLabel ? ` from ${brandLabel}` : ''}. Free, ad-free archive by @axrnovi.`;
  const pageUrl = `${SITE_URL}/collections/${slug}.html`;

  const allImages = item.images || [];
  const phoneImages = allImages.filter((img) => getImageDevices(img).includes('phone'));
  const desktopImages = allImages.filter((img) => getImageDevices(img).includes('desktop'));
  const hasBothSections = phoneImages.length > 0 && desktopImages.length > 0;

  const phoneItemsHtml = phoneImages.map((img, i) => renderImageCard(item, title, img, i, 'phone')).join('');
  const desktopItemsHtml = desktopImages.map((img, i) => renderImageCard(item, title, img, i, 'desktop')).join('');

  let itemsHtml;
  if (hasBothSections) {
    itemsHtml = `
    <div class="device-section-header" onclick="toggleDeviceSection('phone-section')">
      <svg class="device-section-icon" viewBox="0 0 28 46" fill="none" aria-hidden="true"><path d="M18.5996 0C19.6702 0 20.6542 -0.00233922 21.4717 0.0644531C22.2175 0.125401 23.0249 0.254767 23.832 0.600586L24.1777 0.762695L24.4219 0.893555C25.6273 1.56901 26.6081 2.58745 27.2373 3.82227C27.7066 4.74334 27.8659 5.67592 27.9355 6.52832C28.0023 7.34583 28 8.32979 28 9.40039V36.5996C28 37.6702 28.0023 38.6542 27.9355 39.4717C27.8659 40.3241 27.7066 41.2567 27.2373 42.1777C26.5662 43.4949 25.4949 44.5662 24.1777 45.2373C23.2567 45.7066 22.3241 45.8659 21.4717 45.9355C20.6542 46.0023 19.6702 46 18.5996 46H9.40039C8.32979 46 7.34583 46.0023 6.52832 45.9355C5.67592 45.8659 4.74333 45.7066 3.82227 45.2373C2.50514 44.5662 1.43381 43.4949 0.762695 42.1777C0.29345 41.2567 0.134109 40.3241 0.0644531 39.4717C-0.00233906 38.6542 0 37.6702 0 36.5996V9.40039C-1.52855e-08 8.32979 -0.00233986 7.34583 0.0644531 6.52832C0.13411 5.67592 0.293447 4.74334 0.762695 3.82227L0.893555 3.57812C1.56901 2.37273 2.58745 1.39187 3.82227 0.762695L4.16797 0.600586C4.97515 0.254765 5.78248 0.125402 6.52832 0.0644531C7.34583 -0.00233986 8.32979 -1.52856e-08 9.40039 0H18.5996ZM7.91602 3.00684C6.61608 3.02728 5.82525 3.10861 5.18359 3.43555C4.43109 3.81902 3.81902 4.43109 3.43555 5.18359C2.99957 6.03924 3 7.16019 3 9.40039V36.5996C3 38.8398 2.99958 39.9608 3.43555 40.8164C3.81901 41.5689 4.43109 42.181 5.18359 42.5645C5.82525 42.8914 6.61608 42.9727 7.91602 42.9932L9.40039 43H18.5996C20.6999 43 21.816 42.9999 22.6523 42.6406L22.8164 42.5645C23.4749 42.2289 24.0259 41.7183 24.4102 41.0918L24.5645 40.8164C25.0004 39.9608 25 38.8398 25 36.5996V9.40039C25 7.30007 24.9999 6.18397 24.6406 5.34766L24.5645 5.18359C24.181 4.43109 23.5689 3.81901 22.8164 3.43555C21.9608 2.99958 20.8398 3 18.5996 3H9.40039L7.91602 3.00684ZM17 40C17.5523 40 18 40.4477 18 41C18 41.5523 17.5523 42 17 42H11C10.4477 42 10 41.5523 10 41C10 40.4477 10.4477 40 11 40H17ZM16.5 5C17.3284 5 18 5.67157 18 6.5C18 7.32843 17.3284 8 16.5 8H11.5C10.6716 8 10 7.32843 10 6.5C10 5.67157 10.6716 5 11.5 5H16.5Z" fill="currentColor"/></svg>
      <span>For Smartphones</span>
      <svg id="chev-phone-section" class="device-section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </div>
    <div class="device-section-body" id="phone-section">
      <div class="device-section-inner">
        <div class="modal-grid">${phoneItemsHtml}</div>
      </div>
    </div>
    <div class="device-section-divider"></div>
    <div class="device-section-header" onclick="toggleDeviceSection('desktop-section')">
      <svg class="device-section-icon" viewBox="0 0 46 43" fill="none" aria-hidden="true"><path d="M36.5996 0C37.6702 0 38.6542 -0.00233906 39.4717 0.0644531C40.2175 0.125401 41.0249 0.254768 41.832 0.600586L42.1777 0.762695L42.4219 0.893555C43.6273 1.569 44.6081 2.58745 45.2373 3.82227C45.7066 4.74333 45.8659 5.67592 45.9355 6.52832C46.0023 7.34583 46 8.32979 46 9.40039V25.5996C46 26.6702 46.0023 27.6542 45.9355 28.4717C45.8659 29.3241 45.7066 30.2567 45.2373 31.1777C44.5662 32.4949 43.4949 33.5662 42.1777 34.2373C41.2567 34.7066 40.3241 34.8659 39.4717 34.9355C38.6542 35.0023 37.6702 35 36.5996 35H29V40H30.5C31.3284 40 32 40.6716 32 41.5C32 42.3284 31.3284 43 30.5 43H15.5C14.6716 43 14 42.3284 14 41.5C14 40.6716 14.6716 40 15.5 40H17V35H9.40039C8.32979 35 7.34583 35.0023 6.52832 34.9355C5.67592 34.8659 4.74333 34.7066 3.82227 34.2373C2.50514 33.5662 1.43381 32.4949 0.762695 31.1777C0.29345 30.2567 0.134109 29.3241 0.0644531 28.4717C-0.00233922 27.6542 0 26.6702 0 25.5996V9.40039C-1.52855e-08 8.32979 -0.00233986 7.34583 0.0644531 6.52832C0.13411 5.67592 0.293447 4.74334 0.762695 3.82227L0.893555 3.57812C1.56901 2.37273 2.58745 1.39187 3.82227 0.762695L4.16797 0.600586C4.97515 0.254765 5.78248 0.125402 6.52832 0.0644531C7.34583 -0.00233986 8.32979 -1.52856e-08 9.40039 0H36.5996ZM20 40H26V35H20V40ZM7.91602 3.00684C6.61608 3.02728 5.82525 3.10861 5.18359 3.43555C4.43109 3.81902 3.81902 4.43109 3.43555 5.18359C2.99957 6.03924 3 7.16019 3 9.40039V25.5996C3 27.8398 2.99958 28.9608 3.43555 29.8164C3.81901 30.5689 4.43109 31.181 5.18359 31.5645C5.82525 31.8914 6.61608 31.9727 7.91602 31.9932L9.40039 32H36.5996C38.6999 32 39.816 31.9999 40.6523 31.6406L40.8164 31.5645C41.4749 31.2289 42.0259 30.7183 42.4102 30.0918L42.5645 29.8164C43.0004 28.9608 43 27.8398 43 25.5996V9.40039C43 7.30007 42.9999 6.18397 42.6406 5.34766L42.5645 5.18359C42.181 4.43109 41.5689 3.81901 40.8164 3.43555C39.9608 2.99958 38.8398 3 36.5996 3H9.40039L7.91602 3.00684Z" fill="currentColor"/></svg>
      <span>For Desktops</span>
      <svg id="chev-desktop-section" class="device-section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </div>
    <div class="device-section-body" id="desktop-section">
      <div class="device-section-inner">
        <div class="modal-grid desktop-grid">${desktopItemsHtml}</div>
      </div>
    </div>
    <script>
    (function() {
      var saved = sessionStorage.getItem('deviceFilter') || 'all';
      var openId = saved === 'desktop' ? 'desktop-section' : 'phone-section';
      var body = document.getElementById(openId);
      var chev = document.getElementById('chev-' + openId);
      if (body) body.classList.add('open');
      if (chev) chev.classList.add('open');
    })();
    </script>`;
  } else if (desktopImages.length > 0) {
    itemsHtml = `
    <div class="device-section-header static">
      <svg class="device-section-icon" viewBox="0 0 46 43" fill="none" aria-hidden="true"><path d="M36.5996 0C37.6702 0 38.6542 -0.00233906 39.4717 0.0644531C40.2175 0.125401 41.0249 0.254768 41.832 0.600586L42.1777 0.762695L42.4219 0.893555C43.6273 1.569 44.6081 2.58745 45.2373 3.82227C45.7066 4.74333 45.8659 5.67592 45.9355 6.52832C46.0023 7.34583 46 8.32979 46 9.40039V25.5996C46 26.6702 46.0023 27.6542 45.9355 28.4717C45.8659 29.3241 45.7066 30.2567 45.2373 31.1777C44.5662 32.4949 43.4949 33.5662 42.1777 34.2373C41.2567 34.7066 40.3241 34.8659 39.4717 34.9355C38.6542 35.0023 37.6702 35 36.5996 35H29V40H30.5C31.3284 40 32 40.6716 32 41.5C32 42.3284 31.3284 43 30.5 43H15.5C14.6716 43 14 42.3284 14 41.5C14 40.6716 14.6716 40 15.5 40H17V35H9.40039C8.32979 35 7.34583 35.0023 6.52832 34.9355C5.67592 34.8659 4.74333 34.7066 3.82227 34.2373C2.50514 33.5662 1.43381 32.4949 0.762695 31.1777C0.29345 30.2567 0.134109 29.3241 0.0644531 28.4717C-0.00233922 27.6542 0 26.6702 0 25.5996V9.40039C-1.52855e-08 8.32979 -0.00233986 7.34583 0.0644531 6.52832C0.13411 5.67592 0.293447 4.74334 0.762695 3.82227L0.893555 3.57812C1.56901 2.37273 2.58745 1.39187 3.82227 0.762695L4.16797 0.600586C4.97515 0.254765 5.78248 0.125402 6.52832 0.0644531C7.34583 -0.00233986 8.32979 -1.52856e-08 9.40039 0H36.5996ZM20 40H26V35H20V40ZM7.91602 3.00684C6.61608 3.02728 5.82525 3.10861 5.18359 3.43555C4.43109 3.81902 3.81902 4.43109 3.43555 5.18359C2.99957 6.03924 3 7.16019 3 9.40039V25.5996C3 27.8398 2.99958 28.9608 3.43555 29.8164C3.81901 30.5689 4.43109 31.181 5.18359 31.5645C5.82525 31.8914 6.61608 31.9727 7.91602 31.9932L9.40039 32H36.5996C38.6999 32 39.816 31.9999 40.6523 31.6406L40.8164 31.5645C41.4749 31.2289 42.0259 30.7183 42.4102 30.0918L42.5645 29.8164C43.0004 28.9608 43 27.8398 43 25.5996V9.40039C43 7.30007 42.9999 6.18397 42.6406 5.34766L42.5645 5.18359C42.181 4.43109 41.5689 3.81901 40.8164 3.43555C39.9608 2.99958 38.8398 3 36.5996 3H9.40039L7.91602 3.00684Z" fill="currentColor"/></svg>
      <span>For Desktops</span>
    </div>
    <div class="modal-grid desktop-grid">${desktopItemsHtml}</div>`;
  } else {
    itemsHtml = `
    <div class="device-section-header static">
      <svg class="device-section-icon" viewBox="0 0 28 46" fill="none" aria-hidden="true"><path d="M18.5996 0C19.6702 0 20.6542 -0.00233922 21.4717 0.0644531C22.2175 0.125401 23.0249 0.254767 23.832 0.600586L24.1777 0.762695L24.4219 0.893555C25.6273 1.56901 26.6081 2.58745 27.2373 3.82227C27.7066 4.74334 27.8659 5.67592 27.9355 6.52832C28.0023 7.34583 28 8.32979 28 9.40039V36.5996C28 37.6702 28.0023 38.6542 27.9355 39.4717C27.8659 40.3241 27.7066 41.2567 27.2373 42.1777C26.5662 43.4949 25.4949 44.5662 24.1777 45.2373C23.2567 45.7066 22.3241 45.8659 21.4717 45.9355C20.6542 46.0023 19.6702 46 18.5996 46H9.40039C8.32979 46 7.34583 46.0023 6.52832 45.9355C5.67592 45.8659 4.74333 45.7066 3.82227 45.2373C2.50514 44.5662 1.43381 43.4949 0.762695 42.1777C0.29345 41.2567 0.134109 40.3241 0.0644531 39.4717C-0.00233906 38.6542 0 37.6702 0 36.5996V9.40039C-1.52855e-08 8.32979 -0.00233986 7.34583 0.0644531 6.52832C0.13411 5.67592 0.293447 4.74334 0.762695 3.82227L0.893555 3.57812C1.56901 2.37273 2.58745 1.39187 3.82227 0.762695L4.16797 0.600586C4.97515 0.254765 5.78248 0.125402 6.52832 0.0644531C7.34583 -0.00233986 8.32979 -1.52856e-08 9.40039 0H18.5996ZM7.91602 3.00684C6.61608 3.02728 5.82525 3.10861 5.18359 3.43555C4.43109 3.81902 3.81902 4.43109 3.43555 5.18359C2.99957 6.03924 3 7.16019 3 9.40039V36.5996C3 38.8398 2.99958 39.9608 3.43555 40.8164C3.81901 41.5689 4.43109 42.181 5.18359 42.5645C5.82525 42.8914 6.61608 42.9727 7.91602 42.9932L9.40039 43H18.5996C20.6999 43 21.816 42.9999 22.6523 42.6406L22.8164 42.5645C23.4749 42.2289 24.0259 41.7183 24.4102 41.0918L24.5645 40.8164C25.0004 39.9608 25 38.8398 25 36.5996V9.40039C25 7.30007 24.9999 6.18397 24.6406 5.34766L24.5645 5.18359C24.181 4.43109 23.5689 3.81901 22.8164 3.43555C21.9608 2.99958 20.8398 3 18.5996 3H9.40039L7.91602 3.00684ZM17 40C17.5523 40 18 40.4477 18 41C18 41.5523 17.5523 42 17 42H11C10.4477 42 10 41.5523 10 41C10 40.4477 10.4477 40 11 40H17ZM16.5 5C17.3284 5 18 5.67157 18 6.5C18 7.32843 17.3284 8 16.5 8H11.5C10.6716 8 10 7.32843 10 6.5C10 5.67157 10.6716 5 11.5 5H16.5Z" fill="currentColor"/></svg>
      <span>For Smartphones</span>
    </div>
    <div class="modal-grid">${phoneItemsHtml}</div>`;
  }

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
  <link rel="canonical" href="${pageUrl}">

  <script data-goatcounter="https://axrnovi.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
</head>
<body>

<div class="archive-wrapper">
  <div class="modal-inner modal-inner-wide">
    <div class="modal-header modal-header-crumbs-only">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="../index.html" class="breadcrumbs-home">
        <svg class="breadcrumbs-home-icon" viewBox="0 0 45 44" fill="none" aria-hidden="true"><path d="M20.7715 0.205078C21.8747 -0.0676379 23.0286 -0.0676142 24.1318 0.205078C25.5097 0.545812 26.6925 1.4238 27.8047 2.19434L41.6025 11.7539C42.1918 12.1621 42.7918 12.5748 43.2373 12.9404C43.4672 13.1291 43.7622 13.389 44.0303 13.7139C44.2954 14.0353 44.6643 14.5748 44.8193 15.3232C45.0996 16.6766 44.6613 18.0793 43.6602 19.0322C43.1065 19.559 42.4957 19.7921 42.0947 19.9053C41.6896 20.0196 41.2993 20.0667 41.0029 20.0908C40.5535 20.1274 40.0098 20.1309 39.4512 20.1318V33.7344C39.4512 34.8048 39.4535 35.789 39.3867 36.6064C39.3171 37.4588 39.1576 38.3915 38.6885 39.3125C38.0174 40.6296 36.946 41.701 35.6289 42.3721C34.7078 42.8413 33.7753 43.0007 32.9229 43.0703C32.1054 43.1371 31.1213 43.1348 30.0508 43.1348H14.8516C13.781 43.1348 12.797 43.1371 11.9795 43.0703C11.1271 43.0006 10.1944 42.8413 9.27344 42.3721C7.95643 41.7009 6.88493 40.6295 6.21387 39.3125C5.74477 38.3916 5.58527 37.4587 5.51562 36.6064C5.44887 35.789 5.45117 34.8048 5.45117 33.7344V20.1318C4.89297 20.1309 4.34951 20.1274 3.90039 20.0908C3.604 20.0667 3.2138 20.0196 2.80859 19.9053C2.40753 19.7921 1.79598 19.5593 1.24219 19.0322C0.241199 18.0794 -0.197181 16.6765 0.0830078 15.3232L0.150391 15.0527C0.32856 14.4435 0.640976 13.9952 0.873047 13.7139C1.14092 13.3892 1.43519 13.1291 1.66504 12.9404C2.11045 12.5749 2.71068 12.1621 3.2998 11.7539L17.0986 2.19434C18.2108 1.42379 19.3936 0.545806 20.7715 0.205078ZM8.45117 33.7344C8.45117 35.9742 8.45095 37.0956 8.88672 37.9512C9.27014 38.7036 9.88239 39.3157 10.6348 39.6992C11.2764 40.0261 12.0673 40.1075 13.3672 40.1279L14.8516 40.1348H30.0508C32.1511 40.1348 33.2672 40.1347 34.1035 39.7754L34.2676 39.6992C34.926 39.3637 35.477 38.853 35.8613 38.2266L36.0156 37.9512C36.4515 37.0956 36.4512 35.9743 36.4512 33.7344V20.1348H8.45117V33.7344ZM23.4111 3.11816C22.7808 2.9624 22.1216 2.96233 21.4912 3.11816L21.2246 3.19727C20.603 3.41513 19.9561 3.86382 18.8066 4.66016L5.00879 14.2197C3.7382 15.1 3.10181 15.5402 3.02051 15.9316C2.95051 16.2699 3.06038 16.6212 3.31055 16.8594C3.60019 17.1349 4.37397 17.1348 5.91992 17.1348H38.9834C40.4329 17.1348 41.203 17.1344 41.5322 16.9072L41.5918 16.8594C41.8421 16.6212 41.9519 16.27 41.8818 15.9316C41.8005 15.5402 41.165 15.1 39.8945 14.2197L26.0957 4.66016C24.9461 3.86367 24.2995 3.41501 23.6777 3.19727L23.4111 3.11816Z" fill="currentColor"/></svg>
        Home
      </a>
      <span class="breadcrumbs-sep" aria-hidden="true">/</span>
      ${item.brand ? `<a href="../index.html?brand=${encodeURIComponent(item.brand)}">${escapeHtml(getBrandLabel(item.brand))}</a>
      <span class="breadcrumbs-sep" aria-hidden="true">/</span>
      ` : ''}<span class="breadcrumbs-current">${title}</span>
      </nav>
    </div>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": "${SITE_URL}/"}${item.brand ? `,
        {"@type": "ListItem", "position": 2, "name": ${JSON.stringify(getBrandLabel(item.brand))}, "item": "${SITE_URL}/?brand=${encodeURIComponent(item.brand)}"},
        {"@type": "ListItem", "position": 3, "name": ${JSON.stringify(item.title)}, "item": "${pageUrl}"}` : `,
        {"@type": "ListItem", "position": 2, "name": ${JSON.stringify(item.title)}, "item": "${pageUrl}"}`}
      ]
    }
    </script>
    <div class="collection-hero">
      <h1 class="modal-title">${title}</h1>
      ${item.date ? `<div class="modal-date">${escapeHtml(item.date)}</div>` : ''}
      ${item.description ? `<p class="collection-description">${escapeHtml(item.description)}</p>` : ''}
      <button type="button" class="download-all-btn" id="downloadAllBtn">
        <svg class="download-icon-arrow" viewBox="0 0 34 33" fill="none" aria-hidden="true"><path d="M32.5 29.5C33.3284 29.5 34 30.1716 34 31C33.9999 31.8284 33.3284 32.5 32.5 32.5H1.5C0.67161 32.5 6.08143e-05 31.8284 0 31C0 30.1716 0.671573 29.5 1.5 29.5H32.5ZM16.999 0C17.8275 0 18.499 0.671573 18.499 1.5V21.3789L25.4844 14.3936C26.0701 13.8078 27.0197 13.8078 27.6055 14.3936C28.1913 14.9793 28.1913 15.9289 27.6055 16.5146L18.0596 26.0605C17.4738 26.6463 16.5242 26.6463 15.9385 26.0605L6.39258 16.5146C5.80687 15.9289 5.80687 14.9793 6.39258 14.3936C6.97835 13.8078 7.92788 13.8078 8.51367 14.3936L15.499 21.3789V1.5C15.499 0.67161 16.1706 6.08143e-05 16.999 0Z" fill="currentColor"/></svg>
        <svg class="download-icon-spinner" viewBox="0 0 34 34" fill="none" aria-hidden="true"><path d="M9.22204 28.641C11.5243 30.1793 14.2314 31.0004 17.0004 31.0004L18.5002 31.0002C19.3287 31.0002 20.0004 31.6718 20.0004 32.5003C20.0004 33.3288 19.3288 34.0004 18.5003 34.0004H17.0004C13.6381 34.0004 10.3516 33.003 7.55602 31.1351C4.76044 29.2672 2.581 26.6125 1.2943 23.5062C0.00764072 20.3999 -0.329362 16.9816 0.326529 13.684C0.982478 10.3863 2.60236 7.35734 4.97985 4.97985C7.35734 2.60236 10.3863 0.982478 13.684 0.326529C16.9816 -0.329362 20.3999 0.00764048 23.5062 1.2943C26.6125 2.581 29.2672 4.76044 31.1351 7.55602C33.003 10.3516 34.0004 13.6381 34.0004 17.0004V18.5003C34.0004 19.3288 33.3288 20.0004 32.5003 20.0004C31.6718 20.0004 31.0002 19.3287 31.0002 18.5002L31.0004 17.0004C31.0004 14.4045 30.279 11.8631 28.9213 9.65856L28.641 9.22204C27.1026 6.91985 24.9159 5.12538 22.3578 4.06579C19.7997 3.00623 16.9846 2.72873 14.2689 3.26891C11.5532 3.80912 9.05886 5.14303 7.10094 7.10094L6.74157 7.47399C4.97966 9.37132 3.77538 11.7228 3.26891 14.2689C2.72873 16.9846 3.00623 19.7997 4.06579 22.3578C5.12538 24.9159 6.91985 27.1026 9.22204 28.641Z" fill="currentColor"/></svg>
        Download All
      </button>
    </div>
    ${itemsHtml}
    ${similarHtml ? `
    <h2 class="similar-heading">Similar Collections</h2>
    <div class="wallpaper-grid similar-grid">${similarHtml}
    </div>` : ''}
  </div>
</div>

<footer class="site-footer">
  <div class="footer-content">
    <p class="footer-text">This is a completely free, ad-free project. Donations are entirely optional but deeply appreciated. They help me maintain this site and bring new ideas to life.<br>Thanks for your support! ✨</p>
    <a href="https://ko-fi.com/axrnovi" target="_blank" rel="noopener noreferrer" class="btn donate-btn">
    <svg role="img" class="btn-icon" width="18" height="18" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Ko-fi</title><path d="M11.351 2.715c-2.7 0-4.986.025-6.83.26C2.078 3.285 0 5.154 0 8.61c0 3.506.182 6.13 1.585 8.493 1.584 2.701 4.233 4.182 7.662 4.182h.83c4.209 0 6.494-2.234 7.637-4a9.5 9.5 0 0 0 1.091-2.338C21.792 14.688 24 12.22 24 9.208v-.415c0-3.247-2.13-5.507-5.792-5.87-1.558-.156-2.65-.208-6.857-.208m0 1.947c4.208 0 5.09.052 6.571.182 2.624.311 4.13 1.584 4.13 4v.39c0 2.156-1.792 3.844-3.87 3.844h-.935l-.156.649c-.208 1.013-.597 1.818-1.039 2.546-.909 1.428-2.545 3.064-5.922 3.064h-.805c-2.571 0-4.831-.883-6.078-3.195-1.09-2-1.298-4.155-1.298-7.506 0-2.181.857-3.402 3.012-3.714 1.533-.233 3.559-.26 6.39-.26m6.547 2.287c-.416 0-.65.234-.65.546v2.935c0 .311.234.545.65.545 1.324 0 2.051-.754 2.051-2s-.727-2.026-2.052-2.026m-10.39.182c-1.818 0-3.013 1.48-3.013 3.142 0 1.533.858 2.857 1.949 3.897.727.701 1.87 1.429 2.649 1.896a1.47 1.47 0 0 0 1.507 0c.78-.467 1.922-1.195 2.623-1.896 1.117-1.039 1.974-2.364 1.974-3.897 0-1.662-1.247-3.142-3.039-3.142-1.065 0-1.792.545-2.338 1.298-.493-.753-1.246-1.298-2.312-1.298"/></svg>
    Donate
    </a>
  </div>
</footer>
<div class="footer-secondary-links">
    <a href="https://axrnovi.github.io" target="_blank" rel="noopener noreferrer" class="footer-secondary-link">
      <svg role="img" width="15" height="15" fill="currentColor" viewBox="0 0 426 407" xmlns="http://www.w3.org/2000/svg"><title>Premium Walls</title><path d="M201.443 8.29159C205.035 -2.76414 220.676 -2.76413 224.268 8.2916L266.29 137.621C267.896 142.565 272.504 145.913 277.702 145.913H413.687C425.312 145.913 430.145 160.788 420.741 167.621L310.727 247.551C306.521 250.607 304.761 256.023 306.367 260.967L348.389 390.297C351.981 401.352 339.328 410.546 329.923 403.713L219.909 323.783C215.703 320.727 210.008 320.727 205.802 323.783L95.7879 403.713C86.3834 410.546 73.7296 401.352 77.3218 390.297L119.343 260.967C120.95 256.023 119.19 250.607 114.984 247.551L4.97011 167.621C-4.43446 160.788 0.398866 145.913 12.0235 145.913H148.008C153.207 145.913 157.815 142.565 159.421 137.621L201.443 8.29159Z"/></svg>
      My other projects
    </a>
    <span class="footer-secondary-sep" aria-hidden="true">|</span>
    <a href="https://www.threads.net/@axrnovi" target="_blank" rel="noopener noreferrer" class="footer-secondary-link">
      <svg role="img" width="15" height="15" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Threads</title><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"/></svg>
      Threads
    </a>
</div>

<script src="../utils.js" defer></script>
<script>
  document.querySelectorAll('.download-single-btn').forEach((btn) => {
    btn.addEventListener('click', () => downloadImage(btn.dataset.url, btn.dataset.filename, btn));
  });

  const collectionImages = ${JSON.stringify((item.images || []).map((image) => resolveUrl(getImageSrc(image))))};
  document.getElementById('downloadAllBtn').addEventListener('click', (e) => {
    downloadCollection(collectionImages, ${JSON.stringify(item.title)}, e.currentTarget);
  });
</script>

</body>
</html>
`;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function generateSitemap(items) {
  const staticUrls = [`${SITE_URL}/`, `${SITE_URL}/about.html`];
  const staticBlocks = staticUrls.map((u) => `  <url>\n    <loc>${escapeXml(u)}</loc>\n  </url>`);

  const collectionBlocks = items.map((item) => {
    const slug = slugify(item.title);
    const pageUrl = `${SITE_URL}/collections/${slug}.html`;
    const imageBlocks = (item.images || []).map((image) => {
      const imgUrl = resolveUrl(getImageSrc(image));
      return `    <image:image>\n      <image:loc>${escapeXml(imgUrl)}</image:loc>\n    </image:image>`;
    }).join('\n');
    return `  <url>\n    <loc>${escapeXml(pageUrl)}</loc>\n${imageBlocks}\n  </url>`;
  });

  const body = [...staticBlocks, ...collectionBlocks].join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`;
}

function generateFeed(items) {
  const sorted = [...items].sort((a, b) => parseDateSafe(b.date) - parseDateSafe(a.date));

  const itemBlocks = sorted.map((item) => {
    const slug = slugify(item.title);
    const pageUrl = `${SITE_URL}/collections/${slug}.html`;
    const description = item.description || `${item.title} wallpapers${item.brand ? ` — ${getBrandLabel(item.brand)}` : ''}`;
    const pubDate = parseDateSafe(item.date) ? new Date(parseDateSafe(item.date)).toUTCString() : '';

    return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(pageUrl)}</link>
      <guid isPermaLink="true">${escapeXml(pageUrl)}</guid>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
      <description>${escapeXml(description)}</description>
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Stock Wallpapers Archive</title>
    <link>${SITE_URL}/</link>
    <description>A free, ad-free archive of stock wallpapers from iPhone, Google, Samsung, Xiaomi and more.</description>
${itemBlocks}
  </channel>
</rss>
`;
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

  const feed = generateFeed(data);
  fs.writeFileSync(path.join(DOCS_DIR, 'feed.xml'), feed, 'utf8');

  console.log(`Generated ${data.length} collection pages, updated sitemap.xml and feed.xml.`);
}

main();
