export type WorkspaceView = "prd" | "prototype" | "docs";
export type TargetPlatform = "mobile" | "desktop";
export type RuntimeMode = "local" | "hosted";

export type RuntimeCapabilities = {
  runtime: RuntimeMode;
  hasDraft: boolean;
  canManageVersions: boolean;
  canManageAnnotations: boolean;
  canAddComments: boolean;
  canManageDraftComments: boolean;
  canPackage: boolean;
  canOpenFolder: boolean;
};

export type ReviewPackageStatus = {
  versionCount: number;
  publishDirectory: string;
  lastPackage?: {
    packagePath: string;
    fileName: string;
    generatedAt: string;
    sizeBytes: number;
  };
};

export type ReviewPackageResult = {
  packagePath: string;
  fileName: string;
  versionCount: number;
  generatedAt: string;
  sizeBytes: number;
  codexPrompt: string;
};

export type Choice = {
  id: string;
  label: string;
  description?: string;
};

export type Requirement = {
  id: string;
  title: string;
  description: string;
  priority: "must" | "should" | "could";
  screens: string[];
  interactions: string[];
  states: string[];
  acceptanceCriteria: string[];
};

export type FeatureFile = {
  id: string;
  title: string;
  description: string;
  type: "flowchart" | "mindmap" | "snapshot";
  sectionId: string;
  reqIds: string[];
};

export type FeatureGroup = {
  id: string;
  title: string;
  description: string;
  priority: number;
  reqIds: string[];
  files: FeatureFile[];
};

export type BoardAnnotation = {
  id: string;
  reqId: string;
  index: number;
  title: string;
  detail: string;
  x: number;
  y: number;
  source?: "generated" | "product" | "review";
};

export type CanvasAnnotation = BoardAnnotation & {
  frameId: string;
  source: "product";
};

export type AnnotationPatch = Pick<BoardAnnotation, "title" | "detail" | "reqId">;

export type BoardFrameSnapshot = {
  sceneId?: string;
  tabId?: string;
  stateId?: string;
  caption?: string;
  message?: string;
  fieldValues?: Record<string, string>;
  agreementAccepted?: boolean;
};

export type BoardDiagram = {
  type: "flowchart" | "mindmap";
  code: string;
};

export type BoardFrame = {
  id: string;
  title: string;
  subtitle: string;
  kind: "snapshot" | "flow" | "mindmap" | "note";
  reqIds: string[];
  chips: string[];
  bullets: string[];
  snapshot?: BoardFrameSnapshot;
  diagram?: BoardDiagram;
  annotations: BoardAnnotation[];
};

export type BoardSection = {
  id: string;
  title: string;
  description: string;
  type: "flowchart" | "mindmap" | "snapshot";
  reqIds: string[];
  frames: BoardFrame[];
  notes: string[];
};

export type PrototypeField = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  helper?: string;
  inputType?: "text" | "tel" | "password" | "number";
  reqId?: string;
  tabIds?: string[];
  state?: "normal" | "error" | "disabled" | "readonly";
};

export type PrototypeAction = {
  id: string;
  label: string;
  reqId: string;
  variant: "primary" | "secondary" | "ghost";
  behavior: string;
  tabIds?: string[];
  targetState?: string;
};

export type PrototypeScreen = {
  id: string;
  title: string;
  reqIds: string[];
  eyebrow: string;
  headline: string;
  subhead: string;
  tabs: Choice[];
  fields: PrototypeField[];
  actions: PrototypeAction[];
  statePanels: Choice[];
  legalReqId?: string;
  legalCopy?: string;
};

export type ReviewComment = {
  id: string;
  annotationId: string;
  author?: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  status: "open" | "resolved";
};

export type VersionSnapshot = {
  customAnnotations: CanvasAnnotation[];
  annotationEdits: Record<string, AnnotationPatch>;
  deletedAnnotationIds: string[];
  comments: ReviewComment[];
};

export type VersionRenameRecord = {
  from: string;
  to: string;
  renamedAt: string;
};

export type VersionRecord = {
  id: string;
  releaseId?: string;
  name?: string;
  label: string;
  status: "draft" | "final";
  path?: string;
  directory?: string;
  reviewDataPath?: string;
  createdAt?: string;
  updatedAt?: string;
  snapshotSummary?: string;
  source?: "generated" | "workspace";
  deletable?: boolean;
  snapshot?: VersionSnapshot;
  reviewComments?: ReviewComment[];
  renameHistory?: VersionRenameRecord[];
};

export type GeneratedDoc = {
  id: string;
  title: string;
  fileName: string;
  summary: string;
  content: string;
};

export type PrdData = {
  meta: {
    featureName: string;
    featureSlug: string;
    version: string;
    updatedAt: string;
    status: "draft" | "final";
    summary: string;
    targetPlatform: TargetPlatform;
    prototypeViewport: {
      width: number;
      height: number;
    };
  };
  roles: Choice[];
  scenarios: Choice[];
  states: Choice[];
  requirements: Requirement[];
  featureGroups: FeatureGroup[];
  boardSections: BoardSection[];
  prototype: {
    screens: PrototypeScreen[];
  };
  comments: ReviewComment[];
  versionHistory: VersionRecord[];
};
