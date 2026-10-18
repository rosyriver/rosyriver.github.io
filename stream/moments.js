/* Shared feed presentation. Image viewing is handled by PhotoSwipe 5.4.4. */
(() => {
  const feed = document.getElementById('listContainer');
  if (!feed) return;
  const moduleUrl = new URL('vendor/photoswipe/photoswipe.esm.min.js', document.currentScript.src).href;
  const dimensions = new Map();
  const status = document.getElementById('momentPhotoStatus');
  let active, opening = false, request = 0, library;
  function measure(image) {
    const button = image.closest('.moment_photo');
    if (!button) return;
    button.classList.toggle('is_unavailable', image.complete && !image.naturalWidth);
    if (image.naturalWidth) {
      dimensions.set(image.src, {src:image.src, width:image.naturalWidth, height:image.naturalHeight});
      button.classList.toggle('is_long', image.naturalHeight / image.naturalWidth > 1.9);
    }
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


  function readImage(source) {
    const src = new URL(source, location.href).href;
    if (dimensions.has(src)) return Promise.resolve(dimensions.get(src));
    const existing = [...document.images].find(image => image.src === src && image.naturalWidth);
    if (existing) {
      const data = {src, width:existing.naturalWidth, height:existing.naturalHeight};
      dimensions.set(src, data);
      return Promise.resolve(data);
    }
    const pending = new Promise((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => finish(false), 12000);
      function finish(ok) {
        clearTimeout(timer);
        image.onload = image.onerror = null;
        if (ok && image.naturalWidth) {
          const data = {src, width:image.naturalWidth, height:image.naturalHeight};
          dimensions.set(src, data);
          resolve(data);
        } else { dimensions.delete(src); reject(new Error('Image unavailable')); }
      }
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.referrerPolicy = 'no-referrer';
      image.src = src;
    });
    dimensions.set(src, pending);
    return pending;
  }
  function unavailable(source) {
    const message = document.createElement('div');
    message.className = 'moment_photo_error';
    message.textContent = '图片暂时无法加载';
    if (/^(https?:|blob:|data:image\/)/i.test(source)) {
      const link = document.createElement('a');
      link.href = source;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = '在新窗口查看';
      message.appendChild(link);
    }
    return {html:message.outerHTML};
  }
  function cancelOpening() {
    if (!opening) return;
    ++request;
    opening = false;
    if (status) status.hidden = true;
  }
  status?.querySelector('button')?.addEventListener('click', cancelOpening);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') cancelOpening(); });

  async function openPhotos(items, index, trigger) {
    if (active || opening) return;
    const sources = items.filter(source => typeof source === 'string' && source);
    if (!sources.length) return;
    const token = ++request;
    opening = true;
    if (status) status.hidden = false;
    if (trigger) trigger.setAttribute('aria-busy', 'true');
    try {
      if (!library) library = import(moduleUrl).catch(error => { library = null; throw error; });
      const [module, dataSource] = await Promise.all([
        library,
        Promise.all(sources.map(source => readImage(source).catch(() => unavailable(source))))
      ]);
      if (token !== request) return;
      const pswp = new module.default({
        dataSource,
        index:Math.max(0, Math.min(sources.length - 1, Number(index) || 0)),
        mainClass:'moment_photoswipe',
        initialZoomLevel:'fit',
        secondaryZoomLevel:1,
        maxZoomLevel:3,
        paddingFn:viewport => ({top:64, bottom:24, left:viewport.x < 600 ? 16 : 48, right:viewport.x < 600 ? 16 : 48}),
        bgOpacity:1,
        showHideAnimationType:'none',
        zoomAnimationDuration:180,
        loop:false,
        returnFocus:false,
        closeOnVerticalDrag:false,
        pinchToClose:false,
        clickToCloseNonZoomable:false,
        imageClickAction:'zoom',
        bgClickAction:'close',
        closeTitle:'关闭图片',
        zoomTitle:'放大或还原图片',
        arrowPrevTitle:'上一张',
        arrowNextTitle:'下一张',
        errorMsg:'图片暂时无法加载，请稍后再试。'
      });
      pswp.on('uiRegister', () => {
        pswp.ui.registerElement({name:'fit', order:8, isButton:true, title:'完整显示图片', html:'适应',
          onClick:() => { if (pswp.currSlide) pswp.zoomTo(pswp.currSlide.zoomLevels.initial, undefined, 180); }});
        pswp.ui.registerElement({name:'original', order:9, isButton:true, title:'按原始尺寸查看', html:'原图',
          onClick:() => { if (pswp.currSlide?.isZoomable()) pswp.zoomTo(1, undefined, 180); }});
      });
      pswp.on('destroy', () => {
        active = null;
        document.documentElement.classList.remove('photo_viewer_open');
        if (trigger?.isConnected) trigger.focus({preventScroll:true});
      });
      // Preserve the same privacy policy as the feed image requests.
      pswp.on('contentLoadImage', event => { event.content.element.referrerPolicy = 'no-referrer'; });
      document.documentElement.classList.add('photo_viewer_open');
      active = pswp;
      pswp.init();
    } catch {
      active = null;
      document.documentElement.classList.remove('photo_viewer_open');
      if (typeof notify === 'function') notify('图片预览暂时无法打开，请稍后再试。', 'error');
    } finally {
      trigger?.removeAttribute('aria-busy');
      if (token === request) {
        opening = false;
        if (status) status.hidden = true;
      }
    }
  }
  window.openMomentPhotos = openPhotos;
  feed.addEventListener('click', event => {
    const button = event.target.closest('.moment_photo');
    if (!button) return;
    openPhotos(JSON.parse(button.closest('.photo_gallery').dataset.photoSources || '[]'), button.dataset.photoIndex, button);
  });
})();
