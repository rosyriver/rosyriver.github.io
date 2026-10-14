(() => {
  const valineURL = new URL('../js/vendor/valine.min.js', document.currentScript.src).href;
  const menu = document.querySelector('#menu_icon');
  if (menu) {
    menu.setAttribute('role', 'button');
    menu.setAttribute('tabindex', '0');
    menu.setAttribute('aria-label', '打开或收起导航');
    menu.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); menu.click(); }
    });
  }

  const comments = document.querySelector('#vcomments');
  let commentState = 'idle';
  const loadComments = () => {
    if (commentState === 'loading' || commentState === 'ready') return;
    commentState = 'loading';
    comments.innerHTML = '<p class="comment-status" role="status">正在加载留言区…</p>';
    const script = document.createElement('script');
    script.src = valineURL;
    let timer;
    const fail = () => {
      clearTimeout(timer);
      commentState = 'error';
      script.remove();
      comments.innerHTML = '<p class="comment-status" role="status">留言区暂时没能加载。<button type="button">重新加载</button></p>';
      comments.querySelector('button').addEventListener('click', loadComments);
    };
    script.onload = () => {
      clearTimeout(timer);
      if (commentState !== 'loading') return;
      try {
        comments.innerHTML = '';
        new window.Valine({ el: '#vcomments', appId: comments.dataset.appId, appKey: comments.dataset.appKey, placeholder: 'say some shit. ', visitor: true });
        commentState = 'ready';
      } catch { fail(); }
    };
    script.onerror = fail;
    timer = setTimeout(fail, 15000);
    document.head.append(script);
  };
  if (comments) loadComments();
})();


