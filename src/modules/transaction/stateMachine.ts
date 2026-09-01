/**
 * Transaction State Machine
 *
 * Valid transitions:
 *   PENDING    → PAID | FAILED
 *   PAID       → PROCESSING | FAILED
 *   PROCESSING → SUCCESS | FAILED
 *   SUCCESS    → (terminal)
 *   FAILED     → (terminal)
 *   REFUNDED   → (terminal)
 */

export type TxStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED';

const TRANSITIONS: Record<TxStatus, TxStatus[]> = {
  PENDING:    ['PAID', 'FAILED'],
  PAID:       ['PROCESSING', 'FAILED'],
  PROCESSING: ['SUCCESS', 'FAILED'],
  SUCCESS:    [],
  FAILED:     [],
  REFUNDED:   [],
};

export function canTransition(from: TxStatus, to: TxStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Asserts a transition is valid; throws if not.
 * Use before every status update to enforce deterministic state changes.
 */
export function assertTransition(from: TxStatus, to: TxStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid state transition: ${from} → ${to}. Allowed from ${from}: [${TRANSITIONS[from].join(', ') || 'none'}]`
    );
  }
}

export function isTerminal(status: TxStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
