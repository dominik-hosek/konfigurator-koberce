// All Czech UI copy. Keep user-facing text here, not in components.
import type { ProcessingStage } from '../workers/protocol'

/** Czech plural: 1 → one, 2–4 → few, otherwise many. */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one
  if (n >= 2 && n <= 4) return few
  return many
}

const percent = (value: number) =>
  `${value.toLocaleString('cs-CZ', { maximumFractionDigits: value < 1 ? 1 : 0 })} %`

const cm = (mm: number) => `${(mm / 10).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} cm`

const czk = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
})

const m2 = (value: number) =>
  `${value.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`

export const cs = {
  app: {
    title: 'Navrhněte si vlastní koberec',
    lead: 'Nahrajte logo, fotku nebo kresbu. Převedeme ji na návrh tuftovaného koberce z našich přízí.',
    placeholderNotice: 'Paleta přízí a ceny jsou zatím orientační (testovací hodnoty).',
  },
  steps: {
    image: 'Obrázek',
    background: 'Pozadí',
    colors: 'Barvy a příze',
    shape: 'Tvar a rozměr',
    price: 'Orientační cena',
  },
  upload: {
    dropTitle: 'Přetáhněte sem obrázek',
    dropTitleTouch: 'Nahrajte obrázek',
    dropHint: (maxMb: number) => `JPG, PNG nebo WebP, nejvýše ${maxMb} MB`,
    chooseFile: 'Vybrat soubor',
    takePhoto: 'Vyfotit',
    replace: 'Nahrát jiný obrázek',
    loading: 'Načítám obrázek…',
    loaded: (name: string, w: number, h: number) => `${name} · ${w} × ${h} px`,
    errors: {
      'unsupported-type': 'Tento formát neumíme zpracovat. Nahrajte prosím JPG, PNG nebo WebP.',
      'too-large': (maxMb: number) => `Soubor je příliš velký. Nejvýše ${maxMb} MB, prosím.`,
      empty: 'Soubor je prázdný.',
      'decode-failed': 'Obrázek se nepodařilo načíst. Zkuste prosím jiný soubor.',
    },
  },
  background: {
    intro: 'Odstraněné pozadí nebude součástí motivu koberce.',
    alphaDetected: 'Obrázek má průhledné pozadí – odstranili jsme ho automaticky.',
    detect: 'Najít pozadí automaticky',
    detectFailed:
      'Pozadí se nepodařilo najít automaticky. Klikněte prosím na pozadí přímo v náhledu.',
    pick: 'Vybrat pozadí v náhledu',
    pickMore: 'Přidat další místo',
    pickCancel: 'Zrušit výběr',
    pickHint: 'Klikněte v náhledu na pozadí, které chcete odstranit. (Esc zruší výběr.)',
    reset: 'Zrušit odstranění pozadí',
    pickedColors: 'Odstraňované barvy',
    tolerance: 'Citlivost',
    toleranceHint: 'Vyšší citlivost odstraní i podobné odstíny.',
    enclosed: 'Odstranit tuto barvu i uvnitř motivu',
    removedShare: (value: number) => `Odstraněno ${percent(value)} plochy obrázku.`,
  },
  colors: {
    countLabel: 'Počet barev',
    countHint: 'Méně barev = jednodušší a levnější koberec.',
    paletteTitle: 'Příze v návrhu',
    yarnSummary: (n: number) =>
      `Koberec bude mít ${n} ${plural(n, 'barvu příze', 'barvy přízí', 'barev přízí')}.`,
    share: percent,
    sourceColor: 'Barva v obrázku',
    change: 'Změnit',
    changeLabel: (index: number, yarnName: string) =>
      `Změnit přízi pro barvu ${index} (nyní ${yarnName})`,
    restore: 'Vrátit doporučenou',
    fill: 'Pozadí koberce',
    fillChangeLabel: (yarnName: string) => `Změnit přízi pozadí koberce (nyní ${yarnName})`,
    custom: 'vlastní volba',
    fewerThanRequested: (n: number) =>
      `Obrázek obsahuje jen ${n} ${plural(n, 'barvu', 'barvy', 'barev')}.`,
    dropped: (names: string[]) =>
      `Příliš drobné na vytuftování, v koberci nebudou: ${names.join(', ')}.`,
    merged: 'Některé barvy připadly na stejnou přízi, proto se sloučily.',
    smoothed: (minLineMm: number, minDetailMm: number, widthMm: number) =>
      `Linky tenčí než ${minLineMm} mm a plošky menší než ${minDetailMm} mm (při šířce koberce ${cm(widthMm)}) jsme zjednodušili, aby šly vytuftovat.`,
  },
  shape: {
    legend: 'Tvar koberce',
    names: {
      rectangle: 'Obdélník',
      circle: 'Kruh',
      oval: 'Ovál',
      contour: 'Podle motivu',
    },
    contourUnavailable: 'Tvar „podle motivu“ je dostupný po odstranění pozadí.',
    cropHint: 'Tvar se vyřízne ze středu obrázku.',
    width: 'Šířka',
    height: 'Výška',
    unit: 'cm',
    range: (minMm: number, maxMm: number) => `${cm(minMm)} – ${cm(maxMm)}`,
    lockAspect: 'Zachovat poměr stran motivu',
    heightDerived: 'Výška se dopočítá z poměru stran.',
    margin: 'Okraj kolem motivu',
    marginHint: 'Plocha kolem motivu bude z příze pozadí.',
    marginValue: (mm: number) => cm(mm),
    summary: (wMm: number, hMm: number, area: number) =>
      `Koberec ${Math.round(wMm / 10)} × ${Math.round(hMm / 10)} cm · ${m2(area)}`,
    adjusted: (range: string) =>
      `Rozměr jsme upravili, aby obě strany byly ve vyráběném rozsahu (${range}).`,
  },
  price: {
    from: 'od',
    amount: (value: number) => czk.format(value),
    area: (area: number, perM2: number) => `Plocha ${m2(area)} × ${czk.format(perM2)}/m²`,
    colors: (extra: number, included: number) =>
      `Příplatek za ${extra} ${plural(extra, 'barvu', 'barvy', 'barev')} navíc (${included} v ceně)`,
    contour: 'Příplatek za tvar podle motivu',
    minimum: (value: number) => `Minimální cena koberce je ${czk.format(value)}.`,
    note: 'Cena je orientační. Konečnou cenu potvrdíme po posouzení návrhu.',
    breakdownTitle: 'Rozpis ceny',
  },
  yarnPicker: {
    title: 'Vyberte přízi',
    subtitle: 'Seřazeno podle podobnosti s barvou v obrázku.',
    recommended: 'doporučeno',
    current: 'vybráno',
    close: 'Zavřít',
    option: (name: string, code: string) => `${name}, kód ${code}`,
  },
  preview: {
    title: 'Náhled',
    viewLabel: 'Zobrazení náhledu',
    design: 'Návrh',
    original: 'Původní',
    canvasLabel: 'Náhled návrhu koberce',
    originalLabel: 'Původní nahraný obrázek',
    pickLabel: 'Klikněte na pozadí obrázku',
    stages: {
      background: 'Odstraňuji pozadí…',
      histogram: 'Analyzuji barvy…',
      clustering: 'Zjednodušuji barvy…',
      smoothing: 'Vyhlazuji drobné detaily…',
      rendering: 'Vykresluji náhled…',
    } satisfies Record<ProcessingStage, string>,
    working: 'Zpracovávám…',
    progressLabel: 'Průběh zpracování',
    error: 'Při zpracování se něco pokazilo. Zkuste to prosím znovu nebo nahrajte jiný obrázek.',
  },
} as const
