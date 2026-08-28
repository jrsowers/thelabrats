import type { Metadata } from "next";
import { Geist, Geist_Mono, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const TITLE = 'The Lab Rats'
const DESCRIPTION =
  'A just-for-fun fantasy football league brought to you by Creator Science.'

export const metadata: Metadata = {
  // Split rather than one long string: the browser tab shows only the title,
  // and a full sentence there truncates. Search results and link previews
  // render them together as "The Lab Rats – A just-for-fun fantasy football
  // league brought to you by Creator Science."
  title: {
    default: TITLE,
    // Subpages read "Playoff Picture · The Lab Rats".
    template: `%s · ${TITLE}`,
  },
  description: DESCRIPTION,
  metadataBase: new URL('https://www.labratsfantasy.com'),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    siteName: TITLE,
    type: 'website',
    images: [{ url: '/brand/lab-rats-badge.png', width: 552, height: 552, alt: TITLE }],
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/brand/lab-rats-badge.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
