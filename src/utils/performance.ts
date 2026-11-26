/**
 * Eager Immediate List Hook
 * Lazy / progressive batch deferral is disabled so all items mount and render immediately
 * without animation-frame trickle delays.
 */
export function useProgressiveRenderList<T>(
  items: T[],
  _initialCount = 15,
  _batchSize = 25,
  _immediateIndex?: number
): T[] {
  return items || [];
}
