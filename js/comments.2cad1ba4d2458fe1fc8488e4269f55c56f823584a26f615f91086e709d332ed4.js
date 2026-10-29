(() => {
  const section = document.querySelector('[data-comments]');
  if (!section) return;
  const status = section.querySelector('.comments-status');
  const retry = section.querySelector('.comments-retry');
  let loading = false;
  const load = async () => {
    if (loading) return;
    loading = true;
    status.hidden = false;
    status.textContent = '正在加载评论…';
    retry.hidden = true;
    try {
      if (!window.Valine) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          const timer = setTimeout(() => {
            script.remove();
            reject(new Error('Comments timed out'));
          }, 15000);
          script.src = section.dataset.library;
          script.onload = () => { clearTimeout(timer); resolve(); };
          script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Comments unavailable')); };
          document.head.append(script);
        });
      }
      new window.Valine(JSON.parse(section.querySelector('[data-comments-options]').textContent));
      status.hidden = true;
    } catch {
      status.textContent = '评论暂时无法加载，请稍后重试。';
      retry.hidden = false;
    } finally {
      loading = false;
    }
  };
  retry.addEventListener('click', load);
  load();
})();
