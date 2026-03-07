import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Create Build',
    description: 'Create, customize, and share your Wuthering Waves character builds. Configure weapons, echoes, forte levels, and sequence nodes to calculate perfect damage.',
};

export default function EditLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
