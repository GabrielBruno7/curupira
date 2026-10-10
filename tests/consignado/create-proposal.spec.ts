import { test, expect } from '../../support/fixtures';
import { env } from '../../support/env';
import { newUser } from '../../support/data';

type Simulation = {
  valor_parcela: number;
  valor_iof: number;
  valor_emprestimo: number;
  valor_cet_anual: number;
  valor_taxa_anual: number;
};

type Contract = {
  numeroContrato: string;
  dataInicioContrato: string;
  dataPrimeiroDesconto: string;
  dataFimContrato: string;
  valorParcela: number;
  valorIOF: number;
  valorEmprestimo: number;
  valorCETAnual: number;
  valorCETMensal: number;
  valorTaxaAnual: number;
};

type Loan = {
  id_emprestimo: string;
  valor_liberado: number;
  valor_parcela: number;
  valor_iof: number;
  valor_investimento: number;
  carencia: number;
  primeiro_vencimento: string;
  ultimo_vencimento: string;
};

type Installment = {
  data_vencimento: string;
  valor_principal: number;
};

const releasedValue = 10000;
const installments = 24;
const monthlyRate = 1.8;
const payrollLoanGroupId = '50d93655-fcac-4336-bbd5-89015f04ef7f';

function proposal(user: ReturnType<typeof newUser>, dataprevNumber: string, installmentCount: number) {
  return {
    tomador_cpf: user.cpf,
    tomador_nome: user.name,
    tomador_email: user.email,
    tomador_telefone: user.cellphone,
    tomador_data_nascimento: user.birthdate,
    tomador_nome_mae: 'Maria Teste Automatizado',
    tomador_estado_civil: 'solteiro',
    tomador_renda_mensal: '3500.00',
    tomador_pessoa_exposta_politicamente: 'nao',
    tomador_cep: '32145240',
    tomador_logradouro: 'Rua Teste Automatizado',
    tomador_numero_endereco: '100',
    tomador_bairro: 'Eldorado',
    tomador_cidade: 'Contagem',
    tomador_estado: 'MG',
    emprestimo_valor_liberado: releasedValue,
    emprestimo_quantidade_parcelas: installmentCount,
    emprestimo_seguro: true,
    emprestimo_numero_proposta_dataprev: dataprevNumber,
    taxa_juros: monthlyRate,
  };
}

function ddmmyyyy(date: string): string {
  return date.split('-').reverse().join('');
}

function monthsAfter(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1 + months, day)).toISOString().slice(0, 10);
}

test('Hermes creates a consignado proposal in the wallet', { tag: ['@api', '@wallet'] }, async ({ request, walletDb }) => {
  const walletApi = env('WALLET_API_URL');
  const user = newUser();
  const dataprevNumber = `e2e-${user.cpf}`;

  const simulation = await test.step('simulate the loan', async () => {
    const response = await request.get(`${walletApi}/consignado/emprestimo/simular`, {
      params: {
        valor: releasedValue,
        prazo: installments,
        seguro: 'true',
        taxa_juros: monthlyRate,
      },
    });

    await expect(response).toBeOK();

    return (await response.json()) as Simulation;
  });

  const contract = await test.step('Hermes sends the approved proposal', async () => {
    const response = await request.post(`${walletApi}/consignado/emprestimo`, {
      data: proposal(user, dataprevNumber, installments),
    });

    await expect(response).toBeOK();

    const body = (await response.json()) as Contract;

    expect(body).toMatchObject({
      numeroParcelas: installments,
      valorLiberado: releasedValue,
      valorTaxaMensal: monthlyRate,
      numeroContrato: expect.stringMatching(/^10\d{10}$/),
      contratoBase64: expect.stringMatching(/^JVBER/),
    });

    expect(body.valorParcela).toBeCloseTo(simulation.valor_parcela, 1);

    expect(body.valorIOF).toBeCloseTo(simulation.valor_iof, 1);

    expect(body.valorEmprestimo).toBeCloseTo(simulation.valor_emprestimo, 1);

    expect(body.valorCETAnual).toBeCloseTo(simulation.valor_cet_anual, 1);

    expect(body.valorTaxaAnual).toBeCloseTo(simulation.valor_taxa_anual, 1);

    return body;
  });

  await test.step('the borrower is saved', async () => {
    const [borrower] = await walletDb.rows(
      'SELECT id_usuario, tipo, status, estagio, fluxo_cadastro, nome, email, cidade FROM usuario WHERE cpf = ?',
      [user.cpf],
    );

    expect(borrower).toMatchObject({
      tipo: 'tomador',
      status: 'ativo',
      estagio: 'finalizado',
      fluxo_cadastro: 'novo_consignado',
      nome: user.name,
      email: user.email,
      cidade: 1770,
    });

    const links = await walletDb.rows(
      'SELECT grupo_emprestimo_id FROM vinculado_grupo_emprestimo WHERE usuario_id = ? AND status = ?',
      [borrower.id_usuario, 'ativo'],
    );

    expect(links).toEqual([
      {
        grupo_emprestimo_id: payrollLoanGroupId,
      },
    ]);
  });

  const loan = await test.step('the proposal is saved with the right calculation', async () => {
    const [row] = await walletDb.rows(
      `SELECT e.id_emprestimo, e.numero_proposta, e.status, e.modalidade, e.quantidade_parcelas, e.taxa_juros,
              e.valor_liberado, e.valor_parcela, e.valor_iof, e.valor_investimento, e.cet, e.cet_mensal, e.carencia,
              e.previsao_concessao, e.primeiro_vencimento, e.ultimo_vencimento
         FROM emprestimo e
         JOIN usuario u ON u.id_usuario = e.usuario_id
        WHERE u.cpf = ? AND e.numero_proposta_externo = ?`,
      [user.cpf, dataprevNumber],
    );

    expect(row).toMatchObject({
      numero_proposta: contract.numeroContrato,
      status: 'compromisso_pendente',
      modalidade: 'consignado',
      quantidade_parcelas: installments,
      taxa_juros: monthlyRate,
      valor_liberado: releasedValue,
      valor_parcela: contract.valorParcela,
      valor_iof: contract.valorIOF,
      valor_investimento: contract.valorEmprestimo,
      cet: contract.valorCETAnual,
      cet_mensal: contract.valorCETMensal,
    });

    const saved = row as Loan;

    expect([saved.primeiro_vencimento, saved.ultimo_vencimento].map(ddmmyyyy)).toEqual([
      contract.dataPrimeiroDesconto,
      contract.dataFimContrato,
    ]);

    const rate = monthlyRate / 100;

    expect(saved.valor_investimento).toBeCloseTo(saved.valor_liberado + saved.valor_iof, 1);

    expect(contract.valorTaxaAnual).toBeCloseTo(((1 + rate) ** 12 - 1) * 100, 1);

    const accrued = saved.valor_investimento * (1 + rate) ** ((saved.carencia - 30) / 30);

    expect(saved.valor_parcela).toBeCloseTo((accrued * rate) / (1 - (1 + rate) ** -installments), 1);

    return saved;
  });

  await test.step('the installments are consistent', async () => {
    const rows = await walletDb.rows(
      `SELECT numero_parcela, data_vencimento, valor_parcela, valor_principal, status, tipo
         FROM emprestimo_parcela
        WHERE emprestimo_id = ?
        ORDER BY numero_parcela`,
      [loan.id_emprestimo],
    );

    expect(rows).toEqual(
      Array.from({ length: installments }, (_, index) =>
        expect.objectContaining({
          numero_parcela: index + 1,
          data_vencimento: monthsAfter(loan.primeiro_vencimento, index),
          valor_parcela: loan.valor_parcela,
          status: 'pendente',
          tipo: 'consignado',
        }),
      ),
    );

    const saved = rows as Installment[];

    expect(loan.ultimo_vencimento.slice(0, 7)).toBe(saved[installments - 1].data_vencimento.slice(0, 7));

    expect(saved.reduce((total, installment) => total + installment.valor_principal, 0)).toBeCloseTo(
      loan.valor_investimento,
      1,
    );
  });

  await test.step('a second proposal for the same CPF is refused', async () => {
    const response = await request.post(`${walletApi}/consignado/emprestimo`, {
      data: proposal(user, `${dataprevNumber}-2`, installments),
    });

    expect(response.status()).toBe(400);

    expect(await response.json()).toMatchObject({
      code: 4457,
      message: 'Usuário vinculado a mais de um grupo de empréstimo ativo',
    });
  });

  await test.step('Hermes cancels the proposal', async () => {
    const response = await request.patch(`${walletApi}/consignado/emprestimo/cancelar`, {
      data: {
        tomador_cpf: user.cpf,
        numero_proposta_externo: dataprevNumber,
      },
    });

    await expect(response).toBeOK();

    expect(await walletDb.rows('SELECT status FROM emprestimo WHERE id_emprestimo = ?', [loan.id_emprestimo])).toEqual([
      {
        status: 'cancelado',
      },
    ]);
  });
});

test('a consignado proposal with installments out of range is refused', { tag: ['@api', '@wallet'] }, async ({ request }) => {
  const walletApi = env('WALLET_API_URL');
  const user = newUser();

  await test.step('fewer installments than the minimum', async () => {
    const response = await request.post(`${walletApi}/consignado/emprestimo`, {
      data: proposal(user, `e2e-${user.cpf}-min`, 2),
    });

    expect(response.status()).toBe(400);

    expect(await response.json()).toMatchObject({
      code: 4070,
      message: 'Quantidade de parcelas menor que o mínimo',
    });
  });

  await test.step('more installments than the maximum', async () => {
    const response = await request.post(`${walletApi}/consignado/emprestimo`, {
      data: proposal(user, `e2e-${user.cpf}-max`, 61),
    });

    expect(response.status()).toBe(400);

    expect(await response.json()).toMatchObject({
      code: 4071,
      message: 'Quantidade de parcelas maior que o máximo',
    });
  });
});
