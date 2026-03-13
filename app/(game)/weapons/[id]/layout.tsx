import { EditorProviders } from '@/contexts';

export default function WeaponEditorLayout({ children }: { children: React.ReactNode }) {
    return <EditorProviders>{children}</EditorProviders>;
}
