export function randomCpf(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));

  for (const length of [9, 10]) {
    const sum = digits.reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    digits.push(rest === 10 ? 0 : rest);
  }

  return digits.join('');
}

export function randomCellphone(): string {
  return '319' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
}

export function newUser() {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  return {
    cpf: randomCpf(),
    name: 'Teste Automatizado Cadastro',
    email: `e2e.${id}@emcash.test`,
    cellphone: randomCellphone(),
    password: 'E2e@12345',
    birthdate: '1990-01-01',
    deviceId: `e2e-device-${id}`,
    pushToken: `e2e:push-token-${id}`,
  };
}
