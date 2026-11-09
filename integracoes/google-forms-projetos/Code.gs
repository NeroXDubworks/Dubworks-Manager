/**
 * DubWorks Manager — Apps Script EXCLUSIVO de Projetos / Drive / Forms.
 *
 * IMPORTANTE:
 * - Não substitui e não compartilha código com o Apps Script de Advertências.
 * - Perguntas de upload precisam existir nos formulários-modelo.
 * - Script Properties obrigatórias:
 *   DUBWORKS_TEMPLATE_SELECTION_ID
 *   DUBWORKS_TEMPLATE_DELIVERIES_ID
 *
 * Opcionais:
 *   DUBWORKS_SUPABASE_URL
 *   DUBWORKS_SUPABASE_PUBLISHABLE_KEY
 */

const DW_CFG = {
  VERSION: '2.0.0',
  SUPABASE_URL_PROP: 'DUBWORKS_SUPABASE_URL',
  SUPABASE_KEY_PROP: 'DUBWORKS_SUPABASE_PUBLISHABLE_KEY',
  TEMPLATE_SELECTION_PROP: 'DUBWORKS_TEMPLATE_SELECTION_ID',
  TEMPLATE_DELIVERIES_PROP: 'DUBWORKS_TEMPLATE_DELIVERIES_ID',
  FORM_REGISTRY_PREFIX: 'DUBWORKS_PROJECT_FORMS_',
  FORM_UPLOAD_TARGET_PREFIX: 'DUBWORKS_FORM_TARGET_',
  DEFAULT_SUPABASE_URL: 'https://omgjbafqukpzdhhpdlaa.supabase.co',
  DEFAULT_SUPABASE_KEY: 'sb_publishable_3bAOHbPjpV5RMnqb-cJKRA_cB1okqvT',
  DEFAULT_TEMPLATE_SELECTION_ID: '1puXgJ0e-es4NDlD_3MsfFhAFtHBjpr4j9JzxK1ydWPw',
  DEFAULT_TEMPLATE_DELIVERIES_ID: '1MQbh9HL63AMZT4hETQmkck5ltKVK2A6Pxx5GmZ3MWkk',
};

function doGet() {
  return json_({
    ok: true,
    service: 'DubWorks Project Forms',
    version: DW_CFG.VERSION,
  });
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    validarSessao_(payload.access_token);

    const action = String(payload.action || '').trim();

    switch (action) {
      case 'preparar_formularios_projeto':
        return json_(prepararFormulariosProjeto_(payload));

      case 'sincronizar_form_selecao':
        return json_(sincronizarFormulario_(payload, 'selecao'));

      case 'sincronizar_form_entregas':
        return json_(sincronizarFormulario_(payload, 'entregas'));

      case 'ler_respostas_selecao':
        return json_(lerRespostas_(payload, 'selecao'));

      case 'ler_respostas_entregas':
        return json_(lerRespostas_(payload, 'entregas'));

      case 'finalizar_projeto':
        return json_(finalizarProjeto_(payload));

      case 'ping':
        return json_({
          ok: true,
          service: 'DubWorks Project Forms',
          version: DW_CFG.VERSION,
        });

      default:
        throw new Error('Ação inválida.');
    }
  } catch (err) {
    return json_({
      ok: false,
      error: String(err && err.message ? err.message : err),
    });
  }
}

function prepararFormulariosProjeto_(payload) {
  const projectName = limparNomeProjeto_(payload.projectName || payload.projetoNome);
  const respostasSelecaoFolderId = extrairId_(
    payload.respostasSelecaoFolderId
  );
  const entregasFolderId = extrairId_(payload.entregasFolderId);
  const personagensSelecao = normalizarLista_(
    payload.personagensSelecao ||
      payload.personagens ||
      payload.characters ||
      payload.selectionCharacters ||
      []
  );
  const personagensEntregas = normalizarLista_(
    payload.personagensEntregas ||
      payload.deliveryCharacters ||
      payload.elenco &&
        payload.elenco.map(function (item) { return item.personagem; }) ||
      personagensSelecao
  );
  const episodios = normalizarLista_(payload.episodios || []);
  const capaUrl = String(payload.capaUrl || payload.coverUrl || '').trim();

  if (!projectName) throw new Error('Nome do projeto não informado.');
  if (!respostasSelecaoFolderId) {
    throw new Error('Pasta [Seleção] Respostas não informada.');
  }
  if (!entregasFolderId) {
    throw new Error('Pasta [Projeto] Entregas não informada.');
  }
  if (!personagensEntregas.length) {
    throw new Error('O Banco do Projeto está vazio; o formulário de Entregas não pode ser sincronizado.');
  }

  const props = PropertiesService.getScriptProperties();
  const templateSelectionId = extrairId_(
    props.getProperty(DW_CFG.TEMPLATE_SELECTION_PROP) ||
      DW_CFG.DEFAULT_TEMPLATE_SELECTION_ID
  );
  const templateDeliveriesId = extrairId_(
    props.getProperty(DW_CFG.TEMPLATE_DELIVERIES_PROP) ||
      DW_CFG.DEFAULT_TEMPLATE_DELIVERIES_ID
  );

  if (!templateSelectionId) {
    throw new Error(
      'Template de Seleção não configurado em DUBWORKS_TEMPLATE_SELECTION_ID.'
    );
  }
  if (!templateDeliveriesId) {
    throw new Error(
      'Template de Entregas não configurado em DUBWORKS_TEMPLATE_DELIVERIES_ID.'
    );
  }

  const pastaSelecaoRespostas = DriveApp.getFolderById(
    respostasSelecaoFolderId
  );
  const pastaEntregas = DriveApp.getFolderById(entregasFolderId);

  // A pasta Seleção (Testes) permanece totalmente manual.
  const selecao = obterOuCriarFormulario_({
    tipo: 'selecao',
    projectName: projectName,
    projectKey: String(payload.projectId || projectName),
    templateId: templateSelectionId,
    pasta: pastaSelecaoRespostas,
    existingId:
      payload.existingSelectionFormId ||
      payload.formSelecaoId ||
      payload.formSelecao ||
      '',
  });

  prepararFormulario_(selecao.form, {
    tipo: 'selecao',
    projectName: projectName,
    personagens: personagensSelecao.length
      ? personagensSelecao
      : ['Seleção encerrada'],
    capaUrl: capaUrl,
  });
  selecao.form.setAcceptingResponses(Boolean(personagensSelecao.length));

  const selecaoSheet = garantirPlanilhaRespostas_(
    selecao.form,
    '[Seleção] - ' + projectName + ' - Respostas',
    pastaSelecaoRespostas
  );

  garantirLocalizacaoFormulario_(
    selecao.form,
    pastaSelecaoRespostas,
    selecaoSheet
  );

  registrarDestinoUpload_(
    selecao.form,
    pastaSelecaoRespostas,
    'selecao',
    projectName
  );

  const entregas = obterOuCriarFormulario_({
    tipo: 'entregas',
    projectName: projectName,
    projectKey: String(payload.projectId || projectName),
    templateId: templateDeliveriesId,
    pasta: pastaEntregas,
    existingId:
      payload.existingDeliveriesFormId ||
      payload.formEntregasId ||
      payload.formEntregas ||
      '',
  });

  prepararFormulario_(entregas.form, {
    tipo: 'entregas',
    projectName: projectName,
    personagens: personagensEntregas,
    capaUrl: capaUrl,
  });
  atualizarEpisodiosEntregas_(entregas.form, episodios);

  const entregasSheet = garantirPlanilhaRespostas_(
    entregas.form,
    '[Entregas] - ' + projectName + ' - Respostas',
    pastaEntregas
  );

  garantirLocalizacaoFormulario_(
    entregas.form,
    pastaEntregas,
    entregasSheet
  );

  registrarDestinoUpload_(
    entregas.form,
    pastaEntregas,
    'entregas',
    projectName
  );

  salvarRegistroFormularios_(
    String(payload.projectId || projectName),
    selecao.form.getId(),
    entregas.form.getId()
  );

  return {
    ok: true,
    projectName: projectName,
    personagens: personagensSelecao,
    personagensEntregas: personagensEntregas,
    episodios: episodios,
    formSelecao: infoFormulario_(selecao.form),
    formEntregas: infoFormulario_(entregas.form),
    planilhaSelecao: infoPlanilha_(selecaoSheet),
    planilhaEntregas: infoPlanilha_(entregasSheet),
    reused: {
      selecao: selecao.reused,
      entregas: entregas.reused,
    },
  };
}

function obterOuCriarFormulario_(opts) {
  const props = PropertiesService.getScriptProperties();
  const registro = lerRegistroFormularios_(opts.projectKey);
  let existingId = extrairId_(opts.existingId);

  if (!existingId) {
    existingId = extrairId_(
      opts.tipo === 'selecao' ? registro.selecao : registro.entregas
    );
  }

  if (existingId) {
    try {
      const form = FormApp.openById(existingId);
      moverArquivoParaPasta_(existingId, opts.pasta);
      form.setTitle(tituloFormulario_(opts.tipo, opts.projectName));
      return { form: form, reused: true };
    } catch (err) {
      console.warn(
        'Formulário registrado não pôde ser aberto; será recriado: ' + err
      );
    }
  }

  const templateFile = DriveApp.getFileById(opts.templateId);
  const titulo = tituloFormulario_(opts.tipo, opts.projectName);
  const copia = templateFile.makeCopy(titulo, opts.pasta);
  const form = FormApp.openById(copia.getId());

  try {
    form.removeDestination();
  } catch (_) {}

  form.setTitle(titulo);
  return { form: form, reused: false };
}

function prepararFormulario_(form, opts) {
  form.setTitle(tituloFormulario_(opts.tipo, opts.projectName));

  atualizarPersonagens_(form, opts.personagens);
  removerCamposLinkObsoletos_(form, opts.tipo);
  garantirUploadTemplate_(form, opts.tipo);

  if (opts.capaUrl) {
    aplicarCapa_(form, opts.capaUrl);
  }
}

function tituloFormulario_(tipo, projectName) {
  return (
    (tipo === 'selecao' ? '[Seleção] - ' : '[Entregas] - ') +
    limparNomeProjeto_(projectName)
  );
}

function atualizarPersonagens_(form, personagens) {
  if (!Array.isArray(personagens) || !personagens.length) {
    throw new Error(
      'Lista de personagens vazia. O Forms não será preenchido com “A definir”.'
    );
  }

  const aliases = [
    'personagem',
    'personagens',
    'personagem desejado',
    'escolha o personagem',
  ];

  const items = form.getItems();
  let atualizado = false;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const titulo = normalizarTexto_(item.getTitle());

    if (aliases.indexOf(titulo) === -1) continue;

    if (item.getType() === FormApp.ItemType.LIST) {
      item.asListItem().setChoiceValues(personagens).setRequired(true);
      atualizado = true;
      break;
    }

    if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
      item
        .asMultipleChoiceItem()
        .setChoiceValues(personagens)
        .setRequired(true);
      atualizado = true;
      break;
    }

    if (item.getType() === FormApp.ItemType.CHECKBOX) {
      item.asCheckboxItem().setChoiceValues(personagens).setRequired(true);
      atualizado = true;
      break;
    }
  }

  if (!atualizado) {
    form
      .addListItem()
      .setTitle('Personagem')
      .setChoiceValues(personagens)
      .setRequired(true);
  }
}

function atualizarEpisodiosEntregas_(form, episodios) {
  if (!Array.isArray(episodios) || !episodios.length) return;

  const aliases = ['episódio', 'episodio', 'episódio / corte', 'episodio / corte'];
  const items = form.getItems();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (aliases.indexOf(normalizarTexto_(item.getTitle())) === -1) continue;

    if (item.getType() === FormApp.ItemType.LIST) {
      item.asListItem().setChoiceValues(episodios).setRequired(true);
      return;
    }

    if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
      item.asMultipleChoiceItem().setChoiceValues(episodios).setRequired(true);
      return;
    }
  }

  form
    .addListItem()
    .setTitle('Episódio')
    .setChoiceValues(episodios)
    .setRequired(true);
}

function garantirUploadTemplate_(form, tipo) {
  const items = form.getItems();
  const uploadItems = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const tipoItem = String(item.getType() || '').toUpperCase();
    if (tipoItem.indexOf('FILE_UPLOAD') !== -1 || tipoItem.indexOf('UPLOAD') !== -1) {
      uploadItems.push(item);
    }
  }

  if (!uploadItems.length) {
    throw new Error(
      'O formulário-modelo de ' +
        (tipo === 'selecao' ? 'Seleção' : 'Entregas') +
        ' não possui pergunta de Upload de arquivo. O Google não permite criar essa pergunta do zero pelo Apps Script; adicione-a uma vez no template.'
    );
  }

  const upload = uploadItems[0];
  const titulo =
    tipo === 'selecao' ? 'Upload do teste' : 'Upload da entrega';

  try {
    const itemUpload = upload.asFileUploadItem();
    itemUpload.setTitle(titulo);
    itemUpload.setRequired(true);
  } catch (err) {
    // Compatibilidade: algumas versões do Forms Service expõem o item,
    // mas não o cast completo. O upload existente continua válido.
    try {
      if (typeof upload.setTitle === 'function') {
        upload.setTitle(titulo);
      }
    } catch (_) {}
    console.warn('Upload localizado, mas não foi possível renomeá-lo: ' + err);
  }
}

function removerCamposLinkObsoletos_(form, tipo) {
  const aliases =
    tipo === 'selecao'
      ? ['link do teste', 'link do áudio', 'link do audio', 'link do vídeo', 'link do video']
      : [
          'link do vídeo / arquivo',
          'link do video / arquivo',
          'link da entrega',
          'link do arquivo',
        ];

  const normalizados = aliases.map(normalizarTexto_);
  const items = form.getItems();

  for (let i = items.length - 1; i >= 0; i--) {
    const titulo = normalizarTexto_(items[i].getTitle());
    if (normalizados.indexOf(titulo) !== -1) {
      form.deleteItem(items[i]);
    }
  }
}

function aplicarCapa_(form, capaUrl) {
  try {
    const items = form.getItems(FormApp.ItemType.IMAGE);

    for (let i = items.length - 1; i >= 0; i--) {
      if (normalizarTexto_(items[i].getTitle()) === 'capa do projeto') {
        form.deleteItem(items[i]);
      }
    }

    const response = UrlFetchApp.fetch(capaUrl, {
      muteHttpExceptions: true,
      followRedirects: true,
    });

    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
      console.warn(
        'Não foi possível baixar a capa. HTTP ' + response.getResponseCode()
      );
      return;
    }

    const image = form
      .addImageItem()
      .setTitle('Capa do projeto')
      .setImage(response.getBlob());

    try {
      form.moveItem(image.getIndex(), 0);
    } catch (err) {
      console.warn('Capa adicionada, mas não foi possível movê-la para o topo: ' + err);
    }
  } catch (err) {
    console.warn('Não foi possível aplicar a capa no Forms: ' + err);
  }
}

function garantirPlanilhaRespostas_(form, titulo, pasta) {
  const destinationId = extrairId_(form.getDestinationId());

  if (destinationId) {
    try {
      const ss = SpreadsheetApp.openById(destinationId);
      ss.rename(titulo);
      moverArquivoParaPasta_(ss.getId(), pasta);
      return ss;
    } catch (err) {
      console.warn('Destino anterior não pôde ser reutilizado: ' + err);
    }
  }

  const ss = SpreadsheetApp.create(titulo);
  moverArquivoParaPasta_(ss.getId(), pasta);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  return ss;
}

function registrarDestinoUpload_(form, pasta, tipo, projectName) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(
    DW_CFG.FORM_UPLOAD_TARGET_PREFIX + form.getId(),
    JSON.stringify({
      folderId: pasta.getId(),
      tipo: tipo,
      projectName: projectName,
    })
  );

  instalarTrigger_(form);
}

function instalarTrigger_(form) {
  const formId = form.getId();
  const triggers = ScriptApp.getProjectTriggers();
  const jaExiste = triggers.some(function (trigger) {
    try {
      return (
        trigger.getHandlerFunction() === 'onProjectFormSubmit_' &&
        trigger.getTriggerSourceId &&
        trigger.getTriggerSourceId() === formId
      );
    } catch (_) {
      return false;
    }
  });

  if (!jaExiste) {
    ScriptApp.newTrigger('onProjectFormSubmit_')
      .forForm(form)
      .onFormSubmit()
      .create();
  }
}

function onProjectFormSubmit_(e) {
  try {
    const formId = e && e.source ? e.source.getId() : '';
    if (!formId) return;

    const props = PropertiesService.getScriptProperties();
    const raw = props.getProperty(DW_CFG.FORM_UPLOAD_TARGET_PREFIX + formId);
    if (!raw) return;

    const config = JSON.parse(raw);
    const destino = DriveApp.getFolderById(config.folderId);
    const responses =
      e && e.response && e.response.getItemResponses
        ? e.response.getItemResponses()
        : [];

    const idsArquivos = [];

    responses.forEach(function (itemResponse) {
      const item = itemResponse.getItem();
      const tipoItem = String(item.getType() || '').toUpperCase();
      if (tipoItem.indexOf('FILE_UPLOAD') === -1 && tipoItem.indexOf('UPLOAD') === -1) {
        return;
      }

      const resposta = itemResponse.getResponse();
      const lista = Array.isArray(resposta) ? resposta : [resposta];

      lista.forEach(function (valor) {
        const id = extrairId_(valor);
        if (id) idsArquivos.push(id);
      });
    });

    idsArquivos.forEach(function (fileId) {
      try {
        const file = DriveApp.getFileById(fileId);
        const pais = file.getParents();

        if (pais.hasNext()) {
          const pastaUpload = pais.next();

          if (pastaUpload.getId() !== destino.getId()) {
            try {
              pastaUpload.moveTo(destino);
              return;
            } catch (err) {
              console.warn('Não foi possível mover a pasta automática de upload: ' + err);
            }
          }
        }

        // Fallback seguro: pelo menos o arquivo enviado fica na pasta oficial.
        try {
          file.moveTo(destino);
        } catch (err) {
          console.warn('Não foi possível mover o arquivo de upload: ' + err);
        }
      } catch (err) {
        console.warn('Arquivo do upload não pôde ser organizado: ' + err);
      }
    });
  } catch (err) {
    console.error('Erro no trigger de organização de uploads: ' + err);
  }
}

function sincronizarFormulario_(payload, tipo) {
  const formId = extrairId_(
    payload.formId ||
      (tipo === 'selecao'
        ? payload.formSelecaoId || payload.formSelecao
        : payload.formEntregasId || payload.formEntregas)
  );

  if (!formId) throw new Error('Formulário não informado.');

  const personagens = normalizarLista_(
    tipo === 'selecao'
      ? payload.personagensSelecao ||
          payload.personagens ||
          payload.characters ||
          []
      : payload.personagensEntregas ||
          payload.deliveryCharacters ||
          payload.personagens ||
          payload.characters ||
          []
  );
  const episodios = normalizarLista_(payload.episodios || []);

  if (!personagens.length && tipo !== 'selecao') {
    throw new Error('O Banco do Projeto está vazio.');
  }

  const form = FormApp.openById(formId);
  const projectName = limparNomeProjeto_(
    payload.projectName || payload.projetoNome || form.getTitle()
  );

  prepararFormulario_(form, {
    tipo: tipo,
    projectName: projectName,
    personagens:
      tipo === 'selecao' && !personagens.length
        ? ['Seleção encerrada']
        : personagens,
    capaUrl: String(payload.capaUrl || payload.coverUrl || '').trim(),
  });

  if (tipo === 'selecao') {
    form.setAcceptingResponses(Boolean(personagens.length));
  }

  if (tipo === 'entregas') {
    atualizarEpisodiosEntregas_(form, episodios);
  }

  const pastaDestinoId = extrairId_(
    tipo === 'selecao'
      ? payload.respostasSelecaoFolderId || payload.folderId
      : payload.entregasFolderId || payload.folderId
  );

  if (pastaDestinoId) {
    const pastaDestino = DriveApp.getFolderById(pastaDestinoId);
    garantirLocalizacaoFormulario_(form, pastaDestino);
  }

  return {
    ok: true,
    form: infoFormulario_(form),
    personagens: personagens,
  };
}

function salvarRegistroFormularios_(projectKey, selecaoId, entregasId) {
  PropertiesService.getScriptProperties().setProperty(
    DW_CFG.FORM_REGISTRY_PREFIX + normalizarChave_(projectKey),
    JSON.stringify({
      selecao: selecaoId,
      entregas: entregasId,
    })
  );
}

function lerRegistroFormularios_(projectKey) {
  const raw = PropertiesService.getScriptProperties().getProperty(
    DW_CFG.FORM_REGISTRY_PREFIX + normalizarChave_(projectKey)
  );

  if (!raw) return {};

  try {
    return JSON.parse(raw) || {};
  } catch (_) {
    return {};
  }
}

function lerRespostas_(payload, tipo) {
  let spreadsheetId = extrairId_(payload.spreadsheetId);
  const folderId = extrairId_(payload.folderId);

  if (!spreadsheetId && folderId) {
    spreadsheetId = localizarPlanilhaNaPasta_(folderId, tipo);
  }

  if (!spreadsheetId) {
    throw new Error(
      'Nenhuma planilha de respostas de ' +
      (tipo === 'selecao' ? 'Seleção' : 'Entregas') +
      ' foi localizada. Configure o vínculo da planilha deste projeto antes de sincronizar.'
    );
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  // Projetos antigos podem ter abas auxiliares vazias antes da aba de respostas.
  // Identificar o cabeçalho antes de ler evita uma falsa sincronização com zero envios.
  const abas = ss.getSheets();
  const temCabecalhoFormulario = function (aba) {
    if (aba.getLastColumn() < 1) return false;
    const headers = aba.getRange(1, 1, 1, Math.min(aba.getLastColumn(), 40))
      .getDisplayValues()[0].map(normalizarTexto_);
    const temData = headers.some(function (h) {
      return h.indexOf('timestamp') !== -1 ||
        h.indexOf('carimbo de data/hora') !== -1;
    });
    const temCampos = headers.some(function (h) {
      return h.indexOf('nome') !== -1 ||
        h.indexOf('personagem') !== -1 ||
        h.indexOf('semana') !== -1;
    });
    return temData && temCampos;
  };
  const sheet = abas.find(temCabecalhoFormulario) ||
    abas.find(function (aba) {
      return /respostas|responses/i.test(aba.getName()) &&
        aba.getLastColumn() > 0;
    });

  if (!sheet) {
    throw new Error(
      'A planilha vinculada não possui uma aba de respostas reconhecida do Forms. ' +
      'Confira o destino das respostas no formulário.'
    );
  }

  const valores = sheet.getDataRange().getDisplayValues();

  if (!valores.length) {
    return {
      ok: true,
      respostas: [],
      spreadsheetId: spreadsheetId,
      spreadsheetUrl: ss.getUrl(),
      sheetName: sheet.getName(),
      aviso: 'A planilha está acessível, mas ainda não possui envios.',
    };
  }

  const headers = valores[0].map(normalizarTexto_);
  const linhas = valores.slice(1);

  const idx = function (aliases) {
    const normalizados = aliases.map(normalizarTexto_);
    return headers.findIndex(function (header) {
      const limpo = header.replace(/[:：?]+$/g, '').trim();
      return normalizados.some(function (alias) {
        return limpo === alias ||
          limpo.indexOf(alias + ':') === 0 ||
          limpo.indexOf(alias + ' (') === 0 ||
          limpo.indexOf(alias + ' ') === 0 ||
          limpo.indexOf(alias + ' /') === 0;
      });
    });
  };

  const iTimestamp = idx(['carimbo de data/hora', 'timestamp', 'data']);
  const iNome = idx(['nome', 'nome do dublador', 'dublador']);
  const iTelefone = idx([
    'número de telefone / whatsapp',
    'numero de telefone / whatsapp',
    'número de telefone',
    'numero de telefone',
    'telefone do membro',
    'telefone',
    'whatsapp',
    'número / id',
    'numero / id',
  ]);
  const iPersonagem = idx([
    'personagem',
    'personagem desejado',
    'escolha o personagem',
  ]);
  const iSemana = idx([
    'semana', 'semana.', 'semana / corte', 'semana/corte',
    'semena/corte', 'semena / corte',
    'corte referente a semana', 'episódio', 'episodio',
  ]);
  const iObservacao = idx(['observação', 'observacao', 'comentário', 'comentario']);
  // Aceita títulos diferentes dos modelos novos e antigos de Forms.
  // A busca por cabeçalhos é tolerante a prefixos/sufixos como "(Opcional)".
  const termosUpload =
    tipo === 'selecao'
      ? ['upload do teste', 'envie seu teste aqui', 'link do teste', 'faça o upload', 'faca o upload', 'teste', 'arquivo', 'upload']
      : ['upload do arquivo', 'upload da entrega', 'link do vídeo', 'link do video', 'link da entrega', 'envie sua entrega', 'vídeo/áudio dublado', 'video/audio dublado', 'arquivo', 'upload', 'link:'];
  const iUpload = headers.findIndex(function (header) {
    return termosUpload.some(function (termo) {
      const alias = normalizarTexto_(termo);
      return header === alias ||
        header.indexOf(alias) !== -1;
    });
  });

  // Alguns Forms antigos foram reutilizados: possuem testes da seleção
  // e somente parte das respostas representa entregas de produção.
  const cabecalhoDeTeste = headers.some(function (h) {
    return h.indexOf('personagem do teste') !== -1 ||
      h.indexOf('video do teste') !== -1 ||
      h.indexOf('link teste') !== -1;
  });
  const possuiCampoProducao = headers.some(function (h) {
    return /semana|semena|episodio|corte|parte|dublagem|dublado|entrega/.test(h);
  });
  const linhasPreenchidas = linhas.filter(function (row) {
    return row.some(function (cell) { return String(cell || '').trim(); });
  });

  if (tipo === 'entregas' && cabecalhoDeTeste &&
      !possuiCampoProducao && linhasPreenchidas.length) {
    throw new Error(
      'A planilha cadastrada contém respostas de teste de seleção, ' +
      'sem campos de produção. Vincule o formulário/planilha de entregas corretos.'
    );
  }

  // Em planilhas mistas como a de Digital Circus, manter apenas as
  // respostas com Semana/Corte informado, preservando as linhas reais.
  const filtrarTestesDaPlanilhaMista =
    tipo === 'entregas' && cabecalhoDeTeste && iSemana >= 0 &&
    linhasPreenchidas.some(function (row) {
      return Boolean(valorLinha_(row, iSemana));
    });
  let ignoradasSelecao = 0;
  const respostas = [];

  linhas.forEach(function (row, index) {
    if (!row.some(function (cell) { return String(cell || '').trim(); })) return;

    if (filtrarTestesDaPlanilhaMista && !valorLinha_(row, iSemana)) {
      ignoradasSelecao++;
      return;
    }

    const uploadEncontrado = valorLinha_(row, iUpload);
    const urlFallback = row.find(function (valor, indice) {
      return indice >= 4 && /^https:\/\/(drive|docs)\.google\.com\//i.test(String(valor || '').trim());
    }) || '';
    const urlDoEnvio = /^https?:\/\//i.test(uploadEncontrado)
      ? uploadEncontrado
      : String(urlFallback || '').trim();

    respostas.push({
      id: String(index + 2),
      linha: index + 2,
      timestamp: valorLinha_(row, iTimestamp),
      nome: valorLinha_(row, iNome),
      dublador: valorLinha_(row, iNome),
      telefone: valorLinha_(row, iTelefone),
      personagem: valorLinha_(row, iPersonagem),
      semana: valorLinha_(row, iSemana),
      videoUrl: urlDoEnvio,
      video: urlDoEnvio,
      envio: urlDoEnvio,
      comentario: valorLinha_(row, iObservacao),
    });
  });


  // Se o Form ainda recebe uploads, mas a planilha foi recriada ou desvinculada,
  // recuperar as respostas pelo ID nativo sem criar/mover nenhum documento.
  const peloFormulario = (!respostas.length && tipo === 'entregas')
    ? lerRespostasDiretoDoFormulario_(payload)
    : [];
  const resultado = respostas.length ? respostas : peloFormulario;

  return {
    ok: true,
    respostas: resultado,
    spreadsheetId: spreadsheetId,
    spreadsheetUrl: ss.getUrl(),
    sheetName: sheet.getName(),
    origem: peloFormulario.length ? 'formulario' : 'planilha',
    ignoradasSelecao: ignoradasSelecao,
    aviso: peloFormulario.length
      ? 'A planilha está vazia; os envios foram recuperados diretamente do formulário.'
      : (respostas.length
          ? (ignoradasSelecao ? ignoradasSelecao + ' teste(s) de seleção foram ignorados.' : '')
          : (ignoradasSelecao
              ? 'A planilha contém testes antigos, mas nenhuma entrega identificada.'
              : 'A planilha está acessível, mas ainda não recebeu envios.')),
  };
}

// Fallback de leitura para Forms antigos com upload, mas sem planilha ligada.
// Só é usado quando o ID de edição é conhecido; o link público não basta.
function lerRespostasDiretoDoFormulario_(payload) {
  const formId = extrairId_(payload.formId || payload.formEntregasId || '');
  if (!formId) return [];

  const form = FormApp.openById(formId);
  const registros = form.getResponses();

  function textoResposta_(valor) {
    return Array.isArray(valor)
      ? valor.map(function (item) { return String(item || '').trim(); }).filter(Boolean).join(', ')
      : String(valor || '').trim();
  }

  function urlDeUpload_(valor) {
    const lista = Array.isArray(valor) ? valor : [valor];
    for (let i = 0; i < lista.length; i++) {
      const dado = String(lista[i] || '').trim();
      if (/^https?:\/\//i.test(dado)) return dado;
      // Respostas a questões FILE_UPLOAD do Forms são IDs de arquivos Drive.
      if (/^[a-zA-Z0-9_-]{20,}$/.test(dado)) {
        return 'https://drive.google.com/file/d/' + dado + '/view';
      }
    }
    return '';
  }

  return registros.map(function (response, index) {
    const campos = response.getItemResponses().map(function (item) {
      return {
        titulo: normalizarTexto_(item.getItem().getTitle()),
        tipo: String(item.getItem().getType() || ''),
        valor: item.getResponse(),
      };
    });

    function campo_(padrao) {
      return campos.find(function (item) { return padrao.test(item.titulo); });
    }

    const nome = campo_(/nome|dublador|membro/);
    const telefone = campo_(/telefone|whatsapp|n[uú]mero/);
    const personagem = campo_(/personagem/);
    const semana = campo_(/semana|semena|epis[oó]dio|corte|parte/);
    const comentario = campo_(/observa[cç][aã]o|coment[aá]rio/);
    const upload = campos.find(function (item) {
      return item.tipo.toUpperCase().indexOf('FILE_UPLOAD') !== -1;
    }) || campo_(/upload|v[ií]deo|[aá]udio|arquivo|link/);
    const timestamp = response.getTimestamp();

    return {
      // Preserva compatibilidade com as linhas quando a planilha for ligada
      // e as respostas forem exportadas em ordem cronológica.
      id: String(index + 2),
      linha: index + 2,
      timestamp: timestamp && timestamp.toISOString
        ? timestamp.toISOString()
        : String(timestamp || ''),
      nome: nome ? textoResposta_(nome.valor) : '',
      dublador: nome ? textoResposta_(nome.valor) : '',
      telefone: telefone ? textoResposta_(telefone.valor) : '',
      personagem: personagem ? textoResposta_(personagem.valor) : '',
      semana: semana ? textoResposta_(semana.valor) : '',
      videoUrl: upload ? urlDeUpload_(upload.valor) : '',
      video: upload ? urlDeUpload_(upload.valor) : '',
      envio: upload ? urlDeUpload_(upload.valor) : '',
      comentario: comentario ? textoResposta_(comentario.valor) : '',
    };
  });
}

function localizarPlanilhaNaPasta_(folderId, tipo) {
  const pasta = DriveApp.getFolderById(folderId);
  const arquivos = pasta.getFilesByType(MimeType.GOOGLE_SHEETS);
  const prefixo = tipo === 'selecao' ? '[seleção]' : '[entregas]';

  const candidatas = [];
  while (arquivos.hasNext()) {
    const arquivo = arquivos.next();
    if (normalizarTexto_(arquivo.getName()).indexOf(normalizarTexto_(prefixo)) !== -1) {
      candidatas.push(arquivo.getId());
    }
  }

  if (candidatas.length > 1) {
    throw new Error(
      'Há mais de uma planilha de respostas na pasta. Vincule a planilha correta ' +
      'ao projeto para evitar importar dados de outro formulário.'
    );
  }
  return candidatas.length === 1 ? candidatas[0] : '';
}

function finalizarProjeto_(payload) {
  const projetoFolderId = extrairId_(
    payload.projetoFolderId ||
      payload.projectFolderId ||
      payload.sourceFolderId
  );
  const finalizadosFolderId = extrairId_(
    payload.finalizadosFolderId ||
      payload.finalFolderId ||
      payload.destinationFolderId
  );

  if (!projetoFolderId) throw new Error('Pasta 2 | Projeto não informada.');
  if (!finalizadosFolderId) {
    throw new Error('Pasta 3 | Finalizado não informada.');
  }
  if (projetoFolderId === finalizadosFolderId) {
    throw new Error('Origem e destino não podem ser iguais.');
  }

  const origem = DriveApp.getFolderById(projetoFolderId);
  const destino = DriveApp.getFolderById(finalizadosFolderId);
  const movidos = [];
  const falhas = [];

  moverVideosRecursivamente_(origem, destino, movidos, falhas);

  const videoEditorId = extrairId_(payload.videoEditorLink);

  if (
    videoEditorId &&
    !movidos.some(function (item) { return item.id === videoEditorId; })
  ) {
    try {
      const arquivo = DriveApp.getFileById(videoEditorId);
      if (arquivoEhVideo_(arquivo)) {
        arquivo.moveTo(destino);
        movidos.push({
          id: arquivo.getId(),
          nome: arquivo.getName(),
          url: arquivo.getUrl(),
        });
      }
    } catch (err) {
      falhas.push({
        id: videoEditorId,
        erro: String(err && err.message ? err.message : err),
      });
    }
  }

  return {
    ok: true,
    projectId: String(payload.projectId || ''),
    projectName: limparNomeProjeto_(payload.projectName || payload.projetoNome),
    videosMovidos: movidos.length,
    arquivos: movidos,
    falhas: falhas,
  };
}

function moverVideosRecursivamente_(pasta, destino, movidos, falhas) {
  const arquivos = pasta.getFiles();

  while (arquivos.hasNext()) {
    const arquivo = arquivos.next();

    if (!arquivoEhVideo_(arquivo)) continue;

    try {
      const info = {
        id: arquivo.getId(),
        nome: arquivo.getName(),
        url: arquivo.getUrl(),
      };

      arquivo.moveTo(destino);
      movidos.push(info);
    } catch (err) {
      falhas.push({
        id: arquivo.getId(),
        nome: arquivo.getName(),
        erro: String(err && err.message ? err.message : err),
      });
    }
  }

  const subpastas = pasta.getFolders();

  while (subpastas.hasNext()) {
    moverVideosRecursivamente_(subpastas.next(), destino, movidos, falhas);
  }
}

function arquivoEhVideo_(arquivo) {
  let mime = '';

  try {
    mime = String(arquivo.getMimeType() || '').toLowerCase();
  } catch (_) {}

  if (mime.indexOf('video/') === 0) return true;

  const nome = String(arquivo.getName() || '').toLowerCase();
  return /\.(mp4|mov|m4v|avi|mkv|webm|wmv|mpeg|mpg|3gp|ts|mts|m2ts)$/.test(
    nome
  );
}

function garantirLocalizacaoFormulario_(form, pasta, planilha) {
  moverArquivoParaPasta_(form.getId(), pasta);

  if (planilha && planilha.getId) {
    moverArquivoParaPasta_(planilha.getId(), pasta);
    return;
  }

  try {
    const destinoId = form.getDestinationId();
    if (destinoId) {
      moverArquivoParaPasta_(destinoId, pasta);
    }
  } catch (_) {}
}

function moverArquivoParaPasta_(fileId, pasta) {
  const arquivo = DriveApp.getFileById(fileId);
  const pais = arquivo.getParents();

  while (pais.hasNext()) {
    const pai = pais.next();
    if (pai.getId() === pasta.getId()) return;
  }

  arquivo.moveTo(pasta);
}

function infoFormulario_(form) {
  return {
    id: form.getId(),
    viewUrl: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
    title: form.getTitle(),
  };
}

function infoPlanilha_(ss) {
  return {
    id: ss.getId(),
    url: ss.getUrl(),
    title: ss.getName(),
  };
}

function validarSessao_(accessToken) {
  const token = String(accessToken || '').trim();

  if (!token) {
    throw new Error('Sessão do DubWorks Manager não informada.');
  }

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl =
    props.getProperty(DW_CFG.SUPABASE_URL_PROP) || DW_CFG.DEFAULT_SUPABASE_URL;
  const supabaseKey =
    props.getProperty(DW_CFG.SUPABASE_KEY_PROP) || DW_CFG.DEFAULT_SUPABASE_KEY;

  const response = UrlFetchApp.fetch(supabaseUrl + '/auth/v1/user', {
    method: 'get',
    headers: {
      apikey: supabaseKey,
      Authorization: 'Bearer ' + token,
    },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Sessão do DubWorks Manager inválida ou expirada.');
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};

  try {
    return JSON.parse(e.postData.contents);
  } catch (_) {
    throw new Error('JSON inválido.');
  }
}

function limparNomeProjeto_(valor) {
  return String(valor || '')
    .replace(/^\s*\[(Projeto|Parceria)\]\s*/i, '')
    .replace(/^\s*\[(Seleção|Selecao|Entregas)\]\s*-?\s*/i, '')
    .trim();
}

function extrairId_(valor) {
  const s = String(valor || '').trim();
  if (!s) return '';

  const match = s.match(/[-\w]{20,}/);
  return match ? match[0] : '';
}

function normalizarLista_(valor) {
  if (!Array.isArray(valor)) return [];

  const vistos = {};
  const saida = [];

  valor.forEach(function (item) {
    const v = String(item || '').trim();
    const k = normalizarTexto_(v);

    if (!v || vistos[k]) return;

    vistos[k] = true;
    saida.push(v);
  });

  return saida;
}

function normalizarChave_(valor) {
  return normalizarTexto_(String(valor || ''))
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

function normalizarTexto_(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function valorLinha_(row, index) {
  if (index < 0 || index >= row.length) return '';
  return String(row[index] || '').trim();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
