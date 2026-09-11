import type { Metadata } from 'next';
import { SiteMarkup } from '../site-content';

export const metadata: Metadata = {
  title: 'Live Campaign Tracking | PlayMyAdz',
  description: 'Follow truck location, campaign progress, playback status, and delivery updates.',
};

export default function TrackingPage() {
  return <SiteMarkup route="tracking" />;
}
