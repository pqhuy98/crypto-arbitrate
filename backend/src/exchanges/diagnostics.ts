import moment from 'moment';
import { mkdir, writeFile } from 'fs/promises';

export interface Diagnostic {
    success: number
    failure: number
    lastSuccess?: Date
    lastFailure?: Date
    lastSuccessAgo?: string
}

const records: Record<string, Diagnostic> = {};

export function submitDiagnostic(metricId: string, key: keyof Pick<Diagnostic, 'success' | 'failure'>) {
  const d: Diagnostic = records[metricId] ?? { success: 0, failure: 0 };
  d[key] += 1;
  if (key === 'success') {
    d.lastSuccess = new Date();
  } else if (key === 'failure') {
    d.lastFailure = new Date();
  }
  records[metricId] = d;
}

export function getDiagnostics() {
  return records;
}

moment.relativeTimeThreshold('s', 60);
moment.relativeTimeThreshold('ss', -1);
moment.relativeTimeThreshold('m', 60);
moment.relativeTimeThreshold('h', 24);
moment.relativeTimeThreshold('d', 30);
moment.relativeTimeThreshold('M', 12);

const logIntervalS = 10;

setInterval(async () => {
  await mkdir('./output', { recursive: true });
  Object.keys(records).sort().forEach((k) => {
    records[k].lastSuccessAgo = records[k].lastSuccess ? moment(records[k].lastSuccess).fromNow() : 'never';
  });
  writeFile('./output/diagnostics.json', JSON.stringify(getDiagnostics(), null, 2));
}, logIntervalS * 1000);
