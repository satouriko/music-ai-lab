export type ResourceKind = "主教材" | "辅助资料" | "论文" | "代码";

export interface Resource {
  title: string;
  kind: ResourceKind;
  url: string;
  scope: string;
  purpose: string;
}

export interface CodeReading {
  repository: string;
  url: string;
  path: string;
  question: string;
}

export interface WeekPlan {
  week: number;
  phaseId: string;
  month: number;
  title: string;
  objective: string;
  knowledge: string[];
  readings: Resource[];
  codeReadings: CodeReading[];
  exercises: string[];
  project: string[];
  musicTheory: string[];
  piano: string[];
  deliverables: string[];
  acceptance: string[];
  hours: { algorithm: number; music: number; review: number };
}

export interface Phase {
  id: string;
  name: string;
  weeks: [number, number];
  outcome: string;
  tone:
    | "setup"
    | "foundation"
    | "model"
    | "mir"
    | "reduction"
    | "product"
    | "reflection";
}

export interface Category {
  id: string;
  name: string;
  summary: string;
  outcome: string;
  prerequisites: string[];
  weekNumbers: number[];
  topics: string[];
  resources: Resource[];
  evidence: string[];
}

export interface ExtensionPath {
  id: string;
  title: string;
  when: string;
  focus: string[];
  result: string;
}
