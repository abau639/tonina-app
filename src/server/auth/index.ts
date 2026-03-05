import { getServerSession } from "next-auth";
import { authOptions } from "./config";
import { cache } from "react";

export const getServerAuthSession = cache(() => getServerSession(authOptions));

export { authOptions } from "./config";