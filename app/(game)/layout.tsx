import { ToolProviders } from '@/contexts';

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <ToolProviders>{children}</ToolProviders>;
}
