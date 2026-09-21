/**
 * BACKEND GOOGLE APPS SCRIPT (GAS) - CRM ABRAZO EN FAMILIA 2026
 * Pastoral Familiar · Arquidiócesis de Maracaibo
 *
 * Conexión bidireccional entre la SPA y Google Sheets.
 * Soporta autenticación de miembros del equipo, CRUD de reservas, gestión de pagos y sincronización.
 */

const SHEET_NAME = "Reservas CRM";
const USERS_SHEET_NAME = "Usuarios CRM";
const PAYMENTS_SHEET_NAME = "Pagos Reportados";
const INVENTORY_SHEET_NAME = "Inventario y Despachos";
const AUDIT_SHEET_NAME = "Historial y Auditoría";

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
 * Inicializa y configura todas las hojas necesarias en Google Sheets:
 * 1. Reservas CRM (Base central de pedidos y cotizaciones)
 * 2. Pagos Reportados (Histórico de transacciones bancarias, referencias, comprobantes y validaciones)
 * 3. Inventario y Despachos (Control logístico de materiales: kits, guías, afiches, hojas y estados de entrega)
 * 4. Usuarios CRM (Miembros autorizados y accesos)
 * 5. Historial y Auditoría (Bitácora de cambios y trazabilidad de acciones)
 */
function initializeAllRequiredSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const createdSheets = [];
  const existingSheets = [];

  // ==========================================
  // 1. Hoja "Reservas CRM"
  // ==========================================
  let reservasSheet = ss.getSheetByName(SHEET_NAME);
  if (!reservasSheet) {
    reservasSheet = ss.insertSheet(SHEET_NAME, 0);
    reservasSheet.appendRow([
      "Fecha / Hora",
      "Código",
      "Tipo Institución",
      "Parroquia / Colegio",
      "Solicitante",
      "Teléfono",
      "Correo Electrónico",
      "Kits",
      "Afiches",
      "Guías",
      "Hojas Niños",
      "Total Piezas",
      "Total EUR",
      "Estado Reserva",
      "Estado Pago",
      "Método de Pago",
      "Nro. Referencia",
      "Fecha del Pago",
      "Comprobante Pago",
      "Estado Entrega",
      "Fecha Entrega",
      "Notas / Observaciones"
    ]);
    reservasSheet.getRange(1, 1, 1, 22)
      .setFontWeight("bold")
      .setBackground("#78350f")
      .setFontColor("#ffffff");
    reservasSheet.setFrozenRows(1);
    createdSheets.push(SHEET_NAME);
  } else {
    existingSheets.push(SHEET_NAME);
    // Verificar si faltan columnas nuevas en Reservas CRM (Fecha Pago y Comprobante)
    const lastCol = reservasSheet.getLastColumn();
    if (lastCol < 22 && reservasSheet.getLastRow() >= 1) {
      const headers = reservasSheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];
      const headerStr = headers.join(" ").toLowerCase();
      if (!headerStr.includes("comprobante") && !headerStr.includes("fecha del pago")) {
        // Asegurar encabezados completos
        reservasSheet.getRange(1, 18, 1, 2).setValues([["Fecha del Pago", "Comprobante Pago"]]);
        reservasSheet.getRange(1, 18, 1, 2)
          .setFontWeight("bold")
          .setBackground("#78350f")
          .setFontColor("#ffffff");
      }
    }
  }

  // ==========================================
  // 2. Hoja "Pagos Reportados"
  // ==========================================
  let pagosSheet = ss.getSheetByName(PAYMENTS_SHEET_NAME);
  if (!pagosSheet) {
    pagosSheet = ss.insertSheet(PAYMENTS_SHEET_NAME);
    pagosSheet.appendRow([
      "Fecha Registro",
      "Código Reserva",
      "Institución / Solicitante",
      "Monto Total EUR",
      "Método de Pago",
      "Nro. Referencia Bancaria",
      "Fecha del Pago",
      "Estado del Pago",
      "Comprobante (Imagen/Enlace)",
      "Verificado Por",
      "Notas del Pago"
    ]);
    pagosSheet.getRange(1, 1, 1, 11)
      .setFontWeight("bold")
      .setBackground("#065f46") // Verde esmeralda bancario
      .setFontColor("#ffffff");
    pagosSheet.setFrozenRows(1);
    createdSheets.push(PAYMENTS_SHEET_NAME);
  } else {
    existingSheets.push(PAYMENTS_SHEET_NAME);
  }

  // ==========================================
  // 3. Hoja "Inventario y Despachos"
  // ==========================================
  let inventarioSheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
  if (!inventarioSheet) {
    inventarioSheet = ss.insertSheet(INVENTORY_SHEET_NAME);
    inventarioSheet.appendRow([
      "Fecha Actualización",
      "Código Reserva",
      "Tipo Institución",
      "Parroquia / Colegio",
      "Responsable Retiro",
      "Teléfono Contacto",
      "Kits Asignados",
      "Afiches Asignados",
      "Guías Asignadas",
      "Hojas Asignadas",
      "Total Piezas",
      "Estado Entrega",
      "Fecha Prevista / Efectiva",
      "Lugar de Entrega / Despacho",
      "Observaciones de Despacho"
    ]);
    inventarioSheet.getRange(1, 1, 1, 15)
      .setFontWeight("bold")
      .setBackground("#1e40af") // Azul logístico
      .setFontColor("#ffffff");
    inventarioSheet.setFrozenRows(1);
    createdSheets.push(INVENTORY_SHEET_NAME);
  } else {
    existingSheets.push(INVENTORY_SHEET_NAME);
  }

  // ==========================================
  // 4. Hoja "Usuarios CRM"
  // ==========================================
  let userSheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!userSheet) {
    getUsersSheet();
    createdSheets.push(USERS_SHEET_NAME);
  } else {
    existingSheets.push(USERS_SHEET_NAME);
  }

  // ==========================================
  // 5. Hoja "Historial y Auditoría"
  // ==========================================
  let auditSheet = ss.getSheetByName(AUDIT_SHEET_NAME);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(AUDIT_SHEET_NAME);
    auditSheet.appendRow([
      "Fecha y Hora",
      "Usuario / Operador",
      "Acción Realizada",
      "Código Afectado",
      "Detalle del Cambio",
      "IP / Origen"
    ]);
    auditSheet.getRange(1, 1, 1, 6)
      .setFontWeight("bold")
      .setBackground("#374151") // Gris pizarra auditoría
      .setFontColor("#ffffff");
    auditSheet.setFrozenRows(1);

    // Registrar evento de creación inicial
    auditSheet.appendRow([
      Utilities.formatDate(new Date(), "America/Caracas", "dd/MM/yyyy HH:mm:ss"),
      "Sistema Pastoral Familiar",
      "SETUP_SHEETS",
      "SISTEMA",
      "Estructura multi-pestaña inicializada correctamente",
      "CRM Web"
    ]);

    createdSheets.push(AUDIT_SHEET_NAME);
  } else {
    existingSheets.push(AUDIT_SHEET_NAME);
  }

  return {
    success: true,
    message: "Verificación y creación de hojas completada con éxito.",
    createdSheets: createdSheets,
    existingSheets: existingSheets,
    allSheets: [SHEET_NAME, PAYMENTS_SHEET_NAME, INVENTORY_SHEET_NAME, USERS_SHEET_NAME, AUDIT_SHEET_NAME]
  };
}

/**
 * Sincroniza o registra una transacción en la pestaña "Pagos Reportados"
 */
function recordPaymentInPaymentsSheet(body) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let pagosSheet = ss.getSheetByName(PAYMENTS_SHEET_NAME);
    if (!pagosSheet) {
      initializeAllRequiredSheets();
      pagosSheet = ss.getSheetByName(PAYMENTS_SHEET_NAME);
    }
    if (!pagosSheet) return;

    const code = String(body.code || "").trim();
    if (!code) return;

    const lastRow = pagosSheet.getLastRow();
    let rowIndex = -1;

    if (lastRow > 1) {
      const codeValues = pagosSheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (let i = 0; i < codeValues.length; i++) {
        if (String(codeValues[i][0]).trim() === code) {
          rowIndex = i + 2;
          break;
        }
      }
    }

    const receiptDisplay = body.paymentReceipt
      ? (String(body.paymentReceipt).startsWith("data:image")
          ? "Imagen Adjunta en Sistema (" + Math.round(body.paymentReceipt.length / 1024) + " KB)"
          : String(body.paymentReceipt))
      : "";

    const paymentRowData = [
      body.timestamp || Utilities.formatDate(new Date(), "America/Caracas", "dd/MM/yyyy HH:mm"),
      code,
      (body.institutionName || "") + " - " + (body.contactName || ""),
      Number(body.totalEUR || 0),
      body.paymentMethod || "Pago Móvil",
      body.paymentRef || "",
      body.paymentDate || "",
      body.paymentStatus || "Pendiente",
      receiptDisplay,
      body.updatedBy || "Operador CRM",
      body.notes || ""
    ];

    if (rowIndex > 1) {
      pagosSheet.getRange(rowIndex, 1, 1, 11).setValues([paymentRowData]);
    } else {
      pagosSheet.appendRow(paymentRowData);
    }
  } catch (err) {
    Logger.log("Error al sincronizar con Pagos Reportados: " + err);
  }
}

/**
 * Sincroniza el despacho y logística en la pestaña "Inventario y Despachos"
 */
function recordDispatchInInventorySheet(body) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let invSheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
    if (!invSheet) {
      initializeAllRequiredSheets();
      invSheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
    }
    if (!invSheet) return;

    const code = String(body.code || "").trim();
    if (!code) return;

    const lastRow = invSheet.getLastRow();
    let rowIndex = -1;

    if (lastRow > 1) {
      const codeValues = invSheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (let i = 0; i < codeValues.length; i++) {
        if (String(codeValues[i][0]).trim() === code) {
          rowIndex = i + 2;
          break;
        }
      }
    }

    const kitQty = Number(body.kitQuantity || 0);
    const aficheQty = Number(body.aficheQuantity || 0);
    const guiaQty = Number(body.guiaQuantity || 0);
    const hojaQty = Number(body.hojaQuantity || 0);
    const totalQty = Number(body.totalQuantity || (kitQty + aficheQty + guiaQty + hojaQty));

    const dispatchRowData = [
      body.timestamp || Utilities.formatDate(new Date(), "America/Caracas", "dd/MM/yyyy HH:mm"),
      code,
      body.institutionType || "Parroquia",
      body.institutionName || "",
      body.contactName || "",
      body.phone ? "'" + String(body.phone).replace(/^'/, "") : "",
      kitQty,
      aficheQty,
      guiaQty,
      hojaQty,
      totalQty,
      body.deliveryStatus || "Por Imprimir / En Caracas",
      body.deliveryDate || "",
      "Sede Arquidiócesis de Maracaibo",
      body.notes || ""
    ];

    if (rowIndex > 1) {
      invSheet.getRange(rowIndex, 1, 1, 15).setValues([dispatchRowData]);
    } else {
      invSheet.appendRow(dispatchRowData);
    }
  } catch (err) {
    Logger.log("Error al sincronizar con Inventario y Despachos: " + err);
  }
}

/**
 * Registra un evento en la pestaña "Historial y Auditoría"
 */
function recordAuditLog(operator, action, code, detail) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let auditSheet = ss.getSheetByName(AUDIT_SHEET_NAME);
    if (!auditSheet) {
      initializeAllRequiredSheets();
      auditSheet = ss.getSheetByName(AUDIT_SHEET_NAME);
    }
    if (!auditSheet) return;

    auditSheet.appendRow([
      Utilities.formatDate(new Date(), "America/Caracas", "dd/MM/yyyy HH:mm:ss"),
      operator || "Usuario Pastoral",
      action,
      code || "N/A",
      detail || "",
      "CRM Web"
    ]);
  } catch (err) {}
}

/**
 * Endpoint GET: Devuelve reservas, usuarios, pagos o estado de configuración
 */
function doGet(e) {
  try {
    const sheetParam = (e && e.parameter && e.parameter.sheet) ? String(e.parameter.sheet).toLowerCase() : "reservas";

    // Si se solicita verificación o inicialización de hojas vía GET
    if (sheetParam === "setup" || sheetParam === "init" || sheetParam === "check_sheets") {
      const initResult = initializeAllRequiredSheets();
      return createJsonResponse(initResult);
    }

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

    const values = sheet.getRange(2, 1, lastRow - 1, Math.max(lastCol, 22)).getValues();

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
        paymentDate: row[17] instanceof Date ? Utilities.formatDate(row[17], "America/Caracas", "yyyy-MM-dd") : String(row[17] || ""),
        paymentReceipt: String(row[18] || ""),
        deliveryStatus: String(row[19] || "Por Imprimir / En Caracas"),
        deliveryDate: row[20] instanceof Date ? Utilities.formatDate(row[20], "America/Caracas", "dd/MM/yyyy") : String(row[20] || ""),
        notes: String(row[21] || "")
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
 * Endpoint POST: Maneja SETUP_SHEETS, LOGIN, CREATE, UPDATE, DELETE y sincronización
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
    // 0. ACCIÓN: SETUP_SHEETS (Crear hojas faltantes)
    // ==========================================
    if (action === "SETUP_SHEETS" || action === "INIT_SHEETS") {
      const result = initializeAllRequiredSheets();
      recordAuditLog(body.operator || "Administrador", "SETUP_SHEETS", "GLOBAL", "Hojas creadas o verificadas exitosamente");
      return createJsonResponse({
        status: "success",
        action: "SETUP_SHEETS",
        ...result
      });
    }

    // ==========================================
    // 1. ACCIÓN: AUTENTICACIÓN / LOGIN DE USUARIOS
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
        recordAuditLog(authenticatedUser.name, "LOGIN", "N/A", "Inicio de sesión exitoso");
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
      recordAuditLog(body.operator || "Operador", "DELETE", code, "Reserva eliminada del sistema");
      return createJsonResponse({ status: "success", action: "DELETE", code: code });
    }

    // 2. ACCIÓN: ACTUALIZAR REGISTRO
    if (action === "UPDATE") {
      if (rowIndex === -1) {
        return createJsonResponse({ status: "not_found", message: "Reserva no encontrada para actualizar" });
      }

      const currentRow = sheet.getRange(rowIndex, 1, 1, 22).getValues()[0];

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
        body.paymentDate !== undefined ? body.paymentDate : (currentRow[17] || ""),
        body.paymentReceipt !== undefined ? body.paymentReceipt : (currentRow[18] || ""),
        body.deliveryStatus !== undefined ? body.deliveryStatus : currentRow[19],
        body.deliveryDate !== undefined ? body.deliveryDate : currentRow[20],
        body.notes !== undefined ? body.notes : currentRow[21]
      ];

      sheet.getRange(rowIndex, 1, 1, 22).setValues([updatedRow]);

      // Sincronizar automáticamente en las hojas relacionadas (Pagos e Inventario)
      recordPaymentInPaymentsSheet({ ...body, code: code });
      recordDispatchInInventorySheet({ ...body, code: code });
      recordAuditLog(body.operator || "Operador", "UPDATE", code, "Actualización: Pago=" + (body.paymentStatus || "N/A") + ", Entrega=" + (body.deliveryStatus || "N/A"));

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
      body.paymentMethod || "Pago Móvil",
      body.paymentRef || "",
      body.paymentDate || "",
      body.paymentReceipt || "",
      body.deliveryStatus || "Por Imprimir / En Caracas",
      body.deliveryDate || "",
      body.notes || ""
    ];

    sheet.appendRow(newRow);

    // Sincronizar automáticamente en las hojas de Pagos Reportados e Inventario
    recordPaymentInPaymentsSheet(body);
    recordDispatchInInventorySheet(body);
    recordAuditLog(body.operator || "Público/Operador", "CREATE", code, "Nueva reserva registrada por " + (body.institutionName || ""));

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
