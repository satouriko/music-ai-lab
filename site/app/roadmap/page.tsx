import { RoadmapClient } from './roadmap-client';
import { content } from '@/lib/content';

export default function RoadmapPage() {
  return (
    <RoadmapClient
      artifacts={content.artifacts}
      roadmap={content.roadmap}
    />
  );
}
