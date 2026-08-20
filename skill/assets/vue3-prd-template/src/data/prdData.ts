import type { PrdData } from "../types";

export const prdData: PrdData = {
  meta: {
    featureName: "示例功能",
    featureSlug: "sample-feature",
    version: "0.1.0",
    updatedAt: "2026-08-19 00:00 CST",
    status: "draft",
    summary: "这是一个 Vue3 PRD 工作台模板，请基于真实需求替换数据。",
  },
  roles: [
    { id: "user", label: "普通用户", description: "默认体验角色" },
    { id: "reviewer", label: "需求评审", description: "查看标注和评论" },
  ],
  scenarios: [
    { id: "normal", label: "正常流程", description: "用户完成核心操作" },
    { id: "exception", label: "异常流程", description: "校验、权限或接口异常" },
  ],
  states: [
    { id: "normal", label: "正常", description: "默认可操作状态" },
    { id: "error", label: "错误", description: "展示用户可理解的失败原因" },
  ],
  requirements: [
    {
      id: "REQ-001",
      title: "核心操作入口",
      description: "用户可以识别并进入功能的核心操作。",
      priority: "must",
      screens: ["主界面"],
      interactions: ["入口点击"],
      states: ["normal"],
      acceptanceCriteria: ["入口清晰可见", "点击后反馈明确"],
    },
  ],
  featureGroups: [
    {
      id: "core",
      title: "01 核心能力",
      description: "功能主链路和关键边界。",
      priority: 1,
      reqIds: ["REQ-001"],
      files: [
        {
          id: "file-core-flow",
          title: "流程图：核心链路",
          description: "展示核心操作从进入到完成的路径。",
          type: "flowchart",
          sectionId: "board-core-flow",
          reqIds: ["REQ-001"],
        },
        {
          id: "file-core-snapshot",
          title: "快照：核心操作",
          description: "展示高保真操作快照和旁侧标注。",
          type: "snapshot",
          sectionId: "board-core-snapshot",
          reqIds: ["REQ-001"],
        },
      ],
    },
  ],
  boardSections: [
    {
      id: "board-core-flow",
      title: "核心链路流程图",
      description: "每个大功能目录的第一个文件放流程图，先说明用户路径。",
      type: "flowchart",
      reqIds: ["REQ-001"],
      frames: [
        {
          id: "frame-core-flow",
          title: "核心操作流程",
          subtitle: "Mermaid 流程图",
          kind: "flow",
          reqIds: ["REQ-001"],
          chips: ["流程图", "Mermaid"],
          bullets: ["替换为真实业务路径", "把关键节点绑定到 REQ ID"],
          diagram: {
            type: "flowchart",
            code: `flowchart TD
  A["进入功能"] --> B["识别核心入口"]
  B --> C["填写或选择必要信息"]
  C --> D{"校验通过?"}
  D -->|"是"| E["完成核心操作"]
  D -->|"否"| F["展示可理解提示"]`,
          },
          annotations: [
            {
              id: "ann-core-flow",
              reqId: "REQ-001",
              index: 1,
              title: "核心链路",
              detail: "流程图说明用户从进入到完成的主路径。",
              x: 54,
              y: 34,
            },
          ],
        },
      ],
      notes: ["可在真实需求中继续加入 Mermaid mindmap 文件，用于展示概念结构。"],
    },
    {
      id: "board-core-snapshot",
      title: "核心操作快照",
      description: "用高保真操作快照承载 PRD 标注，而不是抽象说明卡片。",
      type: "snapshot",
      reqIds: ["REQ-001"],
      frames: [
        {
          id: "frame-main",
          title: "主界面默认态",
          subtitle: "核心入口和状态反馈",
          kind: "snapshot",
          reqIds: ["REQ-001"],
          chips: ["PRD 标注", "高保真"],
          bullets: ["替换为真实业务屏幕", "把标注绑定到 REQ ID"],
          snapshot: {
            tabId: "mode-a",
            stateId: "normal",
            caption: "默认操作快照",
            message: "把这里替换为真实功能的高保真演示界面。",
            fieldValues: {
              "field-sample": "示例内容",
            },
            agreementAccepted: true,
          },
          annotations: [
            {
              id: "ann-core-entry",
              reqId: "REQ-001",
              index: 2,
              title: "核心入口",
              detail: "标注应说明用户为什么能识别这里可以操作。",
              x: 56,
              y: 44,
            },
          ],
        },
      ],
      notes: ["这里记录跨屏说明、边界和待确认问题。"],
    },
  ],
  prototype: {
    screens: [
      {
        id: "screen-main",
        title: "主界面",
        reqIds: ["REQ-001"],
        eyebrow: "原型",
        headline: "示例功能",
        subhead: "把这里替换为真实功能的高保真演示界面。",
        tabs: [
          { id: "mode-a", label: "模式 A" },
          { id: "mode-b", label: "模式 B" },
        ],
        fields: [
          {
            id: "field-sample",
            label: "示例字段",
            value: "示例内容",
            placeholder: "请输入示例内容",
            inputType: "text",
            reqId: "REQ-001",
          },
        ],
        actions: [
          {
            id: "action-submit",
            label: "提交",
            reqId: "REQ-001",
            variant: "primary",
            behavior: "展示成功反馈",
            targetState: "normal",
          },
        ],
        statePanels: [
          { id: "normal", label: "正常", description: "展示默认状态。" },
          { id: "error", label: "错误", description: "展示失败原因和重试入口。" },
        ],
        legalReqId: "REQ-001",
        legalCopy: "我已阅读并同意相关协议",
      },
    ],
  },
  comments: [
    {
      id: "comment-001",
      annotationId: "ann-core-entry",
      author: "产品评审",
      text: "请在真实需求中补充入口展示条件和不可用状态。",
      createdAt: "当前草稿",
      status: "open",
    },
  ],
  versionHistory: [
    { id: "draft", label: "当前草稿 · 未定版", status: "draft" },
  ],
};
