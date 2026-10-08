export function cardImageAttrs(priority: 'high' | 'low' = 'low') {
  return {
    loading: priority === 'high' ? ('eager' as const) : ('lazy' as const),
    decoding: 'async' as const,
    fetchPriority: priority,
  };
}
