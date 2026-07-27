import type { ElencoItem, Projeto } from "../types";

export const projetoVazio: Projeto = {
  ID: "",
  Projeto: "",
  Tipo: "Projeto",
  Genero: "",
  Prioridade: "P0",
  Dupla: "",
  Lider: "",
  Telefone_Lider: "",
  Editor: "",
  Telefone_Editor: "",
  Status: "Planejamento",
  Data_Inicio: "",
  Video_Editor_Link: "",
  Registro_Semanal: "",
  Observacoes: "",
  Capa_URL: "",
  Drive_Pasta_Link: "",
  Drive_Videos_Link: "",
  Drive_Cortes_Link: "",
  Drive_Final_Link: "",
  Arquivado: false,
  Elenco: [],
};

export const elencoVazio: ElencoItem = {
  id: "",
  personagem: "",
  dublador: "",
  funcao: "",
};

