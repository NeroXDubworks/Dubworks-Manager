/**
 * DubWorks Manager — instalador oficial do Apps Script de Projetos / Forms.
 *
 * Uso:
 * 1. Garanta que o appsscript.json oficial esteja salvo no projeto.
 * 2. Execute instalarDubWorksFormsOficial() pelo editor do Apps Script.
 * 3. Autorize os escopos solicitados pelo Google.
 *
 * A publicação usa o OAuth do usuário que executa o instalador.
 * Não usa service account para administrar Apps Script.
 */
function instalarDubWorksFormsOficial() {
  var scriptId = ScriptApp.getScriptId();
  var deploymentId =
    'AKfycbxl9oYifkr1hos9WIvBBrMXHtI0UsV2Rqqf-yacD895fQkvhG5vTmOIn1bkItxw4KWN';
  var sourceRef = 'f01ed7d962ced3b29256d2166ba64269eb4b93fa';
  var baseRaw =
    'https://raw.githubusercontent.com/NeroXDubworks/Dubworks-Manager/' +
    sourceRef +
    '/integracoes/google-forms-projetos/';
  var rawCodeUrl = baseRaw + 'Code.gs';
  var rawManifestUrl = baseRaw + 'appsscript.json';

  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);

  var token = ScriptApp.getOAuthToken();
  var headers = {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
  };

  var codeResp = UrlFetchApp.fetch(rawCodeUrl, {
    muteHttpExceptions: true,
    followRedirects: true,
  });
  if (codeResp.getResponseCode() !== 200) {
    throw new Error(
      'Falha ao baixar Code.gs: HTTP ' + codeResp.getResponseCode()
    );
  }

  var manifestResp = UrlFetchApp.fetch(rawManifestUrl, {
    muteHttpExceptions: true,
    followRedirects: true,
  });
  if (manifestResp.getResponseCode() !== 200) {
    throw new Error(
      'Falha ao baixar appsscript.json: HTTP ' +
        manifestResp.getResponseCode()
    );
  }

  var codigo = codeResp.getContentText();
  var manifest = manifestResp.getContentText();

  if (
    codigo.indexOf('function doGet()') === -1 ||
    codigo.indexOf('function doPost(e)') === -1
  ) {
    throw new Error('Code.gs inválido. Publicação cancelada.');
  }

  var resposta = UrlFetchApp.fetch(
    'https://script.googleapis.com/v1/projects/' + scriptId + '/content',
    {
      method: 'put',
      headers: headers,
      payload: JSON.stringify({
        files: [
          { name: 'Codigo', type: 'SERVER_JS', source: codigo },
          { name: 'appsscript', type: 'JSON', source: manifest },
        ],
      }),
      muteHttpExceptions: true,
    }
  );

  if (resposta.getResponseCode() >= 300) {
    throw new Error(
      'Falha ao atualizar o projeto: ' + resposta.getContentText()
    );
  }

  resposta = UrlFetchApp.fetch(
    'https://script.googleapis.com/v1/projects/' + scriptId + '/versions',
    {
      method: 'post',
      headers: headers,
      payload: JSON.stringify({
        description: 'DubWorks Project Forms v2.0.0',
      }),
      muteHttpExceptions: true,
    }
  );

  if (resposta.getResponseCode() >= 300) {
    throw new Error(
      'Falha ao criar a versão: ' + resposta.getContentText()
    );
  }

  var versionNumber = JSON.parse(resposta.getContentText()).versionNumber;

  resposta = UrlFetchApp.fetch(
    'https://script.googleapis.com/v1/projects/' +
      scriptId +
      '/deployments/' +
      deploymentId,
    {
      method: 'put',
      headers: headers,
      payload: JSON.stringify({
        deploymentConfig: {
          scriptId: scriptId,
          versionNumber: versionNumber,
          manifestFileName: 'appsscript',
          description: 'DubWorks Project Forms v2.0.0',
        },
      }),
      muteHttpExceptions: true,
    }
  );

  if (resposta.getResponseCode() >= 300) {
    throw new Error(
      'Falha ao publicar a implantação: ' + resposta.getContentText()
    );
  }

  Logger.log(
    'OK — DubWorks Project Forms versão ' +
      versionNumber +
      ' publicada com sucesso.'
  );
}
