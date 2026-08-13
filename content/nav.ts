/**
 * The docs navigation, declared once.
 *
 * One list drives three things that would otherwise drift: the sidebar, the
 * prev/next pager, and `generateStaticParams`. A page not in here does not
 * exist — same discipline as the app's shortcut registry.
 *
 * `slug` is the path under /docs and the path to the MDX file under
 * content/docs, so those two can never disagree either.
 */
export interface NavItem {
  slug: string;
  title: string;
  /** Shown in the sidebar when it differs from the page title. */
  short?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: readonly NavGroup[] = [
  {
    label: 'Getting started',
    items: [
      {
        slug: 'getting-started/what-is-twinscope',
        title: 'What is TwinScope',
        short: 'What it is',
      },
      { slug: 'getting-started/install', title: 'Install' },
      { slug: 'getting-started/first-comparison', title: 'Your first comparison' },
      { slug: 'getting-started/privacy', title: 'Privacy' },
    ],
  },
  {
    label: 'Comparing',
    items: [
      { slug: 'comparing/intake', title: 'Giving it two inputs', short: 'Two inputs' },
      { slug: 'comparing/detection', title: 'Type detection' },
      { slug: 'comparing/running-a-job', title: 'Running a comparison' },
      { slug: 'comparing/reading-a-result', title: 'Reading a result' },
    ],
  },
  {
    label: 'Engines',
    items: [
      { slug: 'engines/text', title: 'Text and code' },
      { slug: 'engines/large-text', title: 'Large text files', short: 'Large text' },
      { slug: 'engines/json', title: 'JSON' },
      { slug: 'engines/yaml', title: 'YAML' },
      { slug: 'engines/xml', title: 'XML' },
      { slug: 'engines/csv', title: 'CSV' },
      { slug: 'engines/deps', title: 'Dependencies' },
      { slug: 'engines/api', title: 'API contracts and captures', short: 'API' },
      { slug: 'engines/config', title: 'Environment and config', short: 'Config' },
      { slug: 'engines/web', title: 'Saved web pages', short: 'Web pages' },
      { slug: 'engines/pdf', title: 'PDF' },
      { slug: 'engines/folders', title: 'Folders' },
      { slug: 'engines/git', title: 'Git refs' },
      { slug: 'engines/images', title: 'Images' },
      { slug: 'engines/visual', title: 'Visual regression', short: 'Visual' },
      { slug: 'engines/binary', title: 'Binary files', short: 'Binary' },
    ],
  },
  {
    label: 'Working with results',
    items: [
      { slug: 'results/change-navigation', title: 'Change navigation' },
      { slug: 'results/search-and-filter', title: 'Search and filter' },
      { slug: 'results/normalisation', title: 'Normalisation' },
      { slug: 'results/radar', title: 'The Diff Radar', short: 'Diff Radar' },
      { slug: 'results/export', title: 'Export' },
    ],
  },
  {
    label: 'Working faster',
    items: [
      { slug: 'workflow/projects', title: 'Projects and saved comparisons', short: 'Projects' },
      { slug: 'workflow/quick-compare', title: 'Quick compare', short: 'Quick compare' },
    ],
  },
  {
    label: 'Beyond the app',
    items: [
      { slug: 'tools/cli', title: 'The twinscope command line', short: 'Command line' },
      { slug: 'tools/ci', title: 'Continuous integration', short: 'CI' },
      { slug: 'tools/vscode', title: 'VS Code extension', short: 'VS Code' },
    ],
  },
  {
    label: 'History',
    items: [
      { slug: 'history/history', title: 'History' },
      { slug: 'history/preferences', title: 'Preferences' },
      { slug: 'history/updates', title: 'Update checks' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { slug: 'reference/keyboard', title: 'Keyboard map', short: 'Keyboard map' },
      { slug: 'reference/command-palette', title: 'Command palette' },
      { slug: 'reference/encodings', title: 'Encodings and line endings', short: 'Encodings' },
      { slug: 'reference/limits', title: 'Limits and performance', short: 'Limits' },
      { slug: 'reference/known-limits', title: 'Known limits' },
    ],
  },
  {
    label: 'Contributing',
    items: [
      { slug: 'contributing/architecture', title: 'Architecture' },
      { slug: 'contributing/boundaries', title: 'Import boundaries', short: 'Boundaries' },
      { slug: 'contributing/verification', title: 'Verifying changes', short: 'Verification' },
    ],
  },
];

/** Every page, in reading order — what the pager walks. */
export const FLAT_NAV: readonly NavItem[] = NAV.flatMap((group) => group.items);

export function navItem(slug: string): NavItem | undefined {
  return FLAT_NAV.find((item) => item.slug === slug);
}

export function groupOf(slug: string): NavGroup | undefined {
  return NAV.find((group) => group.items.some((item) => item.slug === slug));
}

/** Previous and next in reading order; `undefined` at each end. */
export function neighbours(slug: string): { prev?: NavItem; next?: NavItem } {
  const index = FLAT_NAV.findIndex((item) => item.slug === slug);
  if (index < 0) return {};
  return { prev: FLAT_NAV[index - 1], next: FLAT_NAV[index + 1] };
}
