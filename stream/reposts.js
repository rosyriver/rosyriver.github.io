/* Shared original-moment preview for the writing desk and the published feed. */
(() => {
  const esc = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safe = value => {
    if (typeof value !== 'string' || !value.trim()) return '';
    try { const url = new URL(value, location.href); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch (_) { return ''; }
  };
  const paths = {
    share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/>',
    repost:'<path d="m2 9 3-3 3 3M5 6v9a2 2 0 0 0 2 2h8m7-2-3 3-3-3m3 3V9a2 2 0 0 0-2-2H9"/>',
    edit:'<path d="m16 3 5 5-13 13H3v-5L16 3Zm-3 3 5 5"/>',
    delete:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>'
  };
  const icon = name => '<svg class="moment_action_icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(paths[name] || '')+'</svg>';
  function historyButton(id, count, style = 'number') {
    count = Math.max(0, Number(count) || 0);
    if (!count) return '';
    const withIcon = style === 'icon' || style === 'label';
    return '<button class="moment_repost_count'+(withIcon ? ' with_icon' : '')+(style === 'label' ? ' with_label' : '')+'" type="button" data-repost-history="'+esc(id)+'" aria-label="查看 '+count+' 条转发" title="查看 '+count+' 条转发" aria-expanded="false" aria-controls="repost-history-'+esc(id)+'">'+(withIcon ? icon('repost') : '')+'<span>'+count+(style === 'label' ? ' 次转发' : '')+'</span></button>';
  }

  function staticHistoryLoader(prefix) {
    const cache = new Map();
    return async (id, page) => {
      if (!cache.has(id)) {
        cache.set(id, fetch(new URL(prefix + encodeURIComponent(id) + '.json', location.href), {credentials:'same-origin'})
          .then(response => { if (response.status === 404) return {items:[]}; if (!response.ok) throw new Error('Cannot load reposts'); return response.json(); })
          .catch(error => { cache.delete(id); throw error; }));
      }
      const data = await cache.get(id);
      const items = Array.isArray(data.items) ? data.items : [];
      return {page,totalPages:Math.ceil(items.length/10),totalItems:items.length,items:items.slice((page-1)*10,page*10)};
    };
  }

  function attachHistory(container, options) {
    const sections = new WeakMap();
    function draw(section, state) {
      const date = options.formatDate || (value => value || '');
      const rows = state.items.map(item => {
        const href = safe(options.href(item.id));
        const content = String(item.content || '').replace(/\u200b/g, '').trim();
        return '<li><a class="moment_repost_entry" href="'+esc(href)+'" data-repost-id="'+esc(item.id)+'"><span class="moment_repost_entry_meta"><time>'+esc(date(item.date))+'</time>'+(item.visibility === 'private' ? '<span class="moment_repost_private">仅自己</span>' : '')+'</span>'+(item.title ? '<strong>'+esc(item.title)+'</strong>' : '')+'<span class="moment_repost_entry_text">'+esc(content || item.media || '转发了这条瞬间')+'</span></a></li>';
      }).join('');
      section.innerHTML = '<div class="moment_repost_history_heading"><span>转发记录<span class="moment_repost_history_total">'+state.total+'</span></span><button type="button" class="moment_repost_history_close" data-repost-history-close aria-label="收起转发记录" title="收起转发记录">'+icon('close')+'</button></div><ol class="moment_repost_entries">'+rows+'</ol>'+
        (state.failed ? '<button class="moment_repost_more" type="button" data-repost-history-more>加载失败，重试</button>' : state.loading ? '<p class="moment_repost_history_status" role="status">正在加载转发…</p>' : state.page < state.pages ? '<button class="moment_repost_more" type="button" data-repost-history-more>更多转发</button>' : !state.items.length ? '<p class="moment_repost_history_status">暂无转发</p>' : '');
      section.setAttribute('aria-busy', String(state.loading));
    }
    async function load(section, state) {
      if (state.loading) return;
      state.loading = true; state.failed = false; draw(section, state);
      try {
        const data = await options.loadPage(state.id, state.page + 1);
        if (!section.isConnected) return;
        const seen = new Set(state.items.map(item => item.id));
        state.items.push(...data.items.filter(item => !seen.has(item.id)));
        state.page = data.page; state.pages = data.totalPages; state.total = data.totalItems;
        const label = state.button.querySelector('span');
        if (label) label.textContent = state.total + (state.button.classList.contains('with_label') ? ' 次转发' : '');
        state.button.setAttribute('aria-label', '查看 '+state.total+' 条转发');
        state.button.title = '查看 '+state.total+' 条转发';
      } catch (_) { state.failed = true; }
      finally { state.loading = false; if (section.isConnected) draw(section, state); }
    }
    function collapse(section) {
      section.hidden = true;
      const state = sections.get(section);
      if (state) state.button.setAttribute('aria-expanded', 'false');
    }
    container.addEventListener('click', event => {
      const button = event.target.closest('[data-repost-history]');
      if (button) {
        const id = button.dataset.repostHistory;
        const card = button.closest('.list_item') || container;
        let section = card.querySelector('.moment_repost_history');
        if (!section) {
          section = document.createElement('section');
          section.id = 'repost-history-' + id;
          section.className = 'moment_repost_history';
          section.setAttribute('aria-label', '转发记录');
          section.hidden = true;
          card.appendChild(section);
          sections.set(section, {id,button,page:0,pages:1,total:Number(button.textContent.replace(/\D/g,'')) || 0,items:[],loading:false,failed:false});
        }
        if (!section.hidden) { collapse(section); return; }
        section.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        const state = sections.get(section);
        if (!state.page) load(section, state);
        return;
      }
      const section = event.target.closest('.moment_repost_history');
      if (!section) return;
      if (event.target.closest('[data-repost-history-close]')) {
        collapse(section);
        sections.get(section).button.focus({preventScroll:true});
      } else if (event.target.closest('[data-repost-history-more]')) load(section, sections.get(section));
    });
  }
  function card(ref, options = {}) {
    if (!ref || !ref.id) return '';
    if (ref.unavailable) return '<div class="moment_repost is_unavailable"><span class="moment_repost_label">原瞬间已不可用</span></div>';
    const href = options.interactive === false ? '' : safe(options.href || ('#moment-' + encodeURIComponent(ref.id)));
    const tag = href ? 'a' : 'div';
    const date = options.formatDate ? options.formatDate(ref.date) : (ref.date || '');
    const image = safe(ref.image);
    const text = String(ref.content || '').replace(/\u200b/g, '').trim();
    return '<'+tag+' class="moment_repost"'+(href ? ' href="'+esc(href)+'" data-repost-id="'+esc(ref.id)+'" aria-label="查看原瞬间，'+esc(date)+'"' : '')+'>'+
      '<span class="moment_repost_head"><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M6 4h9v8m0-8L5 14M4 8v8h8"/></svg><span class="moment_repost_label">转发自</span><time>'+esc(date)+'</time>'+(ref.visibility === 'private' ? '<span class="moment_repost_private">仅自己</span>' : '')+'</span>'+
      '<span class="moment_repost_preview"><span class="moment_repost_copy">'+(ref.title ? '<strong>'+esc(ref.title)+'</strong>' : '')+
      '<span class="moment_repost_text">'+esc(text || ref.media || '一条瞬间')+'</span>'+(text && ref.media ? '<small>'+esc(ref.media)+'</small>' : '')+'</span>'+
      (image ? '<img class="moment_repost_image" src="'+esc(image)+'" alt="" width="56" height="56" loading="lazy" referrerpolicy="no-referrer">' : '')+'</span></'+tag+'>';
  }
  document.addEventListener('error', event => {
    if (event.target.matches && event.target.matches('.moment_repost_image')) event.target.hidden = true;
  }, true);
  window.MomentReposts = {card, icon, historyButton, attachHistory, staticHistoryLoader};
})();
