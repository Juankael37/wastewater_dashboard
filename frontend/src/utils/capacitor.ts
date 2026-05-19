export function isCapacitorNative(): boolean {
  return typeof (window as any).Capacitor !== 'undefined' ||
    typeof (window as any).CapacitorPlatforms !== 'undefined' ||
    (window as any).location?.protocol === 'capacitor:' ||
    (window as any).location?.protocol === 'ionic:'
}
