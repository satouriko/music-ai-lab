import Link from 'next/link';

import type { Artifact } from '@/lib/artifact-types';
import { artifactHref } from '@/lib/artifacts';
import { groupArtifactsForWeek } from '@/lib/roadmap-artifacts';

const groupLabels = {
  code: '练习',
  notebooks: 'Notebook',
  notes: '笔记',
};

export function RoadmapArtifacts({
  artifacts,
  week,
}: {
  artifacts: Artifact[];
  week: number;
}) {
  const groups = groupArtifactsForWeek(artifacts, week);
  const visibleGroups = (
    Object.entries(groups) as Array<
      [keyof typeof groups, Artifact[]]
    >
  ).filter(([, items]) => items.length > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <section className="week-artifacts" aria-labelledby={`week-${week}-artifacts`}>
      <header>
        <span>LEARNING EVIDENCE</span>
        <h4 id={`week-${week}-artifacts`}>学习产物</h4>
      </header>
      <div className="week-artifact-groups">
        {visibleGroups.map(([kind, items]) => (
          <section key={kind}>
            <h5>{groupLabels[kind]}</h5>
            <div>
              {items.map((artifact) => (
                <Link href={artifactHref(artifact.id)} key={artifact.id}>
                  <span className="artifact-link-copy">
                    <strong>{artifact.title}</strong>
                    <code>
                      {artifact.kind === 'code' ? artifact.root : artifact.path}
                    </code>
                  </span>
                  <span>{artifact.summary}</span>
                  <b aria-hidden="true">↗</b>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
