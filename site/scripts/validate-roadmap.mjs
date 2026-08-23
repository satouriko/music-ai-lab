import { fileURLToPath } from 'node:url';

import { validateArtifacts } from './artifact-validation.mjs';
import { createContentBundle } from './content-index.mjs';
import { validateRoadmap } from './roadmap-validation.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const content = await createContentBundle(repoRoot);

validateRoadmap(content.roadmap);
validateArtifacts(content.artifacts, content);

console.log(
  `Data valid: ${content.roadmap.weeks.length} weeks, ${content.roadmap.phases.length} phases, ${content.roadmap.categories.length} categories, ${content.roadmap.extensionPaths.length} extension paths, ${content.artifacts.length} artifacts.`,
);
