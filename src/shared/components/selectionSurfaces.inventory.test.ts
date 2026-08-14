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
    ['src/app/reminder/edit.tsx', '<SelectField', 'reminder type and lead-time'],
    ['src/app/vehicle/edit.tsx', '<SelectField', 'vehicle body and fuel type'],
    ['src/app/record/edit.tsx', '<SelectField', 'record and expense categories'],
    ['src/app/documents/edit.tsx', '<SelectField', 'document category'],
    ['src/app/body-condition/index.tsx', '<BodyConditionSelector', 'body status'],
  ])('routes %s through the intended selection surface (%s)', (path, marker) => {
    expect(source(path)).toContain(marker);
  });

  it('keeps the only custom runtime Modal in the shared UI component', () => {
    const modalFiles = collectTsxFiles(join(repositoryRoot, 'src'))
      .filter((path) => source(relative(repositoryRoot, path)).includes('<Modal'))
      .map((path) => relative(repositoryRoot, path).replaceAll('\\', '/'));
    expect(modalFiles).toEqual([
      'src/features/vehicles/components/VehiclePhotoGallery.tsx',
      'src/features/vehicles/components/VehicleSwitcherSheet.tsx',
      'src/shared/components/ui.tsx',
    ]);
  });

  it('keeps native time selection and routes reminder calendar content through the shared sheet', () => {
    const ui = source('src/shared/components/ui.tsx');
    expect(ui).toContain('<DateTimePicker');
    expect(ui).toContain('export function BottomSheet');
    expect(source('src/app/reminder/edit.tsx')).toContain('<ReminderScheduleFields');
  });
});
