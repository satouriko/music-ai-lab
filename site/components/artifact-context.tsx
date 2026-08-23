import Link from 'next/link';

import type { Artifact } from '@/lib/artifact-types';
import { artifactHref, roadmapWeekHref } from '@/lib/artifacts';

export function ArtifactContext({
  artifact,
  artifactIsCurrent = false,
  showArtifactLink = false,
}: {
  artifact: Artifact;
  artifactIsCurrent?: boolean;
  showArtifactLink?: boolean;
}) {
  return (
    <nav className="artifact-context" aria-label="学习产物所属路线">
      <Link href="/#roadmap">Roadmap</Link>
      <span aria-hidden="true">/</span>
      <div>
        {artifact.weeks.map((week) => (
          <Link href={roadmapWeekHref(week)} key={week}>
            W{String(week).padStart(2, '0')}
          </Link>
        ))}
      </div>
      {showArtifactLink && (
        <>
          <span aria-hidden="true">/</span>
          {artifactIsCurrent ? (
            <span>{artifact.title}</span>
          ) : (
            <Link href={artifactHref(artifact.id)}>{artifact.title}</Link>
          )}
        </>
      )}
    </nav>
  );
}
