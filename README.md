# Gestión de Obras — Estructuras Humanizadoras (web, multiusuario, Supabase)

App de administración para Estructuras Humanizadoras: clientes, obras,
facturas de venta y de compra, abonos/anticipos, presupuestos, personal
(empleados y autónomos), nóminas e incidencias. Toda la operación es
**compartida por todo el equipo**: Sindy y cualquier persona con cuenta ven
y editan los mismos datos, en tiempo real, tanto desde el ordenador como
desde el móvil (interfaz responsive).

## 1. Crear el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta / inicia sesión.
2. "New project" → elige un nombre (ej. `estructuras-humanizadoras`), una
   contraseña de base de datos (guárdala) y la región más cercana.
3. Espera a que se aprovisione (1-2 minutos).
4. Ve a **Project Settings → API** y copia:
   - `Project URL` → será `VITE_SUPABASE_URL`
   - `anon public` key → será `VITE_SUPABASE_ANON_KEY`

## 2. Cargar el esquema de base de datos

1. En el panel de Supabase, ve a **SQL Editor**.
2. Abre el archivo [`supabase/schema.sql`](./supabase/schema.sql) de este
   proyecto, copia todo su contenido y pégalo en el editor SQL.
3. Ejecuta (`Run`). Esto crea todas las tablas, activa Row Level Security,
   crea el bucket de Storage `documentos` para los adjuntos de facturas
   (PDF/fotos) y añade las tablas a la publicación de Realtime para que los
   cambios de un usuario se vean en el momento en las pantallas de los demás.

   Si el proyecto de Supabase **ya estaba en uso** antes de este cambio
   (obras/facturas de compra creadas con la versión anterior), `schema.sql`
   no basta — hay que ejecutar además, una sola vez,
   [`supabase/migration_002_compras_lineas.sql`](./supabase/migration_002_compras_lineas.sql)
   en el SQL Editor, para añadir la ciudad de las obras y pasar las facturas
   de compra a líneas de producto.

El modelo de seguridad es: **cualquier usuario autenticado tiene acceso
completo de lectura/escritura** a todas las tablas. No hay aislamiento por
usuario porque la operación es compartida por el equipo — el control de
acceso real se hace decidiendo quién puede tener una cuenta (paso siguiente).

## 3. Configurar el acceso de usuarios (importante)

Por defecto, Supabase permite que cualquiera se registre desde el formulario
de "Crear cuenta" de la app, y como el acceso es compartido, **cualquier
cuenta nueva vería toda la operación**. Se recomienda:

1. Ve a **Authentication → Providers → Email** y desactiva "Allow new users
   to sign up" una vez que Sindy y su equipo ya tengan cuenta.
2. Para añadir gente al equipo, usa **Authentication → Users → Invite user**
   (les llega un email para poner su contraseña), en lugar de dejar que se
   registren solos.
3. Si prefieres exigir verificación de email antes de poder entrar, actívalo
   en **Authentication → Providers → Email → Confirm email**.

## 4. Configurar el proyecto localmente

```bash
cd estructuras-humanizadoras
npm install
cp .env.example .env
# Edita .env con tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

Abre la URL que indique Vite (normalmente `http://localhost:5173`). La
primera vez, crea la cuenta de Sindy desde la pantalla de login (o pide que
te inviten si ya has desactivado el registro público).

## 5. Compilar para producción

```bash
npm run build
```

Esto genera la carpeta `dist/` lista para desplegar en cualquier hosting
estático (Vercel, Netlify, Cloudflare Pages…). Recuerda configurar
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como variables de entorno del
hosting elegido (con el mismo prefijo `VITE_`). Al ser una web responsive,
funciona igual en el ordenador de Sindy que en su móvil — no hace falta
instalar nada aparte, basta con abrir la URL en el navegador (y se puede
"Añadir a pantalla de inicio" para que se comporte como una app).

## Qué incluye

- **Clientes** — ficha con NIF, contacto y obras vinculadas.
- **Obras** — proyecto/servicio por cliente, con ciudad, estado (presupuesto,
  activa, finalizada, cancelada), filtro por ciudad, y un detalle que resume
  lo facturado, cobrado, gastado y el margen de cada obra.
- **Facturas de venta** — ingresos a clientes: serie/número, base + IVA,
  si está cobrada y por qué medio, y un marcador de **"cobro en B"** para
  el control interno de Sindy (no se declara nada automáticamente; es solo
  visibilidad de caja).
- **Facturas de compra** — cabecera (fecha, año/trimestre, obra o categoría
  de insumo general —gasolina, mantenimiento, material general,
  autónomo/subcontrata, otro—, nº de factura, comercio) con sus **líneas de
  producto** (cantidad, precio unidad, IVA, precio con IVA, importe), método
  de pago y adjunto del ticket/factura (PDF o foto).
- **Abonos y anticipos** — pagos de clientes no vinculados a una factura
  concreta (anticipos de inicio de obra, entregas a cuenta…).
- **Presupuestos** — cabecera + líneas (concepto, cantidad, precio), con
  estado (borrador/enviado/aceptado/rechazado) y un botón para generar una
  vista imprimible/PDF desde el navegador.
- **Personal** — empleados y autónomos que trabajan para la empresa.
- **Nóminas** — liquidaciones periódicas del personal empleado.
- **Incidencias** — daños o sobrecostes por no seguir el protocolo de obra
  (medidas, fotografías…), con el coste estimado y si lo asume la persona
  responsable o la empresa (esto último sí computa como gasto de la obra).
- **Caja** — dinero entregado en efectivo a un empleado para comprar algo,
  y qué parte ya está justificada con facturas de compra (y qué falta).
  Muestra el saldo de caja: cobrado en efectivo − gastos directos en
  efectivo − entregas a personal.
- **Panorama** — facturado/gastado del mes, margen, pendientes de cobro y
  pago, saldo de caja, desglose de cobros/gastos por método (efectivo,
  tarjeta, transferencia, en cuenta) y evolución anual.
- **Importar Excel** — sube un Excel de facturas de venta, de compra o de
  nóminas; la app detecta la fila de cabeceras, sugiere a qué campo
  corresponde cada columna y avisa si el importe no se ha mapeado bien
  antes de dejar importar.
- **Exportar a Excel** — descarga de todo lo anterior en un único archivo,
  incluida una hoja "Ingresos y Egresos" en orden cronológico con las
  cuentas contables (Debe/Haber, códigos orientativos del plan contable
  español) que afecta cada movimiento, pensada para pasarla a la gestoría.

## Sobre el archivo de partida

El punto de partida fue el Excel de gestión de cobros y facturas que Sindy
ya llevaba (hojas de Ingresos, Gastos, Nóminas y Registro Total). Esta app
digitaliza ese mismo registro con una tabla por concepto (clientes, obras,
facturas, nóminas…) en lugar de filas sueltas en una hoja de cálculo, para
poder relacionar cada gasto e ingreso con la obra a la que pertenece y ver
el margen real de cada trabajo, no solo el total del mes.

## Estructura del proyecto

```
supabase/schema.sql        Esquema completo: tablas, RLS, Storage, Realtime
src/
  supabaseClient.js         Cliente de Supabase
  hooks/
    useAuth.js               Sesión y login/registro
    useData.js                Toda la lógica de datos (CRUD + realtime)
    useDocuments.js            Subida/descarga de adjuntos (facturas)
  lib/
    utils.js, constants.js    Helpers y constantes (formato, fechas…)
    computations.js           Cálculos derivados (márgenes por obra, panorama)
    excelExport.js            Exportación a Excel
  components/
    Auth/Login.jsx
    Sidebar.jsx
    common/                  Modal, Field
    forms/                   Un formulario por entidad
    tabs/                    Una pestaña por sección de la app
```
