import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authenticateCredentials } from "@/server/auth/credentials";
import { enforceLoginRateLimit } from "@/server/auth/login-rate-limit";
import { credentialUserRepository } from "@/server/auth/user-repository";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  providers: [
    Credentials({
      name: "Staff credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const withinLimit = await enforceLoginRateLimit(
          credentials.email,
          request,
        );

        if (!withinLimit) {
          return null;
        }

        return authenticateCredentials(credentials, {
          users: credentialUserRepository,
        });
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (
        typeof token.id !== "string" ||
        (token.role !== "ADMIN" && token.role !== "STAFF")
      ) {
        throw new Error("Session token is missing required identity fields.");
      }

      return {
        expires: session.expires,
        user: {
          id: token.id,
          name: token.name ?? "",
          email: token.email ?? "",
          role: token.role,
        },
      };
    },
  },
});
