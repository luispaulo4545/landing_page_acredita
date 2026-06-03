const SHEET_NAME = "Pre-inscricoes";

function doPost(e) {
  if (!e) {
    return createResponse_({
      ok: false,
      error: "Esta funcao precisa ser chamada por POST pelo formulario da landing page."
    });
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(spreadsheet);
  const data = getRequestData_(e);

  sheet.appendRow([
    new Date(),
    data.name || "",
    data.profession || "",
    data.institution || "",
    data.city || "",
    data.whatsapp || "",
    data.email || "",
    data.area || "",
    data.interest || "",
    data.page || ""
  ]);

  return createResponse_({ ok: true });
}

function doGet() {
  return createResponse_({
    ok: true,
    message: "Web App ativo. Envie o formulario da landing para gravar na planilha."
  });
}

function getRequestData_(e) {
  if (e.parameter && Object.keys(e.parameter).length > 0) {
    return e.parameter;
  }

  if (e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }

  return {};
}

function getOrCreateSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Data de envio",
      "Nome completo",
      "Profissao",
      "Instituicao",
      "Cidade / Estado",
      "WhatsApp",
      "E-mail",
      "Area de atuacao",
      "Interesse",
      "Pagina"
    ]);
  }

  return sheet;
}

function createResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
