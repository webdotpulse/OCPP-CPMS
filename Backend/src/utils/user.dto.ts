export function excludeUserFields<T extends Record<string, any>>(user: T, keys: (keyof T)[]): Omit<T, (typeof keys)[number]> {
  const result = { ...user };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

export function sanitizeUser<T extends Record<string, any>>(user: T | null | undefined): Partial<T> | null | undefined {
  if (!user) return user;
  return excludeUserFields(user, ['password', 'resetToken', 'twoFactorSecret', 'twoFactorCode'] as (keyof T)[]) as Partial<T>;
}

export function sanitizeUsers<T extends Record<string, any>>(users: T[]): Partial<T>[] {
  return users.map(user => sanitizeUser(user) as Partial<T>);
}
