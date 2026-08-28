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

const TITLE = 'The Lab Rats Fantasy Football League'
const DESCRIPTION =
  'A just-for-fun fantasy football league brought to you by Creator Science.'

export const metadata: Metadata = {
  // Title and description stay separate: a browser tab renders only the title,
  // while search results and link previews render both together.
  title: {
    default: TITLE,
    // Page name leads, so it survives the truncation a long suffix invites —
    // a crowded tab bar shows "League Standings · The Lab R…", which still
    // says which page you are on.
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
    // 1200x630 is what Slack, iMessage, X and Facebook all crop toward.
    // A square badge got rendered as a small thumbnail card; this fills the
    // wide layout instead.
    images: [{ url: '/brand/og-image.jpg', width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/brand/og-image.jpg'],
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
