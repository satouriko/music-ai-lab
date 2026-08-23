import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { createContentBundle } from './content-index.mjs';
import { validateArtifacts } from './artifact-validation.mjs';
import { validateRoadmap } from './roadmap-validation.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const outputDirectory = fileURLToPath(new URL('../.generated/', import.meta.url));
const outputPath = fileURLToPath(
  new URL('../.generated/content.json', import.meta.url),
);

const content = await createContentBundle(repoRoot);
validateRoadmap(content.roadmap);
validateArtifacts(content.artifacts, content);
await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(content, null, 2)}\n`);

console.log(
  `Content generated: ${content.notes.length} notes, ${content.code.length} code files, ${content.notebooks.length} notebooks, ${content.artifacts.length} artifacts.`,
);
