import type { GeneratedDoc } from "../types";
import changelogText from "../../CHANGELOG.md?raw";
import handoffText from "../../ai-handoff.md?raw";
import prdText from "../../prd.md?raw";
import requirementsText from "../../requirements.json?raw";
import traceabilityText from "../../traceability-matrix.md?raw";

export const generatedDocs: GeneratedDoc[] = [
  {
    id: "prd",
    title: "PRD 文档",
    fileName: "prd.md",
    summary: "人读的结构化产品需求说明。",
    content: prdText,
  },
  {
    id: "requirements",
    title: "需求数据",
    fileName: "requirements.json",
    summary: "机器可读的需求、场景、字段和验收数据。",
    content: requirementsText,
  },
  {
    id: "traceability",
    title: "追踪矩阵",
    fileName: "traceability-matrix.md",
    summary: "需求 ID 到原型位置和验收信号的映射。",
    content: traceabilityText,
  },
  {
    id: "handoff",
    title: "AI 需求说明",
    fileName: "ai-handoff.md",
    summary: "给 AI 编码助手读取的功能点、边界、状态和风险说明。",
    content: handoffText,
  },
  {
    id: "changelog",
    title: "变更记录",
    fileName: "CHANGELOG.md",
    summary: "当前草稿和定版版本的变更说明。",
    content: changelogText,
  },
];
