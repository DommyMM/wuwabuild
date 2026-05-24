import type { Metadata } from 'next';
import { PrivacyPage } from '@/components/legal/PrivacyPage';

export const metadata: Metadata = {
    title: 'Privacy Policy · WuWa Builds',
    description: 'Privacy Policy for WuWa Builds. Learn how we collect, use, and handle your data.',
    alternates: { canonical: '/privacy' },
};

export default function Page() {
    return <PrivacyPage />;
}
