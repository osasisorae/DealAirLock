export type AuthUser = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
};

export type AuthStatus = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loginUrl: string;
  logoutUrl: string;
};
