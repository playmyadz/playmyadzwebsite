import type { Metadata } from 'next';
import { SiteMarkup } from '../site-content';

export const metadata: Metadata = {
  title: 'Campaign Operations | PlayMyAdz',
  description: 'Preview the PlayMyAdz approval, creative, scheduling, and reporting operations.',
};

export default function OperationsPage() {
  return <SiteMarkup route="operations" />;
}
