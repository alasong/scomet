import type { NativePdcaStatus, PdcaCoverageStats } from './native-types.js';

export type { NativePdcaStatus, PdcaCoverageStats } from './native-types.js';

export const PDCA_STATUS_VALUES: readonly NativePdcaStatus[] = Object.freeze([
  'plan',
  'do',
  'check',
  'act',
  'done',
]);

export const PDCA_TRANSITIONS: Readonly<Record<NativePdcaStatus, readonly NativePdcaStatus[]>> =
  Object.freeze({
    plan: ['do'],
    do: ['check'],
    check: ['done', 'act'],
    act: ['check'],
    done: [],
  });

export const PDCA_SYMBOLS: Readonly<Record<NativePdcaStatus, string>> = Object.freeze({
  plan: '⏳',
  do: '🔄',
  check: '✅',
  act: '❌',
  done: '🏁',
});

export function isValidPdcaStatus(value: string): value is NativePdcaStatus {
  return (PDCA_STATUS_VALUES as readonly string[]).includes(value);
}

export function canTransitionPdca(from: NativePdcaStatus, to: NativePdcaStatus): boolean {
  return PDCA_TRANSITIONS[from].includes(to);
}

export function validatePdcaTransition(
  from: NativePdcaStatus,
  to: NativePdcaStatus,
): { valid: boolean; reason?: string } {
  if (!isValidPdcaStatus(to)) {
    return { valid: false, reason: `Invalid PDCA status: ${to}` };
  }
  if (!canTransitionPdca(from, to)) {
    const allowed = PDCA_TRANSITIONS[from].join(', ') || 'none (terminal)';
    return {
      valid: false,
      reason: `Cannot transition from '${from}' to '${to}'. Allowed: ${allowed}`,
    };
  }
  return { valid: true };
}

export function calculatePdcaCoverage(statuses: NativePdcaStatus[]): PdcaCoverageStats {
  const stats: PdcaCoverageStats = {
    total: statuses.length,
    plan: 0,
    do: 0,
    check: 0,
    act: 0,
    done: 0,
    coverage: 0,
  };

  for (const status of statuses) {
    stats[status]++;
  }

  if (stats.total > 0) {
    stats.coverage = (stats.done + stats.check) / stats.total;
  }

  return stats;
}

export function formatPdcaProgress(stats: PdcaCoverageStats): string {
  const percentage = Math.round(stats.coverage * 100);
  const filled = Math.round(stats.coverage * 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  return `${bar} ${percentage}% (${stats.done + stats.check}/${stats.total})`;
}
