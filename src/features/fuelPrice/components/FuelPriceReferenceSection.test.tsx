/* eslint-disable import/first */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { createFuelEntryState } from '@/features/fuel/domain/fuelEntry';
import type { NormalizedFuelPrice } from '../domain/fuelPrice';

const selectFieldHost = 'SelectField' as unknown as React.ElementType;
const buttonHost = 'Button' as unknown as React.ElementType;
const textHost = 'Text' as unknown as React.ElementType;
const errorBannerHost = 'ErrorBanner' as unknown as React.ElementType;

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(value: T) => value },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
vi.mock('@/shared/theme', () => ({
  spacing: { xs: 4, sm: 8 },
  radii: { md: 14 },
  typography: { body: {}, bodyMedium: {}, cardTitle: {}, caption: {} },
  useAppTheme: () => ({
    colors: {
      textSecondary: '#456',
      textPrimary: '#123',
      primary: '#0ab',
      paleAqua: '#def',
      elevatedSurface: '#fff',
    },
  }),
  useThemedStyles: (factory: (theme: { colors: Record<string, string> }) => unknown) =>
    factory({
      colors: {
        textSecondary: '#456',
        textPrimary: '#123',
        primary: '#0ab',
        paleAqua: '#def',
        elevatedSurface: '#fff',
      },
    }),
}));
vi.mock('@/shared/utils/format', () => ({
  formatCompactDate: () => '15 Ağu',
  formatNumber: (value: number) => String(value),
  parseDecimal: (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  },
}));
vi.mock('@/shared/components/ui', () => ({
  AppButton: (props: { title: string; onPress: () => void; disabled?: boolean }) =>
    React.createElement('Button', props),
  Card: ({ children }: { children: React.ReactNode }) =>
    React.createElement('Card', null, children),
  ErrorBanner: ({ message }: { message: string }) =>
    React.createElement('ErrorBanner', { message }),
  SelectField: (props: { label: string; onChange: (value: string) => void }) =>
    React.createElement('SelectField', props),
}));

import { FuelPriceReferenceSection } from './FuelPriceReferenceSection';

const reference: NormalizedFuelPrice = {
  source: 'epdk',
  fuelType: 'gasoline',
  provinceCode: '42',
  provinceName: 'Konya',
  brand: null,
  providerBrand: null,
  referencePricePerLitre: 47.5,
  currency: 'TRY',
  effectiveDate: '2026-08-15',
  fetchedAt: '2026-08-15T10:00:00Z',
  freshness: 'current',
  granularity: 'province',
  isEstimatedReference: true,
};

async function mount(element: React.ReactElement): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(element);
  });
  return renderer!;
}

describe('FuelPriceReferenceSection', () => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  it('is fail-closed by default and does not call a lookup from form render', async () => {
    const lookup = { lookup: vi.fn(async () => reference) };
    const renderer = await mount(
      <FuelPriceReferenceSection
        vehicleFuelType="gasoline"
        stationBrand=""
        fuelEntry={createFuelEntryState({ total: 2000 })}
        onFuelEntryChange={vi.fn()}
        lookup={lookup}
      />,
    );
    expect(renderer.toJSON()).toBeNull();
    expect(lookup.lookup).not.toHaveBeenCalled();
  });

  it('loads only after an explicit province/action and requires an explicit apply', async () => {
    const lookup = { lookup: vi.fn(async () => reference) };
    const onFuelEntryChange = vi.fn();
    const renderer = await mount(
      <FuelPriceReferenceSection
        vehicleFuelType="gasoline"
        stationBrand=""
        fuelEntry={createFuelEntryState({ total: 2000 })}
        onFuelEntryChange={onFuelEntryChange}
        availability={{ enabled: true, reason: 'ready' }}
        lookup={lookup}
      />,
    );
    await act(async () => {
      renderer.root.findByType(selectFieldHost).props.onChange('42');
    });
    await act(async () => {
      renderer.root
        .findAllByType(buttonHost)
        .find((button) => button.props.title === 'EPDK referansını getir')!
        .props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(lookup.lookup).toHaveBeenCalledWith(
      expect.objectContaining({
        province: expect.objectContaining({ code: '42' }),
        fuelType: 'gasoline',
      }),
    );
    expect(
      renderer.root
        .findAllByType(textHost)
        .some((node) => node.children.join('') === 'EPDK referans fiyatı'),
    ).toBe(true);
    await act(async () => {
      renderer.root
        .findAllByType(buttonHost)
        .find((button) => button.props.title === 'Referans fiyatı kullan')!
        .props.onPress();
    });
    expect(onFuelEntryChange).toHaveBeenCalledWith(
      expect.objectContaining({ pricePerLiter: '47,50' }),
    );
  });

  it('keeps manual entry available when a reference lookup fails', async () => {
    const lookup = {
      lookup: vi.fn(async () => {
        throw new Error('synthetic timeout');
      }),
    };
    const onFuelEntryChange = vi.fn();
    const renderer = await mount(
      <FuelPriceReferenceSection
        vehicleFuelType="gasoline"
        stationBrand=""
        fuelEntry={createFuelEntryState({ total: 2000 })}
        onFuelEntryChange={onFuelEntryChange}
        availability={{ enabled: true, reason: 'ready' }}
        lookup={lookup}
      />,
    );
    await act(async () => {
      renderer.root.findByType(selectFieldHost).props.onChange('42');
    });
    await act(async () => {
      renderer.root
        .findAllByType(buttonHost)
        .find((button) => button.props.title === 'EPDK referansını getir')!
        .props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(renderer.root.findByType(errorBannerHost).props.message).toContain('elle devam');
    expect(onFuelEntryChange).not.toHaveBeenCalled();
  });
});
