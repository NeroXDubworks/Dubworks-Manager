function publicarDubWorksEtapa2() {
  var scriptId = ScriptApp.getScriptId();
  var deploymentId = 'AKfycbxLitr2aV5pukOK-MBHka2cKBVJWRPPlkYthqQhP7HEyNYtyfx_vnMn6EE0OYhgt--R';
  var token = ScriptApp.getOAuthToken();
  var headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  var resposta = UrlFetchApp.fetch(
    'https://script.googleapis.com/v1/projects/' +
    scriptId +
    '/versions',
    {
      method: 'post',
      headers: headers,
      payload: JSON.stringify({
        description: 'DubWorks Project Forms v2.0.0'
      }),
      muteHttpExceptions: true
    }
  );

  if (resposta.getResponseCode() >= 300) {
    throw new Error(
      'Falha ao criar versao: ' +
      resposta.getContentText()
    );
  }

  var versionNumber = JSON.parse(
    resposta.getContentText()
  ).versionNumber;

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
          description: 'DubWorks Project Forms v2.0.0'
        }
      }),
      muteHttpExceptions: true
    }
  );

  if (resposta.getResponseCode() >= 300) {
    throw new Error(
      'Falha ao atualizar implantacao: ' +
      resposta.getContentText()
    );
  }

  Logger.log(
    'OK - versao ' +
    versionNumber +
    ' publicada em https://script.google.com/macros/s/' +
    deploymentId +
    '/exec'
  );
}
