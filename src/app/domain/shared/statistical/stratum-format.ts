export function formatStratumCode(strata: { id: string }[], stratum: Record<string, string>): string {
  return strata.map(s => {
    const val = stratum[s.id] || '';
    if (val.startsWith('>=') || val.startsWith('<=') || val.startsWith('>') || val.startsWith('<')) {
      return val.toUpperCase();
    }
    return val.substring(0, 3).toUpperCase();
  }).join('-');
}
