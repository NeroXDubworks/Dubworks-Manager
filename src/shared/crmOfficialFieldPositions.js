// Posições dos campos AcroForm dos modelos oficiais DubWorks.
// Coordenadas em pontos A4 (origem no canto superior esquerdo):
// [índice da página, x, y, largura, altura].
// São somente as áreas de preenchimento; a diagramação vem do próprio PDF.
export const CAMPOS_MODELO = {
  proposta: {
    cliente: [0,61,545.9,226,30], projeto:[0,303,545.9,230,30],
    numero:[0,61,612.9,138,30], data:[0,213,612.9,144,30], validade:[0,371,612.9,162,30],
    objetivo:[1,59,288.9,477.3,55],
    etapa_1:[1,105,453.9,423,26], etapa_2:[1,105,544.9,423,26],
    etapa_3:[1,105,635.9,423,26],
    entregaveis:[1,43,715.9,326,30], revisoes:[1,381,715.9,171,30],
    item_1:[2,53,310.9,245,25], qtd_1:[2,306,310.9,54,25],
    unit_1:[2,369,310.9,84,25], subtotal_1:[2,462,310.9,80,25],
    item_2:[2,53,354.9,245,25], qtd_2:[2,306,354.9,54,25],
    unit_2:[2,369,354.9,84,25], subtotal_2:[2,462,354.9,80,25],
    item_3:[2,53,398.9,245,25], qtd_3:[2,306,398.9,54,25],
    unit_3:[2,369,398.9,84,25], subtotal_3:[2,462,398.9,80,25],
    total:[2,455,448.9,87,28],
    inicio:[2,57,554.9,147,29], entrega:[2,224,554.9,147,29],
    pagamento:[2,390,554.9,148,29],
    contato:[2,43,737.9,245,27], responsavel:[2,304,737.9,248,27],
  },
  contrato: {
    numero_contrato:[0,60,597.9,143,29], versao_contrato:[0,216,597.9,126,29],
    data_emissao:[0,356,597.9,180,29], status_contrato:[0,60,660.9,476,28],
    prestadora_razao:[1,57,277.9,315,27], prestadora_documento:[1,387,277.9,151,27],
    prestadora_endereco:[1,57,336.9,481,26], prestadora_representante:[1,57,391.9,262,26],
    prestadora_email:[1,331,391.9,207,26],
    cliente_razao:[1,57,501.9,315,27], cliente_documento:[1,387,501.9,151,27],
    cliente_endereco:[1,57,560.9,481,26], cliente_representante:[1,57,607.9,262,26],
    cliente_email:[1,331,607.9,207,26],
    anexo_nome_projeto:[7,43,293.9,312,29], anexo_proposta:[7,369,293.9,183,29],
    anexo_modalidade:[7,43,351.9,244,29], anexo_responsavel:[7,304,351.9,248,29],
    anexo_descricao:[7,43,418.9,509,78], anexo_entregas:[7,43,533.9,509,76],
    anexo_etapas:[7,43,645.9,509,74],
    anexo_preco:[8,43,253.9,200,28], anexo_parcelas:[8,257,253.9,295,28],
    anexo_despesas:[8,43,314.9,246,28], anexo_pagamento:[8,304,314.9,248,28],
    anexo_revisoes:[8,43,375.9,509,28],
    anexo_direitos:[8,43,438.9,509,57], anexo_creditos:[8,43,528.9,509,40],
    anexo_observacoes:[8,43,602.9,509,35], assinatura_local_data:[8,43,740.9,509,26],
  },
};
