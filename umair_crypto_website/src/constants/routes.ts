export const ROUTES = {
  HOME: '/',
  ACTIVATE: '/activate',
  MY_STACK: '/my-stack',
  THE_TRAIL: '/the-trail',
  DOCS: '/docs',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export const NAV_ITEMS = [
  { label: 'Home', path: ROUTES.HOME },
  { label: 'Activate', path: ROUTES.ACTIVATE },
  { label: 'My Stack', path: ROUTES.MY_STACK },
  { label: 'The Trail', path: ROUTES.THE_TRAIL },
  { label: 'Docs', path: ROUTES.DOCS },
] as const;
