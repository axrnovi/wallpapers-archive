let wallpaperData = [];
let currentFilter = 'all';
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

function optimizedUrl(url, width) {
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=75&output=webp`;
}

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/axrnovi/axrnovi-wallpapers@main/';

function resolveUrl(relativePath) {
  return CDN_BASE + relativePath;
}

function getPreviewImages(item) {
  if (item.previews && item.previews.length > 0) {
    return item.previews.map(resolveUrl);
  }
  return (item.images || []).slice(0, 3).map(resolveUrl);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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
    renderFilters();
    renderGrid();
  } catch (error) {
    console.error("Error loading wallpaper database:", error);
    renderErrorState();
  }
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
  allBtn.className = 'filter-btn active';
  allBtn.textContent = 'All';
  allBtn.onclick = () => filterBrand('all', allBtn);
  filterContainer.appendChild(allBtn);

  presentBrands.forEach((brand) => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
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

function getFilteredData() {
  return wallpaperData.filter((item) => {
    if (searchQuery) {
      return itemMatchesSearch(item, searchQuery);
    }
    return currentFilter === 'all' || item.brand === currentFilter;
  });
}

function createWallpaperCard(item) {
  const card = document.createElement('div');
  card.className = 'wallpaper-card';

  const previewImages = getPreviewImages(item);
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

  card.onclick = () => openModal(item);
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

function isMobileOrTablet() {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

async function downloadImage(url, filename) {
  if (isMobileOrTablet()) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
      window.open(url, '_blank');
      return;
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      console.error('Share failed, opening image instead:', error);
      window.open(url, '_blank');
      return;
    }
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (error) {
    console.error('Download failed, opening image instead:', error);
    window.open(url, '_blank');
  }
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

function filterBrand(brand, btnEl) {
  currentFilter = brand;
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

let lockedScrollY = 0;

function lockBodyScroll() {
  lockedScrollY = window.scrollY;

  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  const currentPaddingRight = parseFloat(getComputedStyle(document.body).paddingRight) || 0;

  document.body.style.position = 'fixed';
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';

  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
  }
}

function unlockBodyScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  document.body.style.paddingRight = '';

  const html = document.documentElement;
  const previousScrollBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(0, lockedScrollY);
  html.style.scrollBehavior = previousScrollBehavior;
}

const MODAL_ITEMS_BATCH_SIZE = 4;

function createModalItemWrapper(item, relativePath, index) {
  const imgUrl = resolveUrl(relativePath);
  const ext = relativePath.includes('.') ? relativePath.split('.').pop() : 'jpg';
  const fallbackName = `${item.title}-${index + 1}.${ext}`;

  const itemWrapper = document.createElement('div');
  itemWrapper.className = 'modal-item-wrapper';
  itemWrapper.innerHTML = `<img src="${optimizedUrl(imgUrl, 600)}" alt="${item.title}" loading="lazy" decoding="async">`;

  const downloadBtn = document.createElement('button');
  downloadBtn.type = 'button';
  downloadBtn.className = 'download-single-btn';
  downloadBtn.textContent = 'Download';
  downloadBtn.addEventListener('click', () => downloadImage(imgUrl, fallbackName));

  itemWrapper.appendChild(downloadBtn);
  return itemWrapper;
}

function appendModalItemsInBatches(item, images, grid, startIndex) {
  const endIndex = Math.min(startIndex + MODAL_ITEMS_BATCH_SIZE, images.length);

  for (let i = startIndex; i < endIndex; i++) {
    grid.appendChild(createModalItemWrapper(item, images[i], i));
  }

  if (endIndex < images.length) {
    requestAnimationFrame(() => appendModalItemsInBatches(item, images, grid, endIndex));
  }
}

function openModal(item) {
  const modal = document.getElementById('wallpaperModal');
  const modalTitleEl = document.getElementById('modalTitle');
  modalTitleEl.innerHTML = `
    ${item.title}
    ${item.date ? `<div class="modal-date">${item.date}</div>` : ''}
  `;

  const modalGrid = document.getElementById('modalGrid');
  modalGrid.innerHTML = '';

  appendModalItemsInBatches(item, item.images || [], modalGrid, 0);

  lockBodyScroll();
  void modal.offsetHeight;
  requestAnimationFrame(() => {
    modal.classList.add('active');
  });
}

function closeModal(e) {
  const modal = document.getElementById('wallpaperModal');
  modal.classList.remove('active');
  requestAnimationFrame(() => {
    unlockBodyScroll();
  });
}

function openAboutModal() {
  const modal = document.getElementById('aboutModal');
  lockBodyScroll();
  void modal.offsetHeight;
  requestAnimationFrame(() => {
    modal.classList.add('active');
  });
}

function closeAboutModal(e) {
  const modal = document.getElementById('aboutModal');
  modal.classList.remove('active');
  requestAnimationFrame(() => {
    unlockBodyScroll();
  });
}

document.addEventListener("DOMContentLoaded", loadWallpaperData);

document.addEventListener('touchstart', function () {}, { passive: true });