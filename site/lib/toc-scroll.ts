interface TocScrollMetrics {
  clientHeight: number;
  headerHeight: number;
  itemHeight: number;
  itemTop: number;
  scrollHeight: number;
}

export function tocHashMatchesId(hash: string, id: string) {
  try {
    return decodeURIComponent(hash.replace(/^#/, '')) === id;
  } catch {
    return false;
  }
}

export function centeredTocScrollTop(_metrics: TocScrollMetrics) {
  const {
    clientHeight,
    headerHeight,
    itemHeight,
    itemTop,
    scrollHeight,
  } = _metrics;
  const availableHeight = Math.max(0, clientHeight - headerHeight);
  const itemCenter = itemTop + itemHeight / 2;
  const viewportCenter = headerHeight + availableHeight / 2;
  const maximum = Math.max(0, scrollHeight - clientHeight);

  return Math.round(Math.min(maximum, Math.max(0, itemCenter - viewportCenter)));
}
