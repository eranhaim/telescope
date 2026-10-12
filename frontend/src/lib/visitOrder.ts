// One seed per visit, where a visit is one load of the Mini App. The seed is
// module state, so every fetch and every route change during that visit
// derives the same order, and the next open of the app gets a new one.
const visitSeed = Math.floor(Math.random() * 0x100000000);

// FNV-1a over the id, started from the visit seed. Ordering by a per-id key
// rather than shuffling the array keeps an item's position fixed even if the
// list it arrives in changes.
function sortKey(id: string): number {
  let hash = visitSeed ^ 0x811c9dc5;
  for (let index = 0; index < id.length; index++) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 0x01000193);
  }
  // Mongo ids created minutes apart differ only in their last few characters,
  // and FNV alone leaves those neighbours next to each other in the result.
  // This final avalanche step is what makes the order look random.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  return hash >>> 0;
}

export function orderForVisit<T>(items: T[], getId: (item: T) => string): T[] {
  return [...items].sort((a, b) => sortKey(getId(a)) - sortKey(getId(b)));
}
