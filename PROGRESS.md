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

- **Fáze 2 – příze, pozadí, vyhlazení detailů** (2026-10-05)
  - Mapování barev na nejbližší přízi z palety (CIEDE2000, ověřeno na referenčních datech).
    Barvy, které připadnou na stejnou přízi, se sloučí.
  - Ruční přepnutí příze: dialog se všemi přízemi seřazenými podle podobnosti, označená
    doporučená, „Vrátit doporučenou“. Ovladatelné klávesnicí (Esc zavře).
  - Pozadí: průhledné PNG automaticky; „Najít pozadí automaticky“ (dominantní barva okraje
    obrázku, plní se od okrajů); „Vybrat pozadí v náhledu“ kliknutím (lze přidat více míst);
    posuvník citlivosti; volba „Odstranit tuto barvu i uvnitř motivu“; zrušení. Odstraněné
    pozadí se v náhledu ukazuje šachovnicí.
  - Vyhlazení detailů: morfologické otevření kruhem o průměru minimálního detailu
    (`limits.json` → `minDetailMm`) přepočteného na pixely podle šířky koberce. Odstraní
    tenké linky, ostrůvky, úzké mezery i ostré špičky; okraj obrázku neerodují.
    Příze, které úplně zmizí, se vypíšou jako „příliš drobné“.
  - Worker: pipeline s cache po stupních; rozpracovaný výpočet se zahodí, když přijde novější
    požadavek (např. tažení posuvníkem).
  - GitHub Pages: automatický build + lint + testy + nasazení při každém pushi
    (https://dominik-hosek.github.io/konfigurator-koberce/).
  - 71 unit testů.

- **Fáze 3 – tvary, rozměry, cena** (2026-10-05)
  - Tvary: obdélník, kruh, ovál, podle motivu (obrys motivu rozšířený o okraj, díry
    vyplněné). „Podle motivu“ je dostupné jen po odstranění pozadí.
  - Dva režimy rozvržení: obrázek bez pozadí (fotka) se do tvaru **ořízne** (kruh = čtverec
    ze středu); motiv s odstraněným pozadím tvar **obklopí** s nastavitelným okrajem
    (0–20 cm) a pozadí uvnitř koberce se vyplní přízí (automaticky nejbližší k barvě
    odstraněného pozadí, jde změnit v „Barvy a příze“).
  - Rozměr: šířka v cm, výška dopočítaná z poměru stran; u obdélníku a oválu jde poměr
    odemknout (motiv se vejde dovnitř bez deformace). Limity z `limits.json` hlídají obě
    strany – při zamčeném poměru se šířka posune tak, aby i výška byla v rozsahu.
  - Vyhlazení detailů teď běží na výsledném koberci se skutečným měřítkem (px/mm);
    okraj tvaru se nevyhlazuje.
  - Cena: plocha × cena/m² + příplatek za barvy nad počet v ceně + příplatek za tvar podle
    motivu, minimální cena, zaokrouhlení nahoru (`roundTo`). Rozpis ceny v UI.
    `areaBasis` v `pricing.json` určuje, zda se kruh/ovál/kontura počítá podle skutečné
    plochy, nebo podle opsaného obdélníku.
  - 103 unit testů.

- **Oprava – portréty a obličeje** (2026-10-05)
  - Vyhlazení rozděleno na dvě pravidla: linky tenčí než `minLineWidthMm` (zástupně 5 mm)
    a samostatné plošky menší než tečka o průměru `minDetailMm` (10 mm). Úzké, ale dlouhé
    rysy (obočí, ústa, oční linky) teď zůstanou; dřív je mazalo pravidlo „vše pod 10 mm“.
  - Redukce barev váží pixely podle hustoty detailů v okolí a tělové odstíny (YCbCr
    heuristika, bez AI) ×2 – obličej dostane vlastní odstíny kůže místo sloučení s pozadím.
    U log se nic nemění (ověřeno: stejné barvy).
  - Každý shluk barev dostane vlastní přízi, pokud existuje podobná (ΔE do 12 nad nejbližší),
    místo slučování do jedné.
  - Zástupná paleta doplněna o 10 tělových/teplých odstínů (Y-030 až Y-039).
  - Ověřeno na portrétu (NASA, public domain): oči, nos, úsměv a stínování obličeje zůstanou.
  - 116 unit testů.

- **Fáze 4 – tuftovaný vzhled náhledu** (2026-10-05)
  - Nový výchozí pohled „Tuftovaný“ (dále „Plochý“ a „Původní“). Procedurální, bez obrázků
    a bez AI: vlas jako buňky na skutečné rozteči tuftů (4 mm, řady posunuté o půl tuftu),
    mírná variace jasu tuftů a vláken, žlábky na hranách barevných ploch se stínováním
    (světlo zleva shora), organicky zvlněné hrany mezi barvami; obrys koberce zůstává čistý.
  - Kalibrace: rovná plocha má přesně barvu příze, tmavnou jen žlábky a svahy.
  - Počítá se ve workeru až po plochém náhledu (ten je vidět hned), jde přerušit novější
    změnou, má vlastní průběh („Dokresluji vzhled vlasu…“). Logo ~1 s, portrét ~1,5 s navíc.
  - Náhled se kreslí v rozlišení displeje s kvalitním zmenšením (bez moaré na mobilu);
    „Zobrazit detail“ ukáže texturu v plném rozlišení se scrollováním, vycentrovaně.
  - Poznámka pod náhledem: „Náhled je ilustrační…“.
  - 121 unit testů.

## Rozpracováno

- nic

## Další kroky

- [ ] **Fáze 5** – poptávkový formulář, export PNG.
- [ ] **Fáze 6** – responzivita, iframe embed s automatickou výškou, deploy na GitHub
      Pages, README s návodem na úpravu cen a palety.

## Poznámky pro další fáze

- Vyhlazené hrany loga (anti-aliasing) si u k-means „zaberou“ jednu z barev (např. šedá
  0,5 %). Vyhlazení je pak z koberce odstraní, ale zákazník má o barvu méně, než nastavil.
  Možné zlepšení: ignorovat při shlukování pixely na hranách.
- Ovál a kruh kolem motivu se počítají ze středu ohraničujícího obdélníku motivu – u
  nesymetrických motivů nemusí být nejtěsnější možné.
- Malý motiv na velkém koberci = málo pixelů na cm; náhled je pak hrubší (zdrojové rozlišení).
- Portréty: kvalita silně závisí na paletě – světlé odstíny kůže bez vlastní příze dostanou
  nejbližší volnou (v zástupné paletě šedou). Se skutečnou paletou přízí doladit
  `DISTINCT_YARN_TOLERANCE` (lib/color/yarns.ts) a `SKIN_BOOST` (worker).
- Portrét 1000 × 1200 px se zpracuje za ~3 s (s průběhem); loga za < 1 s.
- Ruční volby přízí se resetují při změně počtu barev nebo pozadí (barvy se přepočítají).
- Na mobilu je náhled nahoře a ovládání pod ním – při úpravách je potřeba scrollovat.
  Řešit ve Fázi 6 (např. přilepený zmenšený náhled).
- Formát HEIC (iPhone) prohlížeče neumí dekódovat; při focení přes „Vyfotit“ iOS posílá JPEG.

## Otevřené otázky

Zatím se jede se zástupnými hodnotami (`"_placeholder": true`):

- [ ] Skutečná paleta přízí (názvy, kódy, HEX).
- [ ] Ceník a příplatky (cena za m², příplatek za barvy, za tvar podle motivu, minimální cena).
      Počítá se kruh/ovál/kontura podle skutečné plochy, nebo opsaného obdélníku?
- [x] Minimální vytuftovatelný detail: 10 mm potvrzeno.
- [x] Minimální šířka linky: 5 mm potvrzeno.
- [x] Maximální počet barev: 16 potvrzeno.
- [ ] Min./max. rozměry koberce a maximální okraj kolem motivu.
- [ ] Endpoint nebo e-mail pro poptávky (Formspree?).
- [ ] Kam přesně se konfigurátor vloží na urug.cz (kvůli iframe a CSP/`frame-ancestors`).
- [ ] GitHub Pages na bezplatném účtu vyžaduje **veřejný** repozitář – je to v pořádku?
- [ ] Výchozí větev repozitáře: repo je prázdné, první pushnutá větev se stane výchozí.
      Deploy workflow plánuji spouštět z `main`.
- [ ] Logo / barvy URUG – složka `brand/` zatím neexistuje.
