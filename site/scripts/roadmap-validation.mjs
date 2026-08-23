const stringListFields = [
  'knowledge',
  'exercises',
  'project',
  'musicTheory',
  'piano',
  'deliverables',
  'acceptance',
];

const resourceKinds = new Set(['主教材', '辅助资料', '论文', '代码']);
const phaseTones = new Set([
  'setup',
  'foundation',
  'model',
  'mir',
  'reduction',
  'product',
  'reflection',
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertString(value, message) {
  assert(typeof value === 'string' && value.trim().length > 0, message);
}

function assertStringField(value, field, context) {
  assertString(value?.[field], `${context} missing ${field}`);
}

function assertStringList(value, message) {
  assert(
    Array.isArray(value)
      && value.length > 0
      && value.every((item) => typeof item === 'string' && item.trim().length > 0),
    message,
  );
}

function assertHttpsUrl(value, message) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(message);
  }
  assert(url.protocol === 'https:' && url.hostname.length > 0, message);
}

function validateResource(resource, context) {
  assert(isRecord(resource), `${context} must be an object`);
  for (const field of ['title', 'kind', 'scope', 'purpose']) {
    assertStringField(resource, field, context);
  }
  assert(resourceKinds.has(resource.kind), `${context} has an invalid kind`);
  assertHttpsUrl(resource.url, `${context} has a non-HTTPS url`);
}

function validatePhases(phases) {
  const ids = new Set();

  for (const [index, phase] of phases.entries()) {
    assert(isRecord(phase), `phase ${index + 1} must be an object`);
    assertStringField(phase, 'id', `phase ${index + 1}`);
    const context = `phase ${phase.id}`;
    assert(!ids.has(phase.id), `duplicate phase ${phase.id}`);
    ids.add(phase.id);
    for (const field of ['name', 'outcome', 'tone']) {
      assertStringField(phase, field, context);
    }
    assert(phaseTones.has(phase.tone), `${context} has an invalid tone`);
    assert(
      Array.isArray(phase.weeks)
        && phase.weeks.length === 2
        && phase.weeks.every(Number.isInteger)
        && phase.weeks[0] >= 1
        && phase.weeks[1] <= 52
        && phase.weeks[0] <= phase.weeks[1],
      `${context} has invalid weeks`,
    );
  }
}

function validateCategories(categories) {
  const ids = new Set();

  for (const [index, category] of categories.entries()) {
    assert(isRecord(category), `category ${index + 1} must be an object`);
    assertStringField(category, 'id', `category ${index + 1}`);
    const context = `category ${category.id}`;
    assert(!ids.has(category.id), `duplicate category ${category.id}`);
    ids.add(category.id);
    for (const field of ['name', 'summary', 'outcome']) {
      assertStringField(category, field, context);
    }
    for (const field of ['prerequisites', 'topics', 'evidence']) {
      assertStringList(category[field], `${context} missing ${field}`);
    }
    assert(
      Array.isArray(category.weekNumbers)
        && category.weekNumbers.length > 0
        && category.weekNumbers.every(
          (week) => Number.isInteger(week) && week >= 1 && week <= 52,
        ),
      `${context} has invalid weekNumbers`,
    );
    assert(
      new Set(category.weekNumbers).size === category.weekNumbers.length,
      `${context} has duplicate weekNumbers`,
    );
    assert(
      Array.isArray(category.resources) && category.resources.length > 0,
      `${context} missing resources`,
    );
    category.resources.forEach((resource, resourceIndex) => {
      validateResource(resource, `${context} resource ${resourceIndex + 1}`);
    });
  }
}

function validateExtensions(extensionPaths) {
  const ids = new Set();

  for (const [index, extension] of extensionPaths.entries()) {
    assert(isRecord(extension), `extension ${index + 1} must be an object`);
    assertStringField(extension, 'id', `extension ${index + 1}`);
    const context = `extension ${extension.id}`;
    assert(!ids.has(extension.id), `duplicate extension ${extension.id}`);
    ids.add(extension.id);
    for (const field of ['title', 'when', 'result']) {
      assertStringField(extension, field, context);
    }
    assertStringList(extension.focus, `${context} missing focus`);
  }
}

function validateWeeks(weeks, phases) {
  const numbers = weeks.map((week) => week?.week);
  assert(
    numbers.every((week) => Number.isInteger(week) && week >= 1 && week <= 52),
    'week numbers must be integers from 1 to 52',
  );
  assert(new Set(numbers).size === 52, 'week numbers must be unique');

  for (let week = 1; week <= 52; week += 1) {
    assert(numbers.includes(week), `missing week ${week}`);
  }

  const phaseById = new Map(phases.map((phase) => [phase.id, phase]));

  for (const week of weeks) {
    const context = `week ${week.week}`;
    assert(isRecord(week), `${context} must be an object`);
    for (const field of ['title', 'objective', 'phaseId']) {
      assertStringField(week, field, context);
    }
    assert(
      Number.isInteger(week.month) && week.month >= 1 && week.month <= 12,
      `${context} has an invalid month`,
    );
    for (const field of stringListFields) {
      assertStringList(week[field], `${context} missing ${field}`);
    }

    assert(
      Array.isArray(week.readings) && week.readings.length > 0,
      `${context} missing readings`,
    );
    week.readings.forEach((reading, readingIndex) => {
      validateResource(reading, `${context} reading ${readingIndex + 1}`);
    });

    assert(
      Array.isArray(week.codeReadings) && week.codeReadings.length > 0,
      `${context} missing codeReadings`,
    );
    week.codeReadings.forEach((code, codeIndex) => {
      const codeContext = `${context} code reading ${codeIndex + 1}`;
      assert(isRecord(code), `${codeContext} must be an object`);
      for (const field of ['repository', 'path', 'question']) {
        assertStringField(code, field, codeContext);
      }
      assertHttpsUrl(code.url, `${codeContext} has a non-HTTPS url`);
    });

    assert(
      isRecord(week.hours)
        && Number.isFinite(week.hours.algorithm)
        && Number.isFinite(week.hours.music)
        && Number.isFinite(week.hours.review)
        && week.hours.algorithm >= 0
        && week.hours.music >= 0
        && week.hours.review >= 0,
      `${context} has invalid hours`,
    );
    const total = week.hours.algorithm + week.hours.music + week.hours.review;
    assert(total >= 24 && total <= 28, `${context} has ${total} hours`);

    const phase = phaseById.get(week.phaseId);
    assert(phase, `${context} references unknown phase ${week.phaseId}`);
    assert(
      week.week >= phase.weeks[0] && week.week <= phase.weeks[1],
      `${context} falls outside phase ${week.phaseId}`,
    );
  }
}

export function validateRoadmap(data) {
  assert(isRecord(data), 'roadmap must be an object');
  assert(Array.isArray(data.weeks), 'roadmap must expose a weeks array');
  assert(data.weeks.length === 52, 'roadmap must contain 52 weeks');
  assert(
    Array.isArray(data.phases) && data.phases.length === 7,
    'roadmap must contain seven phases',
  );
  assert(
    Array.isArray(data.categories) && data.categories.length === 6,
    'roadmap must contain six categories',
  );
  assert(
    Array.isArray(data.extensionPaths) && data.extensionPaths.length === 4,
    'roadmap must contain four extension paths',
  );

  validatePhases(data.phases);
  validateCategories(data.categories);
  validateExtensions(data.extensionPaths);
  validateWeeks(data.weeks, data.phases);
}
