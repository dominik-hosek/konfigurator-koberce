# PROGRESS – Konfigurátor koberců URUG

Stav projektu po fázích. Aktualizuje se na konci každé fáze.

## Hotovo

- **Fáze 0 – průzkum a pravidla** (2026-10-05)
  - Repozitář byl prázdný (žádné commity, žádné větve na GitHubu, žádná složka `brand/`).
  - Vytvořen `CLAUDE.md` (stack, pravidla, konvence, pipeline zpracování, struktura složek).
  - Vytvořen tento `PROGRESS.md`.

- **Fáze 1 – scaffold, nahrání, redukce barev, plochý náhled** (2026-10-05)
  - Vite 8 + React 19 + TypeScript 6 (strict) + Tailwind 4, ESLint 9 (vč. jsx-a11y
    a hlídání, že `src/lib` nesahá na DOM), Prettier, Vitest.
  - Konfigurace v `src/config/*.json` (paleta přízí, ceník, limity, endpoint) se zástupnými
    hodnotami a validací při startu (`src/config/schema.ts`).
  - Nahrání obrázku: drag & drop, výběr souboru, tlačítko „Vyfotit“ na dotykových zařízeních;
    kontrola formátu (JPG/PNG/WebP, i podle přípony) a velikosti; zmenšení na ≤1024 px.
  - Web Worker: histogram barev → vážený k-means++ v Lab (2–12 barev) → index barvy pro každý
    pixel → plochý náhled. Průběh se ukazuje progress barem a textem, starší požadavky se
    při tažení posuvníkem zahazují, mezivýsledky se cachují.
  - Průhledné pixely PNG se už teď berou jako pozadí (nejsou součástí koberce).
  - UI: přepínač Návrh / Původní, posuvník počtu barev, seznam barev s podílem plochy.
  - 29 unit testů (převod barev, k-means, kvantizace, validace uploadu, konfigurace, reducer).

## Rozpracováno

- nic

## Další kroky

- [ ] **Fáze 2** – mapování na paletu přízí (Lab, CIEDE2000), ruční přepínání přízí,
      odstranění pozadí (alfa / klik + tolerance), vyhlazení detailů.
- [ ] **Fáze 3** – tvary (obdélník, kruh, ovál, podle motivu), rozměry, kalkulace ceny.
- [ ] **Fáze 4** – tuftovaný vzhled náhledu.
- [ ] **Fáze 5** – poptávkový formulář, export PNG.
- [ ] **Fáze 6** – responzivita, iframe embed s automatickou výškou, deploy na GitHub
      Pages, README s návodem na úpravu cen a palety.

## Poznámky pro další fáze

- Vyhlazené hrany loga (anti-aliasing) vytvářejí drobné přechodové barvy (~0,5 % plochy).
  Řeší je Fáze 2 (vyhlazení detailů) – případně je při mapování na přízi sloučíme.
- Formát HEIC (iPhone) prohlížeče neumí dekódovat; při focení přes „Vyfotit“ iOS posílá JPEG.

## Otevřené otázky

Zatím se jede se zástupnými hodnotami (`"_placeholder": true`):

- [ ] Skutečná paleta přízí (názvy, kódy, HEX).
- [ ] Ceník a příplatky (cena za m², příplatek za barvy, za tvar podle motivu, minimální cena).
- [ ] Minimální vytuftovatelný detail v mm (zástupně 10 mm) a min./max. rozměry koberce.
- [ ] Endpoint nebo e-mail pro poptávky (Formspree?).
- [ ] Kam přesně se konfigurátor vloží na urug.cz (kvůli iframe a CSP/`frame-ancestors`).
- [ ] GitHub Pages na bezplatném účtu vyžaduje **veřejný** repozitář – je to v pořádku?
- [ ] Výchozí větev repozitáře: repo je prázdné, první pushnutá větev se stane výchozí.
      Deploy workflow plánuji spouštět z `main`.
- [ ] Logo / barvy URUG – složka `brand/` zatím neexistuje.
