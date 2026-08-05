import {
  calculatePdcaCoverage,
  formatPdcaProgress,
  PDCA_SYMBOLS,
  type NativePdcaStatus,
} from './native-pdca.js';
import { listPdcaCriteria } from './native-pdca-store.js';
import {
  assertNoArguments,
  configuredPaths,
  NativeUsageError,
  requiredPositional,
  success,
  takeFlag,
  type DispatchResult,
} from './native-cli-shared.js';

export async function nativeExecutionCommand(
  args: string[],
  projectRoot: string,
): Promise<DispatchResult> {
  const subcommand = requiredPositional(args, 'execution subcommand');

  if (subcommand === 'status') {
    const name = requiredPositional(args, 'change name');
    const jsonOutput = takeFlag(args, '--json');
    assertNoArguments(args);
    const { paths } = await configuredPaths(projectRoot);
    const criteria = await listPdcaCriteria(paths, name);
    const statuses = criteria.map((c) => c.pdca_status);
    const stats = calculatePdcaCoverage(statuses);

    if (jsonOutput) {
      return success('execution status', {
        change: name,
        criteria,
        stats,
        progress: formatPdcaProgress(stats),
      });
    }

    const lines = [
      `Change: ${name}`,
      `Progress: ${formatPdcaProgress(stats)}`,
      '',
      'PDCA Breakdown:',
      `  ⏳ plan:   ${stats.plan}`,
      `  🔄 do:     ${stats.do}`,
      `  ✅ check:  ${stats.check}`,
      `  ❌ act:    ${stats.act}`,
      `  🏁 done:   ${stats.done}`,
    ];

    if (stats.act > 0) {
      lines.push('');
      lines.push('Needs repair (act status):');
      for (const c of criteria.filter((c) => c.pdca_status === 'act')) {
        lines.push(`  - ${c.id}: ${c.pdca_note ?? c.text}`);
      }
    }

    return success('execution status', { change: name, stats }, lines.join('\n') + '\n');
  }

  if (subcommand === 'coverage') {
    const name = requiredPositional(args, 'change name');
    const jsonOutput = takeFlag(args, '--json');
    assertNoArguments(args);
    const { paths } = await configuredPaths(projectRoot);
    const criteria = await listPdcaCriteria(paths, name);
    const statuses = criteria.map((c) => c.pdca_status);
    const stats = calculatePdcaCoverage(statuses);

    if (jsonOutput) {
      return success('execution coverage', {
        change: name,
        stats,
        incomplete: criteria
          .filter((c) => c.pdca_status !== 'done' && c.pdca_status !== 'check')
          .map((c) => ({
            id: c.id,
            text: c.text,
            status: c.pdca_status,
            note: c.pdca_note,
          })),
      });
    }

    const percentage = Math.round(stats.coverage * 100);
    const lines = [
      `Change: ${name}`,
      `Coverage: ${percentage}% (${stats.done + stats.check}/${stats.total})`,
    ];

    const incomplete = criteria.filter(
      (c) => c.pdca_status !== 'done' && c.pdca_status !== 'check',
    );

    if (incomplete.length > 0) {
      lines.push('');
      lines.push('Incomplete criteria:');
      for (const c of incomplete) {
        const symbol = PDCA_SYMBOLS[c.pdca_status as NativePdcaStatus];
        const detail = c.pdca_note ?? c.text ?? '(no description)';
        lines.push(`  ${symbol} ${c.id}: ${detail}`);
      }
    }

    return success('execution coverage', { stats }, lines.join('\n') + '\n');
  }

  throw new NativeUsageError(`Unknown execution command: ${subcommand}`);
}
