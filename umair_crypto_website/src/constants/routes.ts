export const ROUTES = {
  HOME: '/',
  COLLECTION: '/collection',
  ACTIVATE: '/activate',
  MY_HOLDINGS: '/my-holdings',
  THE_TRAIL: '/the-trail',
  DOCS: '/docs',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/* The page was /my-stack until the "stack" wording was retired. Kept so links
   and bookmarks already in the wild still land somewhere real — App redirects
   it to ROUTES.MY_HOLDINGS. */
export const LEGACY_MY_STACK_PATH = '/my-stack';

export const NAV_ITEMS = [
  { label: 'Home', path: ROUTES.HOME },
  { label: 'Collection', path: ROUTES.COLLECTION },
  { label: 'Activate', path: ROUTES.ACTIVATE },
  { label: 'My Holdings', path: ROUTES.MY_HOLDINGS },
  { label: 'The Trail', path: ROUTES.THE_TRAIL },
  { label: 'Docs', path: ROUTES.DOCS },
] as const;
