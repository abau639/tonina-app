import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { fetchStockData } from "~/server/services/stockService";

export const stockRouter = createTRPCRouter({
  
  // 1. READ: Get Data (Database First -> API Fallback)
  getData: protectedProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ ctx, input }) => {
      const symbol = input.symbol.toUpperCase();

      // A. Check Database Cache
      const cached = await ctx.db.stockDataCache.findUnique({
        where: { symbol },
      });

      // If we have data (regardless of age), use it. 
      // This is "Analyst Mode" - we trust our manual data over the broken API.
      if (cached) {
        return JSON.parse(cached.dataBlob) as any; 
      }

      // B. API Fallback (Likely to fail for free tier, but we keep it just in case)
      const freshData = await fetchStockData(symbol);
      
      // If API somehow works, save it
      if (freshData.length > 0) {
        const dataString = JSON.stringify(freshData);
        await ctx.db.stockDataCache.upsert({
          where: { symbol },
          update: { dataBlob: dataString, lastUpdated: new Date() },
          create: { symbol, dataBlob: dataString, lastUpdated: new Date() }
        });
      }

      return freshData;
    }),

  // 2. WRITE: Manual Entry (The New Feature)
  saveManualData: protectedProcedure
    .input(z.object({ 
      symbol: z.string(),
      data: z.array(z.object({
        date: z.string(),
        revenue: z.number(),
        netIncome: z.number(),
        ebitda: z.number(),
        cfo: z.number(),
        shares: z.number(),
        eps: z.number(),
        stockPriceAvg: z.number(),
      }))
    }))
    .mutation(async ({ ctx, input }) => {
       const { symbol, data } = input;
       
       // Save to the "Brain" (StockDataCache)
       await ctx.db.stockDataCache.upsert({
          where: { symbol: symbol.toUpperCase() },
          update: { 
              dataBlob: JSON.stringify(data), 
              lastUpdated: new Date() 
          },
          create: {
              symbol: symbol.toUpperCase(),
              dataBlob: JSON.stringify(data),
              lastUpdated: new Date()
          }
       });
       return { success: true };
    }),

  // 3. Portfolio Limit Logic (Existing)
  addToPortfolio: protectedProcedure
    .input(z.object({ symbol: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const count = await ctx.db.portfolioItem.count({ where: { userId } });
      if (count >= 5) throw new Error("LIMIT_REACHED");
      return ctx.db.portfolioItem.create({
        data: { userId, symbol: input.symbol.toUpperCase() }
      });
    }),
});