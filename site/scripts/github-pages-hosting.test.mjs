import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

async function exists(url) {
  try {
    await access(url);
    return true;
  } catch {
    return false;
  }
}

test('GitHub Pages has a dedicated static build command', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  );

  assert.equal(packageJson.name, 'music-ai-lab-site');
  assert.match(packageJson.scripts['build:pages'], /prepare-github-pages/);
  assert.equal(packageJson.scripts['test:pages'], 'node scripts/github-pages-export.acceptance.mjs');
});

test('the Pages workflow builds and deploys the static export', async () => {
  const workflowUrl = new URL('.github/workflows/pages.yml', `file://${repositoryRoot}/`);
  assert.equal(await exists(workflowUrl), true, '.github/workflows/pages.yml is missing');
  const workflow = await readFile(workflowUrl, 'utf8');

  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /npm run build:pages/);
  assert.match(workflow, /npm run test:pages/);
  assert.match(workflow, /actions\/upload-pages-artifact@v5/);
  assert.match(workflow, /include-hidden-files:\s*true/);
  assert.match(workflow, /actions\/deploy-pages@v5/);
  assert.match(workflow, /path:\s*site\/dist\/client/);
});
