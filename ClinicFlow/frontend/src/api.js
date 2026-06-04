const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3500);

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    signal: controller.signal,
    ...options
  }).finally(() => window.clearTimeout(timeout));

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Erro ao comunicar com a API");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
 
export const api = {
  login: (payload) => request("/login", { method: "POST", body: JSON.stringify(payload) }),
  health: () => request("/health"),
  listarConsultas: () => request("/consultas"),
  criarConsulta: (payload) => request("/consultas", { method: "POST", body: JSON.stringify(payload) }),
  atualizarConsulta: (id, payload) => request(`/consultas/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  cancelarConsulta: (id) => request(`/consultas/${id}`, { method: "DELETE" }),
  listarMedicos: () => request("/medicos"),
  criarMedico: (payload) => request("/medicos", { method: "POST", body: JSON.stringify(payload) }),
  atualizarMedico: (id, payload) => request(`/medicos/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  removerMedico: (id) => request(`/medicos/${id}`, { method: "DELETE" }),
  listarPacientes: () => request("/pacientes"),
  criarPaciente: (payload) => request("/pacientes", { method: "POST", body: JSON.stringify(payload) }),
  atualizarPaciente: (id, payload) => request(`/pacientes/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  forcarErro: () => request("/devops/forcar-erro"),
  verificarBanco: () => request("/devops/banco")
};

