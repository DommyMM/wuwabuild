'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { Star, X } from 'lucide-react';
import { resolveRegionBadge } from '@/lib/regionBadge';
import { capture } from '@/lib/analytics';
import { getPinnedProfilesSnapshot, getProfilesServerSnapshot, getRecentProfilesSnapshot, PINNED_KEY, RECENTS_KEY, removeRecentProfile, StoredProfile, subscribeProfileHistory } from '@/lib/profileHistory';

interface ProfileSwitcherProps {
  currentUid: string;
}

/** Rendered tray height: h-12 tabs under pt-1 */
const TRAY_HEIGHT_PX = 52;

/**
 * Inline script that holds the tray's height in the server HTML when this device stores another profile
 *
 * - History lives in localStorage, so the server HTML has no tray and hydration would push the whole page down by it
 * - Runs at parse time, before the slot it sizes is first painted
 */
function trayReserveScript(currentUid: string): string {
  // uid comes from the URL, so < is escaped to keep it from closing the script tag
  const uid = JSON.stringify(currentUid).replace(/</g, '\\u003c');
  const keys = JSON.stringify([PINNED_KEY, RECENTS_KEY]);
  return `try{var u=${uid},s=document.currentScript.previousElementSibling;${keys}.forEach(function(k){var l=JSON.parse(localStorage.getItem(k)||'[]');if(Array.isArray(l)&&l.some(function(e){return e&&e.uid&&e.uid!==u}))s.style.minHeight='${TRAY_HEIGHT_PX}px'})}catch(e){}`;
}

/**
 * Device-local tray for hopping between pinned and recently opened players
 *
 * Pin keeps a player, x closes a recent, and nothing here is synced or public
 */
export function ProfileSwitcher({ currentUid }: ProfileSwitcherProps) {
  const pinned = useSyncExternalStore(subscribeProfileHistory, getPinnedProfilesSnapshot, getProfilesServerSnapshot);
  const recents = useSyncExternalStore(subscribeProfileHistory, getRecentProfilesSnapshot, getProfilesServerSnapshot);

  const pinnedUids = new Set(pinned.map((entry) => entry.uid));
  const entries: Array<StoredProfile & { isPinned: boolean }> = [
    ...pinned.map((entry) => ({ ...entry, isPinned: true })),
    ...recents.filter((entry) => !pinnedUids.has(entry.uid)).map((entry) => ({ ...entry, isPinned: false })),
  ];

  const hasOtherProfiles = entries.some((entry) => entry.uid !== currentUid);
  const slotRef = useRef<HTMLDivElement>(null);
  // Once the tray renders it sizes the slot itself, and the reserve would otherwise outlive a later cleared history
  useLayoutEffect(() => {
    if (hasOtherProfiles) slotRef.current?.style.removeProperty('min-height');
  }, [hasOtherProfiles]);

  return (
    <>
      <div ref={slotRef} suppressHydrationWarning>
        {hasOtherProfiles && (
          <nav aria-label="Pinned and recently opened profiles" className="relative">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-accent/25 to-transparent" />
            <div className="ml-4 flex items-end gap-2.5 overflow-x-auto pr-4 pt-1 md:ml-5 md:pr-5">
              {entries.map((entry) => {
                const isCurrent = entry.uid === currentUid;
                const badge = resolveRegionBadge(entry.uid);
                return (
                  <div
                    key={entry.uid}
                    className={`group relative flex h-12 shrink-0 items-center overflow-hidden rounded-t-lg border border-b-0 transition-colors ${
                      isCurrent
                        ? 'border-accent/55 bg-background-secondary text-text-primary shadow-[0_-8px_24px_rgba(166,150,98,0.08)]'
                        : 'border-border/75 bg-background-secondary/55 text-text-primary/68 hover:border-accent/35 hover:bg-background-secondary/80 hover:text-text-primary'
                    }`}
                  >
                    <Link
                      href={`/profile/${entry.uid}`}
                      aria-current={isCurrent ? 'page' : undefined}
                      title={`${entry.username || 'Anonymous'} · ${entry.uid}`}
                      onClick={() => {
                        if (!isCurrent) capture('profile_open', { source: 'switcher', surface: 'profile' });
                      }}
                      className="flex h-full min-w-0 items-center gap-2 py-1.5 pl-2 pr-2"
                    >
                      {entry.head ? (
                        <img src={entry.head} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover object-top" loading="lazy" />
                      ) : (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-border/30 text-2xs font-bold text-text-primary/45">
                          {(entry.username || entry.uid).charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="max-w-32 truncate text-sm leading-tight">{entry.username || entry.uid}</span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          {badge && (
                            <span className={`rounded px-1 py-px text-[8px] font-semibold tracking-wider uppercase ${badge.className}`}>
                              {badge.label}
                            </span>
                          )}
                          <span className="font-mono text-3xs text-text-primary/42 tabular-nums">
                            {entry.uid}
                          </span>
                        </span>
                      </span>
                    </Link>
                    {/* Starred tabs trade the close button for a star, browser-style, since a starred tab stays anyway */}
                    {entry.isPinned ? (
                      <span
                        className="mr-1 grid h-6 w-6 shrink-0 place-items-center text-accent"
                        title="Starred profile"
                      >
                        <Star size={11} className="fill-current" aria-label="Starred" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeRecentProfile(entry.uid)}
                        className="mr-1 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md text-text-primary/35 opacity-70 transition-colors hover:bg-border/70 hover:text-text-primary group-hover:opacity-100"
                        title="Close recent profile"
                        aria-label={`Close ${entry.username || entry.uid} from recent profiles`}
                      >
                        <X size={13} aria-hidden />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        )}
      </div>
      <script dangerouslySetInnerHTML={{ __html: trayReserveScript(currentUid) }} />
    </>
  );
}
