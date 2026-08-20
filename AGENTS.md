# PRD Skill 开发规则

- 本仓库 `skill/` 是 `prd` 技能唯一源码；`/Users/edy/.codex/skills/prd` 是验证后的安装副本，禁止直接作为开发源修改。
- PRD 工作台固定使用 Ant Design Vue；移动端高保真原型使用 Vant，桌面端高保真原型使用 Ant Design Vue。
- `skill/assets/vue3-prd-template/src/workbench/`、入口、Store 和工作台样式属于锁定模板；业务生成只修改 `src/prototype/`、`src/data/prdData.ts` 和需求文档。
- 禁止使用 `localStorage`、`sessionStorage` 或 IndexedDB 保存评审、评论和版本数据。
- 修改模板后运行清单生成、PRD 包校验、技能结构校验和模板构建，再同步安装副本。
- 发版、删除版本、删除标注和删除评论必须二次确认；历史版本读取独立目录数据，不读取草稿评审状态。
