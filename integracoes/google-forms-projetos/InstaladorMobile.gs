function instalarDubWorksV2() {
  const scriptId = ScriptApp.getScriptId();
  const deploymentId = 'AKfycbx4bopNipOGkZk5eEGPaqLVtLYJ_exZmxCni10EflhaeTxLNEXt79OcpCT0h8m5PeYC';
  const rawUrl = 'https://raw.githubusercontent.com/NeroXDubworks/Dubworks-Manager/main/integracoes/google-forms-projetos/Code.gs';
  const token = ScriptApp.getOAuthToken();
  const headersJson = {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  const codigoResp = UrlFetchApp.fetch(rawUrl, { muteHttpExceptions: true });
  if (codigoResp.getResponseCode() !== 200) {
    throw new Error('Falha ao baixar Code.gs: HTTP ' + codigoResp.getResponseCode());
  }

  const codigo = codigoResp.getContentText();

  const manifestFinal = JSON.stringify({
    timeZone: 'America/Sao_Paulo',
    dependencies: {},
    exceptionLogging: 'STACKDRIVER',
    runtimeVersion: 'V8',
    oauthScopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/forms',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/script.scriptapp',
      'https://www.googleapis.com/auth/script.external_request'
    ]
  }, null, 2);

  let r = UrlFetchApp.fetch(
    'https://script.googleapis.com/v1/projects/' + scriptId + '/content',
    {
      method: 'put',
      headers: headersJson,
      payload: JSON.stringify({
        files: [
          { name: 'Código', type: 'SERVER_JS', source: codigo },
          { name: 'appsscript', type: 'JSON', source: manifestFinal }
        ]
      }),
      muteHttpExceptions: true
    }
  );

  if (r.getResponseCode() >= 300) {
    throw new Error('Atualização do código falhou: ' + r.getContentText());
  }

  r = UrlFetchApp.fetch(
    'https://script.googleapis.com/v1/projects/' + scriptId + '/versions',
    {
      method: 'post',
      headers: headersJson,
      payload: JSON.stringify({
        description: 'DubWorks Project Forms v2.0.0'
      }),
      muteHttpExceptions: true
    }
  );

  if (r.getResponseCode() >= 300) {
    throw new Error('Criação da versão falhou: ' + r.getContentText());
  }

  const versionNumber = JSON.parse(r.getContentText()).versionNumber;

  const deploymentConfig = {
    scriptId: scriptId,
    versionNumber: versionNumber,
    manifestFileName: 'appsscript',
    description: 'DubWorks Project Forms'
  };

  r = UrlFetchApp.fetch(
    'https://script.googleapis.com/v1/projects/' +
      scriptId +
      '/deployments/' +
      deploymentId,
    {
      method: 'put',
      headers: headersJson,
      payload: JSON.stringify({
        deploymentConfig: deploymentConfig
      }),
      muteHttpExceptions: true
    }
  );

  if (r.getResponseCode() >= 300) {
    throw new Error('Publicação falhou: ' + r.getContentText());
  }

  Logger.log('OK: versão ' + versionNumber + ' publicada no deployment existente.');
}
