import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Edit3,
  LayoutDashboard,
  LogOut,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UsersRound,
  X
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import Login from "./pages/Login";

const fallbackPacientes = [
  { id: 1, nome: "Mariana Alves", cpf: "111.222.333-44", telefone: "(11) 98888-1001", email: "mariana@email.com" },
  { id: 2, nome: "Carlos Henrique", cpf: "222.333.444-55", telefone: "(21) 97777-2002", email: "carlos@email.com" },
  { id: 3, nome: "Beatriz Lima", cpf: "333.444.555-66", telefone: "(31) 96666-3003", email: "beatriz@email.com" }
];

const fallbackMedicos = [
  { id: 1, nome: "Dra. Helena Duarte", especialidade: "Cardiologia", crm: "CRM-SP 102030", sala: "A-12", ativo: true },
  { id: 2, nome: "Dr. Rafael Nogueira", especialidade: "Clinica Geral", crm: "CRM-RJ 908070", sala: "B-04", ativo: true },
  { id: 3, nome: "Dra. Sofia Martins", especialidade: "Pediatria", crm: "CRM-MG 554433", sala: "C-02", ativo: true }
];

const fallbackConsultas = [
  {
    id: 1,
    paciente_id: 1,
    medico_id: 1,
    paciente: "Mariana Alves",
    medico: "Dra. Helena Duarte",
    especialidade: "Cardiologia",
    data_hora: new Date(Date.now() + 86400000).toISOString(),
    status: "agendada"
  },
  {
    id: 2,
    paciente_id: 2,
    medico_id: 2,
    paciente: "Carlos Henrique",
    medico: "Dr. Rafael Nogueira",
    especialidade: "Clinica Geral",
    data_hora: new Date(Date.now() + 172800000).toISOString(),
    status: "confirmada"
  }
];

const emptyPaciente = { nome: "", cpf: "", telefone: "", email: "", nascimento: "" };
const emptyMedico = { nome: "", especialidade: "", crm: "", sala: "" };

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function isFutureDate(value) {
  const data = new Date(value);
  return !Number.isNaN(data.getTime()) && data.getTime() > Date.now();
}

function normalizarTexto(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
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
  const [form, setForm] = useState({ paciente_nome: "", medico_id: "1", data_hora: "", observacoes: "" });
  const [feedback, setFeedback] = useState("");
  const [pacienteForm, setPacienteForm] = useState(emptyPaciente);
  const [pacienteFeedback, setPacienteFeedback] = useState("");
  const [pacienteEditandoId, setPacienteEditandoId] = useState(null);
  const [paginaPaciente, setPaginaPaciente] = useState(() => window.location.hash === "#novo-paciente" ? "novo" : "lista");
  const [medicoForm, setMedicoForm] = useState(emptyMedico);
  const [medicoEditandoId, setMedicoEditandoId] = useState(null);
  const [medicoFeedback, setMedicoFeedback] = useState("");

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
      if (medicosData[0]) setForm((current) => ({ ...current, medico_id: String(medicosData[0].id) }));
    } catch (error) {
      setConsultas(fallbackConsultas);
      setPacientes(fallbackPacientes);
      setMedicos(fallbackMedicos);
      setStatusApi("demo");
    }
  }

  useEffect(() => {
    if (sessao) carregarDados();
  }, [sessao]);

  useEffect(() => {
    const syncHash = () => {
      if (window.location.hash === "#novo-paciente") setPaginaPaciente("novo");
      if (window.location.hash === "#pacientes") setPaginaPaciente("lista");
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const consultasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase();
    return consultas.filter((consulta) =>
      [consulta.paciente, consulta.medico, consulta.especialidade, consulta.status].join(" ").toLowerCase().includes(termo)
    );
  }, [busca, consultas]);

  const metricas = useMemo(() => {
    const agendadas = consultas.filter((item) => item.status === "agendada").length;
    const confirmadas = consultas.filter((item) => item.status === "confirmada").length;
    return { total: consultas.length, agendadas, confirmadas, medicos: medicos.length };
  }, [consultas, medicos.length]);

  function existeConflitoLocal(medicoId, dataHora) {
    return consultas.some((consulta) =>
      Number(consulta.medico_id) === Number(medicoId) &&
      new Date(consulta.data_hora).getTime() === new Date(dataHora).getTime() &&
      ["agendada", "confirmada"].includes(consulta.status)
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback("");

    const pacienteDigitado = form.paciente_nome.trim();

    if (!pacienteDigitado || !form.medico_id || !form.data_hora) {
      setFeedback("Digite o nome do paciente, selecione o medico e informe a data/hora da consulta.");
      return;
    }

    if (!isFutureDate(form.data_hora)) {
      setFeedback("A consulta deve ser marcada para uma data futura.");
      return;
    }

    if (existeConflitoLocal(form.medico_id, form.data_hora)) {
      setFeedback("Este medico ja possui consulta nesse horario.");
      return;
    }

    const medico = medicos.find((item) => Number(item.id) === Number(form.medico_id));
    const pacienteExato = pacientes.find((item) => normalizarTexto(item.nome) === normalizarTexto(pacienteDigitado));
    const pacientesParecidos = pacientes.filter((item) => normalizarTexto(item.nome).includes(normalizarTexto(pacienteDigitado)));
    const paciente = pacienteExato || (pacientesParecidos.length === 1 ? pacientesParecidos[0] : null);

    if (!paciente) {
      setFeedback(pacientesParecidos.length > 1
        ? "Mais de um paciente encontrado. Digite o nome completo do paciente."
        : "Paciente nao encontrado. Cadastre o paciente antes de marcar a consulta.");
      return;
    }

    try {
      const novaConsulta = await api.criarConsulta({
        paciente_id: Number(paciente.id),
        medico_id: Number(form.medico_id),
        data_hora: form.data_hora,
        observacoes: form.observacoes
      });

      setConsultas((current) => [...current, {
        ...novaConsulta,
        paciente: novaConsulta.paciente || paciente?.nome,
        medico: novaConsulta.medico || medico?.nome,
        especialidade: novaConsulta.especialidade || medico?.especialidade
      }]);
      setFeedback("Consulta agendada com sucesso.");
    } catch (error) {
      setFeedback(`Erro ao agendar consulta: ${error.message}`);
      return;
    }

    setForm((current) => ({ ...current, data_hora: "", observacoes: "" }));
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

  async function atualizarStatusConsulta(id, status) {
    setFeedback("");
    try {
      const atualizada = await api.atualizarConsulta(id, { status });
      setConsultas((current) => current.map((consulta) => consulta.id === id ? { ...consulta, ...atualizada } : consulta));
      setFeedback(`Consulta ${status} com sucesso.`);
    } catch (error) {
      setConsultas((current) => current.map((consulta) => consulta.id === id ? { ...consulta, status } : consulta));
      setFeedback(`Consulta ${status} localmente em modo demonstracao.`);
    }
  }

  async function excluirConsulta(id) {
    const confirmar = window.confirm("Deseja excluir esta consulta marcada?");
    if (!confirmar) return;
    setExcluindoId(id);
    try {
      await api.cancelarConsulta(id);
      setFeedback("Consulta excluida com sucesso.");
    } catch (error) {
      setFeedback("Consulta removida localmente em modo demonstracao.");
    } finally {
      setExcluindoId(null);
    }
    setConsultas((current) => current.filter((consulta) => consulta.id !== id));
  }

  async function handlePacienteSubmit(event) {
    event.preventDefault();
    setPacienteFeedback("");

    if (!pacienteForm.nome || !pacienteForm.cpf || !pacienteForm.telefone) {
      setPacienteFeedback("Preencha nome, CPF e telefone do paciente.");
      return;
    }

    try {
      if (pacienteEditandoId) {
        const pacienteAtualizado = await api.atualizarPaciente(pacienteEditandoId, pacienteForm);
        setPacientes((current) => current.map((paciente) => paciente.id === pacienteEditandoId ? pacienteAtualizado : paciente));
        setForm((current) => ({ ...current, paciente_nome: pacienteAtualizado.nome }));
        setPacienteFeedback("Paciente atualizado e salvo no banco de dados.");
      } else {
        const novoPaciente = await api.criarPaciente(pacienteForm);
        setPacientes((current) => [...current, novoPaciente]);
        setForm((current) => ({ ...current, paciente_nome: novoPaciente.nome }));
        setPacienteFeedback("Paciente cadastrado e salvo no banco de dados.");
      }

      setPacienteEditandoId(null);
      setPacienteForm(emptyPaciente);
      setPaginaPaciente("lista");
      window.location.hash = "pacientes";
    } catch (error) {
      if (statusApi === "demo") {
        if (pacienteEditandoId) {
          const pacienteAtualizado = { id: pacienteEditandoId, ...pacienteForm };
          setPacientes((current) => current.map((paciente) => paciente.id === pacienteEditandoId ? pacienteAtualizado : paciente));
          setForm((current) => ({ ...current, paciente_nome: pacienteAtualizado.nome }));
          setPacienteFeedback("Paciente atualizado localmente em modo demonstracao.");
        } else {
          const pacienteDemo = { id: Date.now(), ...pacienteForm };
          setPacientes((current) => [...current, pacienteDemo]);
          setForm((current) => ({ ...current, paciente_nome: pacienteDemo.nome }));
          setPacienteFeedback("Paciente cadastrado localmente em modo demonstracao.");
        }

        setPacienteEditandoId(null);
        setPacienteForm(emptyPaciente);
        setPaginaPaciente("lista");
        window.location.hash = "pacientes";
        return;
      }
      setPacienteFeedback(`Erro ao salvar paciente: ${error.message}`);
    }
  }

  async function handleMedicoSubmit(event) {
    event.preventDefault();
    setMedicoFeedback("");

    if (!medicoForm.nome || !medicoForm.especialidade || !medicoForm.crm || !medicoForm.sala) {
      setMedicoFeedback("Preencha nome, especialidade, CRM e sala.");
      return;
    }

    try {
      if (medicoEditandoId) {
        const atualizado = await api.atualizarMedico(medicoEditandoId, medicoForm);
        setMedicos((current) => current.map((medico) => medico.id === medicoEditandoId ? atualizado : medico));
        setMedicoFeedback("Medico atualizado com sucesso.");
      } else {
        const novoMedico = await api.criarMedico(medicoForm);
        setMedicos((current) => [...current, novoMedico]);
        setMedicoFeedback("Medico cadastrado com sucesso.");
      }
    } catch (error) {
      if (statusApi === "demo") {
        if (medicoEditandoId) {
          setMedicos((current) => current.map((medico) => medico.id === medicoEditandoId ? { ...medico, ...medicoForm } : medico));
          setMedicoFeedback("Medico atualizado localmente em modo demonstracao.");
        } else {
          setMedicos((current) => [...current, { id: Date.now(), ativo: true, ...medicoForm }]);
          setMedicoFeedback("Medico cadastrado localmente em modo demonstracao.");
        }
      } else {
        setMedicoFeedback(`Erro ao salvar medico: ${error.message}`);
        return;
      }
    }

    setMedicoEditandoId(null);
    setMedicoForm(emptyMedico);
  }

  function editarMedico(medico) {
    setMedicoEditandoId(medico.id);
    setMedicoForm({ nome: medico.nome, especialidade: medico.especialidade, crm: medico.crm, sala: medico.sala });
    window.location.hash = "medicos";
  }

  async function desativarMedico(id) {
    const confirmar = window.confirm("Deseja desativar este medico?");
    if (!confirmar) return;
    try {
      await api.removerMedico(id);
      setMedicoFeedback("Medico desativado com sucesso.");
    } catch (error) {
      setMedicoFeedback("Medico desativado localmente em modo demonstracao.");
    }
    setMedicos((current) => current.filter((medico) => medico.id !== id));
  }

  function abrirCadastroPaciente() {
    setPacienteEditandoId(null);
    setPacienteForm(emptyPaciente);
    setPacienteFeedback("");
    setPaginaPaciente("novo");
    window.location.hash = "novo-paciente";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editarPaciente(paciente) {
    setPacienteEditandoId(paciente.id);
    setPacienteForm({
      nome: paciente.nome || "",
      cpf: paciente.cpf || "",
      telefone: paciente.telefone || "",
      email: paciente.email || "",
      nascimento: formatDateInput(paciente.nascimento)
    });
    setPacienteFeedback("");
    setPaginaPaciente("novo");
    window.location.hash = "editar-paciente";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function voltarParaPacientes() {
    setPacienteEditandoId(null);
    setPacienteForm(emptyPaciente);
    setPaginaPaciente("lista");
    window.location.hash = "pacientes";
  }

  async function executarTesteDevops(tipo) {
    setDevopsLog("Executando teste...");
    try {
      if (tipo === "erro") await api.forcarErro();
      if (tipo === "validacao") await api.criarConsulta({});
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

  if (!sessao) return <Login onLogin={handleLogin} />;

  const pacienteEmEdicao = Boolean(pacienteEditandoId);

  if (paginaPaciente === "novo") {
    return (
      <main className="login-page patient-register-page">
        <section className="login-hero patient-register-hero">
          <div className="brand login-brand">
            <div>
              <strong>ClinicFlow</strong>
              <span>Atendimento hospitalar</span>
            </div>
          </div>

          <div>
            <span className="eyebrow">{pacienteEmEdicao ? "Editar paciente" : "Novo paciente"}</span>
            <h1>{pacienteEmEdicao ? "Editar paciente" : "Cadastro de paciente"}</h1>
            <p>{pacienteEmEdicao ? "Atualize os dados do paciente mantendo o historico de consultas ligado ao cadastro." : "Registre os dados principais do paciente para liberar o agendamento de consultas no sistema."}</p>
          </div>

          <div className="patient-register-summary">
            <article>
              <UsersRound size={20} />
              <div><strong>{pacientes.length}</strong><span>pacientes cadastrados</span></div>
            </article>
            <article>
              <DatabaseZap size={20} />
              <div><strong>{statusApi === "online" ? "Banco" : "Demo"}</strong><span>{statusApi === "online" ? "PostgreSQL conectado" : "registro local ativo"}</span></div>
            </article>
          </div>
        </section>

        <form className="login-card patient-register-card" onSubmit={handlePacienteSubmit}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">Dados do paciente</span>
              <h2>{pacienteEmEdicao ? "Ficha em edicao" : "Ficha de cadastro"}</h2>
            </div>
            <UsersRound size={22} />
          </div>

          <label>Nome completo<input value={pacienteForm.nome} onChange={(event) => setPacienteForm({ ...pacienteForm, nome: event.target.value })} placeholder="Ex.: Ana Clara Souza" /></label>
          <div className="patient-fields-grid">
            <label>CPF<input value={pacienteForm.cpf} onChange={(event) => setPacienteForm({ ...pacienteForm, cpf: event.target.value })} placeholder="000.000.000-00" /></label>
            <label>Telefone<input value={pacienteForm.telefone} onChange={(event) => setPacienteForm({ ...pacienteForm, telefone: event.target.value })} placeholder="(61) 99999-9999" /></label>
            <label>E-mail<input value={pacienteForm.email} onChange={(event) => setPacienteForm({ ...pacienteForm, email: event.target.value })} placeholder="paciente@email.com" type="email" /></label>
            <label>Data de nascimento<input value={pacienteForm.nascimento} onChange={(event) => setPacienteForm({ ...pacienteForm, nascimento: event.target.value })} type="date" /></label>
          </div>

          <div className="patient-register-actions">
            <button className="secondary-button" type="button" onClick={voltarParaPacientes}><ArrowLeft size={18} />Voltar</button>
            <button className="primary-button" type="submit">{pacienteEmEdicao ? <Save size={18} /> : <Plus size={18} />}{pacienteEmEdicao ? "Salvar alteracoes" : "Salvar paciente no banco"}</button>
          </div>
          {pacienteFeedback && <p className="feedback">{pacienteFeedback}</p>}
        </form>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div><strong>ClinicFlow</strong><span>Atendimento hospitalar</span></div></div>
        <nav className="nav-list" aria-label="Navegacao principal">
          <a href="#dashboard" className="active"><LayoutDashboard size={18} /> Dashboard</a>
          <a href="#agenda"><CalendarClock size={18} /> Agenda</a>
          <a href="#medicos"><Stethoscope size={18} /> Medicos</a>
          <a href="#pacientes"><UsersRound size={18} /> Pacientes</a>
        </nav>
        <div className="operator-card"><ShieldCheck size={20} /><div><strong>{sessao.usuario?.nome || "Admin logado"}</strong><span>{sessao.usuario?.email}</span></div></div>
        <button className="ghost-button" type="button" onClick={handleLogout}><LogOut size={18} />Sair</button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div><span className="eyebrow">Central de operacoes</span><h1>Agendamento de consultas</h1><p>Controle consultas, medicos e pacientes em um painel integrado.</p></div>
          <div className={`status-pill ${statusApi}`}><span />{statusApi === "online" ? "API online" : statusApi === "demo" ? "Modo demo" : "Verificando API"}</div>
        </header>

        <section className="metrics-grid" id="dashboard">
          <article className="metric-card"><CalendarClock size={22} /><span>Total de consultas</span><strong>{metricas.total}</strong></article>
          <article className="metric-card"><Clock3 size={22} /><span>Agendadas</span><strong>{metricas.agendadas}</strong></article>
          <article className="metric-card"><CheckCircle2 size={22} /><span>Confirmadas</span><strong>{metricas.confirmadas}</strong></article>
          <article className="metric-card"><Stethoscope size={22} /><span>Medicos ativos</span><strong>{metricas.medicos}</strong></article>
        </section>

        <section className="workspace-grid">
          <form className="panel schedule-panel" onSubmit={handleSubmit}>
            <div className="panel-header"><div><span className="eyebrow">Nova consulta</span><h2>Marcar atendimento</h2></div><Plus size={22} /></div>
            <label>Paciente<input value={form.paciente_nome} onChange={(event) => setForm({ ...form, paciente_nome: event.target.value })} placeholder="Digite o nome do paciente" /></label>
            <label>Medico<select value={form.medico_id} onChange={(event) => setForm({ ...form, medico_id: event.target.value })}>{medicos.map((medico) => <option key={medico.id} value={medico.id}>{medico.nome} - {medico.especialidade}</option>)}</select></label>
            <label>Data e horario<input type="datetime-local" value={form.data_hora} onChange={(event) => setForm({ ...form, data_hora: event.target.value })} /></label>
            <label>Observacoes<textarea value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} placeholder="Ex.: paciente deve chegar 20 minutos antes" /></label>
            <button className="primary-button" type="submit"><Plus size={18} />Agendar consulta</button>
            {feedback && <p className="feedback">{feedback}</p>}
          </form>

          <section className="panel agenda-panel" id="agenda">
            <div className="panel-header"><div><span className="eyebrow">Fila clinica</span><h2>Consultas marcadas</h2></div><div className="search-box"><Search size={18} /><input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar" /></div></div>
            <div className="appointment-list">
              {consultasFiltradas.length === 0 && <p className="list-feedback">Nenhuma consulta encontrada.</p>}
              {consultasFiltradas.map((consulta) => (
                <article className="appointment-card" key={consulta.id}>
                  <div className="appointment-time"><strong>{formatDate(consulta.data_hora)}</strong><span className={`badge ${consulta.status}`}>{consulta.status}</span></div>
                  <div><h3>{consulta.paciente}</h3><p>{consulta.medico} - {consulta.especialidade}</p></div>
                  <div className="status-actions">
                    {consulta.status === "agendada" && <button className="secondary-button compact" type="button" onClick={() => atualizarStatusConsulta(consulta.id, "confirmada")}>Confirmar</button>}
                    {consulta.status !== "concluida" && consulta.status !== "cancelada" && <button className="secondary-button compact" type="button" onClick={() => atualizarStatusConsulta(consulta.id, "concluida")}>Concluir</button>}
                    {consulta.status !== "cancelada" && consulta.status !== "concluida" && <button className="secondary-button compact danger-text" type="button" onClick={() => atualizarStatusConsulta(consulta.id, "cancelada")}>Cancelar</button>}
                    <button className="icon-button danger" type="button" title="Excluir consulta" aria-label="Excluir consulta" disabled={excluindoId === consulta.id} onClick={() => excluirConsulta(consulta.id)}><Trash2 size={18} /></button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="devops-band">
          <div className="panel devops-panel">
            <div className="panel-header"><div><span className="eyebrow">DevOps Lab</span><h2>Falhas controladas</h2></div><AlertTriangle size={22} /></div>
            <div className="devops-actions">
              <button className="secondary-button" type="button" onClick={() => executarTesteDevops("erro")}><AlertTriangle size={18} />Forcar erro 500</button>
              <button className="secondary-button" type="button" onClick={() => executarTesteDevops("validacao")}><ShieldCheck size={18} />Forcar validacao</button>
              <button className="secondary-button" type="button" onClick={() => executarTesteDevops("banco")}><DatabaseZap size={18} />Testar banco</button>
            </div>
            <p className="devops-log">{devopsLog}</p>
          </div>
        </section>

        <section className="doctor-band" id="medicos">
          <div className="section-heading"><div><span className="eyebrow">Equipe medica</span><h2>Gestao de medicos</h2></div></div>
          <div className="doctor-management">
            <form className="panel doctor-form" onSubmit={handleMedicoSubmit}>
              <div className="panel-header"><div><span className="eyebrow">{medicoEditandoId ? "Editar medico" : "Novo medico"}</span><h2>Dados profissionais</h2></div><Stethoscope size={22} /></div>
              <label>Nome<input value={medicoForm.nome} onChange={(event) => setMedicoForm({ ...medicoForm, nome: event.target.value })} placeholder="Ex.: Dra. Ana Costa" /></label>
              <label>Especialidade<input value={medicoForm.especialidade} onChange={(event) => setMedicoForm({ ...medicoForm, especialidade: event.target.value })} placeholder="Ex.: Ortopedia" /></label>
              <label>CRM<input value={medicoForm.crm} onChange={(event) => setMedicoForm({ ...medicoForm, crm: event.target.value })} placeholder="CRM-DF 123456" /></label>
              <label>Sala<input value={medicoForm.sala} onChange={(event) => setMedicoForm({ ...medicoForm, sala: event.target.value })} placeholder="A-01" /></label>
              <button className="primary-button" type="submit">{medicoEditandoId ? <Save size={18} /> : <Plus size={18} />}{medicoEditandoId ? "Salvar medico" : "Cadastrar medico"}</button>
              {medicoEditandoId && <button className="secondary-button" type="button" onClick={() => { setMedicoEditandoId(null); setMedicoForm(emptyMedico); }}><X size={18} />Cancelar edicao</button>}
              {medicoFeedback && <p className="feedback">{medicoFeedback}</p>}
            </form>
            <div className="doctor-grid doctor-list">
              {medicos.map((medico) => (
                <article className="doctor-card" key={medico.id}>
                  <div className="avatar">{medico.nome.slice(0, 2)}</div><strong>{medico.nome}</strong><span>{medico.especialidade}</span><small>{medico.crm} | Sala {medico.sala}</small>
                  <div className="card-actions"><button className="secondary-button compact" type="button" onClick={() => editarMedico(medico)}><Edit3 size={16} />Editar</button><button className="secondary-button compact danger-text" type="button" onClick={() => desativarMedico(medico.id)}>Desativar</button></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="patients-band" id="pacientes">
          <div className="section-heading"><div><span className="eyebrow">Pacientes</span><h2>Pacientes cadastrados</h2></div><button className="primary-button new-patient-button" type="button" onClick={abrirCadastroPaciente}><Plus size={18} />Cadastro de novo paciente</button></div>
          {pacienteFeedback && <p className="feedback list-feedback">{pacienteFeedback}</p>}
          <div className="doctor-grid patient-list">{pacientes.map((paciente) => <article className="doctor-card" key={paciente.id}><div className="avatar">{paciente.nome.slice(0, 2)}</div><strong>{paciente.nome}</strong><span>{paciente.email || "E-mail nao informado"}</span><small>{paciente.telefone || "Telefone pendente"}</small><div className="card-actions"><button className="secondary-button compact" type="button" onClick={() => editarPaciente(paciente)}><Edit3 size={16} />Editar</button></div></article>)}</div>
        </section>
      </main>
    </div>
  );
}

export default App;





