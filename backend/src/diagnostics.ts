interface Diagnostic {
    success: number
    failure: number
}

const records: Record<string, Diagnostic> = {};

export function submitDiagnostic(metricId: string, key: keyof Diagnostic) {
  const d: Diagnostic = records[metricId] ?? { success: 0, failure: 0 };
  d[key] += 1;
  records[metricId] = d;
}

export function getDiagnostics() {
  return records;
}
