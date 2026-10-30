import { z } from "zod";
import { protectedProcedure, router } from "@/lib/trpc/context";

const customHotkeysSchema = z.record(z.string(), z.string().nullable());

/**
 * Per-user keyboard shortcut overrides.
 *
 * Only shortcuts that differ from the code-defined defaults are stored. The
 * settings UI and TanStack Hotkeys provider both work with this sparse map.
 */
export const shortcutsRouter = router({
  saveCustom: protectedProcedure
    .input(customHotkeysSchema)
    .mutation(async ({ ctx, input }) => {
      const actions = Object.keys(input);

      await ctx.db.$transaction(async (tx) => {
        await tx.userShortcut.deleteMany({
          where: {
            userId: ctx.user.id,
            ...(actions.length > 0 ? { action: { notIn: actions } } : {}),
          },
        });

        for (const [action, shortcut] of Object.entries(input)) {
          await tx.userShortcut.upsert({
            where: {
              userId_action: { userId: ctx.user.id, action },
            },
            create: {
              userId: ctx.user.id,
              action,
              shortcut,
            },
            update: { shortcut },
          });
        }
      });

      return { success: true };
    }),
});
