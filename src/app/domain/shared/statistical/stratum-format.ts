export function formatStratumCode(strata: { id: string }[], stratum: Record<string, string>): string {
  return strata.map(s => (stratum[s.id] || '').substring(0, 3).toUpperCase()).join('-');
}
