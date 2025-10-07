import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

// Definisi tipe untuk user lokal
interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Definisi tipe untuk credentials
interface Credentials {
  email: string;
  password: string;
}

// Definisi tipe untuk session
interface CustomSession extends Session {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    image?: string | null;
  };
}

const isAuthUser = (value: unknown): value is AuthUser => {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "role" in value &&
    "email" in value &&
    "name" in value
  );
};

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Credentials | undefined) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Simulasi login berhasil untuk demo
          // Pada implementasi sebenarnya, ini akan memanggil API backend
          
          // Daftar akun yang tersedia
          const users: Array<AuthUser & { password: string }> = [
            {
              id: "1",
              name: "Admin Utama",
              email: "admin@example.com",
              password: "admin123",
              role: "admin"
            },
            {
              id: "2",
              name: "Operator Gudang",
              email: "operator@example.com",
              password: "operator123",
              role: "operator"
            }
          ];
          
          // Cek kredensial dengan daftar akun
          const user = users.find(
            (user) => user.email === credentials.email && user.password === credentials.password
          );
          
          if (user) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            } satisfies AuthUser;
          }
          
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/",
    signOut: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (isAuthUser(user)) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: CustomSession; token: JWT }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : session.user.id;
        session.user.role = typeof token.role === "string" ? token.role : session.user.role;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
