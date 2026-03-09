'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LBSortKey, LBSortDirection } from '@/lib/lb';

export interface SortMenuOption {
  key: LBSortKey;
  label: string;
  icon?: string;
  iconFilter?: string;
}

export function blurFocusedMenuControl(): void {
  if (typeof document === 'undefined') return;
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

interface SortHeaderMenuProps {
  menuId: string;
  label: string;
  active: boolean;
  direction: LBSortDirection;
  options: SortMenuOption[];
  selectedKey: LBSortKey;
  onHeaderSort: () => void;
  onSelectOption: (key: LBSortKey) => void;
  alignMenuRight?: boolean;
  icon?: string;
  iconFilter?: string;
  showPlaceholderLine?: boolean;
  contentOpacityClass?: string;
  fillWidth?: boolean;
  naturalMenuWidth?: boolean;
  textSizeClass?: string;
  iconSizeClass?: string;
  showHeaderPlaceholderIcon?: boolean;
  showActive?: boolean;
  triggerWrapperClassName?: string;
}

export const SortHeaderMenu: React.FC<SortHeaderMenuProps> = ({
  menuId,
  label,
  active,
  direction,
  options,
  selectedKey,
  onHeaderSort,
  onSelectOption,
  alignMenuRight = false,
  icon = '',
  iconFilter,
  showPlaceholderLine = false,
  contentOpacityClass = '',
  fillWidth = true,
  naturalMenuWidth = false,
  textSizeClass = 'text-base',
  iconSizeClass = 'h-4 w-4',
  showHeaderPlaceholderIcon = true,
  showActive = false,
  triggerWrapperClassName = '',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const showLineOnly = showPlaceholderLine && !active;
  const menuVisibilityClass = isMenuOpen ? 'block' : 'hidden group-hover/sort:block group-focus-within/sort:block';

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const target = event.target;
      if (target instanceof Node && !containerRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMenuOpen(false);
      blurFocusedMenuControl();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <div ref={containerRef} className={`group/sort relative h-full items-stretch ${fillWidth ? 'flex w-full' : 'inline-flex'}`}>
      <div
        className={`flex h-full ${fillWidth ? 'w-full' : 'w-auto'} overflow-hidden ${
          showActive ? active ? 'border-t-2 border-accent/85' : 'border-t-2 border-transparent' : ''
        } ${triggerWrapperClassName}`}
      >
        <button
          type="button"
          onClick={() => {
            setIsMenuOpen(true);
            onHeaderSort();
          }}
          aria-expanded={isMenuOpen}
          aria-controls={`${menuId}-menu`}
          className={`flex h-full ${fillWidth ? 'w-full' : 'w-auto'} items-center justify-between gap-2 py-2 px-4 ${textSizeClass} transition-colors ${contentOpacityClass} ${
            active
              ? 'border-accent/85 bg-black/35 text-accent'
              : 'border-transparent text-text-primary/85 hover:border-border hover:bg-background/60 hover:text-text-primary'
          }`}
        >
          {showLineOnly ? (
            <span className="mx-2.5 h-px w-full bg-border/85" />
          ) : (
            <>
              <span className="flex min-w-0 items-center gap-2">
                {icon ? (
                  <img
                    src={icon}
                    alt=""
                    className={`${iconSizeClass} shrink-0 object-contain`}
                    style={iconFilter ? { filter: iconFilter } : undefined}
                  />
                ) : showHeaderPlaceholderIcon ? (
                  <span className={`inline-block ${iconSizeClass} shrink-0 opacity-0`} />
                ) : null}
                <span>{label}</span>
              </span>
              {active ? (
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${
                    direction === 'asc' ? 'rotate-180' : ''
                  }`}
                />
              ) : null}
            </>
          )}
        </button>
      </div>

      <div
        id={`${menuId}-menu`}
        className={`absolute top-full z-30 w-max ${naturalMenuWidth ? 'min-w-41' : 'min-w-full'} overflow-hidden rounded-b-md border border-border border-t-0 bg-background-secondary ${menuVisibilityClass} ${
          alignMenuRight ? 'right-0 left-auto' : 'left-0'
        }`}
      >
        {options.map((option) => {
          const isSelected = selectedKey === option.key;
          return (
            <button
              key={`${menuId}-${option.key}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsMenuOpen(false);
                onSelectOption(option.key);
                blurFocusedMenuControl();
              }}
              className={`flex w-full items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-left text-[15px] transition-colors last:border-b-0 ${
                isSelected
                  ? 'border-l-2 border-l-accent bg-black/35 text-accent'
                  : 'border-l-2 border-l-transparent text-text-primary hover:border-l-border hover:bg-background hover:text-text-primary/95'
              }`}
            >
              <span className="flex items-center gap-2">
                {option.icon ? (
                  <img
                    src={option.icon}
                    alt=""
                    className="h-4 w-4 object-contain"
                    style={option.iconFilter ? { filter: option.iconFilter } : undefined}
                  />
                ) : (
                  <span className="inline-block h-4 w-4 opacity-0" />
                )}
                <span className="whitespace-nowrap">{option.label}</span>
              </span>
              {isSelected && (
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition duration-300 ease-out ${direction === 'asc' ? 'rotate-180' : ''}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
