import type { Metadata } from 'next';
import { SiteMarkup } from '../site-content';

export const metadata: Metadata = {
  title: 'LED Trucks and Pricing | PlayMyAdz',
  description: 'Explore PlayMyAdz three-sided LED trucks and Hyderabad launch pricing.',
};

export default function FleetPage() {
  return <SiteMarkup route="fleet" />;
}
