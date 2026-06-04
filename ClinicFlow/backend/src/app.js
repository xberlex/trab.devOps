require("dotenv").config();

const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const db = require("./db");
const mockStore = require("./mockStore");

const app = express();
const useMock = process.env.USE_MOCK_DB === "true";
const CONSULTA_STATUS = ["agendada", "confirmada", "cancelada", "concluida"];

function criarNomePorEmail(email) {
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
    .join(" ") || "Usuario ClinicFlow";
}

function validarDataConsulta(dataHora) {
  const data = new Date(dataHora);
  if (Number.isNaN(data.getTime())) {
    return "Data e horario invalidos";
  }
  if (data.getTime() <= Date.now()) {
    return "A consulta deve ser marcada para uma data futura";
  }
  return null;
}

async function buscarConsultaPorId(id) {
  const result = await db.query(
    `SELECT
       c.id,
       c.paciente_id,
       c.medico_id,
       c.data_hora,
       c.status,
       c.observacoes,
       p.nome AS paciente,
       m.nome AS medico,
       m.especialidade
     FROM consultas c
     JOIN pacientes p ON p.id = c.paciente_id
     JOIN medicos m ON m.id = c.medico_id
     WHERE c.id = $1`,
    [id]
  );
  return result.rows[0];
}

async function existeConflitoConsulta(medicoId, dataHora, consultaId = null) {
  const params = [medicoId, dataHora];
  let filtroId = "";

  if (consultaId) {
    params.push(consultaId);
    filtroId = "AND id <> $3";
  }

  const result = await db.query(
    `SELECT id FROM consultas
     WHERE medico_id = $1
       AND data_hora = $2
       AND status IN ('agendada', 'confirmada')
       ${filtroId}
     LIMIT 1`,
    params
  );

  return result.rowCount > 0;
}

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", async (_req, res) => {
  try {
    if (!useMock) {
      await db.query("SELECT 1");
    }

    res.json({
      status: "ok",
      service: "clinicflow-backend",
      database: useMock ? "mock" : "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      service: "clinicflow-backend",
      database: "unavailable",
      message: error.message
    });
  }
});

app.post("/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  if (email.includes(".com")) {
    return res.json({
      token: "clinicflow-demo-token",
      usuario: { nome: criarNomePorEmail(email), email, perfil: "admin" }
    });
  }

  return res.status(401).json({ message: "Use um e-mail que contenha .com para acessar" });
});

app.get("/devops/forcar-erro", (_req, res) => {
  return res.status(500).json({
    message: "Erro forcado para demonstracao DevOps",
    objetivo: "Mostrar diagnostico, logs, pipeline e tratamento de falhas"
  });
});

app.get("/devops/banco", async (_req, res) => {
  try {
    if (useMock) {
      return res.json({ status: "ok", database: "mock", message: "Banco simulado ativo para testes" });
    }

    const result = await db.query("SELECT NOW() AS agora");
    return res.json({ status: "ok", database: "postgres", agora: result.rows[0].agora });
  } catch (error) {
    return res.status(503).json({ status: "error", database: "unavailable", message: error.message });
  }
});

app.get("/medicos", async (_req, res, next) => {
  try {
    if (useMock) {
      return res.json(mockStore.medicos.filter((medico) => medico.ativo));
    }

    const result = await db.query("SELECT * FROM medicos WHERE ativo = true ORDER BY nome");
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

app.post("/medicos", async (req, res, next) => {
  try {
    const { nome, especialidade, crm, sala } = req.body;

    if (!nome || !especialidade || !crm || !sala) {
      return res.status(400).json({ message: "Nome, especialidade, CRM e sala sao obrigatorios" });
    }

    const medico = {
      nome: String(nome).trim(),
      especialidade: String(especialidade).trim(),
      crm: String(crm).trim(),
      sala: String(sala).trim()
    };

    if (useMock) {
      return res.status(201).json(mockStore.criarMedico(medico));
    }

    const result = await db.query(
      `INSERT INTO medicos (nome, especialidade, crm, sala)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [medico.nome, medico.especialidade, medico.crm, medico.sala]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "CRM ja cadastrado" });
    }
    return next(error);
  }
});

app.put("/medicos/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, especialidade, crm, sala, ativo } = req.body;

    if (useMock) {
      const medico = mockStore.atualizarMedico(id, { nome, especialidade, crm, sala, ativo });
      return medico ? res.json(medico) : res.status(404).json({ message: "Medico nao encontrado" });
    }

    const result = await db.query(
      `UPDATE medicos
       SET nome = COALESCE($1, nome),
           especialidade = COALESCE($2, especialidade),
           crm = COALESCE($3, crm),
           sala = COALESCE($4, sala),
           ativo = COALESCE($5, ativo)
       WHERE id = $6
       RETURNING *`,
      [nome, especialidade, crm, sala, ativo, id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Medico nao encontrado" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "CRM ja cadastrado" });
    }
    return next(error);
  }
});

app.delete("/medicos/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (useMock) {
      const medico = mockStore.atualizarMedico(id, { ativo: false });
      return medico ? res.status(204).send() : res.status(404).json({ message: "Medico nao encontrado" });
    }

    const result = await db.query("UPDATE medicos SET ativo = false WHERE id = $1 RETURNING id", [id]);

    if (!result.rowCount) {
      return res.status(404).json({ message: "Medico nao encontrado" });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get("/pacientes", async (_req, res, next) => {
  try {
    if (useMock) {
      return res.json(mockStore.pacientes);
    }

    const result = await db.query("SELECT * FROM pacientes ORDER BY nome");
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

app.post("/pacientes", async (req, res, next) => {
  try {
    const { nome, cpf, telefone, email, nascimento } = req.body;

    if (!nome || !cpf || !telefone) {
      return res.status(400).json({ message: "Nome, CPF e telefone sao obrigatorios" });
    }

    const paciente = {
      nome: String(nome).trim(),
      cpf: String(cpf).trim(),
      telefone: String(telefone).trim(),
      email: email ? String(email).trim() : null,
      nascimento: nascimento || null
    };

    if (useMock) {
      return res.status(201).json(mockStore.criarPaciente(paciente));
    }

    const result = await db.query(
      `INSERT INTO pacientes (nome, cpf, telefone, email, nascimento)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [paciente.nome, paciente.cpf, paciente.telefone, paciente.email, paciente.nascimento]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "CPF ja cadastrado" });
    }

    return next(error);
  }
});

app.put("/pacientes/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, cpf, telefone, email, nascimento } = req.body;

    if (!nome || !cpf || !telefone) {
      return res.status(400).json({ message: "Nome, CPF e telefone sao obrigatorios" });
    }

    const paciente = {
      nome: String(nome).trim(),
      cpf: String(cpf).trim(),
      telefone: String(telefone).trim(),
      email: email ? String(email).trim() : null,
      nascimento: nascimento || null
    };

    if (useMock) {
      const atualizado = mockStore.atualizarPaciente(id, paciente);
      return atualizado ? res.json(atualizado) : res.status(404).json({ message: "Paciente nao encontrado" });
    }

    const result = await db.query(
      `UPDATE pacientes
       SET nome = $1,
           cpf = $2,
           telefone = $3,
           email = $4,
           nascimento = $5
       WHERE id = $6
       RETURNING *`,
      [paciente.nome, paciente.cpf, paciente.telefone, paciente.email, paciente.nascimento, id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Paciente nao encontrado" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "CPF ja cadastrado" });
    }

    return next(error);
  }
});
app.get("/consultas", async (_req, res, next) => {
  try {
    if (useMock) {
      return res.json(mockStore.listarConsultas());
    }

    const result = await db.query(`
      SELECT
        c.id,
        c.paciente_id,
        c.medico_id,
        c.data_hora,
        c.status,
        c.observacoes,
        p.nome AS paciente,
        m.nome AS medico,
        m.especialidade
      FROM consultas c
      JOIN pacientes p ON p.id = c.paciente_id
      JOIN medicos m ON m.id = c.medico_id
      ORDER BY c.data_hora ASC
    `);

    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

app.post("/consultas", async (req, res, next) => {
  try {
    const { paciente_id, medico_id, data_hora, observacoes } = req.body;

    if (!paciente_id || !medico_id || !data_hora) {
      return res.status(400).json({ message: "Paciente, medico e data/hora sao obrigatorios" });
    }

    const erroData = validarDataConsulta(data_hora);
    if (erroData) {
      return res.status(400).json({ message: erroData });
    }

    if (useMock) {
      const conflito = mockStore.existeConflitoConsulta(medico_id, data_hora);
      if (conflito) {
        return res.status(409).json({ message: "Medico ja possui consulta neste horario" });
      }
      return res.status(201).json(mockStore.criarConsulta({ paciente_id, medico_id, data_hora, observacoes }));
    }

    const conflito = await existeConflitoConsulta(medico_id, data_hora);
    if (conflito) {
      return res.status(409).json({ message: "Medico ja possui consulta neste horario" });
    }

    const result = await db.query(
      `INSERT INTO consultas (paciente_id, medico_id, data_hora, observacoes)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [paciente_id, medico_id, data_hora, observacoes || ""]
    );

    return res.status(201).json(await buscarConsultaPorId(result.rows[0].id));
  } catch (error) {
    return next(error);
  }
});

app.put("/consultas/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paciente_id, medico_id, data_hora, status, observacoes } = req.body;

    if (status && !CONSULTA_STATUS.includes(status)) {
      return res.status(400).json({ message: "Status de consulta invalido" });
    }

    if (data_hora) {
      const erroData = validarDataConsulta(data_hora);
      if (erroData) {
        return res.status(400).json({ message: erroData });
      }
    }

    if (useMock) {
      const atual = mockStore.buscarConsulta(id);
      if (!atual) {
        return res.status(404).json({ message: "Consulta nao encontrada" });
      }
      const medicoFinal = medico_id || atual.medico_id;
      const dataFinal = data_hora || atual.data_hora;
      if (data_hora || medico_id) {
        const conflito = mockStore.existeConflitoConsulta(medicoFinal, dataFinal, id);
        if (conflito) {
          return res.status(409).json({ message: "Medico ja possui consulta neste horario" });
        }
      }
      return res.json(mockStore.atualizarConsulta(id, { paciente_id, medico_id, data_hora, status, observacoes }));
    }

    if (data_hora || medico_id) {
      const atual = await buscarConsultaPorId(id);
      if (!atual) {
        return res.status(404).json({ message: "Consulta nao encontrada" });
      }
      const conflito = await existeConflitoConsulta(medico_id || atual.medico_id, data_hora || atual.data_hora, id);
      if (conflito) {
        return res.status(409).json({ message: "Medico ja possui consulta neste horario" });
      }
    }

    const result = await db.query(
      `UPDATE consultas
       SET paciente_id = COALESCE($1, paciente_id),
           medico_id = COALESCE($2, medico_id),
           data_hora = COALESCE($3, data_hora),
           status = COALESCE($4, status),
           observacoes = COALESCE($5, observacoes)
       WHERE id = $6
       RETURNING id`,
      [paciente_id, medico_id, data_hora, status, observacoes, id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Consulta nao encontrada" });
    }

    return res.json(await buscarConsultaPorId(id));
  } catch (error) {
    return next(error);
  }
});

app.delete("/consultas/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (useMock) {
      const removed = mockStore.removerConsulta(id);
      return removed ? res.status(204).send() : res.status(404).json({ message: "Consulta nao encontrada" });
    }

    const result = await db.query("DELETE FROM consultas WHERE id = $1", [id]);

    if (!result.rowCount) {
      return res.status(404).json({ message: "Consulta nao encontrada" });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  res.status(500).json({
    message: "Erro interno no servidor",
    detail: process.env.NODE_ENV === "production" ? undefined : error.message
  });
});

module.exports = app;

