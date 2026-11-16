/**
 * The old Families and Concepts pages are gone (CG-8): their routes redirect
 * to the Words page (`?focus=<type>:<id>`, `lib/connections/keys.ts`).
 * `/families?family=<id>` (or `?id=`) opens that word, `/concepts?concept=<slug>`
 * (or `?slug=`) that meaning; with neither, the page opens on "All words".
 * The `:` of the focus key is written `%3A` so the rule's own `:param`
 * syntax is not confused; the browser reads it back as `family:<id>`.
 */
const legacy = (route, type, keys) => [
  ...keys.map((key) => ({
    source: `/${route}`,
    has: [{ type: "query", key, value: "(?<ref>[^&]+)" }],
    destination: `/words?focus=${type}%3A:ref`,
    permanent: false,
  })),
  { source: `/${route}`, destination: "/words", permanent: false },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [...legacy("families", "family", ["family", "id"]), ...legacy("concepts", "concept", ["concept", "slug"])];
  },
};

export default nextConfig;
