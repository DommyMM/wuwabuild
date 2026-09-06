'use client';

import React from 'react';
import { HoverCard, HoverCardDescription } from '@/components/ui/HoverCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTerm } from '@/lib/terms';
import { renderGameTemplateWithHighlights } from '@/lib/text/gameText';

// A term's own body links further terms. One level of nesting is useful
// ("Ceaseless Landscape" explaining "Floral Epistle"); beyond that the stack of
// cards is harder to read than the text it came from, and a term that links
// itself would never bottom out.
const MAX_TERM_DEPTH = 2;

interface TermHoverCardProps {
  termId: number;
  depth: number;
  children: React.ReactNode;
}

/**
 * The keyword styling and glossary card behind a `<te href=N>` link.
 *
 * A keyword whose term has not loaded (or is missing from the glossary) still
 * renders its text, just without the dotted underline, so the sentence always
 * reads correctly.
 */
export function TermHoverCard({ termId, depth, children }: TermHoverCardProps) {
  const { t } = useLanguage();
  const term = useTerm(termId);

  if (!term || depth >= MAX_TERM_DEPTH) {
    return <>{children}</>;
  }

  const title = t(term.name);
  const description = t(term.description);
  if (!title && !description) {
    return <>{children}</>;
  }

  return (
    <HoverCard
      placement="top"
      width="md"
      title={title || undefined}
      chips={[{ label: 'Glossary', tone: 'cyan' }]}
      triggerClassName="inline"
      body={description ? (
        <HoverCardDescription>
          {renderGameTemplateWithHighlights({
            template: description,
            getParamValue: () => null,
            keepUnknownPlaceholders: false,
            termDepth: depth + 1,
          })}
        </HoverCardDescription>
      ) : undefined}
    >
      <span className="cursor-help underline decoration-dotted decoration-current/45 underline-offset-3">
        {children}
      </span>
    </HoverCard>
  );
}
