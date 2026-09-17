# CRM & Dashboard de Reservas · Abrazo en Familia 2026
### Pastoral Familiar · Arquidiócesis de Maracaibo

Aplicación interactiva y Dashboard CRM para la gestión en tiempo real de reservas, pagos y despacho de materiales para la Campaña Abrazo en Familia 2026, sincronizado bidireccionalmente con Google Sheets mediante Google Apps Script (API REST).

---

## 🚀 Características Principales

1. **Dashboard de KPIs en Tiempo Real**:
   - Total de reservas registradas.
   - Monto total en Euros (€) y total recaudado/pagado.
   - Total de piezas solicitadas (Kits, Afiches, Guías del Facilitador, Hojas del Niño).
   - Reservas pendientes de cobro y monto pendiente.
   - Entregas pendientes por despachar o en Caracas.

2. **Gráficos Interactivos (Recharts)**:
   - Desglose de piezas para impresión y distribución.
   - Gráfico de dona con estados de pago (Pagado, Pendiente, Verificando).

3. **Gestión CRM & Tabla CRUD Completa**:
   - **Búsqueda Global**: por código, solicitante, parroquia/colegio, teléfono o correo.
   - **Filtros Rápidos**: por Tipo de institución, Estado de Pago y Estado de Entrega.
   - **Integración con WhatsApp**: botón directo en cada fila para abrir chat con mensaje personalizado citando el código de reserva y estado del pago.
   - **Acciones Rápidas en Línea**: cambio inmediato de Estado de Reserva, Pago y Entrega directamente desde los selectores de la tabla.
   - **Modal de Edición**: para registrar método de pago, referencia bancaria, fecha de entrega y notas internas.
   - **Modal de Nueva Reserva**: cálculo en tiempo real del total de piezas y monto en Euros.
   - **Eliminación con Confirmación**: remueve la fila de la hoja de Google Sheets.
   - **Exportación CSV**: descarga con un clic la base de datos limpia con codificación UTF-8 BOM.

4. **Acceso Discreto al CRM**:
   - Botón minimalista `CRM` en la barra de navegación superior que permite al equipo pastoral alternar entre el portal público de reservas y el panel administrativo interno.

---

## 📋 Estructura de Columnas en Google Sheets

La hoja **"Reservas CRM"** contiene las siguientes columnas:

| Columna | Nombre de Campo | Tipo | Ejemplo |
|---|---|---|---|
| A | Fecha y Hora | String / Date | 17/09/2026 8:44 |
| B | Código Reserva | ID Único | AEF26-1483 |
| C | Tipo | Categoria | Parroquia / Colegio |
| D | Parroquia o Colegio | Texto | Basílica Ntra. Sra. de Chiquinquirá |
| E | Solicitante | Texto | Edgar Morales |
| F | Teléfono (WhatsApp) | Texto | '04146222721 |
| G | Correo Electrónico | Email | pastoral@ejemplo.com |
| H | Kits Completos | Número | 3 |
| I | Afiches | Número | 2 |
| J | Guías Facilitador | Número | 1 |
| K | Hojas del Niño | Número | 0 |
| L | Total Piezas | Número | 6 |
| M | Monto Total (€) | Número EUR | 31 |
| N | Estado de Reserva | Select | Nueva Reserva / En Proceso / Confirmada / Cancelada |
| O | Estado del Pago | Select | Pendiente / Pagado / Verificando |
| P | Método de Pago | Texto | Transferencia / Pago Móvil / Efectivo |
| Q | Referencia de Pago | Texto | 12345678 |
| R | Estado de Entrega | Select | Por Imprimir / En Caracas / Enviado / Entregado |
| S | Fecha de Entrega | Fecha | 25/10/2026 |
| T | Notas y Observaciones| Texto | Observaciones internas |

---

## 🔐 Control de Acceso & Tabla "Usuarios CRM"

El script `Code.gs` inicializa automáticamente una segunda hoja de cálculo llamada **"Usuarios CRM"** para el control de acceso del equipo arquidiocesano:

| Columna | Nombre de Campo | Descripción | Ejemplo |
|---|---|---|---|
| A | Nombre Completo | Nombre del miembro del equipo | Secretariado de Pastoral Familiar |
| B | Correo / Usuario | Correo o nombre de usuario | `lapastoralfamiliar.mcbo@gmail.com` |
| C | Contraseña / Clave | Contraseña de acceso | `pastoral2026` |
| D | Rol | Nivel de permisos | Administrador / Equipo Pastoral / Auditor |
| E | Estado | Estatus de la cuenta | Activo / Inactivo |
| F | Último Acceso | Registro de auditoría | 17/09/2026 10:15:30 |

### Cuentas preconfiguradas por defecto:
1. **Administrador**:
   - Usuario/Correo: `lapastoralfamiliar.mcbo@gmail.com`
   - Contraseña: `pastoral2026`
   - Rol: `Administrador`
2. **Equipo Pastoral**:
   - Usuario/Correo: `pastoral.maracaibo`
   - Contraseña: `familia2026`
   - Rol: `Equipo Pastoral`

> **Nota**: Puedes agregar nuevos miembros o cambiar contraseñas directamente en la pestaña **"Usuarios CRM"** de tu hoja de Google Sheets en cualquier momento.

---

## ⚙️ Guía de Configuración e Implementación

### 1. Configurar Google Apps Script (Backend)
1. Abre tu hoja de cálculo en Google Sheets: **Reservas Abrazo en Familia 2026**.
2. En el menú superior haz clic en: **Extensiones** ➔ **Apps Script**.
3. En el archivo `Code.gs` (o `Código.gs`), copia y pega el código completo que se encuentra en el archivo `Code.gs` de este repositorio.
4. Si deseas configurar los permisos del manifiesto, ve a **Configuración del proyecto** y marca *"Mostrar el archivo de manifiesto appsscript.json en el editor"*, luego pega el contenido de `appsscript.json`.
5. Arriba a la derecha, haz clic en **Implementar** ➔ **Gestionar implementaciones** (o **Nueva implementación**):
   - Tipo: **Aplicación web**.
   - Descripción: `API CRM Abrazo en Familia 2026`.
   - Ejecutar como: **Yo (tu cuenta de Google)**.
   - Quién tiene acceso: 👉 **Cualquier persona** *(Anyone)*.
6. Haz clic en **Implementar** y copia la **URL de la aplicación web** generada (termina en `/exec`).

### 2. Configurar Variables de Entorno

Crea o actualiza el archivo `.env.local`:

```env
NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
VITE_GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
```

> **Nota de Seguridad**: Nunca incluyas claves de API de administración privada ni credenciales en el cliente. La URL de la Web App de Google Apps Script está configurada con acceso anónimo público únicamente para ejecutar las funciones definidas en `Code.gs`.

---

## 🌐 Despliegue en Vercel & GitHub

### Paso 1: Subir el proyecto a GitHub
```bash
git init
git add .
git commit -m "feat: CRM y Dashboard de Reservas Abrazo en Familia 2026"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### Paso 2: Importar en Vercel
1. Ingresa a [Vercel](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** ➔ **"Project"**.
3. Selecciona tu repositorio de GitHub y haz clic en **Import**.
4. En la sección **Environment Variables**, añade:
   - `NEXT_PUBLIC_GAS_API_URL` = `https://script.google.com/macros/s/TU_SCRIPT_ID/exec`
   - `VITE_GOOGLE_SHEETS_WEBHOOK_URL` = `https://script.google.com/macros/s/TU_SCRIPT_ID/exec`
5. Haz clic en **Deploy**. Cada vez que hagas `git push` a la rama `main`, Vercel compilará y actualizará el sitio automáticamente en producción.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 19 / Vite / TypeScript.
- **Estilos**: Tailwind CSS 4.
- **Gráficos**: Recharts.
- **Iconos**: Lucide React.
- **Base de Datos**: Google Sheets API REST (Google Apps Script).
