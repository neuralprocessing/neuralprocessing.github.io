#!/usr/bin/env python3
"""Generate the Whispered privacy pages from site/i18n/privacy-whispered.json.

One dictionary, eight HTML files. Run from anywhere:

    python3 site/build-i18n.py

The generated files are committed, because GitHub Pages serves static files and
App Review must be able to open the URL without any build step.

The footer is not part of this template's text: the sitefoot marker is filled in by
site/stamp-footer.mjs (labels per language live in site/sitefoot.mjs), which this script
runs on the files it wrote. Needs Node.js.
"""

import json
import subprocess
from pathlib import Path

SITE = Path(__file__).resolve().parent
SOURCE = SITE / "i18n" / "privacy-whispered.json"
BASE_URL = "https://lowend.dev/site/"

# Contact details appear reversed in the source and are flipped back by CSS (.rev);
# the e-mail is additionally base64-encoded and decoded by contact.js. Same pattern as
# impressum.html, so scrapers get nothing new from these pages.
CONTROLLER_HTML = (
    "<span class='rev'>tdrahlegnE kiaM</span><br>\n"
    "        <span class='rev'>83 .rtsesieW</span><br>\n"
    "        <span class='rev'>nilreB 94021</span><br>\n"
    "        {country}<br>\n"
    "        E-Mail: {email}"
)
EMAIL_HTML = (
    "<a href='#' data-e='dmVkLmRuZXdvbEB0cm9wcHVz'>"
    "<span class='rev'>ved.dnewol@troppus</span></a>"
)
COUNTRY = {
    "de": "Deutschland", "en": "Germany", "es": "Alemania", "fr": "Allemagne",
    "it": "Germania", "ja": "ドイツ", "pt": "Alemanha", "zh": "德国",
}

TEMPLATE = """<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{page_title}</title>
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">
    <link rel="stylesheet" href="style.css">
    <link rel="canonical" href="{canonical}">
{alternates}
</head>
<body>
<div class="page">
    <h1>{title}</h1>
    <p class="lang-switch"><span>{languages_label}:</span> {switcher}</p>
    <p>{intro}</p>
{sections}
</div>
<!-- sitefoot base="../" privacy="datenschutz.html" app="whispered.html" appname="Whispered" licences="whispered" -->
<!-- /sitefoot -->
<script src="contact.js"></script>
</body>
</html>
"""


def render_section(section: dict, lang: str) -> str:
    out = [f"    <h2>{section['h']}</h2>"]
    for paragraph in section["p"]:
        paragraph = paragraph.replace(
            "{{CONTROLLER}}",
            CONTROLLER_HTML.format(country=COUNTRY[lang], email=EMAIL_HTML),
        ).replace("{{EMAIL}}", EMAIL_HTML)
        out.append(f"    <p>\n        {paragraph}\n    </p>")
    return "\n".join(out)


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    files = data["files"]
    languages = data["languages"]
    default = data["default"]

    alternates = "\n".join(
        f'    <link rel="alternate" hreflang="{code}" href="{BASE_URL}{files[code]}">'
        for code in files
    ) + f'\n    <link rel="alternate" hreflang="x-default" href="{BASE_URL}{files[default]}">'

    written: list[Path] = []
    for code, strings in languages.items():
        switcher = " · ".join(
            f"<strong>{languages[other]['name']}</strong>" if other == code
            else f"<a href='{files[other]}' hreflang='{other}'>{languages[other]['name']}</a>"
            for other in files
        )
        html = TEMPLATE.format(
            lang=code,
            page_title=strings["pageTitle"],
            canonical=BASE_URL + files[code],
            alternates=alternates,
            title=strings["title"],
            languages_label=strings["languagesLabel"],
            switcher=switcher,
            intro=strings["intro"],
            sections="\n\n".join(render_section(s, code) for s in strings["sections"]),
        )
        target = SITE / files[code]
        target.write_text(html, encoding="utf-8")
        written.append(target)
        print(f"wrote {target.relative_to(SITE.parent)}  ({len(strings['sections'])} sections)")

    subprocess.run(["node", str(SITE / "stamp-footer.mjs"), *map(str, written)], check=True)


if __name__ == "__main__":
    main()
