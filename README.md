# trab.devOps

# ClinicFlow

Sistema full stack para atendimento hospitalar, com foco em marcacao de consultas medicas e pratica de DevOps com Docker Compose, PostgreSQL, testes automatizados e GitHub Actions.

## Tecnologias utilizadas

- Frontend: React, Vite, CSS, lucide-react
- Backend: Node.js, Express, CORS, Helmet, Morgan
- Banco de dados: PostgreSQL
- Containers: Docker e Docker Compose
- CI/CD: GitHub Actions
- Testes: Jest e Supertest
- Seguranca: `.env`, `.gitignore` e variaveis no workflow

## Estrutura do projeto

```text
clinicflow/
  frontend/
    Dockerfile
    src/
      pages/Login.jsx
      App.jsx
      api.js
      styles.css
  backend/
    Dockerfile
    src/
      app.js
      db.js
      server.js
    tests/
  database/
    init.sql
  .github/
    workflows/ci.yml
  docker-compose.yml
  .env
  .env.example
  README.md
```

## Funcionalidades

- Login administrativo.
- Botao Sair funcional, limpando a sessao local.
- Dashboard com total de consultas, consultas agendadas, confirmadas e medicos ativos.
- Cadastro visual de nova consulta.
- Campo de paciente em nova consulta digitavel por nome, sem seletor antigo.
- Validacao de data futura e bloqueio de conflito de horario para o mesmo medico.
- Listagem de consultas marcadas.
- Botoes de status para confirmar, concluir e cancelar consulta.
- Botao para excluir/cancelar consulta marcada.
- CRUD de medicos: cadastrar, editar e desativar.
- Listagem de pacientes.
- Cadastro de pacientes com persistencia no PostgreSQL.
- Edicao de pacientes cadastrados usando a mesma pagina de cadastro.
- Tela dedicada para cadastro/edicao de paciente, no mesmo estilo visual do login.
- Painel DevOps Lab para forcar erros e testar diagnostico.

## Regra de acesso

```text
Qualquer e-mail que contenha .com pode acessar.
Exemplo: marcos.silva@gmail.com
Senha: opcional nesta demonstracao
```

O nome exibido no menu lateral e gerado automaticamente a partir do e-mail usado no login. Exemplo: `marcos.silva@gmail.com` aparece como `Marcos Silva`.

## Banco de dados

O arquivo `database/init.sql` cria e popula:

- `usuarios`
- `pacientes`
- `medicos`
- `consultas`

O Docker Compose usa volume persistente chamado `clinicflow_pgdata`, evitando perda de dados apos reinicializacao.

## Variaveis de ambiente

O projeto possui `.env.example` e tambem um `.env` local de demonstracao.

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=clinicflow
POSTGRES_PORT=5432
BACKEND_PORT=5000
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:5000
```

Em um repositorio real, o `.env` nao deve ser versionado. Para a atividade, ele fica disponivel localmente para demonstrar a configuracao.

## Como executar com Docker Compose

```bash
docker compose up --build
```

Servicos:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Healthcheck: http://localhost:5000/health
- PostgreSQL: localhost:5432

Para parar:

```bash
docker compose down
ou
ctrl + C
```

Para parar apagando o volume:

```bash
docker compose down -v
```

## Como executar localmente

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Testes automatizados

```bash
cd backend
npm test
```

Testes implementados:

- `GET /health`
- `POST /login`
- `GET /consultas`
- `POST /pacientes`
- `PUT /pacientes/:id`
- `POST /medicos`
- `PUT /medicos/:id`
- `DELETE /medicos/:id`
- `POST /consultas` com validacao de data futura
- `POST /consultas` com bloqueio de conflito de horario
- `PUT /consultas/:id` para atualizar status
- `GET /devops/forcar-erro`

Ultima validacao local: 11 testes automatizados passaram com `npm test` no backend.

## Dockerfiles obrigatorios

O projeto possui dois Dockerfiles:

- `backend/Dockerfile`: cria a imagem da API Node.js.
- `frontend/Dockerfile`: roda o React/Vite em modo desenvolvimento com `npm run dev -- --host 0.0.0.0`.

## Docker Compose

O `docker-compose.yml` integra:

- `db`: PostgreSQL com volume persistente e healthcheck.
- `backend`: Express conectado ao banco pelo host interno `db`.
- `frontend`: React buildado e servido por Nginx.

Correcoes aplicadas:

- O backend nao usa `localhost` para acessar o banco dentro do container.
- O frontend recebe `VITE_API_URL`.
- O banco possui volume persistente.
- `depends_on` usa `condition: service_healthy`.
- Todos os servicos ficam na rede `clinicflow-network`.
- Containers possuem `restart: unless-stopped`.

## GitHub Actions

O arquivo `.github/workflows/ci.yml` executa:

1. Checkout do codigo.
2. Setup do Node.js 20.
3. Instalacao das dependencias do backend.
4. Testes do backend.
5. Build do backend.
6. Instalacao das dependencias do frontend.
7. Build do frontend.
8. Validacao do Docker Compose com `docker compose config`.
9. Build das imagens Docker.
10. Subida integrada de `db` e `backend`.
11. Smoke test em `http://localhost:5000/health`.
12. Encerramento dos containers.

## Falhas forcadas para demonstracao

O sistema possui endpoints e botoes para apresentar erros de forma controlada:

- `GET /devops/forcar-erro`: retorna erro 500 proposital.
- Botao "Forcar erro 500": mostra tratamento de falha no frontend.
- Botao "Forcar validacao": tenta criar consulta sem dados obrigatorios e recebe erro 400.
- Botao "Testar banco": verifica se o banco esta respondendo.

Esses erros ajudam a demonstrar diagnostico, logs, resiliencia e validacao durante a apresentacao.

## Problemas resolvidos

- Frontend sem login: criado `frontend/src/pages/Login.jsx`.
- Login restrito demais: alterado para permitir qualquer e-mail que contenha `.com`.
- Nome do usuario ausente no menu: agora o sistema gera o nome a partir do e-mail de acesso.
- Botao Sair sem acao: agora remove a sessao e volta ao login.
- Botao Excluir sem confirmacao: agora confirma, chama a API e remove da tela.
- Consultas sem fluxo de status: agora possuem acoes de confirmar, concluir e cancelar.
- Agendamento permitia dados inconsistentes: agora valida data futura e conflito de horario por medico.
- Pacientes apenas listados: agora podem ser cadastrados pelo frontend e salvos no banco.
- Botao de cadastro de paciente parecia abrir a mesma pagina: agora abre uma tela dedicada com visual parecido com o login.
- Pacientes cadastrados nao podiam ser editados: agora cada card possui botao Editar, abrindo a tela dedicada com os dados preenchidos.
- Nova consulta ainda usava seletor/lista de paciente: agora o paciente e digitado por nome em um campo de texto puro.
- Falta de banco: criado `database/init.sql`.
- Falta de Docker integrado: criado `docker-compose.yml` com frontend, backend e PostgreSQL.
- Falta de CI/CD: criado workflow GitHub Actions com testes, builds e validacao Docker.
- Falta de falhas simuladas: criado DevOps Lab para erros 500, 400 e teste de banco.
- Risco de senhas no codigo: variaveis movidas para `.env`.

## Etapas realizadas

1. Criacao da estrutura de pastas do projeto.
2. Criacao do backend com Express.
3. Criacao das rotas principais da API.
4. Criacao do banco PostgreSQL via `database/init.sql`.
5. Criacao do frontend React com layout administrativo.
6. Criacao da tela de login baseada no exemplo da aula.
7. Implementacao dos botoes funcionais.
8. Criacao dos Dockerfiles.
9. Criacao do Docker Compose.
10. Criacao dos testes com Jest e Supertest.
11. Criacao do workflow GitHub Actions.
12. Validacao com `npm test` e `npm run build`.
13. Implementacao do CRUD de medicos.
14. Melhoria do agendamento com paciente digitado, validacao de data e conflito de horario.
15. Implementacao de status das consultas: confirmar, concluir e cancelar.
16. Criacao de pagina dedicada para cadastro de paciente.
17. Implementacao da edicao de pacientes pela mesma pagina de cadastro.
18. Refatoracao leve removendo imports e estilos nao utilizados.

## Commits sugeridos

Use estes commits para organizar a entrega:

```bash
git add .
git commit -m "chore: estrutura inicial do ClinicFlow"

git add .
git commit -m "feat: cria backend express com rotas de consultas"

git add .
git commit -m "feat: adiciona banco postgres com script inicial"

git add . 
git commit -m "feat: cria frontend react com dashboard hospitalar"

git add .
git commit -m "feat: adiciona login e botoes funcionais"

git add .
git commit -m "chore: integra docker compose e github actions"

git add .
git commit -m "test: adiciona testes automatizados da api"

git add .
git commit -m "docs: documenta execucao problemas e correcoes"

git add .
git commit -m "feat: aprimorar gestao de pacientes medicos e consultas"

git add ClinicFlow/README.md
git commit -m "docs: atualiza readme com melhorias finais"
```


## Melhorias finais implementadas

- Campo de paciente em nova consulta alterado para texto puro, removendo o seletor antigo.
- Cadastro de paciente movido para uma tela dedicada no estilo do login.
- Edicao de pacientes cadastrados pela mesma tela de cadastro, com formulario preenchido automaticamente.
- CRUD de medicos implementado no frontend, backend e mock de testes.
- Consultas agora possuem acoes de status: confirmar, concluir e cancelar.
- Agendamento valida data futura e impede conflito de horario para o mesmo medico.
- Refatoracao leve removendo imports e estilos que nao eram mais utilizados.

Validacoes feitas apos as melhorias:

```bash
cd backend
npm test
npm run build

cd ../frontend
npm run build

docker compose up -d --build
```

Resultado da validacao: backend com 11 testes passando, builds do backend/frontend sem erro e Docker Compose subindo com banco e backend saudaveis.

## Comandos uteis para apresentacao

```bash
docker compose up --build
docker ps
docker compose logs backend
docker compose logs db
docker compose down
```

```bash
cd backend
npm test
```

```bash
cd frontend
npm run build
```

## Resultado esperado

Ao executar `docker compose up --build`, o sistema deve subir:

- Frontend funcionando em modo dev pelo Vite dentro do Docker.
- Backend funcionando.
- PostgreSQL persistente.
- Login disponivel.
- Consultas listadas.
- Nova consulta com paciente digitado por nome.
- Edicao de pacientes funcionando pela tela dedicada.
- CRUD de medicos funcionando.
- Atualizacao de status das consultas funcionando.
- Exclusao de consultas funcionando.
- Falhas controladas disponiveis no DevOps Lab.
- Pipeline GitHub Actions pronto para validar testes, builds e Docker.



