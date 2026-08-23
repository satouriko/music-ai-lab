const artifactKinds = new Set(['note', 'code', 'notebook']);
const codeFileRoles = new Set(['entry', 'test', 'support']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function ownPath(path, artifactId, knownPaths, ownership) {
  assert(
    isNonEmptyString(path) && knownPaths.has(path),
    `artifact ${artifactId} references unknown content path ${path}`,
  );
  assert(
    !ownership.has(path),
    `content path ${path} belongs to multiple artifacts`,
  );
  ownership.set(path, artifactId);
}

export function validateArtifacts(artifacts, content) {
  assert(Array.isArray(artifacts), 'roadmap must expose an artifacts array');

  const knownWeeks = new Set(content.roadmap.weeks.map((week) => week.week));
  const knownCategories = new Set(
    content.roadmap.categories.map((category) => category.id),
  );
  const notePaths = new Set(content.notes.map((document) => document.path));
  const codePaths = new Set(content.code.map((document) => document.path));
  const notebookPaths = new Set(
    content.notebooks.map((document) => document.path),
  );
  const artifactIds = new Set();
  const ownership = new Map();

  for (const [index, artifact] of artifacts.entries()) {
    assert(isRecord(artifact), `artifact ${index + 1} must be an object`);
    assert(isNonEmptyString(artifact.id), `artifact ${index + 1} missing id`);
    assert(!artifactIds.has(artifact.id), `duplicate artifact id ${artifact.id}`);
    artifactIds.add(artifact.id);

    for (const field of ['title', 'summary']) {
      assert(
        isNonEmptyString(artifact[field]),
        `artifact ${artifact.id} missing ${field}`,
      );
    }
    assert(
      artifactKinds.has(artifact.kind),
      `artifact ${artifact.id} has invalid kind ${artifact.kind}`,
    );
    assert(
      Array.isArray(artifact.weeks) && artifact.weeks.length > 0,
      `artifact ${artifact.id} must reference at least one week`,
    );
    for (const week of artifact.weeks) {
      assert(
        knownWeeks.has(week),
        `artifact ${artifact.id} references unknown week ${week}`,
      );
    }
    assert(
      Array.isArray(artifact.categoryIds),
      `artifact ${artifact.id} must expose categoryIds`,
    );
    for (const categoryId of artifact.categoryIds) {
      assert(
        knownCategories.has(categoryId),
        `artifact ${artifact.id} references unknown category ${categoryId}`,
      );
    }

    if (artifact.kind === 'note') {
      ownPath(artifact.path, artifact.id, notePaths, ownership);
    } else if (artifact.kind === 'notebook') {
      ownPath(artifact.path, artifact.id, notebookPaths, ownership);
    } else if (artifact.kind === 'code') {
      assert(
        isNonEmptyString(artifact.root),
        `artifact ${artifact.id} missing root`,
      );
      assert(
        Array.isArray(artifact.files) && artifact.files.length > 0,
        `artifact ${artifact.id} missing files`,
      );
      const entryFiles = artifact.files.filter((file) => file?.role === 'entry');
      assert(
        entryFiles.length === 1,
        `artifact ${artifact.id} must contain exactly one entry file`,
      );
      for (const file of artifact.files) {
        assert(
          isRecord(file) && codeFileRoles.has(file.role),
          `artifact ${artifact.id} has an invalid code file role`,
        );
        ownPath(file.path, artifact.id, codePaths, ownership);
        assert(
          file.path.startsWith(`${artifact.root}/`),
          `artifact ${artifact.id} file ${file.path} falls outside root ${artifact.root}`,
        );
      }
    }
  }

  for (const path of [...notePaths, ...codePaths, ...notebookPaths].sort()) {
    assert(ownership.has(path), `orphan content ${path}`);
  }
}
