function instalarDubWorksV2() {
  var scriptId = ScriptApp.getScriptId();
  var deploymentId = 'AKfycbx4bopNipOGkZk5eEGPaqLVtLYJ_exZmxCni10EflhaeTxLNEXt79OcpCT0h8m5PeYC';
  var rawUrl = 'https://raw.githubusercontent.com/NeroXDubworks/Dubworks-Manager/main/integracoes/google-forms-projetos/Code.gs';
  var token = ScriptApp.getOAuthToken();
  var headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  var resp = UrlFetchApp.fetch(rawUrl, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('Falha ao baixar o Code.gs: HTTP ' + resp.getResponseCode());
  }

  var codigo = resp.getContentText();
  var manifest = JSON.stringify({
    timeZone: 'America/Sao_Paulo',
    exceptionLogging: 'STACKDRIVER',
    runtimeVersion: 'V8'
  }, null, 2);

  resp = UrlFetchApp.fetch(
    'https://script.googleapis.com/v1/projects/' + scriptId + '/content',
    {
      method: 'put',
      headers: headers,
      payload: JSON.stringify({
        files: [
          { name: 'Codigo', type: 'SERVER_JS', source: codigo },
          { name: 'appsscript', type: 'JSON', source: manifest }
        ]
      }),
      muteHttpExceptions: true
    }
  );

  if (resp.getResponseCode() >= 300) {
    throw new Error('Falha ao atualizar o projeto: ' + resp.getContentText());
  }

  resp = UrlFetchApp.fetch(
    'https://script.googleapis.com/v1/projects/' + scriptId + '/versions',
    {
      method: 'post',
      headers: headers,
      payload: JSON.stringify({ description: 'DubWorks Project Forms v2.0.0' }),
      muteHttpExceptions: true
    }
  );

  if (resp.getResponseCode() >= 300) {
    throw new Error('Falha ao criar a versao: ' + resp.getContentText());
  }

  var versionNumber = JSON.parse(resp.getContentText()).versionNumber;

  resp = UrlFetchApp.fetch(
    'https://script.googleapis.com/v1/projects/' + scriptId + '/deployments/' + deploymentId,
    {
      method: 'put',
      headers: headers,
      payload: JSON.stringify({
        deploymentConfig: {
          scriptId: scriptId,
          versionNumber: versionNumber,
          manifestFileName: 'appsscript',
          description: 'DubWorks Project Forms'
        }
      }),
      muteHttpExceptions: true
    }
  );

  if (resp.getResponseCode() >= 300) {
    throw new Error('Falha ao publicar: ' + resp.getContentText());
  }

  Logger.log('OK - versao ' + versionNumber + ' publicada.');
}
