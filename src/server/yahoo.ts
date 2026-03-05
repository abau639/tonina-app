import yahooFinance from 'yahoo-finance2';

// 1. Create a global variable to hold the instance during hot-reloads
const globalForYahoo = globalThis as unknown as {
  yahooFinance: typeof yahooFinance | undefined;
};

// 2. Use the existing instance if it exists, otherwise use the library default
export const yahoo = globalForYahoo.yahooFinance ?? yahooFinance;

// 3. Save the instance to the global object in development
if (process.env.NODE_ENV !== 'production') {
  globalForYahoo.yahooFinance = yahoo;
}

// 4. Suppress the annoying console notice if possible
try {
  // @ts-ignore
  if (yahoo._opts) {
     // @ts-ignore
     yahoo.suppressNotices(['yahooSurvey']);
  }
} catch (e) {
  // Ignore errors here
}