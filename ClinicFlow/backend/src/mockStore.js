const medicos = [
  { id: 1, nome: "Dra. Helena Duarte", especialidade: "Cardiologia", crm: "CRM-SP 102030", sala: "A-12", ativo: true },
  { id: 2, nome: "Dr. Rafael Nogueira", especialidade: "Clinica Geral", crm: "CRM-RJ 908070", sala: "B-04", ativo: true },
  { id: 3, nome: "Dra. Sofia Martins", especialidade: "Pediatria", crm: "CRM-MG 554433", sala: "C-02", ativo: true }
];

const pacientes = [
  { id: 1, nome: "Mariana Alves", cpf: "111.222.333-44", telefone: "(11) 98888-1001", email: "mariana@email.com" },
  { id: 2, nome: "Carlos Henrique", cpf: "222.333.444-55", telefone: "(21) 97777-2002", email: "carlos@email.com" },
  { id: 3, nome: "Beatriz Lima", cpf: "333.444.555-66", telefone: "(31) 96666-3003", email: "beatriz@email.com" }
];

let consultas = [
  {
    id: 1,
    paciente_id: 1,
    medico_id: 1,
    data_hora: new Date(Date.now() + 86400000).toISOString(),
    status: "agendada",
    observacoes: "Consulta inicial"
  },
  {
    id: 2,
    paciente_id: 2,
    medico_id: 2,
    data_hora: new Date(Date.now() + 172800000).toISOString(),
    status: "confirmada",
    observacoes: "Retorno com exames"
  }
];

function withNames(consulta) {
  const paciente = pacientes.find((item) => item.id === Number(consulta.paciente_id));
  const medico = medicos.find((item) => item.id === Number(consulta.medico_id));

  return {
    ...consulta,
    paciente: paciente?.nome || "Paciente nao encontrado",
    medico: medico?.nome || "Medico nao encontrado",
    especialidade: medico?.especialidade || ""
  };
}

module.exports = {
  medicos,
  pacientes,
  criarPaciente: (payload) => {
    const paciente = {
      id: pacientes.length ? Math.max(...pacientes.map((item) => item.id)) + 1 : 1,
      ...payload
    };
    pacientes.push(paciente);
    return paciente;
  },
  atualizarPaciente: (id, payload) => {
    const index = pacientes.findIndex((item) => item.id === Number(id));
    if (index < 0) return null;
    pacientes[index] = { ...pacientes[index], ...payload };
    return pacientes[index];
  },
  criarMedico: (payload) => {
    const medico = {
      id: medicos.length ? Math.max(...medicos.map((item) => item.id)) + 1 : 1,
      ativo: true,
      ...payload 
    };
    medicos.push(medico);
    return medico;
  },
  atualizarMedico: (id, payload) => {
    const index = medicos.findIndex((item) => item.id === Number(id));
    if (index < 0) return null;
    medicos[index] = { ...medicos[index], ...payload };
    return medicos[index];
  },
  listarConsultas: () => consultas.map(withNames),
  buscarConsulta: (id) => consultas.find((item) => item.id === Number(id)),
  existeConflitoConsulta: (medicoId, dataHora, consultaId = null) => consultas.some((item) =>
    item.medico_id === Number(medicoId) &&
    new Date(item.data_hora).getTime() === new Date(dataHora).getTime() &&
    ["agendada", "confirmada"].includes(item.status) &&
    (!consultaId || item.id !== Number(consultaId))
  ),
  criarConsulta: (payload) => {
    const consulta = {
      id: consultas.length ? Math.max(...consultas.map((item) => item.id)) + 1 : 1,
      status: "agendada",
      observacoes: "",
      ...payload,
      paciente_id: Number(payload.paciente_id),
      medico_id: Number(payload.medico_id)
    };
    consultas.push(consulta);
    return withNames(consulta);
  },
  atualizarConsulta: (id, payload) => {
    const index = consultas.findIndex((item) => item.id === Number(id));
    if (index < 0) return null;
    consultas[index] = { ...consultas[index], ...payload };
    return withNames(consultas[index]);
  },
  removerConsulta: (id) => {
    const antes = consultas.length;
    consultas = consultas.filter((item) => item.id !== Number(id));
    return antes !== consultas.length;
  }
};

