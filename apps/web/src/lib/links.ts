// A link that leaves the site opens in a new tab. The installer (.exe) is a download, not a page: it
// stays in the same tab.
export const isExternal = (href: string): boolean => /^https?:\/\//i.test(href) && !/\.exe$/i.test(href);

// The attributes of a link that leaves the site; none for the others.
export const newTabAttributes = (href: string): { target?: '_blank'; rel?: string } =>
  isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
