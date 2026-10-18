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
  const canvas = viewer.querySelector('.photo_viewer_canvas');
  const thumbnails = viewer.querySelector('[data-photo-thumbnails]');
  const navigation = viewer.querySelector('.photo_viewer_nav');
  const fitButton = viewer.querySelector('[data-photo-fit]');
  const actualButton = viewer.querySelector('[data-photo-actual]');
  const zoomOut = viewer.querySelector('[data-photo-zoom-out]');
  const zoomIn = viewer.querySelector('[data-photo-zoom-in]');
  const zoomLabel = viewer.querySelector('[data-photo-zoom]');
  let sources = [], current = 0, opener, scale = 1, mode = 'fit', loaded = false, sequence = 0, drag, suppressClick = false;

  function fitScale() { return Math.min(1, Math.max(1, stage.clientWidth - 32) / photo.naturalWidth, Math.max(1, stage.clientHeight - 32) / photo.naturalHeight); }
  function draw(anchor) {
    if (!loaded || !viewer.open) return;
    if (mode === 'fit') scale = fitScale();
    const width = photo.naturalWidth * scale, height = photo.naturalHeight * scale;
    const canvasWidth = Math.max(stage.clientWidth, width + 32), canvasHeight = Math.max(stage.clientHeight, height + 32);
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    const left = (canvasWidth - width) / 2, top = (canvasHeight - height) / 2;
    photo.style.width = width + 'px';
    photo.style.height = height + 'px';
    photo.style.left = left + 'px';
    photo.style.top = top + 'px';
    stage.classList.toggle('can_pan', width > stage.clientWidth || height > stage.clientHeight);
    if (anchor) {
      stage.scrollLeft = left + anchor.x * width - anchor.clientX;
      stage.scrollTop = top + anchor.y * height - anchor.clientY;
    }
    zoomLabel.textContent = Math.round(scale * 100) + '%';
    fitButton.setAttribute('aria-pressed', String(mode === 'fit'));
    actualButton.setAttribute('aria-pressed', String(Math.abs(scale - 1) < .001));
    zoomOut.disabled = scale <= fitScale() + .001;
    zoomIn.disabled = scale >= 3;
  }
  function changeZoom(value, point) {
    if (!loaded) return;
    const stageRect = stage.getBoundingClientRect(), rect = photo.getBoundingClientRect();
    const clientX = point ? point.clientX - stageRect.left : stage.clientWidth / 2;
    const clientY = point ? point.clientY - stageRect.top : stage.clientHeight / 2;
    const anchor = {x:(clientX + stageRect.left - rect.left) / rect.width, y:(clientY + stageRect.top - rect.top) / rect.height, clientX, clientY};
    scale = Math.max(fitScale(), Math.min(3, value));
    mode = 'zoom';
    draw(anchor);
  }

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
    const request = ++sequence;
    current = index;
    loaded = false;
    stage.scrollLeft = 0;
    stage.scrollTop = 0;
    stage.classList.remove('can_pan');
    canvas.style.width = canvas.style.height = '';
    photo.hidden = true;
    status.hidden = false;
    status.textContent = '正在加载图片…';
    hint.textContent = '';
    count.textContent = `${index + 1} / ${sources.length}`;
    zoomLabel.textContent = '—';
    zoomOut.disabled = zoomIn.disabled = fitButton.disabled = actualButton.disabled = true;
    previous.disabled = index === 0;
    next.disabled = index === sources.length - 1;
    photo.alt = `第 ${index + 1} 张图片，共 ${sources.length} 张`;
    photo.onload = () => {
      if (request !== sequence || !viewer.open) return;
      loaded = true;
      mode = 'fit';
      photo.hidden = false;
      status.hidden = true;
      fitButton.disabled = actualButton.disabled = false;
      draw();
    };
    photo.onerror = () => { if (request === sequence) status.textContent = '图片暂时无法加载，请稍后再试。'; };
    photo.src = sources[index];
    thumbnails.querySelectorAll('button').forEach((button, i) => {
      button.setAttribute('aria-current', String(i === index));
      if (i === index) button.scrollIntoView({block:'nearest', inline:'nearest'});
    });
  }
  function openPhotos(items, index, trigger) {
    if (viewer.open) return;
    sources = items.filter(source => typeof source === 'string' && source);
    if (!sources.length) return;
    opener = trigger;
    viewer.showModal();
    document.documentElement.classList.add('photo_viewer_open');
    navigation.hidden = sources.length < 2;
    thumbnails.replaceChildren();
    if (sources.length > 1) sources.forEach((source, index) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.setAttribute('aria-label', '查看第 ' + (index + 1) + ' 张图片');
      const image = document.createElement('img');
      image.src = source;
      image.alt = '';
      image.referrerPolicy = 'no-referrer';
      thumb.appendChild(image);
      thumb.addEventListener('click', () => show(index));
      thumbnails.appendChild(thumb);
    });
    show(Math.max(0, Math.min(sources.length - 1, Number(index) || 0)));
    viewer.querySelector('[data-photo-close]').focus();
  }
  window.openMomentPhotos = openPhotos;
  feed.addEventListener('click', event => {
    const button = event.target.closest('.moment_photo');
    if (!button) return;
    openPhotos(JSON.parse(button.closest('.photo_gallery').dataset.photoSources || '[]'), button.dataset.photoIndex, button);
  });
  previous.addEventListener('click', () => { if (current > 0) show(current - 1); });
  next.addEventListener('click', () => { if (current < sources.length - 1) show(current + 1); });
  fitButton.addEventListener('click', () => { mode = 'fit'; draw(); stage.scrollTop = stage.scrollLeft = 0; });
  actualButton.addEventListener('click', () => changeZoom(1));
  zoomOut.addEventListener('click', () => changeZoom(scale / 1.4));
  zoomIn.addEventListener('click', () => changeZoom(scale * 1.4));
  photo.addEventListener('dblclick', event => {
    if (mode === 'zoom' && scale > fitScale() + .01) { mode = 'fit'; draw(); }
    else changeZoom(scale < 1 ? 1 : scale * 2, event);
  });
  stage.addEventListener('wheel', event => {
    if (event.ctrlKey && loaded) { event.preventDefault(); changeZoom(scale * Math.exp(-event.deltaY * .004), event); }
  }, {passive:false});
  photo.addEventListener('dragstart', event => event.preventDefault());
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !stage.classList.contains('can_pan')) return;
    drag = {x:event.clientX, y:event.clientY, left:stage.scrollLeft, top:stage.scrollTop, id:event.pointerId};
    suppressClick = false;
    stage.classList.add('is_dragging');
    event.preventDefault();
  });
  stage.addEventListener('pointermove', event => {
    if (!drag) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      suppressClick = true;
      if (!stage.hasPointerCapture(event.pointerId)) stage.setPointerCapture(event.pointerId);
    }
    stage.scrollLeft = drag.left - dx;
    stage.scrollTop = drag.top - dy;
  });
  function endDrag() { drag = null; stage.classList.remove('is_dragging'); }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('click', event => {
    if (suppressClick) { suppressClick = false; return; }
    if (event.target === stage || event.target === canvas) viewer.close();
  });
  let touch;
  stage.addEventListener('touchstart', event => { if (event.touches.length === 1) touch = {x:event.touches[0].clientX, y:event.touches[0].clientY}; else touch = null; }, {passive:true});
  stage.addEventListener('touchend', event => {
    if (!touch || stage.classList.contains('can_pan') || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touch.x, dy = event.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && current < sources.length - 1) show(current + 1);
    if (dx > 0 && current > 0) show(current - 1);
  }, {passive:true});
  viewer.querySelector('[data-photo-close]').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' && current > 0) { event.preventDefault(); show(current - 1); }
    if (event.key === 'ArrowRight' && current < sources.length - 1) { event.preventDefault(); show(current + 1); }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); changeZoom(scale * 1.4); }
    if (event.key === '-') { event.preventDefault(); changeZoom(scale / 1.4); }
    if (event.key === '0') { mode = 'fit'; draw(); }
  });
  viewer.addEventListener('close', () => {
    document.documentElement.classList.remove('photo_viewer_open');
    ++sequence;
    loaded = false;
    endDrag();
    thumbnails.replaceChildren();
    photo.onload = photo.onerror = null;
    photo.removeAttribute('src');
    if (opener && opener.isConnected) opener.focus({preventScroll:true});
  });
  new ResizeObserver(() => { if (viewer.open && loaded) draw(); }).observe(stage);
})();
