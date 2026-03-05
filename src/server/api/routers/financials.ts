import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { fetchStockData } from "~/server/services/stockService";

export const financialsRouter = createTRPCRouter({
  getUserData: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        loans: true,
        milestones: true,
      },
    });
  }),

  saveData: protectedProcedure
    .input(z.object({
      salary: z.number(),
      cash: z.number(),
      investments: z.number(),
      investmentRate: z.number(),
      expenseData: z.string().optional(), // Stores the JSON for sliders/milestones
      
      loans: z.array(z.object({
        name: z.string(),
        balance: z.number(),
        rate: z.number(),
        payment: z.number(),
        type: z.string(),
      })),
      
      // We accept an array for legacy reasons, even if currently passing empty []
      milestones: z.array(z.any()).optional(), 
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return ctx.db.$transaction(async (tx) => {
        // 1. Update User Financials
        await tx.user.update({
          where: { id: userId },
          data: {
            salary: input.salary,
            cash: input.cash,
            investments: input.investments,
            investmentRate: input.investmentRate,
            expenseData: input.expenseData,
          },
        });

        // 2. Update Loans
        await tx.loan.deleteMany({ where: { userId } });
        if (input.loans.length > 0) {
          await tx.loan.createMany({
            data: input.loans.map((l) => ({ ...l, userId })),
          });
        }
        
        // 3. Milestones are currently saved inside 'expenseData' JSON, 
        // so we don't need to populate the separate Milestone table for now,
        // but we clear it to avoid stale data if you were using it before.
        await tx.milestone.deleteMany({ where: { userId } });
      });
    }),
});