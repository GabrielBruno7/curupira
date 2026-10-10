export function env(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Set ${name} in .env (locally) or in the CI variables and secrets. See docs/ci.md.`);
  }

  return value;
}
