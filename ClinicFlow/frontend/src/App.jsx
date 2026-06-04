import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UsersRound
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import Login from "./pages/Login";

const fallbackPacientes = [
  { id: 1, nome: "Mariana Alves" },
  { id: 2, nome: "Carlos Henrique" },
  { id: 3, nome: "Beatriz Lima" }
];

const fallbackMedicos = [
  { id: 1, nome: "Dra. Helena Duarte", especialidade: "Cardiologia", sala: "A-12" },
  { id: 2, nome: "Dr. Rafael Nogueira", especialidade: "Clinica Geral", sala: "B-04" },
  { id: 3, nome: "Dra. Sofia Martins", especialidade: "Pediatria", sala: "C-02" }
];

const fallbackConsultas = [
  {
    id: 1,
    paciente: "Mariana Alves",
    medico: "Dra. Helena Duarte",
    especialidade: "Cardiologia",
    data_hora: new Date(Date.now() + 86400000).toISOString(),
    status: "agendada"
  },
  {
    id: 2,
    paciente: "Carlos Henrique",
    medico: "Dr. Rafael Nogueira",
    especialidade: "Clinica Geral",
    data_hora: new Date(Date.now() + 172800000).toISOString(),
    status: "confirmada"
  }
];

function isValidCPF(cpf) {
  if (!cpf) return false;
  const s = cpf.replace(/\D/g, "");
  if (s.length !== 11) return false;
  if (/^(\d)\1+$/.test(s)) return false;
  const calc = (t) => {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += Number(s.charAt(i)) * (t + 1 - i);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(9) === Number(s.charAt(9)) && calc(10) === Number(s.charAt(10));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function App() {
  const [sessao, setSessao] = useState(() => {
    const saved = localStorage.getItem("clinicflow-session");
    return saved ? JSON.parse(saved) : null;
  });
  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState(fallbackPacientes);
  const [medicos, setMedicos] = useState(fallbackMedicos);
  const [statusApi, setStatusApi] = useState("verificando");
  const [busca, setBusca] = useState("");
  const [devopsLog, setDevopsLog] = useState("Aguardando teste de falha.");
  const [excluindoId, setExcluindoId] = useState(null);

  // ← campo paciente_nome substitui paciente_id + paciente_text
  const [form, setForm] = useState({
    paciente_nome: "",
    medico_id: "1",
    data_hora: "",
    observacoes: ""
  });

  const [feedback, setFeedback] = useState("");
  const [pacienteForm, setPacienteForm] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    email: "",
    nascimento: ""
  });
  const [pacienteFeedback, setPacienteFeedback] = useState("");
  const [paginaPaciente, setPaginaPaciente] = useState("lista");

  async function carregarDados() {
    try {
      await api.health();
      const [consultasData, pacientesData, medicosData] = await Promise.all([
        api.listarConsultas(),
        api.listarPacientes(),
        api.listarMedicos()
      ]);

      setConsultas(consultasData);
      setPacientes(pacientesData);
      setMedicos(medicosData);
      setStatusApi("online");
    } catch (error) {
      setConsultas(fallbackConsultas);
      setStatusApi("demo");
    }
  }

  useEffect(() => {
    if (sessao) {
      carregarDados();
    }
  }, [sessao]);

  const consultasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase();
    return consultas.filter((consulta) =>
      [consulta.paciente, consulta.medico, consulta.especialidade, consulta.status]
        .join(" ")
        .toLowerCase()
        .includes(termo)
    );
  }, [busca, consultas]);

  const metricas = useMemo(() => {
    const agendadas = consultas.filter((item) => item.status === "agendada").length;
    const confirmadas = consultas.filter((item) => item.status === "confirmada").length;
    return {
      total: consultas.length,
      agendadas,
      confirmadas,
      medicos: medicos.length
    };
  }, [consultas, medicos]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback("");

    if (!form.paciente_nome.trim()) {
      setFeedback("Informe o nome do paciente.");
      return;
    }

    if (!form.data_hora) {
      setFeedback("Informe data e horário da consulta.");
      return;
    }

    const medico = medicos.find((item) => Number(item.id) === Number(form.medico_id));

    try {
      const novaConsulta = await api.criarConsulta({
        paciente_nome: form.paciente_nome,
        medico_id: Number(form.medico_id),
        data_hora: form.data_hora,
        observacoes: form.observacoes
      });

      setConsultas((current) => [
        ...current,
        {
          ...novaConsulta,
          paciente: novaConsulta.paciente || form.paciente_nome,
          medico: novaConsulta.medico || medico?.nome,
          especialidade: novaConsulta.especialidade || medico?.especialidade
        }
      ]);
      setFeedback("Consulta agendada com sucesso.");
    } catch (error) {
      const demoConsulta = {
        id: Date.now(),
        paciente: form.paciente_nome,
        medico: medico?.nome,
        especialidade: medico?.especialidade,
        data_hora: form.data_hora,
        status: "agendada",
        observacoes: form.observacoes
      };
      setConsultas((current) => [...current, demoConsulta]);
      setFeedback("Consulta adicionada em modo demonstração.");
    }

    setForm((current) => ({
      ...current,
      paciente_nome: "",
      data_hora: "",
      observacoes: ""
    }));
  }

  function handleLogin(novaSessao) {
    localStorage.setItem("clinicflow-session", JSON.stringify(novaSessao));
    setSessao(novaSessao);
  }

  function handleLogout() {
    localStorage.removeItem("clinicflow-session");
    setSessao(null);
    setConsultas([]);
    setFeedback("");
  }

  async function cancelarConsulta(id) {
    const confirmar = window.confirm("Deseja excluir esta consulta marcada?");
    if (!confirmar) return;

    setExcluindoId(id);

    try {
      await api.cancelarConsulta(id);
      setConsultas((current) => current.filter((consulta) => consulta.id !== id));
      setFeedback("Consulta excluída com sucesso.");
    } catch (error) {
      setConsultas((current) => current.filter((consulta) => consulta.id !== id));
      setFeedback("Consulta removida localmente em modo demonstração.");
    } finally {
      setExcluindoId(null);
    }
  }

  async function handlePacienteSubmit(event) {
    event.preventDefault();
    setPacienteFeedback("");

    if (!pacienteForm.nome || !pacienteForm.cpf || !pacienteForm.telefone) {
      setPacienteFeedback("Preencha nome, CPF e telefone do paciente.");
      return;
    }

    if (!isValidCPF(pacienteForm.cpf)) {
      setPacienteFeedback("CPF inválido. Verifique o número do CPF.");
      return;
    }

    try {
      const novoPaciente = await api.criarPaciente(pacienteForm);
      setPacientes((current) => [...current, novoPaciente]);
      setPacienteForm({ nome: "", cpf: "", telefone: "", email: "", nascimento: "" });
      setPacienteFeedback("Paciente cadastrado e salvo no banco de dados.");
      setPaginaPaciente("lista");
      window.location.hash = "pacientes";
    } catch (error) {
      if (statusApi === "demo") {
        const pacienteDemo = { id: Date.now(), ...pacienteForm };
        setPacientes((current) => [...current, pacienteDemo]);
        setPacienteForm({ nome: "", cpf: "", telefone: "", email: "", nascimento: "" });
        setPacienteFeedback("Paciente cadastrado localmente em modo demonstração.");
        setPaginaPaciente("lista");
        window.location.hash = "pacientes";
        return;
      }
      setPacienteFeedback(`Erro ao cadastrar paciente: ${error.message}`);
    }
  }

  function abrirCadastroPaciente() {
    setPacienteFeedback("");
    setPaginaPaciente("novo");
    window.location.hash = "novo-paciente";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function voltarParaPacientes() {
    setPaginaPaciente("lista");
    window.location.hash = "pacientes";
  }

  async function executarTesteDevops(tipo) {
    setDevopsLog("Executando teste...");
    try {
      if (tipo === "erro") {
        await api.forcarErro();
      }
      if (tipo === "validacao") {
        await api.criarConsulta({});
      }
      if (tipo === "banco") {
        const resultado = await api.verificarBanco();
        setDevopsLog(`Banco respondeu: ${resultado.database} / ${resultado.status}`);
        return;
      }
      setDevopsLog("Teste finalizado sem erro.");
    } catch (error) {
      setDevopsLog(`Erro capturado: ${error.message}`);
    }
  }

  if (!sessao) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <strong>ClinicFlow</strong>
            <span>Atendimento hospitalar</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navegacao principal">
          <a href="#dashboard" className="active"><LayoutDashboard size={18} /> Dashboard</a>
          <a href="#agenda"><CalendarClock size={18} /> Agenda</a>
          <a href="#medicos"><Stethoscope size={18} /> Medicos</a>
          <a href="#pacientes"><UsersRound size={18} /> Pacientes</a>
        </nav>

        <div className="operator-card">
          <ShieldCheck size={20} />
          <div>
            <strong>{sessao.usuario?.nome || "Admin logado"}</strong>
            <span>{sessao.usuario?.email || "admin@clinicflow.local"}</span>
          </div>
        </div>

        <button className="ghost-button" type="button" onClick={handleLogout}>
          <LogOut size={18} />
          Sair
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Central de operações</span>
            <h1>Agendamento de consultas</h1>
            <p>Controle consultas, médicos e pacientes em um painel integrado.</p>
          </div>
          <div className={`status-pill ${statusApi}`}>
            <span />
            {statusApi === "online" ? "API online" : statusApi === "demo" ? "Modo demo" : "Verificando API"}
          </div>
        </header>

        <section className="metrics-grid" id="dashboard">
          <article className="metric-card">
            <CalendarClock size={22} />
            <span>Total de consultas</span>
            <strong>{metricas.total}</strong>
          </article>
          <article className="metric-card">
            <Clock3 size={22} />
            <span>Agendadas</span>
            <strong>{metricas.agendadas}</strong>
          </article>
          <article className="metric-card">
            <CheckCircle2 size={22} />
            <span>Confirmadas</span>
            <strong>{metricas.confirmadas}</strong>
          </article>
          <article className="metric-card">
            <Stethoscope size={22} />
            <span>Médicos ativos</span>
            <strong>{metricas.medicos}</strong>
          </article>
        </section>

        <section className="workspace-grid">
          <form className="panel schedule-panel" onSubmit={handleSubmit}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">Nova consulta</span>
                <h2>Marcar atendimento</h2>
              </div>
              <Plus size={22} />
            </div>

            {/* ← campo de texto livre, sem resolução por ID */}
            <label>
              Paciente
              <input
                value={form.paciente_nome}
                onChange={(event) => setForm({ ...form, paciente_nome: event.target.value })}
                placeholder="Nome completo do paciente"
                autoComplete="off"
              />
            </label>

            <label>
              Médico
              <select
                value={form.medico_id}
                onChange={(event) => setForm({ ...form, medico_id: event.target.value })}
              >
                {medicos.map((medico) => (
                  <option key={medico.id} value={medico.id}>
                    {medico.nome} - {medico.especialidade}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Data e horário
              <input
                type="datetime-local"
                value={form.data_hora}
                onChange={(event) => setForm({ ...form, data_hora: event.target.value })}
              />
            </label>

            <label>
              Observações
              <textarea
                value={form.observacoes}
                onChange={(event) => setForm({ ...form, observacoes: event.target.value })}
                placeholder="Ex.: paciente deve chegar 20 minutos antes"
              />
            </label>

            <button className="primary-button" type="submit">
              <Plus size={18} />
              Agendar consulta
            </button>
            {feedback && <p className="feedback">{feedback}</p>}
          </form>

          <section className="panel agenda-panel" id="agenda">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Fila clínica</span>
                <h2>Consultas marcadas</h2>
              </div>
              <div className="search-box">
                <Search size={18} />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar"
                />
              </div>
            </div>

            <div className="appointment-list">
              {consultasFiltradas.length === 0 && (
                <p className="list-feedback">Nenhuma consulta encontrada.</p>
              )}
              {consultasFiltradas.map((consulta) => (
                <article className="appointment-card" key={consulta.id}>
                  <div className="appointment-time">
                    <strong>{formatDate(consulta.data_hora)}</strong>
                    <span className={`badge ${consulta.status}`}>{consulta.status}</span>
                  </div>
                  <div>
                    <h3>{consulta.paciente}</h3>
                    <p>{consulta.medico} - {consulta.especialidade}</p>
                  </div>
                  <button
                    className="icon-button danger"
                    type="button"
                    title="Cancelar consulta"
                    aria-label="Cancelar consulta"
                    disabled={excluindoId === consulta.id}
                    onClick={() => cancelarConsulta(consulta.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="devops-band">
          <div className="panel devops-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">DevOps Lab</span>
                <h2>Falhas controladas</h2>
              </div>
              <AlertTriangle size={22} />
            </div>

            <div className="devops-actions">
              <button className="secondary-button" type="button" onClick={() => executarTesteDevops("erro")}>
                <AlertTriangle size={18} />
                Forçar erro 500
              </button>
              <button className="secondary-button" type="button" onClick={() => executarTesteDevops("validacao")}>
                <ShieldCheck size={18} />
                Forçar validação
              </button>
              <button className="secondary-button" type="button" onClick={() => executarTesteDevops("banco")}>
                <DatabaseZap size={18} />
                Testar banco
              </button>
            </div>

            <p className="devops-log">{devopsLog}</p>
          </div>
        </section>

        <section className="doctor-band" id="medicos">
          <div>
            <span className="eyebrow">Equipe médica</span>
            <h2>Profissionais disponíveis</h2>
          </div>
          <div className="doctor-grid">
            {medicos.map((medico) => (
              <article className="doctor-card" key={medico.id}>
                <div className="avatar">{medico.nome.slice(0, 2)}</div>
                <strong>{medico.nome}</strong>
                <span>{medico.especialidade}</span>
                <small>Sala {medico.sala}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="patients-band" id="pacientes">
          {paginaPaciente === "lista" ? (
            <>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Pacientes</span>
                  <h2>Pacientes cadastrados</h2>
                </div>
                <button className="primary-button new-patient-button" type="button" onClick={abrirCadastroPaciente}>
                  <Plus size={18} />
                  Cadastro de novo paciente
                </button>
              </div>

              {pacienteFeedback && <p className="feedback list-feedback">{pacienteFeedback}</p>}

              <div className="doctor-grid patient-list">
                {pacientes.map((paciente) => (
                  <article className="doctor-card" key={paciente.id}>
                    <div className="avatar">{paciente.nome.slice(0, 2)}</div>
                    <strong>{paciente.nome}</strong>
                    <span>{paciente.email || "E-mail não informado"}</span>
                    <small>{paciente.telefone || "Telefone pendente"}</small>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Pacientes</span>
                  <h2>Cadastrar novo paciente</h2>
                </div>
                <button className="secondary-button" type="button" onClick={voltarParaPacientes}>
                  <ArrowLeft size={18} />
                  Voltar para pacientes
                </button>
              </div>

              <form className="panel patient-form patient-form-page" onSubmit={handlePacienteSubmit}>
                <div className="panel-header">
                  <div>
                    <span className="eyebrow">Novo paciente</span>
                    <h2>Dados do paciente</h2>
                  </div>
                  <UsersRound size={22} />
                </div>

                <div className="patient-fields-grid">
                  <label>
                    Nome completo
                    <input
                      value={pacienteForm.nome}
                      onChange={(event) => setPacienteForm({ ...pacienteForm, nome: event.target.value })}
                      placeholder="Ex.: Ana Clara Souza"
                    />
                  </label>

                  <label>
                    CPF
                    <input
                      value={pacienteForm.cpf}
                      onChange={(event) => setPacienteForm({ ...pacienteForm, cpf: event.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </label>

                  <label>
                    Telefone
                    <input
                      value={pacienteForm.telefone}
                      onChange={(event) => setPacienteForm({ ...pacienteForm, telefone: event.target.value })}
                      placeholder="(61) 99999-9999"
                    />
                  </label>

                  <label>
                    E-mail
                    <input
                      value={pacienteForm.email}
                      onChange={(event) => setPacienteForm({ ...pacienteForm, email: event.target.value })}
                      placeholder="paciente@email.com"
                      type="email"
                    />
                  </label>

                  <label>
                    Data de nascimento
                    <input
                      value={pacienteForm.nascimento}
                      onChange={(event) => setPacienteForm({ ...pacienteForm, nascimento: event.target.value })}
                      type="date"
                    />
                  </label>
                </div>

                <button className="primary-button" type="submit">
                  <Plus size={18} />
                  Salvar paciente no banco
                </button>
                {pacienteFeedback && <p className="feedback">{pacienteFeedback}</p>}
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;