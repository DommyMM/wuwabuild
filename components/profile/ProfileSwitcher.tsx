'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Plus, Star, X } from 'lucide-react';
import { openProfileLookup } from '@/components/Navigation';
import { resolveRegionBadge } from '@/lib/regionBadge';
import { capture } from '@/lib/analytics';
import { getPinnedProfilesSnapshot, getProfilesServerSnapshot, getRecentProfilesSnapshot, removeRecentProfile, StoredProfile, subscribeProfileHistory } from '@/lib/profileHistory';

interface ProfileSwitcherProps {
  currentUid: string;
  /** Live name for the current tab, ahead of what history stored */
  currentUsername?: string;
  /** Live portrait for the current tab, ahead of what history stored */
  currentHead?: string | null;
}

type Tab = StoredProfile & { isPinned: boolean };

/** Width of the fade on a side with tabs scrolled out of view */
const EDGE_FADE_PX = 24;

/**
 * Device-local tab strip for hopping between starred and recently opened players
 *
 * - The current profile always has a tab, so the strip renders on the server and history only adds tabs beside it
 * - Starred tabs come first in star order, recents follow in the order they were first opened, and neither moves on revisit
 * - Every tab has the same end slot (star or close), so switching never changes widths
 * - Nothing here is synced or public
 */
export function ProfileSwitcher({ currentUid, currentUsername, currentHead }: ProfileSwitcherProps) {
  const pinned = useSyncExternalStore(subscribeProfileHistory, getPinnedProfilesSnapshot, getProfilesServerSnapshot);
  const recents = useSyncExternalStore(subscribeProfileHistory, getRecentProfilesSnapshot, getProfilesServerSnapshot);
  const router = useRouter();
  // Current tab being closed, hidden until navigation lands so it does not reappear at the end
  const [closingUid, setClosingUid] = useState<string | null>(null);
  const [closingFrom, setClosingFrom] = useState(currentUid);
  if (closingFrom !== currentUid) {
    setClosingFrom(currentUid);
    setClosingUid(null);
  }

  const pinnedUids = new Set(pinned.map((entry) => entry.uid));
  const pinnedTabs: Tab[] = [...pinned]
    .sort((a, b) => a.savedAt - b.savedAt)
    .map((entry) => ({ ...entry, isPinned: true }));
  const recentTabs: Tab[] = recents
    .filter((entry) => !pinnedUids.has(entry.uid))
    .sort((a, b) => (a.openedAt ?? a.savedAt) - (b.openedAt ?? b.savedAt))
    .map((entry) => ({ ...entry, isPinned: false }));
  // Before the visit is recorded the current profile sits where recordProfileVisit will put it, at the end
  if (closingUid !== currentUid && !pinnedUids.has(currentUid) && !recentTabs.some((entry) => entry.uid === currentUid)) {
    recentTabs.push({ uid: currentUid, username: '', head: null, savedAt: 0, isPinned: false });
  }
  const tabs = [...pinnedTabs, ...recentTabs].filter((entry) => entry.uid !== closingUid);

  /** Closing the current tab moves to its right neighbour, or its left one when it was last */
  const closeTab = (uid: string, index: number) => {
    if (uid === currentUid) {
      const next = tabs[index + 1] ?? tabs[index - 1];
      if (!next) return;
      setClosingUid(uid);
      capture('profile_open', { source: 'switcher', surface: 'profile' });
      router.push(`/profile/${next.uid}`);
    }
    removeRecentProfile(uid);
  };

  const scrollerRef = useRef<HTMLDivElement>(null);
  const currentTabRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  // Fade marks a side with hidden tabs, since the strip has no visible scrollbar
  // Vertical wheel scrolls an overflowing strip sideways, as browser and editor tab strips do
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const update = () => {
      const left = scroller.scrollLeft > 1;
      const right = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1;
      setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };
    const onWheel = (event: WheelEvent) => {
      if (scroller.scrollWidth <= scroller.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      scroller.scrollLeft += event.deltaY;
    };
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    scroller.addEventListener('wheel', onWheel, { passive: false });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener('scroll', update);
      scroller.removeEventListener('wheel', onWheel);
      observer.disconnect();
    };
  }, [tabs.length]);

  // Current tab scrolled into view by hand, since scrollIntoView would also scroll the page
  useEffect(() => {
    const scroller = scrollerRef.current;
    const tab = currentTabRef.current;
    if (!scroller || !tab) return;
    const left = tab.offsetLeft - EDGE_FADE_PX;
    const right = tab.offsetLeft + tab.offsetWidth + EDGE_FADE_PX;
    if (left < scroller.scrollLeft) scroller.scrollLeft = left;
    else if (right > scroller.scrollLeft + scroller.clientWidth) scroller.scrollLeft = right - scroller.clientWidth;
  }, [currentUid, tabs.length]);

  const fadeLeft = edges.left ? `transparent, black ${EDGE_FADE_PX}px` : 'black';
  const fadeRight = edges.right ? `black calc(100% - ${EDGE_FADE_PX}px), transparent` : 'black';
  const mask = edges.left || edges.right ? `linear-gradient(to right, ${fadeLeft}, ${fadeRight})` : undefined;

  return (
    <nav aria-label="Starred and recently opened profiles" className="relative">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-accent/25 to-transparent" />
      <div className="ml-4 flex items-end gap-1.5 pr-4 pt-1 md:ml-5 md:pr-5">
        <div
          ref={scrollerRef}
          className="relative flex min-w-0 items-end gap-1.5 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
          style={{ maskImage: mask, WebkitMaskImage: mask }}
        >
          {tabs.map((entry, index) => {
            const isCurrent = entry.uid === currentUid;
            const username = (isCurrent ? currentUsername : undefined) || entry.username || entry.uid;
            const head = (isCurrent ? currentHead : undefined) ?? entry.head;
            const badge = resolveRegionBadge(entry.uid);
            // Wider gap where starred tabs end and recents begin
            const startsRecents = index === pinnedTabs.length && index > 0;
            return (
              <div
                key={entry.uid}
                ref={isCurrent ? currentTabRef : undefined}
                className={`group relative flex h-9 shrink-0 items-center overflow-hidden rounded-t-lg border border-b-0 transition-colors ${
                  startsRecents ? 'ml-2' : ''
                } ${
                  isCurrent
                    ? 'border-accent/55 bg-background-secondary text-text-primary shadow-[0_-8px_24px_rgba(166,150,98,0.08)]'
                    : 'border-border/75 bg-background-secondary/55 text-text-primary/68 hover:border-accent/35 hover:bg-background-secondary/80 hover:text-text-primary'
                }`}
              >
                <Link
                  href={`/profile/${entry.uid}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  title={`${username} · ${entry.uid}`}
                  onClick={() => {
                    if (!isCurrent) capture('profile_open', { source: 'switcher', surface: 'profile' });
                  }}
                  className="flex h-full min-w-0 items-center gap-2 pl-1.5 pr-1.5"
                >
                  {head ? (
                    <img src={head} alt="" className="h-6 w-6 shrink-0 rounded object-cover object-top" loading="lazy" />
                  ) : (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-border/30 text-2xs font-bold text-text-primary/45">
                      {username.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-32 truncate text-sm leading-tight">{username}</span>
                  {badge && (
                    <span className={`shrink-0 rounded px-1 py-px text-[8px] font-semibold tracking-wider uppercase ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                </Link>
                {/* Starred tabs trade the close button for a star, browser-style, and a lone tab has nowhere to close to */}
                {entry.isPinned ? (
                  <span className="mr-1 grid h-6 w-6 shrink-0 place-items-center text-accent" title="Starred profile">
                    <Star size={11} className="fill-current" aria-label="Starred" />
                  </span>
                ) : tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => closeTab(entry.uid, index)}
                    className="mr-1 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md text-text-primary/35 opacity-70 transition-colors hover:bg-border/70 hover:text-text-primary group-hover:opacity-100"
                    title="Close recent profile"
                    aria-label={`Close ${username} from recent profiles`}
                  >
                    <X size={13} aria-hidden />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={openProfileLookup}
          className="mb-1 grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md text-text-primary/45 transition-colors hover:bg-border/60 hover:text-accent"
          title="Open another profile"
          aria-label="Open another profile"
        >
          <Plus size={15} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
