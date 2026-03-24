#!/usr/bin/env node
/**
 * Regenerate src/lib/whois/rdap_gtld_bootstrap.ts from the latest IANA RDAP bootstrap.
 *
 * Usage:
 *   node scripts/update-rdap-bootstrap.js
 *
 * Run this periodically (e.g. monthly) or when new gTLDs appear.
 * ccTLDs are NOT updated by this script — edit rdap_client.ts manually.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const IANA_URL = "https://data.iana.org/rdap/dns.json";
const OUT_FILE = path.join(__dirname, "../src/lib/whois/rdap_gtld_bootstrap.ts");

// TLDs managed manually in CCTLD_RDAP_OVERRIDES — exclude from gTLD file
const MANUAL_CCTLDS = new Set([
  "ad","fi","fo","fr","is","nl","no","pl","si","uk",
  "al","am","az","ba","cy","cz","ge","kg","md","mk","mt","tj","tm","ua","uz",
  "gl","xk",
  "ao","bw","cd","ci","cm","dj","et","gh","ke","ly","mg","ml","mu","mw","mz",
  "na","ng","rw","sc","sd","sn","so","ss","td","tz","ug","zm","zw",
  "bh","iq","jo","lb","om","ps","sy","ye",
  "af","as","au","bn","bt","cc","cx","fj","fm","gs","id","in","kh","la","mm",
  "ms","mv","nf","np","nz","pg","pk","pn","pw","sb","sg","th","to","tv","tw","vu","ws",
  "ag","ai","ar","bb","bm","br","bz","ca","cr","cu","cv","dm","ec","gd","gy",
  "hn","ht","jm","kn","ky","lc","pm","re","sr","tf","tt","vc","vg","vi","wf","yt",
]);

console.log("Fetching", IANA_URL);
https.get(IANA_URL, (res) => {
  let data = "";
  res.on("data", (d) => (data += d));
  res.on("end", () => {
    const j = JSON.parse(data);
    const entries = {};
    for (const [tldList, servers] of j.services) {
      for (const tld of tldList) {
        const lower = tld.toLowerCase();
        if (!MANUAL_CCTLDS.has(lower)) {
          entries[lower] = servers[0];
        }
      }
    }
    const sorted = {};
    for (const k of Object.keys(entries).sort()) sorted[k] = entries[k];
    const count = Object.keys(sorted).length;

    const lines = [
      "/**",
      " * Static RDAP bootstrap for gTLDs — generated from IANA dns.json",
      " * Source: https://data.iana.org/rdap/dns.json",
      ` * Published: ${j.publication}`,
      " *",
      " * ccTLDs are handled separately via CCTLD_RDAP_OVERRIDES in rdap_client.ts",
      " * (which covers more registries than the IANA bootstrap).",
      " *",
      " * To regenerate: node scripts/update-rdap-bootstrap.js",
      " */",
      "export const GTLD_RDAP_BOOTSTRAP: Record<string, string> = {",
      ...Object.entries(sorted).map(
        ([tld, server]) => `  ${JSON.stringify(tld)}: ${JSON.stringify(server)},`
      ),
      "};",
      "",
      "export function getGtldRdapServer(tld: string): string | undefined {",
      "  return GTLD_RDAP_BOOTSTRAP[tld.toLowerCase()];",
      "}",
    ];

    fs.writeFileSync(OUT_FILE, lines.join("\n") + "\n");
    console.log(`Written ${count} entries to ${OUT_FILE}`);
  });
}).on("error", (e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
