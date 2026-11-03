// @vitest-environment node
import type { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
}));
vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs/promises')>()),
  readdir: mocks.list,
  readFile: mocks.read,
  writeFile: mocks.write,
}));

function entry(name: string, directory = false) {
  return {
    name,
    isDirectory: () => directory,
    isFile: () => !directory,
  };
}

function article(category = 'podstawy', metadata = {}) {
  return `---\n${JSON.stringify({
    title: 'Article',
    description: 'Description',
    category,
    order: 1,
    tags: ['help'],
    ...metadata,
  })}\n---\nArticle content`;
}

const initialExitCode = process.exitCode;
beforeAll(async () => {
  await import('gray-matter');
});
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  process.exitCode = initialExitCode;
  mocks.list.mockImplementation(async (directory: string) =>
    directory === 'content/help'
      ? [entry('podstawy', true), entry('registry.generated.ts')]
      : [entry('article.mdx')],
  );
  mocks.read.mockResolvedValue(article());
  mocks.write.mockResolvedValue(undefined);
});
afterEach(() => {
  process.exitCode = initialExitCode;
  vi.restoreAllMocks();
});

async function generate() {
  await import('@/scripts/generateHelpRegistry');
  await vi.waitFor(() => expect(mocks.write).toHaveBeenCalledOnce());
  return mocks.write.mock.calls[0][1] as string;
}

async function fails(message: string) {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  await import('@/scripts/generateHelpRegistry');
  await vi.waitFor(() =>
    expect(error).toHaveBeenCalledWith(
      'Failed to generate the help-article registry.',
      expect.objectContaining({ message: expect.stringContaining(message) }),
    ),
  );
  expect(process.exitCode).toBe(1);
  expect(mocks.write).not.toHaveBeenCalled();
}

describe('help registry generation', () => {
  it('includes every configured category using static imports and deterministic ordering', async () => {
    const categories = ['zus', 'podstawy', 'podatki', 'aplikacja'];
    mocks.list.mockImplementation(async (directory: string) =>
      directory === 'content/help'
        ? categories.map((category) => entry(category, true))
        : [
            entry('z.mdx'),
            entry('ignored.txt'),
            entry('nested', true),
            entry('a.mdx'),
          ],
    );
    mocks.read.mockImplementation(async (filename: string) =>
      article(path.basename(path.dirname(filename))),
    );
    const output = await generate();
    const expectedSlugs = [...categories]
      .sort()
      .flatMap((category) => [`${category}/a`, `${category}/z`]);
    expect(
      [...output.matchAll(/slugPath: "([^"]+)"/g)].map((match) => match[1]),
    ).toEqual(expectedSlugs);
    for (const [index, slug] of expectedSlugs.entries()) {
      expect(output).toContain(
        `import helpArticle${index} from "./${slug}.mdx";`,
      );
      expect(output).toContain(`Content: helpArticle${index},`);
    }
    expect(mocks.read).toHaveBeenCalledTimes(8);
    expect(mocks.write).toHaveBeenCalledWith(
      path.join(process.cwd(), 'content', 'help', 'registry.generated.ts'),
      output,
      'utf8',
    );
  });

  it('orders articles by numeric order before their slug', async () => {
    mocks.list.mockResolvedValueOnce([entry('podstawy', true)]);
    mocks.list.mockResolvedValueOnce([entry('a.mdx'), entry('z.mdx')]);
    mocks.read
      .mockResolvedValueOnce(article('podstawy', { order: 2 }))
      .mockResolvedValueOnce(article('podstawy', { order: 1 }));
    const output = await generate();
    expect(output.indexOf('slugPath: "podstawy/z"')).toBeLessThan(
      output.indexOf('slugPath: "podstawy/a"'),
    );
  });

  it.each([
    [{ title: '' }, 'non-empty title'],
    [{ title: 1 }, 'non-empty title'],
    [{ description: null }, 'string description'],
    [{ category: 'zus' }, 'directory name'],
    [{ order: '1' }, 'finite numeric order'],
    [{ tags: 'help' }, 'array of string tags'],
    [{ tags: [1] }, 'array of string tags'],
  ])(
    'rejects invalid metadata %j without overwriting the registry',
    async (metadata, message) => {
      mocks.read.mockResolvedValue(article('podstawy', metadata));
      await fails(message);
    },
  );

  it('rejects unknown category directories', async () => {
    mocks.list.mockResolvedValue([entry('custom', true)]);
    await fails('Unknown help-article category directory: custom');
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it('rejects Markdown files instead of generating unrenderable entries', async () => {
    mocks.list.mockResolvedValueOnce([entry('podstawy', true)]);
    mocks.list.mockResolvedValueOnce([entry('article.md')]);
    await fails('must use the .mdx extension');
  });

  it('rejects an empty catalog rather than reporting success', async () => {
    mocks.list.mockResolvedValue([]);
    await fails('No MDX help articles found');
  });

  it('rejects duplicate slugs', async () => {
    mocks.list.mockResolvedValueOnce([entry('podstawy', true)]);
    mocks.list.mockResolvedValueOnce([
      entry('article.mdx'),
      entry('article.mdx'),
    ]);
    await fails('Duplicate help-article slug: podstawy/article');
  });

  it.each([
    { operation: 'list', mock: mocks.list },
    { operation: 'read', mock: mocks.read },
  ])(
    'reports $operation failures without writing a partial registry',
    async ({ mock }) => {
      mock.mockRejectedValue(new Error('Filesystem unavailable'));
      await fails('Filesystem unavailable');
    },
  );
});

describe('help registry lifecycle configuration', () => {
  it('generates the registry before development, builds and typechecking', async () => {
    const { readFile: actualReadFile } = await vi.importActual<{
      readFile: typeof readFile;
    }>('node:fs/promises');
    const manifest = JSON.parse(
      await actualReadFile(
        new URL('../../package.json', import.meta.url),
        'utf8',
      ),
    ) as { scripts: Record<string, string> };
    const command = 'tsx scripts/generateHelpRegistry.ts';
    expect(manifest.scripts.predev).toContain(command);
    expect(manifest.scripts.prebuild).toContain(command);
    expect(manifest.scripts.pretypecheck).toContain(command);
  });
});
