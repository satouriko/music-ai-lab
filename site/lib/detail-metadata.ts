import type { Metadata } from 'next';

const socialImage = {
  url: '/music-ai-roadmap-og.png',
  width: 1200,
  height: 630,
  alt: '音乐 AI 52 周学习路线',
};

interface DetailMetadataOptions {
  title: string;
  description: string;
  canonical: string;
}

export function detailMetadata({
  title,
  description,
  canonical,
}: DetailMetadataOptions): Metadata {
  return {
    title: `${title} · Music AI Lab`,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      images: [socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [socialImage.url],
    },
  };
}
