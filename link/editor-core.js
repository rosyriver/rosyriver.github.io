(function(root){
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validUrl(v){try{const u=new URL(v);return /^https?:$/.test(u.protocol)&&!/\s/.test(v)&&!u.username&&!u.password;}catch{return false;}}
function parseShare(text){
 const matches=String(text).match(/https?:\/\/[^\s<>"'，。！？；）】]+/gi)||[];
 const urls=[...new Set(matches.map(u=>u.replace(/[.,!?;]+$/,'')))].filter(validUrl);
 if(urls.length!==1)return {url:'',text:text.trim(),error:urls.length?'识别到多个链接，请保留你想推广的那个链接。':'没有找到有效的 http:// 或 https:// 链接。'};
 return {url:urls[0],text:text.replace(urls[0],'').trim(),error:''};
}
const DEFAULT_CTA = '邀请链接';
const REASON_LIMIT = 1002;
const VERSION = 3;
const OLD_DEFAULTS = new Set(['了解工具', '查看邀请福利', '领取新用户积分']);
function blankLink(){return {name:'新工具',url:'',reason:'',cta:DEFAULT_CTA,featured:false,shareText:''};}
function normalize(raw){
 if(!raw||![1,2,VERSION].includes(raw.version)||!raw.profile||!Array.isArray(raw.categories)||raw.categories.length>100)throw Error('不是受支持的清单备份文件。');
 const str=(v,max,optional=false)=>{if(optional&&v===undefined)return '';if(typeof v!=='string'||v.length>max)throw Error('备份字段格式或长度不正确。');return v;};
 const legacy = raw.version < VERSION;
 return {version:VERSION,profile:{name:str(raw.profile.name,80),bio:str(raw.profile.bio,240),disclosure:str(raw.profile.disclosure,1000)},categories:raw.categories.map(c=>{
 if(!c||!Array.isArray(c.links)||c.links.length>500)throw Error('分类或链接格式不正确。');
 return {name:str(c.name,80),links:c.links.map(l=>{
 const reason = str(l?.reason, legacy ? 400 : REASON_LIMIT, true);
 const introduction = legacy ? str(l?.description, 600, true) : '';
 const cta = str(l?.cta, 30, true);
 const result = {
  name: str(l?.name, 120),
  url: str(l?.url, 4096),
  reason: legacy ? [...new Set([reason.trim(), introduction.trim()].filter(Boolean))].join('\n\n') : reason,
  cta: legacy && OLD_DEFAULTS.has(cta.trim()) ? DEFAULT_CTA : cta,
  featured: l.featured === true,
  shareText: str(l.shareText, 8000, true),
 };
 if(!validUrl(result.url)&&result.url.trim()){const p=parseShare(result.url);if(!p.error){result.shareText=result.shareText||result.url;result.url=p.url;}}
 if(raw.version===1&&!result.reason&&/^https?:\/\/(?:www\.)?trae\.cn\//i.test(result.url)) result.reason='AI 编程工具，辅助完成编程与开发任务。';
 return result;
 })};})};
}
function defaults(collection){return normalize({version:VERSION,profile:{name:'joyseen',bio:'分享值得一试的工具，让工作与生活轻一点。',disclosure:'部分链接为推广链接，通过链接注册或购买，我可能获得奖励。请按需选择，活动权益与服务条款以官方页面为准。'},categories:collection.categories.map(name=>({name,links:collection.tools.filter(t=>t.category===name).map(t=>({...blankLink(),name:t.name,url:t.demo?'':t.url,reason:t.reason||'',featured:!!t.featured}))}))});}
function problems(data){const errors=[];if(!data.profile.name.trim())errors.push('请填写昵称。');const names=new Set();data.categories.forEach((c,i)=>{if(!c.name.trim())errors.push('第 '+(i+1)+' 个分类需要名称。');else if(names.has(c.name.trim()))errors.push('分类「'+c.name+'」重名了。');names.add(c.name.trim());c.links.forEach((l,j)=>{if(!l.name.trim())errors.push('「'+c.name+'」第 '+(j+1)+' 个工具需要名称。');if(l.url.trim()&&!validUrl(l.url.trim()))errors.push('「'+l.name+'」的链接无效；整段文案可使用「提取链接」。');});});return errors;}
function toolRow(link) {
 const url = link.url.trim();
 const live = validUrl(url);
 const reason = link.reason.trim();
 const name = '<span class="tool-name" title="' + esc(link.name) + '">' + esc(link.name) + '</span>';
 const main = reason
  ? '<details class="tool-info"><summary class="tool-row">' + name + '<span class="description">' + esc(reason) + '</span>' +
    '<span class="detail-toggle" aria-hidden="true"></span></summary><div class="tool-detail">' +
    '<p>' + esc(reason) + '</p></div></details>'
  : '<div class="tool-row">' + name + '</div>';
 const label = link.cta.trim() || DEFAULT_CTA;
 const action = live
  ? '<a class="visit" href="' + esc(url) + '" target="_blank" rel="sponsored noopener noreferrer" title="' +
    esc(label) + '">' + esc(label) + '</a>'
  : '<span class="pending">待添加</span>';
 return '<article class="tool' + (link.featured ? ' featured' : '') + '">' + main + action + '</article>';
}

function body(data) {
 const groups = data.categories.filter(category => category.links.length);
 const sections = groups.map(category => '<section class="collection"><h2>' + esc(category.name) +
  '</h2><div class="tool-list">' + category.links.map(toolRow).join('') + '</div></section>');
 return '<main class="page"><header class="page-header"><h1>' + esc(data.profile.name) +
  '<span class="brand-dot" aria-hidden="true"></span></h1><p>' + esc(data.profile.bio) + '</p></header>' +
  sections.join('') + '<footer class="page-footer">' +
  esc(data.profile.disclosure).replace(/\n/g, '<br>') + '</footer></main>';
}
function setupReasonDisclosure() {
 const rows = Array.from(document.querySelectorAll('.tool-info'), details => {
  const summary = details.querySelector('summary');
  const description = summary.querySelector('.description');
  const toggle = summary.querySelector('.detail-toggle');
  summary.addEventListener('click', event => {
   if (toggle.hidden) event.preventDefault();
  });
  return {details, summary, description, toggle};
 });

 function refresh() {
  // Measure the space available before the disclosure icon takes any of it.
  rows.forEach(({toggle}) => { toggle.hidden = true; });
  const overflow = rows.map(({description}) => description.scrollWidth > description.clientWidth);
  rows.forEach(({details, summary, toggle}, index) => {
   toggle.hidden = !overflow[index];
   if (overflow[index]) {
    summary.removeAttribute('tabindex');
    summary.removeAttribute('aria-disabled');
   } else {
    details.open = false;
    summary.tabIndex = -1;
    summary.setAttribute('aria-disabled', 'true');
   }
  });
 }

 if (rows.length) {
  refresh();
  window.addEventListener('resize', refresh);
  document.fonts?.ready.then(refresh);
 }
}

function html(data, css) {
 return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
  esc(data.profile.name) + ' · 工具清单</title><meta name="description" content="' + esc(data.profile.bio) +
  '"><style>' + css + '</style></head><body>' + body(data) + '<script>(' + setupReasonDisclosure.toString() +
  ')();</script></body></html>';
}
root.LinkEditor={defaults,normalize,problems,html,body,validUrl,parseShare,blankLink,DEFAULT_CTA,REASON_LIMIT,VERSION};
})(typeof window==='undefined'?globalThis:window);
