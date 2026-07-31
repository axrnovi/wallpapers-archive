let wallpaperData = [];
const urlBrandParam = new URLSearchParams(window.location.search).get('brand');
let currentFilter = urlBrandParam || sessionStorage.getItem('brandFilter') || 'all';
if (urlBrandParam) {
  sessionStorage.setItem('brandFilter', urlBrandParam);
}
let currentDeviceFilter = sessionStorage.getItem('deviceFilter') || 'all';
let searchQuery = '';

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
  if (deviceFilter === 'phone' || deviceFilter === 'desktop') {
    const filtered = images.filter((img) => getImageDevices(img).includes(deviceFilter));
    if (filtered.length > 0) images = filtered;
  }
  return images.slice(0, 3).map(getImageSrc).map(resolveUrl);
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

function getFilteredData() {
  return wallpaperData
    .filter((item) => {
      if (!itemMatchesDevice(item, currentDeviceFilter)) return false;
      if (searchQuery) {
        return itemMatchesSearch(item, searchQuery);
      }
      return currentFilter === 'all' || item.brand === currentFilter;
    })
    .sort((a, b) => parseDateSafe(b.date) - parseDateSafe(a.date));
}

function createWallpaperCard(item) {
  const card = document.createElement('a');
  card.className = 'wallpaper-card';
  card.href = `collections/${slugify(item.title)}.html`;

  const previewImages = getPreviewImages(item, currentDeviceFilter);
  let mediaHtml = '<div class="card-media-wrapper">';

  if (previewImages.length > 1) {
    mediaHtml += `<div class="card-slider">`;
    previewImages.forEach((img, i) => {
      mediaHtml += `<img data-src="${optimizedUrl(img, 500)}" class="${i === 0 ? 'active' : ''}" decoding="async" alt="${item.title} wallpaper preview">`;
    });
    mediaHtml += `</div>`;
  } else {
    const singleImg = previewImages.length > 0 ? previewImages[0] : '';
    mediaHtml += `<div class="card-slider"><img data-src="${optimizedUrl(singleImg, 500)}" class="active" decoding="async" alt="${item.title} wallpaper preview"></div>`;
  }

  const badge = `<span class="badge">${getBrandLabel(item.brand)}</span>`;
  mediaHtml += `${badge}</div>`;

  const infoHtml = `
    <div class="card-info">
        <h3 class="card-title">${item.title}</h3>
    </div>
  `;

  card.innerHTML = mediaHtml + infoHtml;

  return card;
}

function clearActiveSliderIntervals() {
  document.querySelectorAll('.card-slider').forEach((slider) => {
    if (slider.dataset.intervalId) {
      clearInterval(parseInt(slider.dataset.intervalId));
      slider.removeAttribute('data-interval-id');
      slider.dataset.intervalId = '';
    }
  });
}

function renderGrid() {
  const grid = document.getElementById('wallpaperGrid');
  grid.classList.toggle('desktop-mode', currentDeviceFilter === 'desktop');
  clearActiveSliderIntervals();
  grid.innerHTML = '';

  const filteredData = getFilteredData();

  if (filteredData.length === 0) {
    renderEmptyState(grid);
    updateLoadMoreButton(0);
    return;
  }

  const visibleData = filteredData.slice(0, visibleCount);

  visibleData.forEach((item) => {
    grid.appendChild(createWallpaperCard(item));
  });

  observeLazyImages(grid);
  initSliders();
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
  initSliders();
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

let sliderObserver = null;

function initSliders() {
  if (sliderObserver) {
    sliderObserver.disconnect();
  }

  sliderObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const slider = entry.target;
      if (entry.isIntersecting) {
        if (!slider.dataset.intervalId) {
          const images = slider.querySelectorAll('img');
          if (images.length <= 1) return;
          let idx = 0;
          const intervalId = setInterval(() => {
            images[idx].classList.remove('active');
            idx = (idx + 1) % images.length;
            images[idx].classList.add('active');
          }, 3000);
          slider.dataset.intervalId = intervalId;
        }
      } else {
        if (slider.dataset.intervalId) {
          clearInterval(parseInt(slider.dataset.intervalId));
          slider.removeAttribute('data-interval-id');
          slider.dataset.intervalId = '';
        }
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.card-slider').forEach(s => sliderObserver.observe(s));
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

document.addEventListener('touchstart', function () {}, { passive: true });
