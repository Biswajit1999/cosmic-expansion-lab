"""One-time v2 editorial integration; safe to rerun against the v1 or v2 page."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'web/index.html'
s=p.read_text(encoding='utf8')
if '<!-- V2 CHAPTERS -->' in s:
    raise SystemExit('V2 chapters already installed')
s=s.replace('<link rel="stylesheet" href="style.css"><script src="app.js" defer></script>', '<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="research.css"><script src="app.js" defer></script><script src="research.js" defer></script>')
s=s.replace('AN OPEN SCIENCE PROJECT / 01','OPEN DATA / OPEN QUESTIONS / VOL. 02')
start=s.index('<section class="intro">');end=s.index('<div class="data-strip">',start)
s=s[:start]+'''<section class="intro intro-v2"><div><p class="eyebrow"><span class="dot"></span> A FIELD GUIDE TO THE EXPANDING UNIVERSE</p><h1>The universe<br>won’t sit <em>still.</em></h1><p class="hero-deck">Read the light. Measure the distance.<br>Explore the evidence for cosmic expansion.</p><a class="text-link" href="#laboratory">Start exploring <span aria-hidden="true">↓</span></a></div><figure class="intro-observation"><img src="assets/cosmic-field.jpg" alt="Hubble observation of CLASS B1608+656: a field of galaxies at different distances, with white and orange galaxies against black space." width="1280" height="1281" fetchpriority="high"><figcaption><span>AN ACTUAL CROSS-SECTION OF THE COSMOS</span><a href="https://esahubble.org/images/heic1408a/">CLASS B1608+656 · NASA, ESA ↗</a></figcaption></figure></section>
<nav class="chapter-nav" aria-label="Project chapters"><a href="#laboratory">01 / Experiment</a><a href="#observations">02 / Observe</a><a href="#distances">03 / Calculate</a><a href="#research">04 / Test the model</a><a href="#field-guide">05 / Understand</a><a href="#catalog">06 / Reproduce</a></nav>
'''+s[end:]
marker='<section id="methods">'
chapters=(ROOT/'scripts/chapters.html').read_text(encoding='utf8')
s=s.replace(marker,chapters+'\n'+marker)
s=s.replace('02 / FOLLOW THE REASONING','THE EQUATIONS BEHIND THE EXPERIMENTS').replace('03 / OPEN THE NOTEBOOK','06 / REPRODUCIBLE OPEN SCIENCE')
s=s.replace('python analysis/fit.py\n','python analysis/fit.py\npython analysis/research.py\n')
s=s.replace('<footer><span>COSMIC EXPANSION LAB</span>', '<footer><span>COSMIC EXPANSION LAB · VOL. 02</span><a href="https://github.com/Biswajit1999/cosmic-expansion-lab">Public repository ↗</a>')
p.write_text(s,encoding='utf8')
