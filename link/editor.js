const core=window.LinkEditor,KEY='joyseen-link-editor-v1';
const $=id=>document.getElementById(id);
let model=core.defaults(window.COLLECTION),history=[],active=0,expanded=-1,saveTimer,previewTimer,previewUrl,toastTimer,failedLoad=false;
function status(text){$('status').textContent=text;}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
try{const saved=localStorage.getItem(KEY);if(saved){const raw=JSON.parse(saved);model=core.normalize(raw);if(raw.version<core.VERSION&&!localStorage.getItem(KEY+'-before-v3'))localStorage.setItem(KEY+'-before-v3',saved);status('已恢复草稿 · 旧版内容已兼容');}else status('仅保存到当前浏览器');}catch{failedLoad=true;status('原草稿未改动。读取失败，请先备份或导入有效文件。');}
function snapshot(){const s=JSON.stringify(model);if(history.at(-1)!==s)history.push(s);if(history.length>30)history.shift();$('undo').disabled=false;}
function save(){clearTimeout(saveTimer);if(failedLoad){status('原草稿受保护，请导入有效备份后再保存。');return;}try{localStorage.setItem(KEY,JSON.stringify(model));status('已保存 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}));}catch{status('保存失败，请立即导出备份。');}}
function preview(){clearTimeout(previewTimer);const errors=core.problems(model);$('errors').hidden=!errors.length;$('errors').textContent=errors.slice(0,8).join('\n');$('preview').srcdoc=core.html(model,window.PAGE_STYLE);}
function changed(){clearTimeout(previewTimer);previewTimer=setTimeout(preview,180);status('正在保存…');clearTimeout(saveTimer);saveTimer=setTimeout(save,350);}
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
const paths={up:'m7 14 5-5 5 5',down:'m7 10 5 5 5-5',trash:'M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7'};
function action(kind,title,fn,disabled=false){const b=node('button','icon-button');b.type='button';b.title=title;b.setAttribute('aria-label',title);b.disabled=disabled;b.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="'+paths[kind]+'" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';b.onclick=()=>{snapshot();fn();render();changed();};return b;}
function field(label,value,max,fn,options={}){const wrap=node('label');wrap.append(node('span','',label));const input=node(options.multiline?'textarea':'input');input.value=value||'';input.maxLength=max;if(options.multiline)input.rows=options.rows||3;if(options.placeholder)input.placeholder=options.placeholder;input.addEventListener('focus',snapshot);input.addEventListener('input',()=>{fn(input.value);changed();});wrap.append(input);return wrap;}
function move(list,i,d){[list[i],list[i+d]]=[list[i+d],list[i]];}
function renderTabs(){$('category-tabs').replaceChildren();model.categories.forEach((c,i)=>{const b=node('button',i===active?'selected':'',c.name||'未命名分类');b.setAttribute('aria-pressed',String(i===active));b.append(node('small','',c.links.length));b.onclick=()=>{active=i;expanded=-1;render();};$('category-tabs').append(b);});}
function parseInto(link,value){const p=core.parseShare(value);if(p.error){toast(p.error);return false;}snapshot();link.shareText=value;link.url=p.url;toast('已提取链接，原文保存在「分享原文」。');render();changed();return true;}
function render(){
 active=Math.min(active,Math.max(0,model.categories.length-1));renderTabs();
 for(const [id,key]of[['nickname','name'],['bio','bio'],['disclosure','disclosure']])$(id).value=model.profile[key];
 $('groups').replaceChildren();const category=model.categories[active];
 if(!category){$('groups').append(node('p','empty-category','先新增一个分类，再收集你的好工具。'));preview();return;}
 const settings=node('div','category-settings');settings.append(field('分类名称',category.name,80,v=>{category.name=v;renderTabs();}));
 const catActions=node('div','category-actions');catActions.append(action('up','上移分类 '+category.name,()=>{move(model.categories,active,-1);active--;},active===0),action('down','下移分类 '+category.name,()=>{move(model.categories,active,1);active++;},active===model.categories.length-1),action('trash','删除分类 '+category.name,()=>{model.categories.splice(active,1);toast('分类已删除，可撤销恢复。');}));settings.append(catActions);$('groups').append(settings);
 const rows = node('div', 'editor-rows');
 category.links.forEach((link,j)=>{
 const details=node('details','tool-editor');details.open=j===expanded;
 details.classList.toggle('is-featured', link.featured);
 details.addEventListener('toggle',()=>{if(details.open){expanded=j;for(const other of $('groups').querySelectorAll('.tool-editor'))if(other!==details)other.open=false;}});
 const summary=node('summary');const monogram=node('span','mini-icon',Array.from(link.name)[0]?.toUpperCase()||'·'),text=node('span','summary-text'),name=node('span','summary-name',link.name||'未命名工具'),desc=node('span','summary-desc',link.reason);text.append(name,desc);summary.append(monogram,text);if(link.featured)summary.append(node('span','star-badge','推荐'));summary.append(node('span','edit-label','编辑'));
 const fields=node('div','tool-fields'),toolbar=node('div','tool-toolbar'),checkLabel=node('label','featured-check'),check=node('input');check.type='checkbox';check.checked=link.featured;check.onchange=()=>{snapshot();link.featured=check.checked;render();changed();};checkLabel.append(check,document.createTextNode('设为重点推荐'));const controls=node('div','tool-actions');controls.append(action('up','上移工具 '+link.name,()=>{move(category.links,j,-1);expanded=j-1;},j===0),action('down','下移工具 '+link.name,()=>{move(category.links,j,1);expanded=j+1;},j===category.links.length-1),action('trash','删除工具 '+link.name,()=>{category.links.splice(j,1);expanded=0;toast('工具已删除，可撤销恢复。');}));toolbar.append(checkLabel,controls);
 const form=node('div','form-block'),first=node('div','field-row');first.append(field('工具名称',link.name,120,v=>{link.name=v;name.textContent=v||'未命名工具';monogram.textContent=Array.from(v)[0]?.toUpperCase()||'·';}),field('按钮文字',link.cta,30,v=>link.cta=v,{placeholder:core.DEFAULT_CTA}));
 form.append(first, field('推荐理由 · 选填', link.reason, core.REASON_LIMIT, value => {
  link.reason = value;
  desc.textContent = value;
 }, {multiline:true, rows:2, placeholder:'写下你的真实体验或适合的人群。'}));
 const urlRow = node('div','url-row');
 const urlField = field('推广链接 / 分享文案', link.url, 4096, value => link.url = value, {
  multiline:true, rows:2, placeholder:'粘贴 https:// 链接，或完整分享文案',
 });
 const parse = node('button','','提取链接');
 parse.onclick = () => parseInto(link, urlField.querySelector('textarea').value);
 urlRow.append(urlField, parse);
 form.append(urlRow, node('p','field-help','粘贴整段分享文案后，可提取链接并保留原文。'));
 const source=node('details','source-copy');source.append(node('summary','','分享原文（保留备查）'));source.append(field('原始分享内容',link.shareText,8000,v=>link.shareText=v,{multiline:true,rows:3,placeholder:'也可以把完整分享内容粘贴到这里。'}));const fromSource=node('button','','从原文提取链接');fromSource.onclick=()=>parseInto(link,link.shareText);source.append(fromSource);form.append(source);fields.append(toolbar,form);details.append(summary,fields);rows.append(details);
 });
 if(category.links.length)$('groups').append(rows);
 if(!category.links.length)$('groups').append(node('p','empty-category','这个分类还是空的，添加第一个工具吧。'));
 const add=node('button','add-link','＋ 添加工具');add.onclick=()=>{snapshot();category.links.push(core.blankLink());expanded=category.links.length-1;render();changed();};$('groups').append(add);$('undo').disabled=!history.length;preview();
}
for(const [id,key]of[['nickname','name'],['bio','bio'],['disclosure','disclosure']]){$(id).addEventListener('focus',snapshot);$(id).oninput=()=>{model.profile[key]=$(id).value;changed();};}
$('add-category').onclick=()=>{snapshot();let name='新分类',n=2;while(model.categories.some(c=>c.name===name))name='新分类 '+n++;model.categories.push({name,links:[]});active=model.categories.length-1;expanded=0;render();changed();$('groups').querySelector('input')?.focus();};
$('undo').onclick=()=>{const now=JSON.stringify(model);while(history.length&&history.at(-1)===now)history.pop();if(!history.length){$('undo').disabled=true;return;}model=JSON.parse(history.pop());render();changed();};
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('backup').onclick=()=>{let raw=JSON.stringify(model,null,2);if(failedLoad){try{raw=localStorage.getItem(KEY)||raw;}catch{}}else save();download('joyseen-links-backup.json',raw,'application/json;charset=utf-8');toast('已生成备份。');};
$('export').onclick=()=>{if(core.problems(model).length){preview();document.body.classList.remove('preview-mode');$('errors').scrollIntoView({behavior:'smooth'});toast('请先修正提示的内容，再导出。');return;}save();download('index.html',core.html(model,window.PAGE_STYLE),'text/html;charset=utf-8');toast('已生成独立 HTML，可直接打开或部署。');};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{const file=$('file').files[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('备份不能超过 2 MB。');const next=core.normalize(JSON.parse(await file.text()));if(!confirm('导入将替换当前草稿。导入后可撤销恢复，是否继续？'))return;snapshot();model=next;failedLoad=false;active=0;expanded=0;render();changed();toast('备份已导入。');}catch(e){toast('导入失败：'+e.message);}finally{$('file').value='';}};
function switchView(previewMode){document.body.classList.toggle('preview-mode',previewMode);$('edit-view').classList.toggle('active',!previewMode);$('preview-view').classList.toggle('active',previewMode);if(previewMode)preview();}
$('edit-view').onclick=()=>switchView(false);$('preview-view').onclick=()=>switchView(true);
window.addEventListener('pagehide',()=>{if(saveTimer)save();});render();
