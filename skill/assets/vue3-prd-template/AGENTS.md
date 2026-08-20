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

## 数据与版本

- 禁止使用 `localStorage`、`sessionStorage`、IndexedDB 或其他浏览器存储保存评审数据。
- 草稿标注、标注编辑、删除标注 ID 和评论写入 `review-data/draft.json`。
- 定版、重命名和删除是文件操作；定版版本读取自身目录中的 `review-data.json`，不得读取当前草稿数据。
- 发版及所有删除操作必须二次确认。历史版本中的标注和评论只读。

## 验证

- 使用 pnpm 安装依赖，项目只保留 `pnpm-lock.yaml`。
- 修改后运行 `pnpm build`，并使用 PRD 技能的 `validate_prd_package.mjs` 校验包结构、需求映射、UI 库隔离和工作台锁定清单。
