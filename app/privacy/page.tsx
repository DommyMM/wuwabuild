import type { Metadata } from 'next';
import { PrivacyPage } from '@/components/legal/PrivacyPage';

export const metadata: Metadata = {
    title: 'Privacy Policy · WuWa Builds',
};

export default function Page() {
    return <PrivacyPage />;
}
