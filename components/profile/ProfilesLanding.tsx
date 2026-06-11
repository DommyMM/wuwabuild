'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { ProfileSearch } from '@/components/home/ProfileSearch';
import { clearRecentProfiles, getPinnedProfilesSnapshot, getProfilesServerSnapshot, getRecentProfilesSnapshot, StoredProfile, subscribeProfileHistory } from '@/lib/profileHistory';

function ProfileCardLink({ profile, pinned }: { profile: StoredProfile; pinned?: boolean }) {
  return (
    <Link
      href={`/profile/${profile.uid}`}
      className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors ${
        pinned
          ? 'border-accent/35 bg-accent/6 hover:border-accent/60 hover:bg-accent/10'
          : 'border-border bg-background-secondary/50 hover:border-accent/40 hover:bg-accent/6'
      }`}
    >
      {profile.head ? (
        <img src={profile.head} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover object-top" loading="lazy" />
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-border/30 text-sm font-bold text-text-primary/40">
          {(profile.username || profile.uid).charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] text-text-primary">
          {profile.username || 'Anonymous'}
        </span>
        <span className="block font-mono text-[10px] text-text-primary/45 tabular-nums">
          {profile.uid}
        </span>
      </span>
      {pinned && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-accent/80" aria-label="Pinned">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )}
    </Link>
  );
}

/**
 * Profile landing: search any player, plus your pinned and recently opened
 * profiles as a directory. All history is localStorage
 */
export function ProfilesLanding() {
  const pinned = useSyncExternalStore(subscribeProfileHistory, getPinnedProfilesSnapshot, getProfilesServerSnapshot);
  const recents = useSyncExternalStore(subscribeProfileHistory, getRecentProfilesSnapshot, getProfilesServerSnapshot);

  const pinnedUids = new Set(pinned.map((entry) => entry.uid));
  const others = recents.filter((entry) => !pinnedUids.has(entry.uid));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <div className="text-[11px] tracking-[0.22em] uppercase text-text-primary/50 mb-2.5">
        Profiles
      </div>
      <h1 className="font-plus-jakarta text-3xl md:text-5xl leading-[1.05] font-medium text-balance">
        Find a player.
      </h1>
      <p className="mt-4 max-w-140 text-sm md:text-base leading-relaxed text-text-primary/60">
        Search by UID or username. Star a profile to pin it
      </p>

      <div id="profiles-page-search" className="mt-8 scroll-mt-24">
        <ProfileSearch surface="profiles" showSavedProfiles={false} />
      </div>

      {pinned.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-primary/45">
            Pinned
          </h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {pinned.map((profile) => (
              <li key={profile.uid}>
                <ProfileCardLink profile={profile} pinned />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-primary/45">
            Recently opened
          </h2>
          {others.length > 0 && (
            <button
              type="button"
              onClick={clearRecentProfiles}
              className="cursor-pointer text-xs text-text-primary/40 transition-colors hover:text-text-primary/70"
            >
              Clear history
            </button>
          )}
        </div>

        {others.length > 0 ? (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {others.map((profile) => (
              <li key={profile.uid}>
                <ProfileCardLink profile={profile} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-border/70 px-4 py-5 text-sm text-text-primary/45">
            Profiles you open show up here. Find yourself with the search, or click any
            player on the leaderboards.
          </p>
        )}
      </section>
    </main>
  );
}
