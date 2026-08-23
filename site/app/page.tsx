import { RoadmapClient } from '@/app/roadmap/roadmap-client';
import { content } from '@/lib/content';

export default function Home() {
  return (
    <RoadmapClient
      artifacts={content.artifacts}
      roadmap={content.roadmap}
    />
  );
}
