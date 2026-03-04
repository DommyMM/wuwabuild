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

