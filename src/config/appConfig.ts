import type { ChavePermissao } from "../types";

export const LOGO_URL = "/Logo_dubworks.png";
export const FORMS_COPIER_URL =
  "https://script.google.com/macros/s/AKfycbwdbYEQydYzSH3mKPc_sWagVmrSPFbNJIWRoAq2oLprtwjGHDioiD0CBQknZVL2sAsW/exec";

export const permissoesDisponiveis: { chave: ChavePermissao; label: string }[] = [
  { chave: "acesso_projetos", label: "Projetos" },
  { chave: "acesso_membros", label: "Membros" },
  { chave: "acesso_usuarios", label: "Usuários" },
  { chave: "acesso_relatorios_projetos", label: "Relatório de projetos" },
  { chave: "acesso_relatorios_elenco", label: "Relatório de elenco" },
  { chave: "acesso_relatorios_membros", label: "Relatório de membros" },
  { chave: "acesso_relatorios_entrada_saida", label: "Entrada e saída" },
  { chave: "acesso_exportacoes", label: "Exportações" },
  { chave: "acesso_treinamentos", label: "Treinamentos" },
];

export const estilos = {
  azul: "#38bdf8",
  azulEscuro: "#dbeafe",
  azulClaro: "rgba(56, 189, 248, 0.14)",
  borda: "rgba(148, 163, 184, 0.24)",
  texto: "#f8fafc",
  textoSuave: "#cbd5e1",
  fundo: "#050816",
  branco: "rgba(15, 23, 42, 0.94)",
};
