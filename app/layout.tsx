import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Email PDF Ingestion | Automated PDF Retrieval Platform',
  description:
    'Automatically scan email inboxes for PDF attachments, download them locally, and store metadata in PostgreSQL.',
  keywords: 'email, PDF, IMAP, attachment, ingestion, automation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
