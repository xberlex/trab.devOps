require("dotenv").config();

const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const db = require("./db");
const mockStore = require("./mockStore");

const app = express();
const useMock = process.env.USE_MOCK_DB === "true";

function criarNomePorEmail(email) {
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
    .join(" ") || "Usuario ClinicFlow";
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
      return res.json(mockStore.medicos);
    }

    const result = await db.query("SELECT * FROM medicos WHERE ativo = true ORDER BY nome");
    return res.json(result.rows);
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

    if (useMock) {
      return res.status(201).json(mockStore.criarConsulta({ paciente_id, medico_id, data_hora, observacoes }));
    }

    const result = await db.query(
      `INSERT INTO consultas (paciente_id, medico_id, data_hora, observacoes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [paciente_id, medico_id, data_hora, observacoes || ""]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

app.put("/consultas/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paciente_id, medico_id, data_hora, status, observacoes } = req.body;

    if (useMock) {
      return res.json(mockStore.atualizarConsulta(id, { paciente_id, medico_id, data_hora, status, observacoes }));
    }

    const result = await db.query(
      `UPDATE consultas
       SET paciente_id = COALESCE($1, paciente_id),
           medico_id = COALESCE($2, medico_id),
           data_hora = COALESCE($3, data_hora),
           status = COALESCE($4, status),
           observacoes = COALESCE($5, observacoes)
       WHERE id = $6
       RETURNING *`,
      [paciente_id, medico_id, data_hora, status, observacoes, id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Consulta nao encontrada" });
    }

    return res.json(result.rows[0]);
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

