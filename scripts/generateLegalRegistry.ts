import matter from 'gray-matter';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type DocumentKind = 'terms' | 'privacy';
type LegalDocument = {
  version: string;
  effectiveDate: string;
  importName: string;
  importPath: string;
};

const documentKinds: DocumentKind[] = ['terms', 'privacy'];
const legalDirectory = path.join(process.cwd(), 'content', 'legal');
const registryPath = path.join(legalDirectory, 'registry.generated.ts');

function normalizeEffectiveDate(value: unknown, filePath: string): string {
  const date =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : typeof value === 'string'
        ? value
        : '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${filePath} must define date in YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`${filePath} has an invalid effective date.`);
  }

  return date;
}

function createImportName(kind: DocumentKind, version: string): string {
  const suffix = version.replace(/[^a-zA-Z0-9_$]/g, '_');
  return `${kind}_${suffix}`;
}

function readDocumentEntries(kind: DocumentKind) {
  switch (kind) {
    case 'terms':
      return readdir('content/legal/terms', { withFileTypes: true });
    case 'privacy':
      return readdir('content/legal/privacy', { withFileTypes: true });
  }
}

async function readDocuments(kind: DocumentKind): Promise<LegalDocument[]> {
  const directory = path.join(legalDirectory, kind);
  const entries = await readDocumentEntries(kind);
  const documents: LegalDocument[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.mdx')) continue;

    const filePath = path.join(directory, entry.name);
    const source = await readFile(filePath, 'utf8');
    const { data } = matter(source);
    const fileVersion = entry.name.slice(0, -'.mdx'.length);
    const version = data.version;

    if (
      typeof version !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(version)
    ) {
      throw new Error(`${filePath} must define a valid string version.`);
    }
    if (version !== fileVersion) {
      throw new Error(
        `${filePath} must use its front matter version as its filename.`,
      );
    }

    documents.push({
      version,
      effectiveDate: normalizeEffectiveDate(data.date, filePath),
      importName: createImportName(kind, version),
      importPath: `./${kind}/${fileVersion}.mdx`,
    });
  }

  if (documents.length === 0) {
    throw new Error(`No versioned MDX documents found in ${directory}.`);
  }

  const versions = new Set<string>();
  const dates = new Set<string>();
  for (const document of documents) {
    if (versions.has(document.version)) {
      throw new Error(`Duplicate ${kind} version: ${document.version}.`);
    }
    if (dates.has(document.effectiveDate)) {
      throw new Error(
        `Multiple ${kind} documents have effective date ${document.effectiveDate}.`,
      );
    }
    versions.add(document.version);
    dates.add(document.effectiveDate);
  }

  return documents.sort((a, b) =>
    a.effectiveDate.localeCompare(b.effectiveDate),
  );
}

async function main() {
  const documentsByKind = await Promise.all(
    documentKinds.map(async (kind) => ({
      kind,
      documents: await readDocuments(kind),
    })),
  );

  const imports = documentsByKind
    .flatMap(({ documents }) => documents)
    .map(
      ({ importName, importPath }) =>
        `import ${importName} from ${JSON.stringify(importPath)};`,
    );

  const entries = documentsByKind
    .map(({ kind, documents: kindDocuments }) => {
      const documents = kindDocuments.map(
        ({ version, effectiveDate, importName }) =>
          `    { version: ${JSON.stringify(version)}, effectiveDate: ${JSON.stringify(effectiveDate)}, Content: ${importName} },`,
      );
      return `  ${kind}: [\n${documents.join('\n')}\n  ],`;
    })
    .join('\n');

  const output = `${imports.join('\n')}\n\nexport const legalDocumentRegistry = {\n${entries}\n} as const;\n`;
  await writeFile(registryPath, output, 'utf8');
}

main().catch((error: unknown) => {
  console.error('Failed to generate the legal-document registry.', error);
  process.exitCode = 1;
});
