import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const hasGoogleKeys = process.env.GOOGLE_CLIENT_ID && 
  process.env.GOOGLE_CLIENT_SECRET && 
  !process.env.GOOGLE_CLIENT_ID.startsWith('your_');

const providers: any[] = [
  ...(hasGoogleKeys ? [Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  })] : []),
  Credentials({
    id: 'guest-login',
    name: 'Guest Login',
    credentials: {
      email: {},
      password: {},
    },
    authorize: async (credentials) => {
      try {
        // Try guest login first
        let res = await fetch(`${API_URL}/auth/guest/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        });

        if (!res.ok) {
          // Fallback to admin login
          res = await fetch(`${API_URL}/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          });
        }

        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.access_token) {
          return {
            id: data.user?.id || "user",
            email: data.user?.email || (credentials.email as string),
            name: data.user?.name || "",
            role: data.user?.role || "GUEST",
            accessToken: data.access_token,
          } as any;
        }
        return null;
      } catch (e) {
        console.error('Auth error:', e);
        return null;
      }
    },
  }),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback_secret_for_development",
  session: { strategy: 'jwt' as const },
  pages: {
    signIn: '/login',
  },
  providers,
  callbacks: {
    signIn: async ({ user, account, profile }: any) => {
      if (account?.provider === 'google' && profile?.email) {
        try {
          const res = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile.email,
              name: profile.name || profile.email,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            user.accessToken = data.access_token;
            user.role = data.user?.role || 'GUEST';
            user.id = data.user?.id;
          }
        } catch (e) {
          console.error('Google auth backend sync error:', e);
        }
      }
      return true;
    },
    jwt: async ({ token, user }: any) => {
      if (user) {
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.userId = user.id;
      }
      return token;
    },
    session: async ({ session, token }: any) => {
      if (session.user) {
        session.user.role = token.role;
        session.user.accessToken = token.accessToken;
        session.user.id = token.userId;
      }
      return session;
    },
  },
});

