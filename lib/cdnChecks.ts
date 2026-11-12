/** One named field check on a CDN record, so a drop can say which field failed */
export type CdnCheck<T> = readonly [field: string, passes: (record: Partial<T>) => boolean];

/** Names of the checks a CDN record fails, empty when it passes, ["record"] when it is not an object */
export function failedCdnChecks<T>(value: unknown, checks: readonly CdnCheck<T>[]): string[] {
  if (!value || typeof value !== 'object') return ['record'];
  const record = value as Partial<T>;
  return checks.filter(([, passes]) => !passes(record)).map(([field]) => field);
}
