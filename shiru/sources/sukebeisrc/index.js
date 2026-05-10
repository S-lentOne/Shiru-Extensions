import AbstractSource from "../abstract.js";

/**
 * @typedef {import('../index.d.ts').TorrentQuery} TorrentQuery
 * @typedef {import('../index.d.ts').TorrentResult} TorrentResult
 */
function parseSize(sizeStr) {
  if (!sizeStr) return 0;

  const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);

  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  const multipliers = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };

  return Math.round(value * multipliers[unit]);
}
export default new (class SukebeiSrc extends AbstractSource {
  base = "http://localhost:8888/api/sukebei/";

  /**
   * @param {TorrentQuery} options
   * @returns {Promise<TorrentResult[]>}
   */
  async single({ titles, episode }) {
    if (!titles?.length) return [];
    return this._search(titles[0], episode);
  }

  /**
   * @param {TorrentQuery} options
   * @returns {Promise<TorrentResult[]>}
   */
  async batch(options) {
    return this.single(options);
  }

  /**
   * @param {TorrentQuery} options
   * @returns {Promise<TorrentResult[]>}
   */
  async movie(options) {
    return this.single(options);
  }

  /**
   * Internal search method
   * @param {string} title
   * @param {number} [episode]
   * @returns {Promise<TorrentResult[]>}
   */
  async _search(title, episode) {
    let query = title.replace(/[^\w\s-]/g, " ").trim();
    if (episode) query += ` ${episode.toString().padStart(2, "0")}`;

    const url = this.base + encodeURIComponent(query);
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item) => ({
      title: item.Name,
      link: item.Magnet,
      hash: item.Magnet?.match(/btih:([A-Fa-f0-9]+)/)?.[1] || "",
      seeders: Number(item.Seeders || 0),
      leechers: Number(item.Leechers || 0),
      downloads: Number(item.Downloads || 0),
      size: parseSize(item.Size),
      date: new Date(item.DateUploaded),
      accuracy: "medium",
      type: "alt",
    }));
  }

  /**
   * Validates the source is reachable
   * @returns {Promise<boolean>}
   */
  async validate() {
    try {
      // Test search
      const res = await fetch(this.base + "one%20piece");
      return res.ok;
    } catch {
      return false;
    }
  }
})();
