// 增加分类：在 categories 添加一个名称；条目的 category 使用相同名称。
// 添加真实链接：填写 url，移除示例名称，并将 demo 改为 false。
window.COLLECTION = {
  categories: ['AI 工具', '网络工具', '效率办公', '云服务'],
  tools: [
    { name: 'TRAE', category: 'AI 工具', reason: 'AI 编程工具，辅助完成编程与开发任务。', featured: true, url: 'https://www.trae.cn/events/code-fission/NFNJRDJ23GAB?utm_source=copy_link&utm_medium=code_fission', demo: false },
    { name: 'AI 图像创作', category: 'AI 工具', icon: '◈', color: 'pink', description: '把脑海里的画面变成视觉灵感，探索更多创作可能。', tags: ['图像', '设计'], url: '', demo: true },
    { name: '网络连接服务', category: '网络工具', icon: '◎', color: 'blue', description: '网络服务推荐位，可补充适用设备、使用体验与套餐信息。', tags: ['网络', '多设备'], url: '', demo: true },
    { name: '笔记与知识管理', category: '效率办公', icon: '▤', color: 'sand', description: '收纳零散想法、项目资料和阅读笔记，让知识井井有条。', tags: ['笔记', '知识库'], url: '', demo: true },
    { name: '自动化工作流', category: '效率办公', icon: '⌘', color: 'purple', description: '连接日常工具，把重复步骤交给自动化，留出专注的时间。', tags: ['自动化', '效率'], url: '', demo: true },
    { name: '云服务器 / VPS', category: '云服务', icon: '▱', color: 'peach', description: '为个人网站和小项目准备的云服务推荐位。', tags: ['VPS', '建站'], url: '', demo: true }
  ]
};
