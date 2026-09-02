import type { Artifact } from '@/lib/artifact-types';
import { artifactHref, roadmapWeekHref } from '@/lib/artifacts';
import { withSiteBasePath } from '@/lib/site-path';

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
      <a href={withSiteBasePath('/#roadmap')}>Roadmap</a>
      <span aria-hidden="true">/</span>
      <div>
        {artifact.weeks.map((week) => (
          <a href={roadmapWeekHref(week)} key={week}>
            W{String(week).padStart(2, '0')}
          </a>
        ))}
      </div>
      {showArtifactLink && (
        <>
          <span aria-hidden="true">/</span>
          {artifactIsCurrent ? (
            <span>{artifact.title}</span>
          ) : (
            <a href={artifactHref(artifact.id)}>{artifact.title}</a>
          )}
        </>
      )}
    </nav>
  );
}
