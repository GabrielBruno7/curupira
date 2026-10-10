<div align="center">

<img src="assets/logo.svg" alt="curupira" width="140">

# curupira

Testes end-to-end da Emcash

</div>

## Rodar

```bash
./curupira start
```

Só precisa de Docker. Os serviços testados já precisam estar no ar ([como subir a wallet](docs/wallet.md#running-it-locally)).

## Criar um teste

No Claude Code, rode `/write-e2e-test`. Na mão, siga o [passo a passo](WRITING-A-TEST.md).

## Saiba mais

- [docs/](docs/): o que sabemos de cada serviço, o CI e a configuração
- [PLAN.md](PLAN.md): a estratégia e as pendências

> [!WARNING]
> Nunca rode contra dados reais: os testes criam usuários, e o staging envia SMS e e-mails de verdade.
