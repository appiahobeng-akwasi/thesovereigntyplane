import type { Country, Scope } from '../data/types';

export function filterByScope(countries: Country[], scope: Scope): Country[] {
  if (scope === 'africa') {
    return countries.filter((c) => c.in_africa_scope);
  }
  return countries.filter((c) => c.in_frontier_scope);
}
