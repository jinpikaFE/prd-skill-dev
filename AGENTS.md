# PRD Skill 开发规则

- 本仓库 `skill/` 是 `prd` 技能唯一源码；`/Users/edy/.codex/skills/prd` 是验证后的安装副本，禁止直接作为开发源修改。
- PRD 工作台固定使用 Ant Design Vue；移动端高保真原型使用 Vant，桌面端高保真原型使用 Ant Design Vue。
- 工作台说明性悬浮提示统一使用 Ant Design Vue `Tooltip`，不得在按钮、菜单项、链接或输入控件上使用原生 `title`；弹窗可见标题和 iframe 无障碍名称不受此限制。
- 工作台顶部固定提供“打开当前原型所在文件夹”图标操作；草稿打开项目根目录，定版打开对应版本目录，浏览器不得提交任意文件系统路径。
- 工作台单行或多行文本截断场景优先使用 `EllipsisTooltipText.vue`，由组件检测真实溢出后再显示完整内容提示。
- Ant Design Vue `Select` 的长选项不得依赖字符串标签自动生成的原生 `title`；使用组件节点标签和 `EllipsisTooltipText` 接管溢出提示。
- 工作台展示 `REQ-###` 标签时统一使用 `RequirementTag.vue`，Tooltip 至少包含需求标题、说明和首条验收标准。
- `skill/assets/vue3-prd-template/src/workbench/`、入口、Store 和工作台样式属于锁定模板；业务生成只修改 `src/prototype/`、`src/data/prdData.ts` 和需求文档。
- `skill/assets/vue3-prd-template/src/prototype/main.ts` 属于锁定启动入口，固定负责平台 UI 库注册和样式加载；业务原型不得覆盖。
- 禁止使用 `localStorage`、`sessionStorage` 或 IndexedDB 保存评审、评论和版本数据。
- 本地历史版本和线上评审中，定版内容与产品标注只读；本地历史版本可新增匿名评论，每条评论必须保存并展示创建日期。
- 定版时的冻结评论保留在 `review-data.json`，定版后新增评论保存在对应版本的 `review-comments.json`；线上评论由目标部署平台按 `deployment-handoff.json` 接入，未接入前保持只读。
- 工作台“生成发布包”只打包定版历史并输出 ZIP，不直接调用任何部署平台；生成日期以北京时间可读格式展示，并提供固定动作打开 `publish/` 目录。发布话术必须说明历史切换和画布拖动缩放已内置，只有匿名评论存储属于可选部署适配。
- 修改模板后运行清单生成、PRD 包校验、技能结构校验和模板构建，再同步安装副本。
- 发版、删除版本、删除标注和删除评论必须二次确认；历史版本读取独立目录数据，不读取草稿评审状态。
