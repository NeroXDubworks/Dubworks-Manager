function instalarDubWorksEtapa1() {
  var scriptId = ScriptApp.getScriptId();
  var rawUrl = 'https://raw.githubusercontent.com/NeroXDubworks/Dubworks-Manager/main/integracoes/google-forms-projetos/Code.gs';
  var token = ScriptApp.getOAuthToken();
  var headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  var resposta = UrlFetchApp.fetch(rawUrl, {
    muteHttpExceptions: true
  });

  if (resposta.getResponseCode() !== 200) {
    throw new Error(
      'Nao foi possivel baixar o Code.gs. HTTP ' +
      resposta.getResponseCode()
    );
  }

  var codigoFinal = resposta.getContentText();

  if (
    codigoFinal.indexOf('function doGet()') === -1 ||
    codigoFinal.indexOf('function doPost(e)') === -1
  ) {
    throw new Error(
      'O Code.gs baixado nao contem doGet e doPost. Instalacao cancelada.'
    );
  }

  var instalador2 = [
    "function publicarDubWorksEtapa2() {",
    "  var scriptId = ScriptApp.getScriptId();",
    "  var deploymentId = 'AKfycbxLitr2aV5pukOK-MBHka2cKBVJWRPPlkYthqQhP7HEyNYtyfx_vnMn6EE0OYhgt--R';",
    "  var token = ScriptApp.getOAuthToken();",
    "  var headers = {",
    "    'Authorization': 'Bearer ' + token,",
    "    'Content-Type': 'application/json'",
    "  };",
    "",
    "  var resposta = UrlFetchApp.fetch(",
    "    'https://script.googleapis.com/v1/projects/' + scriptId + '/versions',",
    "    {",
    "      method: 'post',",
    "      headers: headers,",
    "      payload: JSON.stringify({",
    "        description: 'DubWorks Project Forms v2.0.0'",
    "      }),",
    "      muteHttpExceptions: true",
    "    }",
    "  );",
    "",
    "  if (resposta.getResponseCode() >= 300) {",
    "    throw new Error(",
    "      'Falha ao criar versao: ' + resposta.getContentText()",
    "    );",
    "  }",
    "",
    "  var versionNumber = JSON.parse(",
    "    resposta.getContentText()",
    "  ).versionNumber;",
    "",
    "  resposta = UrlFetchApp.fetch(",
    "    'https://script.googleapis.com/v1/projects/' +",
    "    scriptId +",
    "    '/deployments/' +",
    "    deploymentId,",
    "    {",
    "      method: 'put',",
    "      headers: headers,",
    "      payload: JSON.stringify({",
    "        deploymentConfig: {",
    "          scriptId: scriptId,",
    "          versionNumber: versionNumber,",
    "          manifestFileName: 'appsscript',",
    "          description: 'DubWorks Project Forms v2.0.0'",
    "        }",
    "      }),",
    "      muteHttpExceptions: true",
    "    }",
    "  );",
    "",
    "  if (resposta.getResponseCode() >= 300) {",
    "    throw new Error(",
    "      'Falha ao atualizar implantacao: ' + resposta.getContentText()",
    "    );",
    "  }",
    "",
    "  Logger.log(",
    "    'OK - versao ' +",
    "    versionNumber +",
    "    ' publicada em https://script.google.com/macros/s/' +",
    "    deploymentId +",
    "    '/exec'",
    "  );",
    "}"
  ].join('\n');

  var manifesto = JSON.stringify({
    timeZone: 'America/Sao_Paulo',
    dependencies: {},
    exceptionLogging: 'STACKDRIVER',
    runtimeVersion: 'V8',
    oauthScopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/forms',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/script.scriptapp',
      'https://www.googleapis.com/auth/script.external_request',
      'https://www.googleapis.com/auth/script.projects',
      'https://www.googleapis.com/auth/script.deployments'
    ]
  }, null, 2);

  resposta = UrlFetchApp.fetch(
    'https://script.googleapis.com/v1/projects/' +
    scriptId +
    '/content',
    {
      method: 'put',
      headers: headers,
      payload: JSON.stringify({
        files: [
          {
            name: 'Codigo',
            type: 'SERVER_JS',
            source: codigoFinal
          },
          {
            name: 'Instalador2',
            type: 'SERVER_JS',
            source: instalador2
          },
          {
            name: 'appsscript',
            type: 'JSON',
            source: manifesto
          }
        ]
      }),
      muteHttpExceptions: true
    }
  );

  if (resposta.getResponseCode() >= 300) {
    throw new Error(
      'Falha ao instalar o codigo final: ' +
      resposta.getContentText()
    );
  }

  Logger.log(
    'ETAPA 1 OK - atualize a pagina. O projeto agora contem Codigo.gs e Instalador2.gs.'
  );
}
