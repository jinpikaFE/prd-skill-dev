# 变更记录

## 0.2.0 - 2026-08-20 11:04 CST

- 工作台固定使用 Ant Design Vue，移动端原型使用 Vant，桌面端原型使用 Ant Design Vue。
- 新增独立 `prototype.html` 和 iframe 隔离，避免原型 UI 库样式影响工作台。
- 新增 `targetPlatform`、原型视口配置、模板锁定清单和工作台漂移校验。

## 0.1.0 - 2026-08-19 00:00 CST

- 新增 Vue3 + Vite + TypeScript + Pinia + Vant + markdown-it + Mermaid PRD 工作台模板。
- 新增左侧目录 / 文件菜单、流程图画布、高保真快照标注、评论定位和文档查看能力。
- 新增产品标注和临时评论分离展示、编辑、删除和定位能力。
- 新增文件存储规则：草稿写入 `review-data/draft.json`，版本索引写入 `versions/index.json`，发版生成 `versions/vX.Y.Z/` 和版本 `review-data.json`。
- 新增发版按钮、版本重命名/删除，以及发版/删除动作二次确认。
- 新增 pnpm 默认安装配置和 Node/pnpm 版本约束。
