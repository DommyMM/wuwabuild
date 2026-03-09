import { EditorProviders } from '@/contexts';

export default function CharacterEditorLayout({ children }: { children: React.ReactNode }) {
    return <EditorProviders>{children}</EditorProviders>;
}
