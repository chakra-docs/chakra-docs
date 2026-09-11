export function normalizeDocsSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_/.-]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function createDocsSearchText(value: string): string {
  const normalized = normalizeDocsSearchText(value);
  const identifierTerms = normalizeDocsSearchText(
    value.replace(/([a-z\d])([A-Z])/g, '$1 $2'),
  ).split(' ');
  const existingTerms = new Set(normalized.split(' '));
  const additions = identifierTerms.filter((term) => {
    if (!term || existingTerms.has(term)) return false;
    existingTerms.add(term);
    return true;
  });

  return [normalized, ...additions].filter(Boolean).join(' ');
}
