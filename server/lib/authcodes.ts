import { randomId } from "./utils";

type AuthCode = {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  method: "S256";
  userEmail: string;
  createdAt: number;
};

const codes = new Map<string, AuthCode>();

export function createCode(input: Omit<AuthCode, "code" | "createdAt">) {
  const code = randomId(32);
  const item: AuthCode = { ...input, code, createdAt: Date.now() };
  codes.set(code, item);
  return item;
}

export function consumeCode(code: string) {
  const item = codes.get(code);
  if (!item) return null;
  codes.delete(code);
  return item;
}
