import { pricingConfig } from '../config'
import type { PriceBreakdown } from '../lib/pricing/price'
import { cs } from '../strings/cs'
import { Panel } from './ui/Panel'

interface PricePanelProps {
  step: number
  price: PriceBreakdown | null
}

export function PricePanel({ step, price }: PricePanelProps) {
  return (
    <Panel step={step} title={cs.steps.price}>
      {price && (
        <div aria-live="polite">
          <p className="flex items-baseline gap-2">
            <span className="text-muted text-sm">{cs.price.from}</span>
            <span className="text-3xl font-semibold tracking-tight tabular-nums">
              {cs.price.amount(price.total)}
            </span>
          </p>

          <h3 className="sr-only">{cs.price.breakdownTitle}</h3>
          <dl className="text-muted mt-4 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt>{cs.price.area(price.areaM2, pricingConfig.pricePerM2)}</dt>
              <dd className="tabular-nums">{cs.price.amount(price.base)}</dd>
            </div>
            {price.colorSurcharge > 0 && (
              <div className="flex justify-between gap-4">
                <dt>{cs.price.colors(price.extraColors, pricingConfig.includedColors)}</dt>
                <dd className="tabular-nums">{cs.price.amount(price.colorSurcharge)}</dd>
              </div>
            )}
            {price.shapeSurcharge > 0 && (
              <div className="flex justify-between gap-4">
                <dt>{cs.price.contour}</dt>
                <dd className="tabular-nums">{cs.price.amount(price.shapeSurcharge)}</dd>
              </div>
            )}
          </dl>
          {price.minimumApplied && (
            <p className="mt-2 text-sm">{cs.price.minimum(pricingConfig.minimumPrice)}</p>
          )}
          <p className="text-muted mt-4 text-xs">{cs.price.note}</p>
        </div>
      )}
    </Panel>
  )
}
