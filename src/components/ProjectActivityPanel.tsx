import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { NotificacaoChat } from "../services/appServices";

type Historico = {
  id: number;
  episodio_id: number;
  descricao: string;
  tipo: string;
  usuario: string | null;
  criado_em: string;
};

type Props = {
  projetoId: number;
  notificacoes: NotificacaoChat[];
  onAbrirEpisodio: (episodioId?: number | null) => void;
  onAbrirNotificacao: (notificacao: NotificacaoChat) => void;
};

export default function ProjectActivityPanel({
  projetoId,
  notificacoes,
  onAbrirEpisodio,
  onAbrirNotificacao,
}: Props) {
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const atualizar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    const { data, error } = await supabase
      .from("episodio_historico")
      .select("id,episodio_id,descricao,tipo,usuario,criado_em")
      .eq("projeto_id", projetoId)
      .order("criado_em", { ascending: false })
      .limit(100);
    setCarregando(false);
    if (error) {
      setErro("Não foi possível carregar o histórico real deste projeto.");
      return;
    }
    setHistorico((data || []) as Historico[]);
  }, [projetoId]);

  useEffect(() => { void atualizar(); }, [atualizar]);

  const eventos = useMemo(() => {
    const avisos = notificacoes
      .filter((n) => Number(n.projeto_id) === projetoId)
      .map((n) => ({
        chave: "n-" + n.id,
        data: n.created_at,
        titulo: n.titulo,
        descricao: n.texto_preview,
        autor: n.autor_nome || "DubWorks",
        episodioId: n.episodio_id,
        notificacao: n as NotificacaoChat | null,
      }));
    const alteracoes = historico.map((h) => ({
      chave: "h-" + h.id,
      data: h.criado_em,
      titulo: "Histórico do episódio",
      descricao: h.descricao,
      autor: h.usuario || "Sistema",
      episodioId: h.episodio_id,
      notificacao: null as NotificacaoChat | null,
    }));
    return [...avisos, ...alteracoes]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 120);
  }, [historico, notificacoes, projetoId]);

  return (
    <section style={{ background: "rgba(11,17,34,.9)", border: "1px solid rgba(148,163,184,.2)", borderRadius: 16, padding: 18 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ color: "#f8fafc", margin: 0, fontSize: 20 }}>🔔 Atividade e notificações do projeto</h2>
          <p style={{ color: "#94a3b8", margin: "6px 0 0", fontSize: 13 }}>Entregas recebidas e alterações reais dos episódios; sem registros fictícios.</p>
        </div>
        <button type="button" onClick={() => void atualizar()} disabled={carregando}
          style={{ cursor: "pointer", background: "#18233b", color: "#e2e8f0", border: "1px solid #34435e", borderRadius: 10, padding: "10px 14px" }}>
          {carregando ? "Atualizando..." : "↻ Atualizar atividade"}
        </button>
      </div>
      {erro && <p role="alert" style={{ color: "#fda4af" }}>{erro}</p>}
      <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
        {eventos.map((evento) => (
          <div key={evento.chave} style={{ background: "rgba(2,6,23,.5)", border: "1px solid rgba(148,163,184,.13)", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
              <strong style={{ color: evento.notificacao && !evento.notificacao.lida ? "#a5b4fc" : "#f8fafc" }}>{evento.titulo}</strong>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>{evento.data ? new Date(evento.data).toLocaleString("pt-BR") : ""}</span>
            </div>
            <p style={{ color: "#cbd5e1", margin: "8px 0" }}>{evento.descricao}</p>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>{evento.autor}</span>
              {evento.episodioId && (
                <button type="button" onClick={() => evento.notificacao ? onAbrirNotificacao(evento.notificacao) : onAbrirEpisodio(evento.episodioId)}
                  style={{ cursor: "pointer", background: "transparent", color: "#93c5fd", border: 0, padding: 0, fontSize: 12 }}>
                  Abrir episódio
                </button>
              )}
            </div>
          </div>
        ))}
        {!carregando && !eventos.length && <p style={{ color: "#94a3b8" }}>Nenhuma atividade registrada para este projeto.</p>}
      </div>
    </section>
  );
}
