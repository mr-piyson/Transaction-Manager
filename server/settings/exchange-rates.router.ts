import { z } from 'zod';
import { NotFoundError, ConflictError } from '@/lib/error';
import { orgProcedure, router } from '@/lib/trpc/context';
import { currencyCodeSchema } from '@/lib/validations';
import {
  fetchLatestRates,
  fullSyncCurrenciesAndRates,
  transformRates,
} from '../shared/frankfurter';

const SYNC_SETTINGS_KEYS = {
  ENABLED: 'currencySyncEnabled',
  FREQUENCY: 'currencySyncFrequency',
  LAST_SYNCED: 'currencyLastSyncedAt',
} as const;

const SYNC_FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;
type SyncFrequency = (typeof SYNC_FREQUENCIES)[number];

function getCronExpression(frequency: SyncFrequency): string {
  switch (frequency) {
    case 'daily':
      return '0 0 * * *';
    case 'weekly':
      return '0 0 * * 0';
    case 'monthly':
      return '0 0 1 * *';
    default:
      return '0 0 * * *';
  }
}

export const exchangeRatesRouter = router({
  /**
   * Get all exchange rates for the organization (latest per currency pair)
   */
  list: orgProcedure.query(async ({ ctx }) => {
    const orgId = ctx.user.organizationId;

    // Get the latest rate for each currency pair
    const rates = await ctx.db.$queryRaw<
      Array<{
        id: string;
        fromCurrency: string;
        toCurrency: string;
        rate: string;
        effectiveDate: Date;
        source: string | null;
      }>
    >`
      SELECT DISTINCT ON ("fromCurrency", "toCurrency")
        id, "fromCurrency", "toCurrency", rate::text, "effectiveDate", source
      FROM "ExchangeRate"
      WHERE "organizationId" = ${orgId}
      ORDER BY "fromCurrency", "toCurrency", "effectiveDate" DESC
    `;

    return rates.map((r) => ({
      id: r.id,
      fromCurrency: r.fromCurrency,
      toCurrency: r.toCurrency,
      rate: parseFloat(r.rate),
      effectiveDate: r.effectiveDate,
      source: r.source,
    }));
  }),

  /**
   * Get the latest rate for a specific currency pair
   */
  getRate: orgProcedure
    .input(
      z.object({
        fromCurrency: currencyCodeSchema,
        toCurrency: currencyCodeSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.fromCurrency === input.toCurrency) {
        return { rate: 1 };
      }

      const rate = await ctx.db.exchangeRate.findFirst({
        where: {
          organizationId: ctx.user.organizationId,
          fromCurrency: input.fromCurrency,
          toCurrency: input.toCurrency,
        },
        orderBy: { effectiveDate: 'desc' },
        select: { rate: true },
      });

      if (rate) {
        return { rate: Number(rate.rate) };
      }

      // Fallback: try to fetch live from Frankfurter
      try {
        const response = await fetchLatestRates(input.fromCurrency, [input.toCurrency]);
        if (response.rates.length > 0) {
          return { rate: response.rates[0].rate };
        }
      } catch {
        // ignore
      }

      return { rate: 1 };
    }),

  /**
   * Get latest rates directly from Frankfurter API (preview before sync)
   */
  getLatest: orgProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.user.organizationId },
      select: { currency: true },
    });

    if (!org?.currency) {
      throw new NotFoundError('Organization', ctx.user.organizationId);
    }

    const baseCurrency = org.currency;
    const allCurrencies = await ctx.db.currency.findMany({
      where: { isActive: true },
      select: { code: true },
    });
    const targetCurrencies = allCurrencies.map((c) => c.code).filter((c) => c !== baseCurrency);

    const response = await fetchLatestRates(baseCurrency, targetCurrencies);
    return {
      baseCurrency,
      date: response.date,
      rates: response.rates,
    };
  }),

  /**
   * Add or update a manual exchange rate
   */
  manualUpsert: orgProcedure
    .input(
      z.object({
        fromCurrency: currencyCodeSchema,
        toCurrency: currencyCodeSchema,
        rate: z.number().positive(),
        effectiveDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      if (input.fromCurrency === input.toCurrency) {
        throw new ConflictError('From and to currencies must be different');
      }

      // Check if a manual rate already exists for this pair and date
      const existing = await ctx.db.exchangeRate.findFirst({
        where: {
          organizationId: orgId,
          fromCurrency: input.fromCurrency,
          toCurrency: input.toCurrency,
          effectiveDate: input.effectiveDate,
          source: 'manual',
        },
      });

      if (existing) {
        // Update existing manual rate
        return ctx.db.exchangeRate.update({
          where: { id: existing.id },
          data: { rate: input.rate },
        });
      }

      // Create new manual rate
      return ctx.db.exchangeRate.create({
        data: {
          fromCurrency: input.fromCurrency,
          toCurrency: input.toCurrency,
          rate: input.rate,
          effectiveDate: input.effectiveDate,
          source: 'manual',
          organizationId: orgId,
        },
      });
    }),

  /**
   * Delete a manual exchange rate
   */
  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.exchangeRate.findFirst({
        where: { id: input.id, organizationId: orgId },
      });

      if (!existing) {
        throw new NotFoundError('ExchangeRate', input.id);
      }

      if (existing.source !== 'manual') {
        throw new ConflictError('Cannot delete auto-synced rates. Disable auto-sync instead.');
      }

      await ctx.db.exchangeRate.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /**
   * Trigger immediate sync from Frankfurter API
   */
  syncNow: orgProcedure.mutation(async ({ ctx }) => {
    const orgId = ctx.user.organizationId;

    const org = await ctx.db.organization.findUnique({
      where: { id: orgId },
      select: { currency: true },
    });

    if (!org?.currency) {
      throw new NotFoundError('Organization', orgId);
    }

    const baseCurrency = org.currency;

    // Use the centralized full sync function
    const result = await fullSyncCurrenciesAndRates(baseCurrency, orgId);

    // Update last synced timestamp
    await ctx.db.organizationSetting.upsert({
      where: {
        organizationId_key: {
          organizationId: orgId,
          key: SYNC_SETTINGS_KEYS.LAST_SYNCED,
        },
      },
      create: {
        organizationId: orgId,
        key: SYNC_SETTINGS_KEYS.LAST_SYNCED,
        value: new Date().toISOString(),
      },
      update: { value: new Date().toISOString() },
    });

    return {
      success: true,
      ratesUpdated: result.ratesSynced,
      baseCurrency,
    };
  }),

  /**
   * Get sync settings for the organization
   */
  getSyncSettings: orgProcedure.query(async ({ ctx }) => {
    const orgId = ctx.user.organizationId;

    const settings = await ctx.db.organizationSetting.findMany({
      where: {
        organizationId: orgId,
        key: {
          in: Object.values(SYNC_SETTINGS_KEYS),
        },
      },
    });

    const settingsMap = settings.reduce<Record<string, string>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    return {
      enabled: settingsMap[SYNC_SETTINGS_KEYS.ENABLED] === 'true',
      frequency: (settingsMap[SYNC_SETTINGS_KEYS.FREQUENCY] || 'daily') as SyncFrequency,
      lastSyncedAt: settingsMap[SYNC_SETTINGS_KEYS.LAST_SYNCED] || null,
      cronExpression: getCronExpression(
        (settingsMap[SYNC_SETTINGS_KEYS.FREQUENCY] || 'daily') as SyncFrequency
      ),
    };
  }),

  /**
   * Update sync settings
   */
  updateSyncSettings: orgProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        frequency: z.enum(SYNC_FREQUENCIES),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      await ctx.db.$transaction(async (tx) => {
        // Update enabled setting
        await tx.organizationSetting.upsert({
          where: {
            organizationId_key: {
              organizationId: orgId,
              key: SYNC_SETTINGS_KEYS.ENABLED,
            },
          },
          create: {
            organizationId: orgId,
            key: SYNC_SETTINGS_KEYS.ENABLED,
            value: String(input.enabled),
          },
          update: { value: String(input.enabled) },
        });

        // Update frequency setting
        await tx.organizationSetting.upsert({
          where: {
            organizationId_key: {
              organizationId: orgId,
              key: SYNC_SETTINGS_KEYS.FREQUENCY,
            },
          },
          create: {
            organizationId: orgId,
            key: SYNC_SETTINGS_KEYS.FREQUENCY,
            value: input.frequency,
          },
          update: { value: input.frequency },
        });
      });

      return {
        success: true,
        frequency: input.frequency,
        cronExpression: getCronExpression(input.frequency),
      };
    }),
});
