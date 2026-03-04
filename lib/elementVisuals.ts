import { Element } from './character';

export const ELEMENT_ICON_FILTERS: Record<string, string> = {
  'Aero DMG':
    'brightness(0) saturate(100%) invert(81%) sepia(40%) saturate(904%) hue-rotate(93deg) brightness(104%) contrast(103%)',
  'Glacio DMG':
    'brightness(0) saturate(100%) invert(68%) sepia(39%) saturate(2707%) hue-rotate(176deg) brightness(102%) contrast(97%)',
  'Fusion DMG':
    'brightness(0) saturate(100%) invert(62%) sepia(74%) saturate(2505%) hue-rotate(328deg) brightness(98%) contrast(93%)',
  'Electro DMG':
    'brightness(0) saturate(100%) invert(63%) sepia(39%) saturate(1470%) hue-rotate(227deg) brightness(103%) contrast(101%)',
  'Havoc DMG':
    'brightness(0) saturate(100%) invert(53%) sepia(40%) saturate(1418%) hue-rotate(296deg) brightness(98%) contrast(96%)',
  'Spectro DMG':
    'brightness(0) saturate(100%) invert(83%) sepia(34%) saturate(1178%) hue-rotate(359deg) brightness(102%) contrast(94%)',
} as const;

export const ELEMENT_TINT: Record<string, string> = {
  Aero: 'from-aero/24 via-aero/10 to-transparent',
  Havoc: 'from-havoc/28 via-havoc/12 to-transparent',
  Spectro: 'from-spectro/24 via-spectro/10 to-transparent',
  Glacio: 'from-glacio/22 via-glacio/9 to-transparent',
  Electro: 'from-electro/24 via-electro/10 to-transparent',
  Fusion: 'from-fusion/26 via-fusion/11 to-transparent',
};

export const ELEMENT_BLOOM: Record<string, string> = {
  Aero: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(85,255,181,0.28)_0%,rgba(85,255,181,0.08)_40%,transparent_78%)]',
  Havoc: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(230,73,166,0.3)_0%,rgba(230,73,166,0.09)_40%,transparent_78%)]',
  Spectro: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(248,229,108,0.27)_0%,rgba(248,229,108,0.09)_40%,transparent_78%)]',
  Glacio: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(65,174,251,0.26)_0%,rgba(65,174,251,0.08)_40%,transparent_78%)]',
  Electro: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(180,107,255,0.28)_0%,rgba(180,107,255,0.09)_40%,transparent_78%)]',
  Fusion: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(240,116,78,0.28)_0%,rgba(240,116,78,0.09)_40%,transparent_78%)]',
};

export const ELEMENT_TINT_CLASS: Record<string, string> = {
  Aero: 'bg-[radial-gradient(100%_70%_at_5%_0%,rgba(85,255,181,0.11)_0%,transparent_62%)]',
  Havoc: 'bg-[radial-gradient(100%_70%_at_5%_0%,rgba(230,73,166,0.12)_0%,transparent_62%)]',
  Spectro: 'bg-[radial-gradient(100%_70%_at_5%_0%,rgba(248,229,108,0.11)_0%,transparent_62%)]',
  Glacio: 'bg-[radial-gradient(100%_70%_at_5%_0%,rgba(65,174,251,0.12)_0%,transparent_62%)]',
  Electro: 'bg-[radial-gradient(100%_70%_at_5%_0%,rgba(180,107,255,0.12)_0%,transparent_62%)]',
  Fusion: 'bg-[radial-gradient(100%_70%_at_5%_0%,rgba(240,116,78,0.12)_0%,transparent_62%)]',
};

export const ELEMENT_COLOR: Record<string, string> = {
  Aero: '#55FFB5',
  Havoc: '#E649A6',
  Spectro: '#F8E56C',
  Glacio: '#41AEFB',
  Electro: '#B46BFF',
  Fusion: '#F0744E',
};

export const ELEMENT_BG: Record<string, string> = {
  [Element.Glacio]:  'bg-glacio/15 hover:bg-gradient-to-b hover:from-glacio/30 hover:to-glacio/5',
  [Element.Fusion]:  'bg-fusion/15 hover:bg-gradient-to-b hover:from-fusion/30 hover:to-fusion/5',
  [Element.Electro]: 'bg-electro/15 hover:bg-gradient-to-b hover:from-electro/30 hover:to-electro/5',
  [Element.Aero]:    'bg-aero/15 hover:bg-gradient-to-b hover:from-aero/30 hover:to-aero/5',
  [Element.Spectro]: 'bg-spectro/15 hover:bg-gradient-to-b hover:from-spectro/30 hover:to-spectro/5',
  [Element.Havoc]:   'bg-havoc/15 hover:bg-gradient-to-b hover:from-havoc/30 hover:to-havoc/5',
  [Element.Rover]:   'bg-rover/15 hover:bg-gradient-to-b hover:from-rover/30 hover:to-rover/5',
};

export const ELEMENT_CHIP_ACTIVE: Record<string, string> = {
  [Element.Glacio]:  'bg-glacio/20 border-glacio/50 text-glacio',
  [Element.Fusion]:  'bg-fusion/20 border-fusion/50 text-fusion',
  [Element.Electro]: 'bg-electro/20 border-electro/50 text-electro',
  [Element.Aero]:    'bg-aero/20 border-aero/50 text-aero',
  [Element.Spectro]: 'bg-spectro/20 border-spectro/50 text-spectro',
  [Element.Havoc]:   'bg-havoc/20 border-havoc/50 text-havoc',
};

export const ELEMENT_BADGE_COLORS: Record<string, string> = {
  'Aero':       'bg-aero/80 text-white border-aero',
  'Glacio':     'bg-blue-400/80 text-white border-blue-400',
  'Electro':    'bg-purple-500/80 text-white border-purple-500',
  'Fusion':     'bg-orange-400/80 text-white border-orange-400',
  'Havoc':      'bg-pink-500/80 text-white border-pink-500',
  'Spectro':    'bg-spectro/80 text-black border-spectro',
  'ER':         'bg-zinc-500/80 text-white border-zinc-500',
  'Attack':     'bg-red-700/80 text-white border-red-700',
  'Healing':    'bg-green-500/80 text-white border-green-500',
  'Empyrean':   'bg-slate-400/80 text-white border-slate-400',
  'Frosty':     'bg-sky-400/80 text-white border-sky-400',
  'Midnight':   'bg-purple-400/80 text-white border-purple-400',
  'Radiance':   'bg-yellow-400/80 text-black border-yellow-400',
  'Tidebreaking': 'bg-zinc-600/80 text-white border-zinc-600',
  'Gust':       'bg-cyan-300/80 text-black border-cyan-300',
  'Windward':   'bg-teal-500/80 text-white border-teal-500',
  'Flaming':    'bg-red-900/80 text-white border-red-900',
  'Dream':      'bg-pink-300/80 text-black border-pink-300',
  'Crown':      'bg-amber-600/80 text-white border-amber-600',
  'Law':        'bg-slate-600/80 text-white border-slate-600',
  'Flamewing':  'bg-orange-500/80 text-white border-orange-500',
  'Thread':     'bg-fuchsia-400/80 text-white border-fuchsia-400',
  'Pact':       'bg-yellow-500/80 text-black border-yellow-500',
  'Halo':       'bg-lime-400/80 text-black border-lime-400',
  'Rite':       'bg-amber-500/80 text-white border-amber-500',
  'Trailblazing': 'bg-red-500/80 text-white border-red-500',
  'Chromatic':  'bg-rose-400/80 text-white border-rose-400',
  'Sound':      'bg-emerald-600/80 text-white border-emerald-600',
};