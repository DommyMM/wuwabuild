import { loadCharacterDisplayMap, loadWeaponNames } from '@/lib/server/gameData';

// Internal gallery for eyeballing every OG embed in one place, at Discord-ish
// render width. Never cached, never indexed; image URLs get a ?v= cache-buster
// so edits show up without fighting the edge cache.
// Dev-only: production builds always 404.
export const dynamic = 'force-dynamic';

const STATIC_CARDS: Array<{ label: string; url: string }> = [
  { label: 'Root / fallback (all routes without their own card)', url: '/opengraph-image' },
  { label: '/leaderboards', url: '/api/og/leaderboards' },
  { label: '/builds', url: '/api/og/builds' },
  { label: '/import', url: '/api/og/import' },
  { label: '/edit', url: '/api/og/edit' },
  { label: '/saves', url: '/api/og/saves' },
  { label: '/profiles', url: '/api/og/profiles' },
];

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function options(entries: Array<{ id: string; name: string }>, selected: string, blankLabel?: string): string {
  const blank = blankLabel ? `<option value="">${escapeHtml(blankLabel)}</option>` : '';
  return (
    blank +
    entries
      .map(
        (e) =>
          `<option value="${escapeHtml(e.id)}"${e.id === selected ? ' selected' : ''}>${escapeHtml(e.name)} (${escapeHtml(e.id)})</option>`,
      )
      .join('')
  );
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }
  const characters = Object.entries(loadCharacterDisplayMap())
    .map(([id, c]) => ({ id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const weapons = Object.entries(loadWeaponNames())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const defaultChar = characters.some((c) => c.id === '1107') ? '1107' : (characters[0]?.id ?? '');

  const staticCards = STATIC_CARDS.map(
    (card) => `
      <figure>
        <img data-base="${escapeHtml(card.url)}" alt="${escapeHtml(card.label)}" width="440" height="231" loading="lazy" />
        <figcaption><a href="${escapeHtml(card.url)}" target="_blank" rel="noopener">${escapeHtml(card.label)}</a></figcaption>
      </figure>`,
  ).join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>OG Preview | WuWaBuilds</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 32px; background: #121212; color: #e6e6ea; font: 15px/1.5 system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.hint { color: #8b8b93; margin: 0 0 24px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.14em; color: #cdbe8f; margin: 36px 0 12px; }
  .grid { display: flex; flex-wrap: wrap; gap: 20px; }
  figure { margin: 0; }
  img { display: block; width: 440px; height: auto; border: 1px solid #2a2a30; border-radius: 8px; background: #090909; }
  figcaption { margin-top: 6px; font-size: 13px; color: #8b8b93; }
  a { color: #cdbe8f; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .controls { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
  select, input, button { background: #1d1d23; color: #e6e6ea; border: 1px solid #2a2a30; border-radius: 6px; padding: 6px 10px; font: inherit; }
  button { cursor: pointer; }
</style>
</head>
<body>
<h1>OG embed preview</h1>
<p class="hint">Rendered at 440px, roughly what Discord shows. Click a caption to open the full 1200&times;630 image. Images load with a cache-buster; use Reload all after deploying changes.</p>
<button id="reload-all" type="button">Reload all</button>

<h2>Static cards</h2>
<div class="grid">${staticCards}</div>

<h2>Character page</h2>
<div class="controls">
  <select id="char-select">${options(characters, defaultChar)}</select>
</div>
<figure>
  <img id="char-img" alt="Character card" width="440" height="231" />
  <figcaption><a id="char-link" href="#" target="_blank" rel="noopener"></a></figcaption>
</figure>

<h2>Weapon page</h2>
<div class="controls">
  <select id="weapon-select">${options(weapons, weapons[0]?.id ?? '')}</select>
</div>
<figure>
  <img id="weapon-img" alt="Weapon card" width="440" height="231" />
  <figcaption><a id="weapon-link" href="#" target="_blank" rel="noopener"></a></figcaption>
</figure>

<h2>Character leaderboard</h2>
<div class="controls">
  <select id="lb-char-select">${options(characters, defaultChar)}</select>
  <select id="lb-weapon-select">${options(weapons, '', 'default weapon')}</select>
  <input id="lb-track" type="text" placeholder="track (optional)" />
  <button id="lb-apply" type="button">Apply</button>
</div>
<figure>
  <img id="lb-img" alt="Leaderboard card" width="440" height="231" />
  <figcaption><a id="lb-link" href="#" target="_blank" rel="noopener"></a></figcaption>
</figure>

<script>
(function () {
  function bust(url) {
    return url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now();
  }
  function setCard(imgId, linkId, url) {
    var img = document.getElementById(imgId);
    var link = document.getElementById(linkId);
    img.src = bust(url);
    link.href = url;
    link.textContent = url;
  }
  function refreshStatic() {
    var imgs = document.querySelectorAll('img[data-base]');
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].src = bust(imgs[i].getAttribute('data-base'));
    }
  }
  function refreshChar() {
    var id = document.getElementById('char-select').value;
    setCard('char-img', 'char-link', '/api/og/character?id=' + encodeURIComponent(id));
  }
  function refreshWeapon() {
    var id = document.getElementById('weapon-select').value;
    setCard('weapon-img', 'weapon-link', '/api/og/weapon?id=' + encodeURIComponent(id));
  }
  function refreshLb() {
    var charId = document.getElementById('lb-char-select').value;
    var weaponId = document.getElementById('lb-weapon-select').value;
    var track = document.getElementById('lb-track').value.trim();
    var url = '/api/og/leaderboard?char=' + encodeURIComponent(charId);
    if (weaponId) url += '&weaponId=' + encodeURIComponent(weaponId);
    if (track) url += '&track=' + encodeURIComponent(track);
    setCard('lb-img', 'lb-link', url);
  }
  document.getElementById('char-select').addEventListener('change', refreshChar);
  document.getElementById('weapon-select').addEventListener('change', refreshWeapon);
  document.getElementById('lb-char-select').addEventListener('change', refreshLb);
  document.getElementById('lb-apply').addEventListener('click', refreshLb);
  document.getElementById('reload-all').addEventListener('click', function () {
    refreshStatic();
    refreshChar();
    refreshWeapon();
    refreshLb();
  });
  refreshStatic();
  refreshChar();
  refreshWeapon();
  refreshLb();
})();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
