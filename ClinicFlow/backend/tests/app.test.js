const request = require("supertest");
const app = require("../src/app");

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
  it("forca erro para demonstracao DevOps", async () => {
    const response = await request(app).get("/devops/forcar-erro");

    expect(response.status).toBe(500);
    expect(response.body.message).toContain("Erro forcado");
  });
});

