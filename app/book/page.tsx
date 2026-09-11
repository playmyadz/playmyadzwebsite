import type { Metadata } from 'next';
import { SiteMarkup } from '../site-content';

export const metadata: Metadata = {
  title: 'Book a Campaign | PlayMyAdz',
  description: 'Choose a Hyderabad LED truck, route, campaign duration, schedule, and creative.',
};

export default function BookPage() {
  return <SiteMarkup route="book" />;
}
