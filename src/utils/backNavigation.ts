type BackHandler = () => boolean;

const backHandlers: BackHandler[] = [];

/**
 * Registers a LIFO back-navigation handler for nested popups, dropdowns, and submenus.
 * Returns an unregister callback.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler);
  return () => {
    const idx = backHandlers.lastIndexOf(handler);
    if (idx !== -1) {
      backHandlers.splice(idx, 1);
    }
  };
}

/**
 * Invokes registered handlers from top-most (most recently opened/mounted) down.
 * Returns true if any handler consumed the back action.
 */
export function invokeRegisteredBackHandlers(): boolean {
  for (let i = backHandlers.length - 1; i >= 0; i -= 1) {
    try {
      if (backHandlers[i]()) {
        return true;
      }
    } catch {
      // Ignore individual handler errors and continue unwinding
    }
  }
  return false;
}
