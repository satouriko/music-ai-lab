import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import 'katex/dist/katex.min.css';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Music AI Lab',
  description: '浏览音乐 AI 学习路线、笔记、练习代码和实验 Notebook。',
  openGraph: {
    title: 'Music AI Lab',
    description: '音乐 AI 学习路线、笔记、练习代码和实验 Notebook。',
    images: [{ url: '/music-ai-roadmap-og.png', width: 1200, height: 630, alt: '音乐 AI 52 周学习路线' }],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Music AI Lab',
    description: '音乐 AI 学习路线、笔记、练习代码和实验 Notebook。',
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
        className={`${geistSans.variable} antialiased`}
      >
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
