'use client';

import { CheckCircle, ExternalLink, Info, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export type ImportDestination = 'leaderboard' | 'profile' | 'editor';

interface ImportCompleteProps {
  isOpen: boolean;
  onClose: () => void;
  characterName: string;
  uploaded: boolean;
  lbAction: 'created' | 'updated' | null;
  /** Human-readable reason shown when the build stayed local. */
  localReason: string | null;
  leaderboardHref: string | null;
  isLeaderboardLinkLoading: boolean;
  profileHref: string | null;
  /** Set once "Save a copy" ran, to freeze the link into a confirmation. */
  savedCopyName: string | null;
  onNavigate: (destination: ImportDestination) => void;
  onImportAnother: () => void;
  onSaveCopy: () => void;
}

const PRIMARY_BUTTON_CLASS =
  'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60';
const SECONDARY_BUTTON_CLASS =
  'w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-text-primary/70 transition-colors hover:border-text-primary/30 hover:text-text-primary';

export function ImportComplete({
  isOpen,
  onClose,
  characterName,
  uploaded,
  lbAction,
  localReason,
  leaderboardHref,
  isLeaderboardLinkLoading,
  profileHref,
  savedCopyName,
  onNavigate,
  onImportAnother,
  onSaveCopy,
}: ImportCompleteProps) {
  const headline = uploaded
    ? `${characterName} uploaded`
    : `${characterName} imported locally`;
  const subline = uploaded
    ? (lbAction === 'updated'
      ? 'Your existing leaderboard entry was updated.'
      : 'New leaderboard entry created.')
    : (localReason ?? 'Leaderboard upload was skipped.');

  const showLeaderboardPrimary = uploaded && (Boolean(leaderboardHref) || isLeaderboardLinkLoading);
  const showProfilePrimary = uploaded && !showLeaderboardPrimary && Boolean(profileHref);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={headline}
      contentClassName="w-full max-w-md"
    >
      <div className="flex flex-col gap-4">

        <div className="flex items-start gap-2 text-sm text-text-primary/70">
          {uploaded
            ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
            : <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
          <span>{subline}</span>
        </div>

        {uploaded && (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-background/60 p-3 text-sm text-text-primary/70">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              Leaderboards rank your best build per character. Uploading more builds
              never removes the others, and every upload stays on your profile.
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {showLeaderboardPrimary && (
            <>
              <button
                onClick={() => onNavigate('leaderboard')}
                disabled={isLeaderboardLinkLoading}
                className={PRIMARY_BUTTON_CLASS}
              >
                {isLeaderboardLinkLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ExternalLink className="h-4 w-4" />}
                Go to Leaderboard
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onNavigate('profile')}
                  disabled={!profileHref}
                  className={SECONDARY_BUTTON_CLASS}
                >
                  View Profile
                </button>
                <button onClick={() => onNavigate('editor')} className={SECONDARY_BUTTON_CLASS}>
                  Open in Editor
                </button>
              </div>
              <button onClick={onImportAnother} className={SECONDARY_BUTTON_CLASS}>
                Import Another
              </button>
            </>
          )}

          {showProfilePrimary && (
            <>
              <button onClick={() => onNavigate('profile')} className={PRIMARY_BUTTON_CLASS}>
                <ExternalLink className="h-4 w-4" />
                View Profile
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onNavigate('editor')} className={SECONDARY_BUTTON_CLASS}>
                  Open in Editor
                </button>
                <button onClick={onImportAnother} className={SECONDARY_BUTTON_CLASS}>
                  Import Another
                </button>
              </div>
            </>
          )}

          {!showLeaderboardPrimary && !showProfilePrimary && (
            <>
              <button onClick={() => onNavigate('editor')} className={PRIMARY_BUTTON_CLASS}>
                Open in Editor
              </button>
              <button onClick={onImportAnother} className={SECONDARY_BUTTON_CLASS}>
                Import Another
              </button>
            </>
          )}

          {savedCopyName ? (
            <p className="self-center text-sm text-text-primary/50">
              Saved &quot;{savedCopyName}&quot; to Saves.
            </p>
          ) : (
            <button
              onClick={onSaveCopy}
              className="self-center text-sm text-text-primary/50 underline underline-offset-2 transition-colors hover:text-text-primary"
            >
              Save a copy to Saves
            </button>
          )}
        </div>

      </div>
    </Modal>
  );
}
