/* Shared gallery and text overflow handling for both stream surfaces. */
(() => {
  const feed = document.getElementById('listContainer');
  const viewer = document.getElementById('photoViewer');
  if (!feed || !viewer) return;
  const stage = viewer.querySelector('.photo_viewer_stage');
  const photo = viewer.querySelector('.photo_viewer_image');
  const count = viewer.querySelector('[data-photo-count]');
  const hint = viewer.querySelector('[data-photo-hint]');
  const status = viewer.querySelector('.photo_viewer_status');
  const previous = viewer.querySelector('[data-photo-previous]');
  const next = viewer.querySelector('[data-photo-next]');
  let sources = [], current = 0, opener;

  function measure(image) {
    const button = image.closest('.moment_photo');
    if (!button) return;
    button.classList.toggle('is_unavailable', image.complete && !image.naturalWidth);
    if (image.naturalWidth) button.classList.toggle('is_long', image.naturalHeight / image.naturalWidth > 1.9);
  }
  feed.addEventListener('load', e => { if (e.target.matches('.moment_photo img')) measure(e.target); }, true);
  feed.addEventListener('error', e => { if (e.target.matches('.moment_photo img')) measure(e.target); }, true);
  let refreshFrame;
  function refreshText() {
    cancelAnimationFrame(refreshFrame);
    refreshFrame = requestAnimationFrame(() => {
      if (window.refreshStreamExpand) window.refreshStreamExpand();
    });
  }
  new MutationObserver(() => {
    feed.querySelectorAll('.moment_photo img').forEach(img => { if (img.complete) measure(img); });
    refreshText();
  }).observe(feed, {childList:true, subtree:true});
  feed.querySelectorAll('.moment_photo img').forEach(img => { if (img.complete) measure(img); });
  window.addEventListener('resize', refreshText);
  refreshText();

  function show(index) {
    current = index;
    stage.scrollTop = 0;
    stage.classList.remove('is_long');
    photo.hidden = true;
    status.hidden = false;
    status.textContent = '正在加载图片…';
    hint.textContent = '';
    count.textContent = `${index + 1} / ${sources.length}`;
    previous.disabled = index === 0;
    next.disabled = index === sources.length - 1;
    photo.alt = `第 ${index + 1} 张图片，共 ${sources.length} 张`;
    photo.onload = () => {
      const long = photo.naturalHeight / photo.naturalWidth > 1.9;
      stage.classList.toggle('is_long', long);
      hint.textContent = long ? '向下滚动看完整长图' : '';
      photo.hidden = false;
      status.hidden = true;
    };
    photo.onerror = () => { status.textContent = '图片暂时无法加载，请稍后再试。'; };
    photo.src = sources[index];
  }
  feed.addEventListener('click', event => {
    const button = event.target.closest('.moment_photo');
    if (!button) return;
    sources = JSON.parse(button.closest('.photo_gallery').dataset.photoSources || '[]');
    if (!sources.length) return;
    opener = button;
    show(Number(button.dataset.photoIndex));
    viewer.showModal();
    document.documentElement.classList.add('photo_viewer_open');
    viewer.querySelector('[data-photo-close]').focus();
  });
  previous.addEventListener('click', () => { if (current > 0) show(current - 1); });
  next.addEventListener('click', () => { if (current < sources.length - 1) show(current + 1); });
  viewer.querySelector('[data-photo-close]').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' && current > 0) { event.preventDefault(); show(current - 1); }
    if (event.key === 'ArrowRight' && current < sources.length - 1) { event.preventDefault(); show(current + 1); }
  });
  viewer.addEventListener('close', () => {
    document.documentElement.classList.remove('photo_viewer_open');
    photo.onload = photo.onerror = null;
    photo.removeAttribute('src');
    if (opener && opener.isConnected) opener.focus({preventScroll:true});
  });
})();
