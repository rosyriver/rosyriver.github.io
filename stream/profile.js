/* Public profile display, with local-only editing in the writing desk. */
(() => {
  const script = document.currentScript;
  const profileUrl = new URL(script.dataset.profileUrl, location.href);
  const defaultAvatar = new URL(script.dataset.avatarUrl, location.href).href;
  const editable = script.dataset.profileEditor === 'true';
  const defaults = {name:'VarKai', signature:'一些念头，一些正在发生的生活。', avatar:''};
  let saved = {...defaults}, avatar = '';
  function avatarSource(value) {
    if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value || '')) return value;
    return defaultAvatar;
  }
  function display(profile) {
    saved = {...defaults, ...profile};
    document.querySelectorAll('#stream-profile-name').forEach(el => { el.textContent = saved.name; });
    document.querySelectorAll('[data-profile-signature]').forEach(el => {
      el.textContent = saved.signature;
      el.hidden = !saved.signature;
    });
    document.querySelectorAll('[data-profile-avatar]').forEach(el => {
      el.src = avatarSource(saved.avatar);
      el.alt = saved.name + ' 的头像';
    });
  }
  async function refresh() {
    try {
      const response = await fetch(profileUrl, {cache:'no-store'});
      if (response.ok) display(await response.json());
    } catch { /* The initial markup remains usable when offline. */ }
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
      <button class="btn btn_small" type="button" data-reset-avatar>恢复默认</button>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-avatar-file hidden>
    </div>
    <label>昵称<input name="name" maxlength="80" required autocomplete="nickname"></label>
    <label>个签<textarea name="signature" maxlength="240" rows="3"></textarea></label>
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
  button.addEventListener('click', async () => {
    await refresh();
    form.elements.name.value = saved.name;
    form.elements.signature.value = saved.signature;
    avatar = saved.avatar || '';
    avatarPreview.src = avatarSource(avatar);
    file.value = '';
    status.textContent = '';
    dialog.showModal();
  });
  dialog.querySelector('[data-cancel-profile]').onclick = () => dialog.close();
  dialog.querySelector('[data-choose-avatar]').onclick = () => file.click();
  dialog.querySelector('[data-reset-avatar]').onclick = () => {
    avatar = '';
    file.value = '';
    avatarPreview.src = defaultAvatar;
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
