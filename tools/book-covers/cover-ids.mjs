// Shared catalogue-derived cover IDs and baseline limits for build + CI.
import crypto from 'node:crypto';
import {cataloguePDFURL} from './pdf-source.mjs';

export const COVER_BASELINE_SLACK = 0.02;

export function collectCoverSources(tree, catalog) {
  if (catalog?.schema !== 1 || catalog.nbooks !== tree.books.length || catalog.nunits !== tree.nunits) {
    throw Error('Catalogue mismatch');
  }
  const sources = new Map(), sourceIDs = catalog.coverSources || {};
  for (const id of catalog.bookScans.flat()) sources.set(id, {kind: 'hb'});
  for (const [identity, id] of Object.entries(sourceIDs)) if (identity.startsWith('pdf:')) {
    const url = cataloguePDFURL(identity.slice(4));
    if (!/^c-[a-f0-9]{24}$/.test(id) || id !== 'c-' + crypto.createHash('sha256').update(identity).digest('hex').slice(0, 24)) {
      throw Error('Invalid document cover identity');
    }
    sources.set(id, {kind: 'pdf', url});
  }
  for (const series of tree.series) for (const volume of series.vols) {
    const match = volume[3]?.confirmed === false ? null : /^hb:([0-9]{1,8})$/.exec(volume[2]);
    if (match) sources.set(match[1], {kind: 'hb'});
  }
  const ids = [...sources.keys()];
  if (ids.some(id => !/^(?:[0-9]{1,8}|c-[a-f0-9]{24})$/.test(id))) throw Error('Invalid scan ID');
  return sources;
}

export function collectCoverSourceIds(tree, catalog) {
  return new Set(collectCoverSources(tree, catalog).keys());
}

export function coverBaselineLimits(expectedTotal, ratio = COVER_BASELINE_SLACK) {
  const maxGap = Math.ceil(expectedTotal * ratio);
  return {expectedTotal, maxGap, minPrepared: expectedTotal - maxGap};
}

export function assertCoverReportBaseline(report, expectedTotal, extra = {}) {
  const {maxGap, minPrepared} = coverBaselineLimits(expectedTotal);
  if (report.total !== expectedTotal) {
    throw Error(`report.total ${report.total} !== catalog cover count ${expectedTotal}`);
  }
  if (report.prepared < minPrepared) {
    throw Error(`prepared ${report.prepared} < ${minPrepared} (catalog ${expectedTotal}, slack ${maxGap})`);
  }
  if (!Array.isArray(report.failures) || report.failures.length > maxGap) {
    throw Error(`failures ${report.failures?.length} > ${maxGap} (catalog ${expectedTotal})`);
  }
  if (extra.preparedCount != null && report.prepared !== extra.preparedCount) {
    throw Error(`prepared ${report.prepared} !== manifest covers ${extra.preparedCount}`);
  }
}
