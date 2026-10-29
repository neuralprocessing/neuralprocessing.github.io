// LowEnd Design: gemeinsame Fußzeile aller LowEnd-Seiten und -Apps (Home, App, Support, Datenschutz, Impressum, Lizenzen).
// Einzige Quelle für Markup, Reihenfolge und Beschriftungen. Nicht in den Projekten ändern, sondern hier und dann ./sync.sh ausführen.
// Reines Modul ohne Importe und ohne DOM-Globals: läuft in Node (Build, Tests), in esbuild/tsc und direkt im Browser.
//
// Die Fußzeile steht als statisches HTML in jeder Seite (Impressum und Datenschutz müssen ohne JavaScript erreichbar sein).
// Sie wird zwischen zwei Markierungen erzeugt und von stamp() in die Datei geschrieben:
//   <!-- sitefoot base="../" privacy="datenschutz-whispered.html" licences="whispered" self="privacy" -->
//   <!-- /sitefoot -->
// Attribute: base (Pfad zur Site-Wurzel, "" oder "../"), privacy (Datenschutzseite unter site/), licences (Anker auf site/lizenzen.html),
// app + appname (App-Link unter site/ mit Produktnamen; beide oder keins), self (Link der aktuellen Seite entfällt:
// home, app, support, privacy, imprint oder licences). Die Sprache kommt aus <html lang>, sonst Deutsch.

export const LANGS = ['de', 'en', 'es', 'fr', 'it', 'ja', 'pt', 'zh'];

/** @type {Record<string, { home: string, support: string, privacy: string, imprint: string, licences: string }>} */
export const LABELS = {
  de: { home: 'Home', support: 'Support', privacy: 'Datenschutz', imprint: 'Impressum', licences: 'Lizenzen' },
  en: { home: 'Home', support: 'Support', privacy: 'Privacy', imprint: 'Legal notice', licences: 'Licences' },
  es: { home: 'Inicio', support: 'Soporte', privacy: 'Privacidad', imprint: 'Aviso legal', licences: 'Licencias' },
  fr: { home: 'Accueil', support: 'Assistance', privacy: 'Confidentialité', imprint: 'Mentions légales', licences: 'Licences' },
  it: { home: 'Home', support: 'Supporto', privacy: 'Privacy', imprint: 'Note legali', licences: 'Licenze' },
  ja: { home: 'ホーム', support: 'サポート', privacy: 'プライバシー', imprint: '運営者情報', licences: 'ライセンス' },
  pt: { home: 'Início', support: 'Suporte', privacy: 'Privacidade', imprint: 'Informação legal', licences: 'Licenças' },
  zh: { home: '首页', support: '支持', privacy: '隐私', imprint: '法律声明', licences: '许可证' },
};

const ATTRS = ['base', 'privacy', 'licences', 'app', 'appname', 'self'];
const SELF = ['home', 'app', 'support', 'privacy', 'imprint', 'licences'];
const START = /^([ \t]*)<!-- sitefoot((?:\s+[a-z]+="[^"]*")*)\s*-->/gm;
const ATTR = /\s+([a-z]+)="([^"]*)"/g;
const END = '<!-- /sitefoot -->';
const STEP = '  ';

/** Unterstützte Sprache zum Sprachcode (en-GB → en); unbekannt oder leer → de. @param {string | null | undefined} lang */
function pick(lang) {
  const primary = String(lang ?? '').toLowerCase().split('-')[0];
  return LANGS.includes(primary) ? primary : 'de';
}

/** @param {string} s */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Die Fußzeile als HTML: ein Link pro Zeile, feste Reihenfolge Home, App, Support, Datenschutz, Impressum, Lizenzen.
 * @param {{ base?: string, privacy?: string, licences?: string, app?: string, appname?: string, self?: string, lang?: string }} o
 * @param {string} [indent] Einrückung der Zeilen (die der Markierung)
 * @returns {string} <footer class="sitefoot">…</footer>, je Link ein <a data-sitefoot="Schlüssel">
 */
export function render({ base = '', privacy = 'datenschutz.html', licences = '', app, appname, self, lang = 'de' }, indent = '') {
  if (self !== undefined && !SELF.includes(self)) throw new Error(`sitefoot: unbekanntes self="${self}" (erlaubt: ${SELF.join(', ')})`);
  if ((app === undefined) !== (appname === undefined)) throw new Error('sitefoot: app und appname gehören zusammen');
  const labels = LABELS[pick(lang)];
  /** @type {[string, string, string][]} */
  const links = [['home', base + 'index.html', labels.home]];
  if (app !== undefined && appname !== undefined) links.push(['app', base + 'site/' + app, appname]);
  links.push(
    ['support', base + 'site/support.html', labels.support],
    ['privacy', base + 'site/' + privacy, labels.privacy],
    ['imprint', base + 'site/impressum.html', labels.imprint],
    ['licences', base + 'site/lizenzen.html' + (licences ? '#' + licences : ''), labels.licences],
  );
  const lines = links.filter(([key]) => key !== self).map(([key, href, text]) => `${indent}${STEP}<a data-sitefoot="${key}" href="${esc(href)}">${esc(text)}</a>`);
  return [`${indent}<footer class="sitefoot">`, ...lines, `${indent}</footer>`].join('\n');
}

/**
 * Erzeugt jeden Block <!-- sitefoot …Attribute --> … <!-- /sitefoot --> neu. Sprache aus <html lang> (Hauptteil), sonst de.
 * Reiner Text → Text und idempotent. Wirft bei unbekanntem Attribut, doppeltem Attribut, unbekanntem self oder fehlender Endmarke.
 * @param {string} html
 * @returns {string}
 */
export function stamp(html) {
  const lang = pick(/<html\b[^>]*\blang="([^"]*)"/i.exec(html)?.[1]);
  let out = '';
  let pos = 0;
  START.lastIndex = 0;
  for (let m; (m = START.exec(html)); ) {
    const [whole, indent, attrText] = m;
    /** @type {Record<string, string>} */
    const attrs = {};
    for (const a of attrText.matchAll(ATTR)) {
      if (!ATTRS.includes(a[1])) throw new Error(`sitefoot: unbekanntes Attribut "${a[1]}" (erlaubt: ${ATTRS.join(', ')})`);
      if (a[1] in attrs) throw new Error(`sitefoot: Attribut "${a[1]}" doppelt`);
      attrs[a[1]] = a[2];
    }
    const from = m.index + whole.length;
    const end = html.indexOf(END, from);
    if (end < 0) throw new Error('sitefoot: Endmarke <!-- /sitefoot --> fehlt');
    if (html.slice(from, end).includes('<!-- sitefoot')) throw new Error('sitefoot: Markierungen dürfen nicht verschachtelt sein');
    out += html.slice(pos, m.index) + `${indent}<!-- sitefoot${attrText} -->\n${render({ ...attrs, lang }, indent)}\n${indent}${END}`;
    pos = end + END.length;
    START.lastIndex = pos;
  }
  if (html.slice(pos).includes('<!-- sitefoot')) throw new Error('sitefoot: Anfangsmarke nicht erkannt (Zeilenanfang, Attribute name="wert")');
  return out + html.slice(pos);
}

/**
 * Laufzeit-Umschaltung für die Apps: setzt textContent jedes [data-sitefoot] unter root auf die Beschriftung der Sprache (fehlende
 * Sprache → de). Ändert nur textContent, nie Attribute oder Links; der App-Link (Produktname) bleibt unübersetzt.
 * @param {{ querySelectorAll(selector: string): Iterable<{ getAttribute(name: string): string | null, textContent: string | null }> }} root
 * @param {string} lang
 */
export function relabel(root, lang) {
  /** @type {Record<string, string>} */
  const labels = LABELS[pick(lang)];
  for (const el of root.querySelectorAll('[data-sitefoot]')) {
    const text = labels[el.getAttribute('data-sitefoot') ?? ''];
    if (text !== undefined) el.textContent = text;
  }
}
