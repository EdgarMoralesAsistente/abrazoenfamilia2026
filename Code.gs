/**
 * BACKEND GOOGLE APPS SCRIPT (GAS) - CRM ABRAZO EN FAMILIA 2026
 * Pastoral Familiar · Arquidiócesis de Maracaibo
 *
 * Conexión bidireccional entre la SPA y Google Sheets.
 * Soporta autenticación de miembros del equipo, CRUD de reservas y sincronización.
 */

const SHEET_NAME = "Reservas CRM";
const USERS_SHEET_NAME = "Usuarios CRM";

function getTargetSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.getActiveSheet();
  }
  return sheet;
}

/**
 * Obtiene o inicializa la tabla "Usuarios CRM" con las credenciales del equipo pastoral
 */
function getUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(USERS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET_NAME);
    // Encabezados oficiales
    sheet.appendRow([
      "Nombre Completo",
      "Correo / Usuario",
      "Contraseña / Clave",
      "Rol",
      "Estado",
      "Último Acceso"
    ]);

    // Formatear encabezado
    sheet.getRange(1, 1, 1, 6)
      .setFontWeight("bold")
      .setBackground("#78350f")
      .setFontColor("#ffffff");

    // Usuarios iniciales del Equipo Pastoral Familiar
    sheet.appendRow([
      "Secretariado de Pastoral Familiar",
      "lapastoralfamiliar.mcbo@gmail.com",
      "pastoral2026",
      "Administrador",
      "Activo",
      ""
    ]);

    sheet.appendRow([
      "Equipo Arquidiocesano de Pastoral",
      "pastoral.maracaibo",
      "familia2026",
      "Equipo Pastoral",
      "Activo",
      ""
    ]);

    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Endpoint GET: Devuelve reservas o usuarios según el parámetro ?sheet=
 */
function doGet(e) {
  try {
    const sheetParam = (e && e.parameter && e.parameter.sheet) ? String(e.parameter.sheet).toLowerCase() : "reservas";

    // Consulta de Usuarios
    if (sheetParam === "users" || sheetParam === "usuarios") {
      const userSheet = getUsersSheet();
      const lastRow = userSheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({ status: "success", count: 0, data: [] });
      }

      const rows = userSheet.getRange(2, 1, lastRow - 1, 6).getValues();
      const users = rows.map(function(r) {
        return {
          name: String(r[0] || ""),
          emailOrUser: String(r[1] || ""),
          role: String(r[3] || "Equipo Pastoral"),
          status: String(r[4] || "Activo"),
          lastLogin: r[5] ? Utilities.formatDate(new Date(r[5]), "America/Caracas", "dd/MM/yyyy HH:mm") : ""
        };
      }).filter(function(u) { return u.emailOrUser !== ""; });

      return createJsonResponse({ status: "success", count: users.length, data: users });
    }

    // Consulta por defecto: Reservas
    const sheet = getTargetSheet();
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow <= 1) {
      return createJsonResponse({ status: "success", count: 0, data: [] });
    }

    const values = sheet.getRange(2, 1, lastRow - 1, Math.max(lastCol, 20)).getValues();

    const reservations = values.map(function (row, index) {
      return {
        id: String(row[1] || "ROW-" + (index + 2)),
        timestamp: row[0] instanceof Date ? Utilities.formatDate(row[0], "America/Caracas", "dd/MM/yyyy HH:mm") : String(row[0] || ""),
        code: String(row[1] || ""),
        institutionType: String(row[2] || "Parroquia"),
        institutionName: String(row[3] || ""),
        contactName: String(row[4] || ""),
        phone: String(row[5] || "").replace(/^'/, ""),
        email: String(row[6] || ""),
        kitQuantity: Number(row[7] || 0),
        aficheQuantity: Number(row[8] || 0),
        guiaQuantity: Number(row[9] || 0),
        hojaQuantity: Number(row[10] || 0),
        totalQuantity: Number(row[11] || 0),
        totalEUR: Number(row[12] || 0),
        status: String(row[13] || "Nueva Reserva"),
        paymentStatus: String(row[14] || "Pendiente"),
        paymentMethod: String(row[15] || ""),
        paymentRef: String(row[16] || ""),
        deliveryStatus: String(row[17] || "Por Imprimir / En Caracas"),
        deliveryDate: row[18] instanceof Date ? Utilities.formatDate(row[18], "America/Caracas", "dd/MM/yyyy") : String(row[18] || ""),
        notes: String(row[19] || "")
      };
    }).filter(function (item) {
      return item.code !== "";
    });

    return createJsonResponse({
      status: "success",
      count: reservations.length,
      data: reservations
    });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Endpoint POST: Maneja LOGIN, CREATE, UPDATE, DELETE y sincronización
 */
function doPost(e) {
  try {
    let body = {};

    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (err) {
        body = e.parameter || {};
      }
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    const action = String(body.action || "CREATE").toUpperCase();

    // ==========================================
    // 0. ACCIÓN: AUTENTICACIÓN / LOGIN DE USUARIOS
    // ==========================================
    if (action === "LOGIN") {
      const emailOrUser = String(body.emailOrUser || "").trim().toLowerCase();
      const password = String(body.password || "").trim();

      if (!emailOrUser || !password) {
        return createJsonResponse({
          status: "unauthorized",
          message: "Por favor proporcione usuario/correo y contraseña."
        });
      }

      const usersSheet = getUsersSheet();
      const lastRow = usersSheet.getLastRow();

      if (lastRow <= 1) {
        return createJsonResponse({
          status: "unauthorized",
          message: "No hay usuarios registrados en la base de datos."
        });
      }

      const usersData = usersSheet.getRange(2, 1, lastRow - 1, 6).getValues();
      let authenticatedUser = null;
      let userRowIndex = -1;

      for (let i = 0; i < usersData.length; i++) {
        const row = usersData[i];
        const rowUser = String(row[1] || "").trim().toLowerCase();
        const rowPass = String(row[2] || "").trim();
        const rowStatus = String(row[4] || "Activo").trim();

        if (rowUser === emailOrUser) {
          if (rowPass === password) {
            if (rowStatus.toLowerCase() === "inactivo") {
              return createJsonResponse({
                status: "forbidden",
                message: "Este usuario se encuentra inactivo. Contacte al Administrador."
              });
            }

            authenticatedUser = {
              name: String(row[0] || "Miembro Pastoral"),
              emailOrUser: String(row[1] || ""),
              role: String(row[3] || "Equipo Pastoral"),
              status: rowStatus
            };
            userRowIndex = i + 2;
            break;
          } else {
            return createJsonResponse({
              status: "unauthorized",
              message: "Contraseña incorrecta."
            });
          }
        }
      }

      if (!authenticatedUser) {
        return createJsonResponse({
          status: "unauthorized",
          message: "Usuario o correo electrónico no registrado."
        });
      }

      // Actualizar Último Acceso
      try {
        const nowString = Utilities.formatDate(new Date(), "America/Caracas", "dd/MM/yyyy HH:mm:ss");
        usersSheet.getRange(userRowIndex, 6).setValue(nowString);
      } catch (logErr) {}

      return createJsonResponse({
        status: "success",
        message: "Autenticación exitosa.",
        user: authenticatedUser
      });
    }

    // ==========================================
    // OPERACIONES SOBRE RESERVAS
    // ==========================================
    const sheet = getTargetSheet();
    const code = String(body.code || "").trim();

    if (!code && action !== "READ") {
      return createJsonResponse({ status: "error", message: "Código de reserva requerido" });
    }

    const lastRow = sheet.getLastRow();
    let rowIndex = -1;

    // Búsqueda del código de reserva en la Columna B (Fila 2 en adelante)
    if (lastRow > 1) {
      const codeValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (let i = 0; i < codeValues.length; i++) {
        if (String(codeValues[i][0]).trim() === code) {
          rowIndex = i + 2;
          break;
        }
      }
    }

    // 1. ACCIÓN: ELIMINAR REGISTRO
    if (action === "DELETE") {
      if (rowIndex === -1) {
        return createJsonResponse({ status: "not_found", message: "Reserva no encontrada para eliminar" });
      }
      sheet.deleteRow(rowIndex);
      return createJsonResponse({ status: "success", action: "DELETE", code: code });
    }

    // 2. ACCIÓN: ACTUALIZAR REGISTRO
    if (action === "UPDATE") {
      if (rowIndex === -1) {
        return createJsonResponse({ status: "not_found", message: "Reserva no encontrada para actualizar" });
      }

      const currentRow = sheet.getRange(rowIndex, 1, 1, 20).getValues()[0];

      const updatedRow = [
        body.timestamp !== undefined ? body.timestamp : currentRow[0],
        code,
        body.institutionType !== undefined ? body.institutionType : currentRow[2],
        body.institutionName !== undefined ? body.institutionName : currentRow[3],
        body.contactName !== undefined ? body.contactName : currentRow[4],
        body.phone !== undefined ? "'" + String(body.phone).replace(/^'/, "") : currentRow[5],
        body.email !== undefined ? body.email : currentRow[6],
        body.kitQuantity !== undefined ? Number(body.kitQuantity) : currentRow[7],
        body.aficheQuantity !== undefined ? Number(body.aficheQuantity) : currentRow[8],
        body.guiaQuantity !== undefined ? Number(body.guiaQuantity) : currentRow[9],
        body.hojaQuantity !== undefined ? Number(body.hojaQuantity) : currentRow[10],
        body.totalQuantity !== undefined ? Number(body.totalQuantity) : currentRow[11],
        body.totalEUR !== undefined ? Number(body.totalEUR) : currentRow[12],
        body.status !== undefined ? body.status : currentRow[13],
        body.paymentStatus !== undefined ? body.paymentStatus : currentRow[14],
        body.paymentMethod !== undefined ? body.paymentMethod : currentRow[15],
        body.paymentRef !== undefined ? body.paymentRef : currentRow[16],
        body.deliveryStatus !== undefined ? body.deliveryStatus : currentRow[17],
        body.deliveryDate !== undefined ? body.deliveryDate : currentRow[18],
        body.notes !== undefined ? body.notes : currentRow[19]
      ];

      sheet.getRange(rowIndex, 1, 1, 20).setValues([updatedRow]);
      return createJsonResponse({ status: "success", action: "UPDATE", code: code });
    }

    // 3. ACCIÓN: CREAR REGISTRO
    if (rowIndex !== -1) {
      return createJsonResponse({ status: "already_exists", message: "La reserva ya existe en el sistema", code: code });
    }

    const kitQty = Number(body.kitQuantity || 0);
    const aficheQty = Number(body.aficheQuantity || 0);
    const guiaQty = Number(body.guiaQuantity || 0);
    const hojaQty = Number(body.hojaQuantity || 0);
    const totalQty = Number(body.totalQuantity || (kitQty + aficheQty + guiaQty + hojaQty));

    const newRow = [
      body.timestamp || Utilities.formatDate(new Date(), "America/Caracas", "dd/MM/yyyy HH:mm"),
      code,
      body.institutionType || "Parroquia",
      body.institutionName || "",
      body.contactName || "",
      body.phone ? "'" + String(body.phone).replace(/^'/, "") : "",
      body.email || "",
      kitQty,
      aficheQty,
      guiaQty,
      hojaQty,
      totalQty,
      Number(body.totalEUR || 0),
      body.status || "Nueva Reserva",
      body.paymentStatus || "Pendiente",
      body.paymentMethod || "",
      body.paymentRef || "",
      body.deliveryStatus || "Por Imprimir / En Caracas",
      body.deliveryDate || "",
      body.notes || ""
    ];

    sheet.appendRow(newRow);
    return createJsonResponse({ status: "success", action: "CREATE", code: code });

  } catch (error) {
    return createJsonResponse({ status: "error", error: error.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
