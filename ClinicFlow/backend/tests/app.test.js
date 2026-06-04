process.env.USE_MOCK_DB = "true";

const request = require("supertest");
const app = require("../src/app");

function dataFutura(dias = 7) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  data.setHours(10, 0, 0, 0);
  return data.toISOString();
}

describe("ClinicFlow API", () => {
  it("responde o healthcheck", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("lista consultas cadastradas", async () => {
    const response = await request(app).get("/consultas");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty("paciente");
    expect(response.body[0]).toHaveProperty("medico");
  });

  it("realiza login com credenciais validas", async () => {
    const response = await request(app)
      .post("/login")
      .send({ email: "marcos.silva@gmail.com", senha: "qualquer-senha" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(response.body.usuario.email).toBe("marcos.silva@gmail.com");
    expect(response.body.usuario.nome).toBe("Marcos Silva");
  });

  it("bloqueia login sem .com no e-mail", async () => {
    const response = await request(app)
      .post("/login")
      .send({ email: "aluno@faculdade.edu", senha: "123" });

    expect(response.status).toBe(401);
  });

  it("cadastra paciente", async () => {
    const response = await request(app)
      .post("/pacientes")
      .send({
        nome: "Ana Clara Souza",
        cpf: "999.888.777-66",
        telefone: "(61) 99999-9999",
        email: "ana.clara@email.com",
        nascimento: "1998-05-10"
      });

    expect(response.status).toBe(201);
    expect(response.body.nome).toBe("Ana Clara Souza");
    expect(response.body).toHaveProperty("id");
  });

  it("edita paciente cadastrado", async () => {
    const cpf = `777.666.${Date.now().toString().slice(-3)}-55`;

    const criado = await request(app)
      .post("/pacientes")
      .send({
        nome: "Paciente Para Editar",
        cpf,
        telefone: "(61) 98888-0000",
        email: "editar@email.com",
        nascimento: "1995-03-20"
      });

    expect(criado.status).toBe(201);

    const editado = await request(app)
      .put(`/pacientes/${criado.body.id}`)
      .send({
        nome: "Paciente Editado",
        cpf,
        telefone: "(61) 97777-1111",
        email: "editado@email.com",
        nascimento: "1995-03-20"
      });

    expect(editado.status).toBe(200);
    expect(editado.body.nome).toBe("Paciente Editado");
    expect(editado.body.telefone).toBe("(61) 97777-1111");
  });
  it("cadastra, edita e desativa medico", async () => {
    const crm = `CRM-TESTE-${Date.now()}`;

    const criado = await request(app)
      .post("/medicos")
      .send({
        nome: "Dra. Paula Martins",
        especialidade: "Ortopedia",
        crm,
        sala: "D-08"
      });

    expect(criado.status).toBe(201);
    expect(criado.body.nome).toBe("Dra. Paula Martins");
    expect(criado.body.ativo).toBe(true);

    const editado = await request(app)
      .put(`/medicos/${criado.body.id}`)
      .send({
        nome: "Dra. Paula Martins",
        especialidade: "Ortopedia e Trauma",
        crm,
        sala: "D-09",
        ativo: true
      });

    expect(editado.status).toBe(200);
    expect(editado.body.especialidade).toBe("Ortopedia e Trauma");
    expect(editado.body.sala).toBe("D-09");

    const removido = await request(app).delete(`/medicos/${criado.body.id}`);

    expect(removido.status).toBe(204);

    const medicos = await request(app).get("/medicos");
    expect(medicos.body.some((medico) => medico.id === criado.body.id)).toBe(false);
  });

  it("bloqueia agendamento com data passada", async () => {
    const response = await request(app)
      .post("/consultas")
      .send({
        paciente_id: 1,
        medico_id: 1,
        data_hora: "2020-01-01T10:00:00.000Z",
        observacoes: "Nao deve agendar no passado"
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("futura");
  });

  it("bloqueia conflito de horario para o mesmo medico", async () => {
    const horario = dataFutura(12);

    const primeira = await request(app)
      .post("/consultas")
      .send({
        paciente_id: 1,
        medico_id: 1,
        data_hora: horario,
        observacoes: "Consulta valida"
      });

    expect(primeira.status).toBe(201);

    const conflito = await request(app)
      .post("/consultas")
      .send({
        paciente_id: 2,
        medico_id: 1,
        data_hora: horario,
        observacoes: "Conflito proposital"
      });

    expect(conflito.status).toBe(409);
    expect(conflito.body.message).toContain("horario");
  });

  it("atualiza status da consulta", async () => {
    const consulta = await request(app)
      .post("/consultas")
      .send({
        paciente_id: 2,
        medico_id: 2,
        data_hora: dataFutura(15),
        observacoes: "Consulta para teste de status"
      });

    expect(consulta.status).toBe(201);

    const confirmada = await request(app)
      .put(`/consultas/${consulta.body.id}`)
      .send({ status: "confirmada" });

    expect(confirmada.status).toBe(200);
    expect(confirmada.body.status).toBe("confirmada");

    const concluida = await request(app)
      .put(`/consultas/${consulta.body.id}`)
      .send({ status: "concluida" });

    expect(concluida.status).toBe(200);
    expect(concluida.body.status).toBe("concluida");
  });

  it("forca erro para demonstracao DevOps", async () => {
    const response = await request(app).get("/devops/forcar-erro");

    expect(response.status).toBe(500);
    expect(response.body.message).toContain("Erro forcado");
  });
});


