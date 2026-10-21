export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span
      className="logo-mark"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.56) }}
      aria-hidden="true"
    >
      M
    </span>
  )
}
