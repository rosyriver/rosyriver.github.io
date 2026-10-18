/* Public profile display, with local-only editing in the writing desk. */
(() => {
  const script = document.currentScript;
  const profileUrl = new URL(script.dataset.profileUrl, location.href);
  const editable = script.dataset.profileEditor === 'true';
  let saved = {name:'', signature:'', avatar:''}, avatar = '', hasLoaded = false;
  function avatarSource(value) {
    if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value || '')) return value;
    return '';
  }
  function display(profile) {
    saved = {name:typeof profile.name === 'string' ? profile.name : '', signature:typeof profile.signature === 'string' ? profile.signature : '', avatar:avatarSource(profile.avatar)};
    hasLoaded = true;
    document.querySelectorAll('#stream-profile-name').forEach(el => { el.textContent = saved.name; });
    document.querySelectorAll('[data-profile-signature]').forEach(el => {
      el.textContent = saved.signature;
      el.hidden = !saved.signature;
    });
    document.querySelectorAll('[data-profile-avatar]').forEach(el => {
      el.hidden = !saved.avatar;
      if (saved.avatar) el.src = saved.avatar;
      else el.removeAttribute('src');
      el.alt = saved.name ? saved.name + ' 的头像' : '';
    });
    document.querySelectorAll('[data-profile-initial]').forEach(el => { el.textContent = Array.from(saved.name)[0] || ''; el.hidden = !!saved.avatar; });
    document.querySelectorAll('.stream-profile').forEach(el => {
      el.dataset.profileState = 'ready';
      el.setAttribute('aria-busy', 'false');
      if (!editable) el.hidden = !saved.name;
    });
    const message = document.querySelector('[data-profile-message]');
    if (message) message.hidden = true;
  }
  async function refresh() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(profileUrl, {cache:'no-store', signal:controller.signal});
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
      display(data);
      return true;
    } catch {
      // Keep generated public markup intact; never substitute sample identity data.
      if (editable && !hasLoaded) {
        document.querySelector('.stream-profile').dataset.profileState = 'error';
        document.querySelector('.stream-profile').setAttribute('aria-busy', 'false');
        const message = document.querySelector('[data-profile-message]');
        if (message) message.hidden = false;
      }
      return false;
    } finally { clearTimeout(timeout); }
  }
  refresh();
  if (!editable) {
    if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') setInterval(refresh, 2500);
    return;
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'profile_editor';
  dialog.setAttribute('aria-labelledby', 'profileEditorTitle');
  dialog.innerHTML = `<form>
    <h2 id="profileEditorTitle">个人资料</h2>
    <div class="profile_avatar_choice">
      <img data-avatar-preview alt="头像预览">
      <button class="btn btn_small" type="button" data-choose-avatar>更换头像</button>
      <button class="btn btn_small" type="button" data-reset-avatar>移除头像</button>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-avatar-file hidden>
    </div>
    <label>昵称<input name="name" maxlength="80" required autocomplete="nickname"></label>
    <label>签名<textarea name="signature" maxlength="240" rows="3"></textarea></label>
    <p class="profile_editor_status" role="status" aria-live="polite"></p>
    <div class="profile_editor_actions">
      <button class="btn" type="button" data-cancel-profile>取消</button>
      <button class="btn btn_primary" type="submit">保存资料</button>
    </div>
  </form>`;
  document.body.appendChild(dialog);
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[role=status]');
  const file = dialog.querySelector('[data-avatar-file]');
  const avatarPreview = dialog.querySelector('[data-avatar-preview]');
  const submit = form.querySelector('[type=submit]');
  let processingAvatar = false;
  const button = document.getElementById('btnProfile');
  let editorOpening = false;
  async function openEditor(focus = 'name') {
    if (editorOpening || dialog.open) return;
    editorOpening = true;
    const loaded = await refresh();
    editorOpening = false;
    if (!loaded && !hasLoaded) { if (typeof notify === 'function') notify('资料暂时无法加载，请稍后重试。', 'error'); return; }
    form.elements.name.value = saved.name;
    form.elements.signature.value = saved.signature;
    avatar = saved.avatar || '';
    if (avatar) avatarPreview.src = avatar;
    avatarPreview.hidden = !avatar;
    if (!avatar) avatarPreview.removeAttribute('src');
    file.value = '';
    status.textContent = '';
    dialog.showModal();
    if (focus === 'avatar') dialog.querySelector('[data-choose-avatar]').focus();
    else form.elements[focus].focus();
  }
  button.addEventListener('click', () => openEditor());
  document.querySelector('[data-edit-avatar]')?.addEventListener('click', () => openEditor('avatar'));
  const copy = document.querySelector('.is-write .stream-profile-copy');
  if (copy) {
    copy.tabIndex = 0;
    copy.setAttribute('role', 'button');
    copy.setAttribute('aria-label', '修改昵称和签名');
    copy.addEventListener('click', event => openEditor(event.target.closest('[data-profile-signature]') ? 'signature' : 'name'));
    copy.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openEditor(); }
    });
  }
  dialog.querySelector('[data-cancel-profile]').onclick = () => dialog.close();
  dialog.querySelector('[data-choose-avatar]').onclick = () => file.click();
  dialog.querySelector('[data-reset-avatar]').onclick = () => {
    avatar = '';
    file.value = '';
    avatarPreview.hidden = true;
    avatarPreview.removeAttribute('src');
  };
  file.onchange = async () => {
    const selected = file.files[0];
    if (!selected) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(selected.type) || selected.size > 10 * 1024 * 1024) {
      status.textContent = '请选择 10 MB 以内的 PNG、JPG、WebP 或 GIF 图片。';
      return;
    }
    processingAvatar = true;
    submit.disabled = true;
    try {
      const bitmap = await createImageBitmap(selected);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const side = Math.min(bitmap.width, bitmap.height);
      canvas.getContext('2d').drawImage(bitmap, (bitmap.width-side)/2, (bitmap.height-side)/2, side, side, 0, 0, 256, 256);
      bitmap.close();
      avatar = canvas.toDataURL('image/png');
      avatarPreview.src = avatar;
      avatarPreview.hidden = false;
      status.textContent = '头像已准备好，保存后生效。';
    } catch { status.textContent = '这张图片无法读取，请换一张。'; }
    finally { processingAvatar = false; submit.disabled = false; }
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (processingAvatar) return;
    const profile = {name:form.elements.name.value.trim(), signature:form.elements.signature.value.trim(), avatar};
    if (!profile.name) { status.textContent = '请填写昵称。'; return; }
    submit.disabled = true;
    status.textContent = '正在保存…';
    try {
      const response = await fetch('/api/profile', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(profile)});
      if (!response.ok) throw new Error();
      display(await response.json());
      dialog.close();
      if (typeof notify === 'function') notify('个人资料已保存', 'success');
    } catch { status.textContent = '保存失败，请稍后重试。'; }
    finally { submit.disabled = false; }
  });
  document.addEventListener('keydown', event => {
    if (dialog.open && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      event.stopImmediatePropagation();
      form.requestSubmit();
    }
  }, true);
})();
