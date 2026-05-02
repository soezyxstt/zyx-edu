import Fuse from "fuse.js";
import {
  getSiteSearchDocuments,
  type SiteSearchDocument,
} from "@/lib/site-search-index";

const GROUP_ORDER: SiteSearchDocument["group"][] = [
  "Halaman",
  "Course",
  "Materi",
  "Evaluasi",
  "Topik & landing",
];

let fuse: Fuse<SiteSearchDocument> | null = null;

function getFuse(): Fuse<SiteSearchDocument> {
  if (!fuse) {
    const list = getSiteSearchDocuments();
    fuse = new Fuse(list, {
      keys: [
        { name: "title", weight: 0.42 },
        { name: "keywords", weight: 0.18 },
        { name: "content", weight: 0.32 },
        { name: "subtitle", weight: 0.12 },
        { name: "href", weight: 0.06 },
      ],
      threshold: 0.38,
      ignoreLocation: true,
      distance: 512,
      minMatchCharLength: 2,
      includeScore: true,
      ignoreDiacritics: true,
    });
  }
  return fuse;
}

export function searchSite(query: string, limit = 32): SiteSearchDocument[] {
  const q = query.trim();
  if (!q) return [];

  const results = getFuse().search(q, { limit });
  return results.map((r) => r.item);
}

export function groupOrderIndex(group: SiteSearchDocument["group"]): number {
  const i = GROUP_ORDER.indexOf(group);
  return i === -1 ? GROUP_ORDER.length : i;
}
