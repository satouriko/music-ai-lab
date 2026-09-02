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

test('GitHub Pages is the only configured hosting target', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  );
  const viteConfig = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
  const siteReadme = await readFile(new URL('../README.md', import.meta.url), 'utf8');

  assert.equal(packageJson.name, 'music-ai-lab-site');
  assert.equal(packageJson.devDependencies['@openai/sites-vite-plugin'], undefined);
  assert.equal(packageJson.devDependencies['@cloudflare/vite-plugin'], undefined);
  assert.equal(packageJson.devDependencies['@cloudflare/workers-types'], undefined);
  assert.equal(packageJson.devDependencies.wrangler, undefined);
  assert.doesNotMatch(viteConfig, /openai|sites\(|cloudflare|wrangler|hosting\.json/i);
  assert.doesNotMatch(siteReadme, /OpenAI Sites|chatgpt\.site|hosting\.json/i);

  for (const relativePath of [
    '.openai/hosting.json',
    'worker/index.ts',
    'scripts/prepare-sites-assets.mjs',
    'scripts/spa-navigation.acceptance.mjs',
    'scripts/static-export.acceptance.mjs',
    'scripts/worker-spa.acceptance.mjs',
  ]) {
    assert.equal(
      await exists(new URL(`../${relativePath}`, import.meta.url)),
      false,
      `${relativePath} still belongs to the retired hosting target`,
    );
  }
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
