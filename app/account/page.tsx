import type { Metadata } from 'next';
import { SiteMarkup } from '../site-content';

export const metadata: Metadata = {
  title: 'Customer Access | PlayMyAdz',
  description: 'Register and verify your email to book, pay for, and track PlayMyAdz campaigns.',
};

export default function AccountPage() {
  return <SiteMarkup route="account" />;
}
