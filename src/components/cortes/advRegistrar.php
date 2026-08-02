<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Formulário de Advertência</title>
  </head>

  <body>
    <form action="/advRegistrar.php">
    <!-- Campo do numero do moderador -->
      <label for="tellModerador">Número do moderador:</label><br /><br />
      <input
        type="tel"
        id="tellModerador"
        name="tellModerador"
        placeholder="(00) 00000-0000"
        required
      />
      <br /><br />

    <!-- Campo do numero do membro que foi advertido -->
      <label for="tellMembro">Número do advertido:</label><br /><br />
      <input
        type="tel"
        id="tellMembro"
        name="tellMembro"
        placeholder="(00) 00000-0000"
        required
      />
      <br /><br />

    <!-- Campo da data da ocorrencia -->
      <label for="dataAdvertencia">Dia da ocorrência:</label><br /><br />
      <input type="date" id="dataAdvertencia" required />
      <br /><br />

    <!-- Campo de valor/pontos da ocorrencia, avaliação. -->
      <label for="nota">Gravidade da infração:</label><br /><br />
      <input type="range" min="0" max="10" value="0" id="nota" />
      <span id="valor">0</span>
      <br /><br />

    <!-- Campo de envio das provas -->
      <label for="midias">Anexar arquivos:</label><br /><br />
      <input
        type="file"
        id="midias"
        name="midias"
        accept="image/*,video/*,audio/*"
        multiple
      />

    <!-- Botão de enviar -->
      <br /><input type="submit" value="Enviar" /><br />
    </form>

    <!-- Função do Range, que mostra os numeros/valor da infração -->
    <script>
      const nota = document.getElementById("nota");
      const valor = document.getElementById("valor");

      nota.addEventListener("input", function () {
        valor.textContent = this.value;
      });
    </script>
  </body>
</html>
