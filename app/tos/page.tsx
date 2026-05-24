import type { Metadata } from 'next';
import { TosPage } from '@/components/legal/TosPage';

export const metadata: Metadata = {
    title: 'Terms of Service · WuWa Builds',
    description: 'Terms of Service for WuWa Builds. Read the terms and conditions for using our platform.',
    alternates: { canonical: '/tos' },
};

export default function Page() {
    return <TosPage />;
}
