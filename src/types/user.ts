export interface UserAttributes {
  email: string;
  name: string;
  created_at: Date;
  active: boolean;
  deleted_at: Date | null;
}

export interface User extends UserAttributes {
  id: number;
}

export type CreateUserInput = Pick<User, "email" | "name">;

export type UpdateUserInput = Pick<User, "email" | "name" | "active">;
