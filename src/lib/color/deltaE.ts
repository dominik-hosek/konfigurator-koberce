// CIEDE2000 colour difference (Sharma, Wu & Dalal 2005).
import type { Lab } from './convert'

const RAD = Math.PI / 180
const POW25_7 = 25 ** 7

export function deltaE2000([l1, a1, b1]: Lab, [l2, a2, b2]: Lab): number {
  const c1 = Math.hypot(a1, b1)
  const c2 = Math.hypot(a2, b2)
  const cMean = (c1 + c2) / 2
  const cMean7 = cMean ** 7
  const g = 0.5 * (1 - Math.sqrt(cMean7 / (cMean7 + POW25_7)))

  const a1p = (1 + g) * a1
  const a2p = (1 + g) * a2
  const c1p = Math.hypot(a1p, b1)
  const c2p = Math.hypot(a2p, b2)

  const hue = (a: number, b: number) => {
    if (a === 0 && b === 0) return 0
    const h = Math.atan2(b, a) / RAD
    return h >= 0 ? h : h + 360
  }
  const h1p = hue(a1p, b1)
  const h2p = hue(a2p, b2)

  const dLp = l2 - l1
  const dCp = c2p - c1p

  let dhp = 0
  if (c1p * c2p !== 0) {
    dhp = h2p - h1p
    if (dhp > 180) dhp -= 360
    else if (dhp < -180) dhp += 360
  }
  const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin((dhp / 2) * RAD)

  const lMean = (l1 + l2) / 2
  const cpMean = (c1p + c2p) / 2

  let hpMean = h1p + h2p
  if (c1p * c2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hpMean /= 2
    else hpMean = h1p + h2p < 360 ? (hpMean + 360) / 2 : (hpMean - 360) / 2
  }

  const t =
    1 -
    0.17 * Math.cos((hpMean - 30) * RAD) +
    0.24 * Math.cos(2 * hpMean * RAD) +
    0.32 * Math.cos((3 * hpMean + 6) * RAD) -
    0.2 * Math.cos((4 * hpMean - 63) * RAD)

  const dTheta = 30 * Math.exp(-(((hpMean - 275) / 25) ** 2))
  const cpMean7 = cpMean ** 7
  const rc = 2 * Math.sqrt(cpMean7 / (cpMean7 + POW25_7))
  const lMean50 = (lMean - 50) ** 2
  const sl = 1 + (0.015 * lMean50) / Math.sqrt(20 + lMean50)
  const sc = 1 + 0.045 * cpMean
  const sh = 1 + 0.015 * cpMean * t
  const rt = -Math.sin(2 * dTheta * RAD) * rc

  const tl = dLp / sl
  const tc = dCp / sc
  const th = dHp / sh
  return Math.sqrt(tl * tl + tc * tc + th * th + rt * tc * th)
}
