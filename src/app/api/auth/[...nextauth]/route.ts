import NextAuth from "next-auth";
import { authOptions } from "~/server/auth/config";

// Initialize NextAuth
const handler = NextAuth(authOptions);

// Export the handler
export { handler as GET, handler as POST };