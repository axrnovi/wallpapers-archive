const CDN_BASE = 'https://cdn.jsdelivr.net/gh/axrnovi/axrnovi-wallpapers@main/';

function resolveUrl(relativePath) {
  return CDN_BASE + relativePath;
}

function optimizedUrl(url, width) {
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=75&output=webp`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function isMobileOrTablet() {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

let jsZipLoadingPromise = null;

function loadJSZip() {
  if (window.JSZip) return Promise.resolve();
  if (jsZipLoadingPromise) return jsZipLoadingPromise;

  jsZipLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load JSZip'));
    document.head.appendChild(script);
  });

  return jsZipLoadingPromise;
}

async function downloadCollection(imageUrls, collectionTitle, btnEl) {
  if (btnEl) btnEl.classList.add('loading');
  try {
    if (isMobileOrTablet()) {
      try {
        const files = await Promise.all(imageUrls.map(async (url, i) => {
          const response = await fetch(url);
          const blob = await response.blob();
          const ext = url.includes('.') ? url.split('.').pop().split('?')[0] : 'jpg';
          return new File([blob], `${collectionTitle}-${i + 1}.${ext}`, { type: blob.type || 'image/jpeg' });
        }));

        if (navigator.canShare && navigator.canShare({ files })) {
          await navigator.share({ files });
          return;
        }
      } catch (error) {
        if (error && error.name === 'AbortError') return;
        console.error('Share failed, falling back to zip download:', error);
      }
    }

    try {
      await loadJSZip();
      const zip = new JSZip();
      await Promise.all(imageUrls.map(async (url, i) => {
        const response = await fetch(url);
        const blob = await response.blob();
        const ext = url.includes('.') ? url.split('.').pop().split('?')[0] : 'jpg';
        zip.file(`${collectionTitle}-${i + 1}.${ext}`, blob);
      }));

      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(content);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${collectionTitle}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Zip download failed:', error);
    }
  } finally {
    if (btnEl) btnEl.classList.remove('loading');
  }
}

async function downloadImage(url, filename, btnEl) {
  if (btnEl) btnEl.classList.add('loading');
  try {
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
  } finally {
    if (btnEl) btnEl.classList.remove('loading');
  }
}

let modalLazyObserver = null;

function getModalLazyObserver() {
  if (modalLazyObserver) return modalLazyObserver;
  modalLazyObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.onload = () => img.classList.add('loaded');
      }
      modalLazyObserver.unobserve(img);
    });
  }, { rootMargin: '800px 0px 800px 0px' });
  return modalLazyObserver;
}

function observeModalLazyImages(container) {
  if (!container) return;
  const observer = getModalLazyObserver();
  container.querySelectorAll('img[data-src]').forEach((img) => observer.observe(img));
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('img[data-src]').forEach((img) => {
    const closedSection = img.closest('.device-section-body:not(.open)');
    if (!closedSection) {
      getModalLazyObserver().observe(img);
    }
  });
});

function toggleDeviceSection(id) {
  const body = document.getElementById(id);
  const chevron = document.getElementById('chev-' + id);
  if (!body) return;

  const inner = body.querySelector('.device-section-inner');
  const isOpening = !body.classList.contains('open');

  if (isOpening) {
    body.classList.add('open');
    if (chevron) chevron.classList.add('open');
    observeModalLazyImages(body);
  } else {
    if (chevron) chevron.classList.remove('open');
    if (inner) {
      inner.classList.add('closing');
      setTimeout(() => {
        body.classList.remove('open');
        inner.classList.remove('closing');
      }, 200);
    } else {
      body.classList.remove('open');
    }
  }
}

document.addEventListener('touchstart', function () {}, { passive: true });

function initShareButton() {
  const btn = document.getElementById('shareBtn');
  if (!btn) return;
  const url = btn.dataset.url;
  const title = btn.dataset.title;
  const label = btn.querySelector('.share-btn-label');

  btn.addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      btn.classList.add('copied');
      label.textContent = 'Link copied';
      setTimeout(() => {
        btn.classList.remove('copied');
        label.textContent = 'Share';
      }, 2000);
    } catch (err) {
    }
  });
}

document.addEventListener('DOMContentLoaded', initShareButton);
