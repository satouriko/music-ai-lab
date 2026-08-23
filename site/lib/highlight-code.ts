import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import bash from 'shiki/langs/bash.mjs';
import json from 'shiki/langs/json.mjs';
import python from 'shiki/langs/python.mjs';
import yaml from 'shiki/langs/yaml.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';

export type HighlightLanguage = 'bash' | 'json' | 'python' | 'text' | 'yaml';

const highlighterPromise = createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
  langs: [bash, json, python, yaml],
  themes: [githubDark],
});

export function normalizeHighlightLanguage(language?: string): HighlightLanguage {
  const normalized = language?.trim().toLowerCase();
  if (normalized === 'py' || normalized === 'python') return 'python';
  if (['bash', 'sh', 'shell', 'zsh'].includes(normalized ?? '')) return 'bash';
  if (normalized === 'yaml' || normalized === 'yml') return 'yaml';
  if (normalized === 'json') return 'json';
  return 'text';
}

export async function highlightCode(
  source: string,
  language: HighlightLanguage,
) {
  const highlighter = await highlighterPromise;
  return highlighter.codeToHtml(source, {
    lang: language,
    theme: 'github-dark',
  });
}
