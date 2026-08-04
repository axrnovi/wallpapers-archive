let wallpaperData = [];
const urlBrandParam = new URLSearchParams(window.location.search).get('brand');
let currentFilter = urlBrandParam || sessionStorage.getItem('brandFilter') || 'all';
if (urlBrandParam) {
  sessionStorage.setItem('brandFilter', urlBrandParam);
}
let currentDeviceFilter = sessionStorage.getItem('deviceFilter') || 'all';
let searchQuery = '';
let isInitialRender = true;
const PRIORITY_COUNT = 4;

const DESKTOP_BREAKPOINT = 768;
const ROWS_PER_PAGE = 10;

function computeColumns() {
  return window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches ? 3 : 2;
}

let COLUMNS = computeColumns();
let PAGE_SIZE = ROWS_PER_PAGE * COLUMNS;
let visibleCount = PAGE_SIZE;

const KNOWN_BRAND_LABELS = {
  apple: 'Apple',
  google: 'Google',
  samsung: 'Samsung',
  xiaomi: 'Xiaomi'
};
const PREFERRED_BRAND_ORDER = ['apple', 'google', 'samsung', 'xiaomi', 'huawei'];

function getBrandLabel(brand) {
  if (!brand) return '';
  if (KNOWN_BRAND_LABELS[brand]) return KNOWN_BRAND_LABELS[brand];
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getImageSrc(image) {
  return typeof image === 'object' ? image.src : image;
}

function getImageDevices(image) {
  if (typeof image === 'object' && Array.isArray(image.devices)) return image.devices;
  return ['phone'];
}

function getPreviewImages(item, deviceFilter) {
  if (item.previews && item.previews.length > 0) {
    return item.previews.map(resolveUrl);
  }
  let images = item.images || [];
  if (deviceFilter === 'phone' || deviceFilter === 'desktop' || deviceFilter === 'tablet') {
    const filtered = images.filter((img) => getImageDevices(img).includes(deviceFilter));
    if (filtered.length > 0) images = filtered;
  }
  return images.slice(0, 1).map(getImageSrc).map(resolveUrl);
}

function renderLoadingState() {
  const grid = document.getElementById('wallpaperGrid');
  grid.innerHTML = `
    <div class="state-message">
      <p class="state-text">Loading wallpapers…</p>
    </div>
  `;
}

function renderErrorState() {
  const grid = document.getElementById('wallpaperGrid');
  grid.innerHTML = `
    <div class="state-message">
      <p class="state-text">Couldn't load the wallpaper catalog. Please check your connection and try again.</p>
      <button type="button" class="btn state-retry-btn" onclick="retryLoad()">Retry</button>
    </div>
  `;
  updateLoadMoreButton(0);
}

function renderEmptyState(grid) {
  const wrapper = document.createElement('div');
  wrapper.className = 'state-message';

  if (searchQuery) {
    wrapper.innerHTML = `<p class="state-text">No results found for "${escapeHtml(searchQuery)}".</p>`;
  } else {
    wrapper.innerHTML = `<p class="state-text">No wallpapers found in this category.</p>`;
  }

  grid.appendChild(wrapper);
}

async function loadWallpaperData() {
  renderLoadingState();
  try {
    const response = await fetch('wallpapers.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    wallpaperData = await response.json();
    renderCollectionStats();
    renderFilters();
    renderGrid();
  } catch (error) {
    console.error("Error loading wallpaper database:", error);
    renderErrorState();
  }
}

function renderCollectionStats() {
  const statsEl = document.getElementById('collectionStats');
  if (!statsEl) return;
  const totalCollections = wallpaperData.length;
  const totalImages = wallpaperData.reduce((sum, item) => sum + (item.images ? item.images.length : 0), 0);
  statsEl.textContent = `${totalImages.toLocaleString('en-US')} wallpapers · ${totalCollections} collections`;
}

function retryLoad() {
  loadWallpaperData();
}

function renderFilters() {
  const filterContainer = document.getElementById('filterContainer');

  const presentBrands = [...new Set(wallpaperData.map(item => item.brand).filter(Boolean))];

  presentBrands.sort((a, b) => {
    const ai = PREFERRED_BRAND_ORDER.indexOf(a);
    const bi = PREFERRED_BRAND_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  filterContainer.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = currentFilter === 'all' ? 'filter-btn active' : 'filter-btn';
  allBtn.textContent = 'All';
  allBtn.onclick = () => filterBrand('all', allBtn);
  filterContainer.appendChild(allBtn);

  presentBrands.forEach((brand) => {
    const btn = document.createElement('button');
    btn.className = brand === currentFilter ? 'filter-btn active' : 'filter-btn';
    btn.textContent = getBrandLabel(brand);
    btn.onclick = () => filterBrand(brand, btn);
    filterContainer.appendChild(btn);
  });

  updateFilterFade();
}

const FILTER_FADE_MAX = 56;

function updateFilterFade() {
  const container = document.getElementById('filterContainer');
  const wrapper = document.getElementById('filterScrollWrapper');
  if (!container || !wrapper) return;

  const scrollLeft = container.scrollLeft;
  const maxScrollLeft = container.scrollWidth - container.clientWidth;

  const leftWidth = Math.max(0, Math.min(FILTER_FADE_MAX, scrollLeft));
  const rightRemaining = Math.max(0, maxScrollLeft - scrollLeft);
  const rightWidth = Math.max(0, Math.min(FILTER_FADE_MAX, rightRemaining));

  wrapper.style.setProperty('--fade-left-w', `${leftWidth}px`);
  wrapper.style.setProperty('--fade-right-w', `${rightWidth}px`);
}

function itemMatchesSearch(item, query) {
  const brandLabel = getBrandLabel(item.brand);
  const haystack = `${item.title || ''} ${brandLabel}`.toLowerCase();
  const queryWords = query.split(/\s+/).filter(Boolean);
  return queryWords.every((word) => haystack.includes(word));
}

function itemMatchesDevice(item, device) {
  if (device === 'all') return true;
  if (!item.images || item.images.length === 0) return true;
  const hasDeviceInfo = item.images.some((img) => typeof img === 'object' && img.devices);
  if (!hasDeviceInfo) return true;
  return item.images.some((img) => typeof img === 'object' && Array.isArray(img.devices) && img.devices.includes(device));
}

function parseDateSafe(dateStr) {
  const t = Date.parse(dateStr);
  return isNaN(t) ? 0 : t;
}

function getSortPriority(title) {
  if (title.startsWith('iOS ')) return 0;
  if (title.startsWith('iPadOS ')) return 1;
  if (title.startsWith('macOS ') || title.startsWith('Mac OS X ') || title.startsWith('OS X ')) return 2;
  return 3;
}

function getFilteredData() {
  return wallpaperData
    .filter((item) => {
      if (!itemMatchesDevice(item, currentDeviceFilter)) return false;
      if (searchQuery) {
        return itemMatchesSearch(item, searchQuery);
      }
      return currentFilter === 'all' || item.brand === currentFilter;
    })
    .sort((a, b) => {
      const dateDiff = parseDateSafe(b.date) - parseDateSafe(a.date);
      if (dateDiff !== 0) return dateDiff;
      return getSortPriority(a.title) - getSortPriority(b.title);
    });
}

function createWallpaperCard(item, isPriority) {
  const card = document.createElement('a');
  card.className = 'wallpaper-card';
  card.href = `collections/${slugify(item.title)}.html`;

  const previewImages = getPreviewImages(item, currentDeviceFilter);
  const singleImg = previewImages.length > 0 ? previewImages[0] : '';
  let mediaHtml = '<div class="card-media-wrapper">';
  if (isPriority) {
    mediaHtml += `<img src="${optimizedUrl(singleImg, 24)}" class="card-preview-blur" aria-hidden="true">`;
    mediaHtml += `<img src="${optimizedUrl(singleImg, 750)}" class="card-preview-img loaded" decoding="async" fetchpriority="high" alt="${item.title} wallpaper preview">`;
  } else {
    mediaHtml += `<img data-src="${optimizedUrl(singleImg, 24)}" class="card-preview-blur" aria-hidden="true">`;
    mediaHtml += `<img data-src="${optimizedUrl(singleImg, 750)}" class="card-preview-img" decoding="async" alt="${item.title} wallpaper preview">`;
  }

  const badge = `<span class="badge">${getBrandLabel(item.brand)}</span>`;
  const imageCount = (item.images || []).length;
  const countBadge = imageCount > 0 ? `<span class="count-badge"><svg class="count-badge-icon" viewBox="0 0 34 34" fill="none" aria-hidden="true"><path d="M26.2012 1.62164e-05C26.9916 1.55086e-05 27.7654 -0.00236355 28.416 0.0507975C29.1017 0.106849 29.9106 0.239567 30.7246 0.654313C31.7829 1.19355 32.6564 2.0334 33.2354 3.06642L33.3467 3.27638L33.4903 3.58107C33.7941 4.29059 33.9012 4.98509 33.9502 5.58498C34.0034 6.23568 34.001 7.00932 34.001 7.79982V16.2002C34.001 16.9907 34.0034 17.7644 33.9502 18.4151C33.8942 19.1007 33.7614 19.9096 33.3467 20.7236C32.7715 21.8526 31.8535 22.7705 30.7246 23.3457C30.0936 23.6672 29.4654 23.8183 28.8955 23.8965C28.8172 24.4658 28.6669 25.0933 28.3457 25.7236C27.7705 26.8526 26.8525 27.7705 25.7236 28.3457C25.093 28.667 24.465 28.8173 23.8955 28.8955C23.8173 29.4651 23.6671 30.0929 23.3457 30.7236C22.7705 31.8526 21.8526 32.7705 20.7236 33.3457C19.9096 33.7605 19.1007 33.8932 18.4151 33.9492C17.7644 34.0024 16.9907 34 16.2002 34H7.79982C7.00932 34 6.23568 34.0024 5.58498 33.9492C4.89931 33.8932 4.09048 33.7605 3.27638 33.3457C2.14742 32.7705 1.22955 31.8526 0.654313 30.7236C0.239543 29.9096 0.106841 29.1007 0.0507975 28.4151C-0.00236562 27.7644 1.58322e-05 26.9907 1.62165e-05 26.2002V17.7998C1.58006e-05 17.0093 -0.00236681 16.2357 0.0507975 15.585C0.106842 14.8993 0.239537 14.0905 0.654313 13.2764C1.22955 12.1474 2.14742 11.2296 3.27638 10.6543C3.90645 10.3333 4.53345 10.1819 5.10256 10.1035C5.18083 9.53415 5.3331 8.90684 5.65431 8.27638C6.22956 7.14746 7.14745 6.22953 8.27638 5.65431C8.90688 5.33311 9.53413 5.18081 10.1035 5.10256C10.1818 4.53342 10.3343 3.90649 10.6553 3.27638C11.2305 2.14745 12.1484 1.22954 13.2774 0.654313C14.0914 0.239589 14.9003 0.106838 15.586 0.0507975C16.2366 -0.00235342 17.0104 1.58322e-05 17.8008 1.62164e-05H26.2012ZM7.79982 13C6.1198 13 5.27942 13.0002 4.63771 13.3272L4.43166 13.4424C3.96168 13.7306 3.57889 14.1438 3.32716 14.6377L3.26955 14.7608C3.00009 15.388 3.00002 16.2247 3.00002 17.7998V26.2002L3.0049 27.3125C3.02022 28.2878 3.08193 28.881 3.32716 29.3623C3.61474 29.9265 4.0735 30.3853 4.63771 30.6729C5.27942 30.9998 6.1198 31 7.79982 31H16.2002L17.3125 30.9951C18.2066 30.9811 18.7793 30.9281 19.2393 30.7305L19.3623 30.6729C19.8562 30.4211 20.2694 30.0384 20.5576 29.5684L20.6729 29.3623C20.9181 28.881 20.9798 28.2878 20.9951 27.3125L21 26.2002V17.7998C21 16.1198 20.9998 15.2794 20.6729 14.6377C20.4211 14.1438 20.0383 13.7306 19.5684 13.4424L19.3623 13.3272C18.881 13.0819 18.2878 13.0202 17.3125 13.0049L16.2002 13H7.79982ZM12.7998 8.00002C11.12 8.00002 10.2794 8.0003 9.63771 8.32716L9.43166 8.4424C8.96171 8.73057 8.57889 9.14387 8.32716 9.63771L8.26955 9.76076C8.2368 9.83698 8.20888 9.91665 8.18361 10H16.2002C16.9907 10 17.7644 9.99763 18.4151 10.0508C19.1007 10.1068 19.9096 10.2395 20.7236 10.6543C21.782 11.1935 22.6554 12.0334 23.2344 13.0664L23.3457 13.2764L23.4893 13.5811C23.7931 14.2906 23.9002 14.9851 23.9492 15.585C24.0024 16.2357 24 17.0093 24 17.7998V25.8154C24.0832 25.7902 24.1632 25.7632 24.2393 25.7305L24.3623 25.6729C24.8561 25.4211 25.2695 25.0383 25.5576 24.5684L25.6729 24.3623C25.9181 23.881 25.9798 23.2877 25.9951 22.3125L26 21.2002V12.7998C26 11.1199 25.9998 10.2794 25.6729 9.63771C25.4212 9.14388 25.0383 8.73058 24.5684 8.4424L24.3623 8.32716C23.881 8.08194 23.2876 8.02023 22.3125 8.0049L21.2002 8.00002H12.7998ZM17.8008 3.00002C16.1209 3.00002 15.2804 3.00027 14.6387 3.32716L14.4326 3.4424C13.9627 3.73057 13.5799 4.14386 13.3281 4.63771L13.2705 4.76076C13.2378 4.83699 13.2099 4.91664 13.1846 5.00002H21.2002C21.9906 5.00002 22.7644 4.99764 23.4151 5.0508C24.1007 5.10685 24.9096 5.23958 25.7236 5.65431C26.7819 6.19355 27.6555 7.03342 28.2344 8.06642L28.3457 8.27638L28.4893 8.58107C28.7931 9.29058 28.9002 9.9851 28.9492 10.585C29.0024 11.2357 29 12.0093 29 12.7998V20.8154C29.0832 20.7901 29.1632 20.7632 29.2393 20.7305L29.3623 20.6729C29.8562 20.4211 30.2694 20.0383 30.5576 19.5684L30.6729 19.3623C30.9181 18.881 30.9798 18.2877 30.9951 17.3125L31 16.2002V7.79982C31 6.11985 30.9998 5.27941 30.6729 4.63771C30.4211 4.14386 30.0383 3.73058 29.5684 3.4424L29.3623 3.32716C28.881 3.08193 28.2876 3.02023 27.3125 3.0049L26.2012 3.00002H17.8008Z" fill="currentColor"/></svg>${imageCount}</span>` : '';
  mediaHtml += `${badge}${countBadge}</div>`;

  const titleHtml = `<h3 class="card-title">${item.title}</h3>`;

  card.innerHTML = mediaHtml + titleHtml;

  return card;
}

function renderGrid() {
  const grid = document.getElementById('wallpaperGrid');
  grid.classList.toggle('desktop-mode', currentDeviceFilter === 'desktop');
  grid.classList.toggle('tablet-mode', currentDeviceFilter === 'tablet');

  const filteredData = getFilteredData();

  const matchesBakedState = isInitialRender && currentFilter === 'all' && currentDeviceFilter === 'all' && !searchQuery;
  isInitialRender = false;

  if (filteredData.length === 0) {
    grid.innerHTML = '';
    renderEmptyState(grid);
    updateLoadMoreButton(0);
    return;
  }

  if (matchesBakedState && grid.children.length === Math.min(PRIORITY_COUNT, filteredData.length)) {
    const remainingData = filteredData.slice(grid.children.length, visibleCount);
    remainingData.forEach((item) => {
      grid.appendChild(createWallpaperCard(item, false));
    });
    observeLazyImages(grid);
    updateLoadMoreButton(filteredData.length);
    return;
  }

  grid.innerHTML = '';

  const visibleData = filteredData.slice(0, visibleCount);

  visibleData.forEach((item, index) => {
    grid.appendChild(createWallpaperCard(item, index < PRIORITY_COUNT));
  });

  observeLazyImages(grid);
  updateLoadMoreButton(filteredData.length);
}

function updateLoadMoreButton(totalCount) {
  const btn = document.getElementById('loadMoreBtn');
  if (!btn) return;
  btn.style.display = totalCount > visibleCount ? 'block' : 'none';
}

function loadMore() {
  const grid = document.getElementById('wallpaperGrid');
  const filteredData = getFilteredData();
  const previousCount = visibleCount;
  visibleCount += PAGE_SIZE;

  const newItems = filteredData.slice(previousCount, visibleCount);
  newItems.forEach((item) => {
    grid.appendChild(createWallpaperCard(item));
  });

  observeLazyImages(grid);
  updateLoadMoreButton(filteredData.length);
}

const LAZY_LOAD_MARGIN_PX = 800;

let lazyImageObserver = null;

function getLazyImageObserver() {
  if (lazyImageObserver) return lazyImageObserver;

  lazyImageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        if (img.classList.contains('card-preview-img')) {
          img.onload = () => img.classList.add('loaded');
        }
      }
      lazyImageObserver.unobserve(img);
    });
  }, {
    rootMargin: `${LAZY_LOAD_MARGIN_PX}px 0px ${LAZY_LOAD_MARGIN_PX}px 0px`
  });

  return lazyImageObserver;
}

function observeLazyImages(container) {
  const observer = getLazyImageObserver();
  container.querySelectorAll('img[data-src]').forEach((img) => observer.observe(img));
}

function filterDevice(device, btnEl) {
  currentDeviceFilter = device;
  sessionStorage.setItem('deviceFilter', device);
  visibleCount = PAGE_SIZE;
  document.querySelectorAll('.device-btn').forEach(btn => btn.classList.remove('active'));
  if (btnEl) {
    btnEl.classList.add('active');
  }
  renderGrid();
}

function filterBrand(brand, btnEl) {
  currentFilter = brand;
  sessionStorage.setItem('brandFilter', brand);
  visibleCount = PAGE_SIZE;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  if (btnEl) {
    btnEl.classList.add('active');
  }
  renderGrid();
}

document.getElementById('filterContainer').addEventListener('scroll', updateFilterFade, { passive: true });

function handleResize() {
  updateFilterFade();

  const newColumns = computeColumns();
  if (newColumns !== COLUMNS) {
    COLUMNS = newColumns;
    PAGE_SIZE = ROWS_PER_PAGE * COLUMNS;
    visibleCount = PAGE_SIZE;
    renderGrid();
  }
}
window.addEventListener('resize', handleResize);

function forceStickyRepaint() {
  const filtersRow = document.querySelector('.filters-row');
  if (!filtersRow) return;
  filtersRow.style.display = 'none';
  void filtersRow.offsetHeight;
  filtersRow.style.display = '';
}

function getFiltersRowLockY() {
  const filtersRow = document.querySelector('.filters-row');
  if (!filtersRow) return 0;
  const stickyTop = parseFloat(getComputedStyle(filtersRow).top) || 0;

  const originalPosition = filtersRow.style.position;
  filtersRow.style.position = 'static';
  const naturalY = filtersRow.getBoundingClientRect().top + window.scrollY;
  filtersRow.style.position = originalPosition;

  return Math.max(0, naturalY - stickyTop);
}

function openSearch() {
  const html = document.documentElement;
  const previousScrollBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(0, window.scrollY + 1);
  html.style.scrollBehavior = previousScrollBehavior;

  document.getElementById('filterScrollWrapper').style.display = 'none';
  document.getElementById('searchToggleBtn').style.display = 'none';
  const searchContainer = document.getElementById('searchContainer');
  searchContainer.style.display = 'flex';
  forceStickyRepaint();
  document.getElementById('searchInput').focus({ preventScroll: true });

  window.scrollTo({ top: getFiltersRowLockY(), left: 0, behavior: 'smooth' });
}

function closeSearch() {
  const hadQuery = searchQuery !== '';
  searchQuery = '';
  visibleCount = PAGE_SIZE;
  document.getElementById('searchInput').value = '';
  document.getElementById('searchContainer').style.display = 'none';
  document.getElementById('filterScrollWrapper').style.display = '';
  document.getElementById('searchToggleBtn').style.display = 'flex';
  forceStickyRepaint();

  if (hadQuery) {
    renderGrid();
  }
}

function handleSearchInput(value) {
  searchQuery = value.trim().toLowerCase();
  visibleCount = PAGE_SIZE;
  renderGrid();
}

function restoreDeviceFilterUI() {
  document.querySelectorAll('.device-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.device === currentDeviceFilter);
    btn.style.transition = '';
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key !== '/') return;
  const tag = document.activeElement ? document.activeElement.tagName : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  e.preventDefault();
  searchInput.focus();
});

document.addEventListener("DOMContentLoaded", restoreDeviceFilterUI);
document.addEventListener("DOMContentLoaded", loadWallpaperData);

window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
  document.documentElement.classList.add('pageshow-freeze');
  setTimeout(() => {
    document.documentElement.classList.remove('pageshow-freeze');
  }, 150);
});
