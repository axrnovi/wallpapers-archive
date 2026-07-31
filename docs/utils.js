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

async function downloadCollection(imageUrls, collectionTitle) {
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
