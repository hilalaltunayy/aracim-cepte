import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = process.cwd();

function source(path: string): string {
  return readFileSync(join(repositoryRoot, path), 'utf8');
}

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    return entry.name.endsWith('.tsx') && !entry.name.includes('.test.') ? [path] : [];
  });
}

describe('selection surface inventory', () => {
  it.each([
    ['src/app/reminder/edit.tsx', 'reminder type and lead-time'],
    ['src/app/vehicle/edit.tsx', 'vehicle body and fuel type'],
    ['src/app/record/edit.tsx', 'record and expense categories'],
    ['src/app/documents/edit.tsx', 'document category'],
    ['src/app/body-condition/index.tsx', 'body status'],
  ])('routes %s through the shared safe-area SelectField (%s)', (path) => {
    expect(source(path)).toContain('<SelectField');
  });

  it('keeps the only custom runtime Modal in the shared UI component', () => {
    const modalFiles = collectTsxFiles(join(repositoryRoot, 'src'))
      .filter((path) => source(relative(repositoryRoot, path)).includes('<Modal'))
      .map((path) => relative(repositoryRoot, path).replaceAll('\\', '/'));
    expect(modalFiles).toEqual(['src/shared/components/ui.tsx']);
  });

  it('keeps date/time selection on the existing native picker instead of a second unsafe sheet', () => {
    const ui = source('src/shared/components/ui.tsx');
    expect(ui).toContain('<DateTimePicker');
    expect(source('src/app/reminder/edit.tsx')).toContain('<DateField');
  });
});
