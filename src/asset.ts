// Build-time base path. '/' for local dev/preview and root-hosted deploys,
// '/takip/' for a GitHub Pages project site. Root-relative results keep
// worker and main-thread lookups unambiguous.
export const assetPath = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
