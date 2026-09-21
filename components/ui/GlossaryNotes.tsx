'use client';

import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTerms } from '@/lib/terms';
import { collectTemplateTermIds, renderGameTemplateWithHighlights } from '@/lib/text/gameText';

interface GlossaryNotesProps {
  /** The same template string the text above was rendered from */
  template: string;
  className?: string;
}

// Keyword's gold, so headword and keyword pair up without numbering
const HEADWORD_COLOR = '#f8e39a';

/**
 * Glossary entries for the keywords in a block of game text, printed under it as footnotes
 *
 * Hover cards use this in place of per-keyword popups, which would overlap the triggers behind them
 */
export function GlossaryNotes({ template, className = '' }: GlossaryNotesProps) {
  const { t } = useLanguage();
  const ids = useMemo(() => collectTemplateTermIds(template), [template]);
  const terms = useTerms(ids);

  if (terms.length === 0) return null;

  return (
    <div className={`mt-3 border-t border-white/8 pt-2.5 ${className}`}>
      <p className="font-mono text-3xs uppercase tracking-[0.18em] text-white/40">Glossary</p>
      <dl className="mt-2 space-y-2">
        {terms.map((term) => {
          const name = t(term.name);
          const description = t(term.description);
          if (!name && !description) return null;
          return (
            <div key={term.id}>
              <dt className="text-xs" style={{ color: HEADWORD_COLOR }}>{name}</dt>
              {description && (
                <dd className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-white/70">
                  {renderGameTemplateWithHighlights({
                    template: description,
                    getParamValue: () => null,
                    keepUnknownPlaceholders: false,
                    // A definition may name other keywords, but marking them would promise a footnote to a footnote
                    termMode: 'plain',
                  })}
                </dd>
              )}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
