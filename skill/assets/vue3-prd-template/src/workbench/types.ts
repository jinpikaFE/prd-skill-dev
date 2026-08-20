import type { BoardAnnotation } from "../types";

export type LocatedAnnotation = BoardAnnotation & {
  frameId: string;
  sectionId: string;
  fileId: string;
  source: "generated" | "product" | "review";
};
