/**
 * PROTOTYPE host — throwaway (#765).
 * Three wireframe variants of the redesigned home page, switchable via
 * `?variant=A|B|C` on `/`. Mounted by HomeView only in dev when the param
 * is present. See HOME_SCRIPT.md for the section script every variant enacts.
 */
import { PrototypeSwitcher } from './PrototypeSwitcher'
import { VariantA } from './VariantA'
import { VariantB } from './VariantB'
import { VariantC } from './VariantC'

export function HomeWireframe({ variant }: { variant: string }) {
  return (
    <>
      {variant === 'B' && <VariantB />}
      {variant === 'C' && <VariantC />}
      {variant !== 'B' && variant !== 'C' && <VariantA />}
      <PrototypeSwitcher current={variant === 'B' || variant === 'C' ? variant : 'A'} />
    </>
  )
}
