import { useId } from 'react'

/**
 * Asteron logo — símbolo de dos anillos entrelazados + wordmark "ASTERON".
 *
 * variant  : 'auto'  → usa text-ink (se adapta al modo claro/oscuro del tema)
 *          | 'dark'  → texto claro (para fondos siempre oscuros: login, landing)
 *          | 'light' → texto navy  (para fondos siempre claros: docs, facturas)
 * showWord : mostrar el wordmark junto al símbolo (default true)
 * stacked  : apilar símbolo arriba + wordmark abajo (default false = horizontal)
 * size     : 'sm' | 'md' | 'lg' | 'xl'
 */
export function Logo({
  variant = 'auto',
  showWord = true,
  stacked = false,
  size = 'md',
  className = '',
}) {
  const uid = useId()
  const maskId = `asteron-cut-${uid.replace(/:/g, '')}`

  const colorClass =
    variant === 'dark'  ? 'text-[#F4F6FB]' :
    variant === 'light' ? 'text-[#0F2438]' :
    'text-ink'

  const markH = { sm: 'h-5', md: 'h-6', lg: 'h-9', xl: 'h-12' }[size] ?? 'h-6'
  const wordH = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl', xl: 'text-3xl' }[size] ?? 'text-lg'
  const gap   = stacked ? 'gap-2' : 'gap-3'
  const dir   = stacked ? 'flex-col items-center' : 'items-center'

  const mark = (
    <svg
      viewBox="0 0 120 70"
      fill="none"
      aria-hidden="true"
      className={`${markH} w-auto shrink-0`}
    >
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="70">
        <rect x="0" y="0" width="120" height="70" fill="#fff" />
        <circle cx="76" cy="35" r="18" fill="none" stroke="#000" strokeWidth="14" />
      </mask>
      <circle cx="44" cy="35" r="18" fill="none" stroke="currentColor" strokeWidth="8" mask={`url(#${maskId})`} />
      <circle cx="76" cy="35" r="18" fill="none" stroke="currentColor" strokeWidth="8" />
    </svg>
  )

  return (
    <span className={`inline-flex ${dir} ${gap} ${colorClass} ${className}`}>
      {mark}
      {showWord && (
        <span className={`font-normal ${wordH} tracking-[0.22em] leading-none select-none`}>
          ASTERON
        </span>
      )}
    </span>
  )
}

export default Logo
