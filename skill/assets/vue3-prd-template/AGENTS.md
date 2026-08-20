# PRD 生成项目规则

## 可修改范围

- `src/prototype/`：高保真产品原型和场景运行时。
- `src/data/prdData.ts`：需求、功能目录、画布、场景和原型数据。
- `src/data/generatedDocs.ts`、`prd.md`、`requirements.json`、`traceability-matrix.md`、`ai-handoff.md`、`CHANGELOG.md`：同源需求文档。
- `review-data/`、`versions/`：由工作台文件接口维护的草稿与定版 JSON 数据。

## 锁定范围

- `.prd-template.json` 中 `lockedFiles` 列出的文件是工作台模板，不随具体业务原型修改。
- `index.html` 和 `src/workbench/` 固定使用 Ant Design Vue。
- `prototype.html` 通过 iframe 加载产品原型；移动端原型使用 Vant，桌面端原型使用 Ant Design Vue。
- 禁止在工作台入口或工作台组件中导入 Vant、Vant CSS 或使用 `van-*` 组件。
- 工作台按钮、菜单项、链接和输入控件需要悬浮说明时，使用 Ant Design Vue `Tooltip`，不得使用原生 `title`。弹窗可见标题、iframe 无障碍名称和业务数据中的 `title` 字段不属于悬浮提示。
- 工作台文本需要单行或多行截断时，优先使用 `src/workbench/components/internal/EllipsisTooltipText.vue`；默认仅在真实溢出时展示完整文本 Tooltip，必须始终提示的说明场景显式使用 `tooltip-trigger="always"`。
- Ant Design Vue `Select` 的长标签使用组件节点承载并复用 `EllipsisTooltipText`，不得让字符串标签生成浏览器原生 `title` 提示。
- 工作台中的 `REQ-###` 标签统一复用 `src/workbench/components/internal/RequirementTag.vue`，通过 Ant Design Vue Tooltip 展示需求标题、说明和首条验收标准。
- 工作台顶部“打开当前原型所在文件夹”操作属于锁定能力；草稿打开项目根目录，定版打开对应版本目录，原型业务代码不得改写其文件接口或传入任意路径。

## 数据与版本

- 禁止使用 `localStorage`、`sessionStorage`、IndexedDB 或其他浏览器存储保存评审数据。
- 草稿标注、标注编辑、删除标注 ID 和评论写入 `review-data/draft.json`。
- 定版、重命名和删除是文件操作；定版版本读取自身目录中的 `review-data.json`，不得读取当前草稿数据。定版后的新评论单独写入该版本的 `review-comments.json`。
- 发版及所有删除操作必须二次确认。历史版本中的产品标注只读，可继续拖动、缩放并添加匿名评论；历史评论不可编辑或删除。
- 每条评论必须包含 `createdAt`，右侧评论列表必须展示创建日期。线上评审不提供草稿、版本管理、打开目录和打包操作；只有部署平台按 `deployment-handoff.json` 接入评论接口后，页面才开放匿名评论。
- “生成发布包”只生成包含全部定版历史的 ZIP，并写入 `published-state.json` 与 `deployment-handoff.json`，不得在模板内绑定 Vercel 或其他特定平台。生成日期使用北京时间可读格式，工作台只通过固定接口打开 `publish/` 目录；发布话术说明历史切换和画布拖动缩放已内置，只有匿名评论存储属于可选部署适配。

## 验证

- 使用 pnpm 安装依赖，项目只保留 `pnpm-lock.yaml`。
- 修改后运行 `pnpm build`，并使用 PRD 技能的 `validate_prd_package.mjs` 校验包结构、需求映射、UI 库隔离和工作台锁定清单。
