import type { Metadata } from 'next';
import { TosPage } from '@/components/legal/TosPage';

export const metadata: Metadata = {
    title: 'Terms of Service · WuWa Builds',
};

export default function Page() {
    return <TosPage />;
}
