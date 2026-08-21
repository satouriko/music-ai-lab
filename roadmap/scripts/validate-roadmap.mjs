import { readFile } from "node:fs/promises";

const dataUrl = new URL("../app/data/roadmap.json", import.meta.url);
const data = JSON.parse(await readFile(dataUrl, "utf8"));

const requiredArrays = [
  "knowledge",
  "readings",
  "codeReadings",
  "exercises",
  "project",
  "musicTheory",
  "piano",
  "deliverables",
  "acceptance",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(Array.isArray(data.weeks), "roadmap must expose a weeks array");
assert(data.weeks.length === 52, "roadmap must contain 52 weeks");

const numbers = data.weeks.map((week) => week.week);
assert(new Set(numbers).size === 52, "week numbers must be unique");

for (let week = 1; week <= 52; week += 1) {
  assert(numbers.includes(week), `missing week ${week}`);
}

for (const week of data.weeks) {
  for (const field of ["title", "objective", "phaseId"]) {
    assert(
      typeof week[field] === "string" && week[field].trim().length > 0,
      `week ${week.week} missing ${field}`,
    );
  }

  for (const field of requiredArrays) {
    assert(
      Array.isArray(week[field]) && week[field].length > 0,
      `week ${week.week} missing ${field}`,
    );
  }

  for (const reading of week.readings) {
    assert(
      typeof reading.url === "string" && reading.url.startsWith("https://"),
      `week ${week.week} has a non-HTTPS reading`,
    );
  }

  for (const code of week.codeReadings) {
    assert(
      typeof code.url === "string" && code.url.startsWith("https://"),
      `week ${week.week} has a non-HTTPS code link`,
    );
  }

  const total = week.hours.algorithm + week.hours.music + week.hours.review;
  assert(total >= 24 && total <= 28, `week ${week.week} has ${total} hours`);
}

assert(data.phases?.length === 7, "roadmap must contain seven phases");
assert(data.categories?.length === 6, "roadmap must contain six categories");
assert(
  data.extensionPaths?.length === 4,
  "roadmap must contain four extension paths",
);

console.log(
  `Roadmap valid: ${data.weeks.length} weeks, ${data.phases.length} phases, ${data.categories.length} categories, ${data.extensionPaths.length} extension paths.`,
);
