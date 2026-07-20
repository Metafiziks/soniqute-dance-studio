import { AuthOptions } from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { DefaultSession } from "next-auth";

// Extend the default session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
}

// Extend the JWT token type
declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    isAdmin?: boolean;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.isAdmin = (user as any).isAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.isAdmin = token.isAdmin ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth",
  },
};
