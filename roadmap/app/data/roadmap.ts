import raw from "./roadmap.json";
import type { Category, ExtensionPath, Phase, WeekPlan } from "./types";

export const phases = raw.phases as Phase[];
export const weeks = raw.weeks as WeekPlan[];
export const categories = raw.categories as Category[];
export const extensionPaths = raw.extensionPaths as ExtensionPath[];
