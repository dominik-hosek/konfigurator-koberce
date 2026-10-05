# PROGRESS – Konfigurátor koberců URUG

Stav projektu po fázích. Aktualizuje se na konci každé fáze.

## Hotovo

- **Fáze 0 – průzkum a pravidla** (2026-10-05)
  - Repozitář byl prázdný (žádné commity, žádné větve na GitHubu, žádná složka `brand/`).
  - Vytvořen `CLAUDE.md` (stack, pravidla, konvence, pipeline zpracování, struktura složek).
  - Vytvořen tento `PROGRESS.md`.

## Rozpracováno

- nic

## Další kroky

- [ ] **Fáze 1** – scaffold (Vite + React + TS + Tailwind, ESLint, Vitest), konfigurační
      JSONy se zástupnými hodnotami, nahrání obrázku (drag & drop, soubor, fotoaparát),
      zmenšení na ≤1024 px, Web Worker s průběhem, k-means redukce barev (2–12), plochý náhled.
- [ ] **Fáze 2** – mapování na paletu přízí (Lab, CIEDE2000), ruční přepínání přízí,
      odstranění pozadí (alfa / klik + tolerance), vyhlazení detailů.
- [ ] **Fáze 3** – tvary (obdélník, kruh, ovál, podle motivu), rozměry, kalkulace ceny.
- [ ] **Fáze 4** – tuftovaný vzhled náhledu.
- [ ] **Fáze 5** – poptávkový formulář, export PNG.
- [ ] **Fáze 6** – responzivita, iframe embed s automatickou výškou, deploy na GitHub
      Pages, README s návodem na úpravu cen a palety.

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
