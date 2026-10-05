// All Czech UI copy. Keep user-facing text here, not in components.
import type { ProcessingStage } from '../workers/protocol'

export const cs = {
  app: {
    title: 'Navrhněte si vlastní koberec',
    lead: 'Nahrajte logo, fotku nebo kresbu. Převedeme ji na návrh tuftovaného koberce z našich přízí.',
    placeholderNotice: 'Paleta přízí a ceny jsou zatím orientační (testovací hodnoty).',
  },
  steps: {
    image: 'Obrázek',
    colors: 'Barvy',
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
  colors: {
    countLabel: 'Počet barev',
    countHint: 'Méně barev = jednodušší a levnější koberec.',
    paletteTitle: 'Barvy návrhu',
    share: (percent: number) =>
      `${percent.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} %`,
    swatchLabel: (index: number, hex: string, percent: string) =>
      `Barva ${index}: ${hex}, ${percent} plochy`,
    fewerThanRequested: (n: number) =>
      `Obrázek obsahuje jen ${n} ${n === 1 ? 'barvu' : n < 5 ? 'barvy' : 'barev'}.`,
  },
  preview: {
    title: 'Náhled',
    viewLabel: 'Zobrazení náhledu',
    design: 'Návrh',
    original: 'Původní',
    canvasLabel: 'Náhled návrhu koberce',
    originalLabel: 'Původní nahraný obrázek',
    empty: 'Tady se objeví návrh vašeho koberce.',
    stages: {
      histogram: 'Analyzuji barvy…',
      clustering: 'Zjednodušuji barvy…',
      rendering: 'Vykresluji náhled…',
    } satisfies Record<ProcessingStage, string>,
    working: 'Zpracovávám…',
    progressLabel: 'Průběh zpracování',
    error: 'Při zpracování se něco pokazilo. Zkuste to prosím znovu nebo nahrajte jiný obrázek.',
  },
} as const
