export interface SignupInput {
  email: string;
  password: string;
  companyName: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleLoginInput {
  idToken: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    isSuperAdmin: boolean;
  };
  brand: {
    id: string;
    slug: string;
    companyName: string;
  };
  membership: {
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
  };
}
