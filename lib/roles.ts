export const APP_ROLES = {
  ADMIN: "Admin",
  APPROVER: "approver",
  USER: "User",
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

