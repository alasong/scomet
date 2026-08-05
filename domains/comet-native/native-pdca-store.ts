import { promises as fs } from 'fs';
import path from 'path';

import { nativeChangeDir } from './native-change.js';
import { isValidPdcaStatus, validatePdcaTransition, type NativePdcaStatus } from './native-pdca.js';
import type { NativeAcceptanceCriterionWithPdca, NativeProjectPaths } from './native-types.js';

const PDCA_STATUS_FILE = 'pdca-status.json';

interface PdcaStatusStore {
  schema: 'comet.native.pdca-status.v1';
  criteria: Record<string, NativeAcceptanceCriterionWithPdca>;
  updated_at: string;
}

function pdcaStatusPath(changeDir: string): string {
  return path.join(changeDir, 'runtime', PDCA_STATUS_FILE);
}

async function readPdcaStatusStore(changeDir: string): Promise<PdcaStatusStore> {
  const filePath = pdcaStatusPath(changeDir);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as PdcaStatusStore;
  } catch {
    return {
      schema: 'comet.native.pdca-status.v1',
      criteria: {},
      updated_at: new Date().toISOString(),
    };
  }
}

async function writePdcaStatusStore(changeDir: string, store: PdcaStatusStore): Promise<void> {
  const filePath = pdcaStatusPath(changeDir);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  store.updated_at = new Date().toISOString();
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf8');
}

export async function listPdcaCriteria(
  paths: NativeProjectPaths,
  changeName: string,
): Promise<NativeAcceptanceCriterionWithPdca[]> {
  const changeDir = nativeChangeDir(paths, changeName);
  const store = await readPdcaStatusStore(changeDir);
  return Object.values(store.criteria);
}

export async function updatePdcaStatus(
  paths: NativeProjectPaths,
  changeName: string,
  acceptanceId: string,
  newStatus: string,
  note?: string,
): Promise<{
  acceptance_id: string;
  previous_status: NativePdcaStatus | null;
  new_status: NativePdcaStatus;
  note?: string;
}> {
  if (!isValidPdcaStatus(newStatus)) {
    throw new Error(`Invalid PDCA status: ${newStatus}`);
  }

  const changeDir = nativeChangeDir(paths, changeName);
  const store = await readPdcaStatusStore(changeDir);
  const existing = store.criteria[acceptanceId];
  const previousStatus = existing?.pdca_status ?? null;

  if (previousStatus !== null) {
    const validation = validatePdcaTransition(previousStatus, newStatus as NativePdcaStatus);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }
  }

  const criterion: NativeAcceptanceCriterionWithPdca = {
    id: acceptanceId,
    text: existing?.text ?? '',
    pdca_status: newStatus as NativePdcaStatus,
    pdca_updated_at: new Date().toISOString(),
    ...(note ? { pdca_note: note } : {}),
  };

  store.criteria[acceptanceId] = criterion;
  await writePdcaStatusStore(changeDir, store);

  return {
    acceptance_id: acceptanceId,
    previous_status: previousStatus,
    new_status: newStatus as NativePdcaStatus,
    ...(note ? { note } : {}),
  };
}

export async function setCriterionText(
  paths: NativeProjectPaths,
  changeName: string,
  acceptanceId: string,
  text: string,
): Promise<void> {
  const changeDir = nativeChangeDir(paths, changeName);
  const store = await readPdcaStatusStore(changeDir);
  if (store.criteria[acceptanceId]) {
    store.criteria[acceptanceId].text = text;
    await writePdcaStatusStore(changeDir, store);
  }
}
