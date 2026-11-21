(() => {
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().trim();
  document.querySelectorAll('[data-directory]').forEach(section => {
    const tools = section.querySelector('.directory-tools');
    if (!tools) return;
    const input = tools.querySelector('[data-directory-search]');
    const category = tools.querySelector('[data-directory-category]');
    const entries = [...section.querySelectorAll('[data-directory-entry]')];
    const primary = section.querySelector('[data-directory-primary]');
    const more = section.querySelector('.directory-more');
    const summary = more?.querySelector('summary');
    const result = section.querySelector('.directory-result');
    const empty = section.querySelector('.directory-empty');
    const indexed = entries.map(element => ({
      element,
      text: normalize(element.dataset.search || ''),
      category: element.dataset.category || ''
    }));
    let filtering = false;
    let previousOpen = false;
    function update() {
      const query = normalize(input.value);
      const tokens = query.split(/\s+/).filter(Boolean);
      const selected = category?.value || '';
      const active = tokens.length > 0 || selected !== '';
      if (active && !filtering) previousOpen = !!more?.open;
      let matches = 0;
      indexed.forEach(item => {
        const match = tokens.every(token => item.text.includes(token)) && (!selected || item.category === selected);
        item.element.hidden = !match;
        if (match) matches++;
      });
      primary.hidden = ![...primary.children].some(item => !item.hidden);
      if (more) {
        const extraMatches = [...more.querySelectorAll('[data-directory-entry]')].some(item => !item.hidden);
        more.hidden = active && !extraMatches;
        summary.hidden = active;
        if (active) more.open = true;
        else if (filtering) more.open = previousOpen;
      }
      result.hidden = !active;
      result.textContent = active ? `${matches} / ${entries.length}` : '';
      empty.hidden = matches !== 0;
      filtering = active;
    }
    input.addEventListener('input', update);
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        input.value = '';
        if (category) category.value = '';
        update();
      }
    });
    category?.addEventListener('change', update);
    tools.hidden = false;
  });
})();
