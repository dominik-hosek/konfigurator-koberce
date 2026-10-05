// Shared button looks. File inputs are wrapped in <label>, so these work on both.
const base =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-stone-800 disabled:cursor-not-allowed disabled:opacity-50'

export const primaryButton = `${base} bg-stone-900 text-white hover:bg-stone-700`
export const secondaryButton = `${base} border border-stone-300 bg-white text-stone-900 hover:border-stone-500`
export const textButton =
  'cursor-pointer text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900 has-focus-visible:outline-2 has-focus-visible:outline-stone-800'
