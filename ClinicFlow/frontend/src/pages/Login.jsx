import { LockKeyhole, LogIn, ShieldCheck } from "lucide-react";
import React, { useState } from "react";
import { api } from "../api";

function criarNomePorEmail(email) {
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
    .join(" ") || "Usuario ClinicFlow";
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleEntrar = async (event) => {
    event.preventDefault();
    setErro("");
    setCarregando(true);

    const emailNormalizado = email.trim().toLowerCase();

    if (!emailNormalizado.includes(".com")) {
      setErro("Para acessar, use um e-mail que contenha o final .com.");
      setCarregando(false);
      return;
    }

    try {
      const sessao = await api.login({ email: emailNormalizado, senha });
      onLogin(sessao);
    } catch (error) {
      onLogin({
        token: "clinicflow-demo-token",
        usuario: { nome: criarNomePorEmail(emailNormalizado), email: emailNormalizado, perfil: "admin" }
      });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="brand login-brand">
          <div>
            <strong>ClinicFlow</strong>
            <span>Atendimento hospitalar</span>
          </div>
        </div>

        <div>
          <span className="eyebrow">Acesso administrativo</span>
          <h1>Entre para gerenciar consultas</h1>
          <p>Controle pacientes, medicos, horarios e simulações DevOps em uma unica central.</p>
        </div>

        <div className="login-proof">
          <ShieldCheck size={20} />
          <span>Ambiente com Docker, PostgreSQL e GitHub Actions</span>
        </div>
      </section>

      <form className="login-card" onSubmit={handleEntrar}>
        <div className="panel-header">
          <div>
            <span className="eyebrow">Login</span>
            <h2>Credenciais do sistema</h2>
          </div>
          <LockKeyhole size={22} />
        </div>

        <label>
          E-mail
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>

        <label>
          Senha
          <input
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            placeholder="Opcional nesta demonstracao"
            type="password"
          />
        </label>

        <button className="primary-button" type="submit" disabled={carregando}>
          <LogIn size={18} />
          {carregando ? "Entrando..." : "Entrar"}
        </button>

        {erro && <p className="feedback danger-text">{erro}</p>}
        <p className="login-hint">Qualquer e-mail com .com pode acessar. O nome exibido vem do e-mail.</p>
      </form>
    </main>
  );
}

export default Login;

