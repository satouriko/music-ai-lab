import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '音乐 AI · 52 周学习路线',
  description: '为有 Web 开发经验的学习者设计的音乐 AI、个人兴趣项目、乐理与钢琴训练路线。',
  openGraph: {
    title: '音乐 AI · 52 周学习路线',
    description: '机器学习、音乐技术、个人兴趣项目与钢琴训练的一年学习路线。',
    images: [{ url: '/music-ai-roadmap-og.png', width: 1200, height: 630, alt: '音乐 AI 52 周学习路线' }],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '音乐 AI · 52 周学习路线',
    description: '机器学习、音乐技术、个人兴趣项目与钢琴训练的一年学习路线。',
    images: ['/music-ai-roadmap-og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
