// Schreibt die gemeinsame Fußzeile (sitefoot.mjs, Quelle: Repo lowend-design) in index.html und site/*.html.
// Aufruf: node site/stamp-footer.mjs            alle Seiten schreiben
//         node site/stamp-footer.mjs --check    nichts schreiben, Exit 1 bei veralteter oder fehlender Fußzeile
//         node site/stamp-footer.mjs Datei ...  nur diese Dateien (so ruft build-i18n.py den Schreiber auf)
// Jede Seite hat genau eine Markierung <!-- sitefoot … --> … <!-- /sitefoot -->, außer den Weiterleitungsseiten in EXCLUDED.
// Außerdem bekommen style.css (in jeder Seite) und lowend.css (im @import von style.css) einen Inhalts-Hash als ?v=, damit kein
// Browser die neue Seite mit einem zwischengespeicherten alten Stylesheet kombiniert.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stamp } from './sitefoot.mjs';

const site = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(site);
const EXCLUDED = new Set(['datenschutz-resistance-scanner.html']);   // Weiterleitung ohne Fußzeile

const args = process.argv.slice(2);
const check = args.includes('--check');
const named = args.filter(a => a !== '--check');
const files = named.length ? named.map(f => path.resolve(f))
  : [path.join(root, 'index.html'), ...readdirSync(site).filter(f => f.endsWith('.html') && !EXCLUDED.has(f)).sort().map(f => path.join(site, f))];

const problems = [];
let written = 0;
const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 10);

// Erst lowend.css im @import von style.css versionieren, dann den Hash der fertigen style.css in die Seiten schreiben
const styleFile = path.join(site, 'style.css');
const style = readFileSync(styleFile, 'utf8');
const importRe = /@import url\('lowend\.css(?:\?v=[0-9a-f]+)?'\);/;
if (!importRe.test(style)) problems.push("site/style.css: @import url('lowend.css') fehlt");
const styleOut = style.replace(importRe, `@import url('lowend.css?v=${hash(readFileSync(path.join(site, 'lowend.css')))}');`);
if (styleOut !== style) {
  if (check) problems.push('site/style.css: Version von lowend.css veraltet (node site/stamp-footer.mjs ausführen)');
  else { writeFileSync(styleFile, styleOut); console.log('versioniert site/style.css'); }
}
const styleV = hash(styleOut);
const linkRe = /href="((?:site\/)?style\.css)(?:\?v=[0-9a-f]+)?"/g;

for (const file of files) {
  const rel = path.relative(root, file);
  const src = readFileSync(file, 'utf8');
  const markers = src.match(/<!-- sitefoot\b/g)?.length ?? 0;
  if (markers !== 1) { problems.push(`${rel}: ${markers} Markierungen statt genau einer`); continue; }
  if (!/href="(?:site\/)?style\.css(?:\?v=[0-9a-f]+)?"/.test(src)) { problems.push(`${rel}: kein <link> auf style.css`); continue; }
  let out;
  try { out = stamp(src).replace(linkRe, (_, href) => `href="${href}?v=${styleV}"`); } catch (e) { problems.push(`${rel}: ${e.message}`); continue; }
  if (out === src) continue;
  if (check) problems.push(`${rel}: Fußzeile oder Stylesheet-Version veraltet (node site/stamp-footer.mjs ausführen)`);
  else { writeFileSync(file, out); written++; console.log(`gestempelt ${rel}`); }
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(check ? `Fußzeile aktuell in ${files.length} Seiten` : `${written} von ${files.length} Seiten geschrieben`);
