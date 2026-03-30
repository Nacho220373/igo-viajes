
/**
 * ==================================================
 * API REST "IGO VIAJES" - VERSIÓN FINAL PRO (CLEAN ARCHITECTURE)
 * ==================================================
 * - Manejo de Sesiones Híbridas (Admin/Cliente/Pasajero)
 * - Lógica Financiera P&L (Utilidad Real vs Presupuestada)
 * - Estado de Cuenta Unificado (Servicios = Cargo / Pagos = Abono)
 * - Soporte para IVA y Facturación
 * - UPDATE: SOPORTE MULTI-TELÉFONO EN PASAJEROS Y PROVEEDORES
 * - UPDATE: GESTIÓN DE CUENTAS DE EMPRESA
 * - UPDATE: MULTI-SELECCIÓN EN ESTADOS DE CUENTA (CORREGIDO)
 * - NUEVO (Opción B): Endpoint obtenerViajesPorClientes (multicliente)
 */

const ID_HOJA = SpreadsheetApp.getActiveSpreadsheet().getId(); 

// ==========================================
// 1. HELPER: MAPEO DINÁMICO DE COLUMNAS
// ==========================================
function obtenerMapaColumnas(hoja) {
  const ultimaColumna = hoja.getLastColumn();
  if (ultimaColumna === 0) return {};
    
  const encabezados1 = hoja.getRange(1, 1, 1, ultimaColumna).getValues()[0];
  const encabezados2 = hoja.getRange(2, 1, 1, ultimaColumna).getValues()[0];
    
  let mapa = {};
    
  encabezados1.forEach((titulo, index) => {
    if (titulo) mapa[titulo.toString().trim()] = index; 
  });
    
  encabezados2.forEach((titulo, index) => {
    if (titulo) {
        const key = titulo.toString().trim();
        // Prioridad a encabezados secundarios específicos
        if (!mapa[key] || key === "Moneda" || key === "Tipo") {
            mapa[key] = index;
        }
    }
  });
    
  return mapa;
}

// ==========================================
// HELPER: PARSEO DE FECHAS UNIVERSAL
// ==========================================
function formatearFechaUniversal(fechaVal) {
  if (!fechaVal) return "";
  
  // 1. Si Google Sheets ya lo detectó como objeto Date
  if (fechaVal instanceof Date) {
    const year = fechaVal.getFullYear();
    const month = String(fechaVal.getMonth() + 1).padStart(2, '0');
    const day = String(fechaVal.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // 2. Si viene como texto (ej. "29/8/1964")
  let str = String(fechaVal).trim();
  if (str.includes('/')) {
    let partes = str.split('/');
    // Asumimos formato Latino: DD/MM/YYYY
    if (partes.length === 3) {
      let dia = partes[0].padStart(2, '0');
      let mes = partes[1].padStart(2, '0');
      let anio = partes[2];
      
      // Validamos que el año tenga 4 dígitos por seguridad
      if (anio.length === 4) {
        return `${anio}-${mes}-${dia}`;
      }
    }
  }
  
  // 3. Intento de parseo nativo final (por si acaso viene como YYYY-MM-DD string)
  let objDate = new Date(str);
  if (!isNaN(objDate.getTime())) {
    const year = objDate.getFullYear();
    const month = String(objDate.getMonth() + 1).padStart(2, '0');
    const day = String(objDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return str; // Si todo falla, devolvemos lo que llegó original
}

// ==========================================
// 2. ENRUTADOR PRINCIPAL (DOPOST)
// ==========================================
function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return output.setContent(JSON.stringify({ exito: false, error: "No data received" }));
    }

    const datos = JSON.parse(e.postData.contents);
    const accion = datos.accion;
    let respuesta = {};

    // --- AUTENTICACIÓN Y CONFIG ---
    if (accion === 'login') respuesta = verificarLogin(datos.correo, datos.password);
    else if (accion === 'registrarUsuario') respuesta = registrarUsuario(datos);
    else if (accion === 'obtenerConfiguracion') respuesta = obtenerConfiguracion();
      
    // --- LECTURA DE DATOS ---
    else if (accion === 'obtenerCotizaciones') respuesta = obtenerCotizaciones(datos.rol);
    else if (accion === 'obtenerViajes') respuesta = obtenerViajes(datos.idUsuario, datos.rol);
    else if (accion === 'obtenerDetallesViaje') respuesta = obtenerDetallesViaje(datos.idViaje);
    else if (accion === 'obtenerEstatusVuelo') respuesta = obtenerEstatusVuelo(datos.codigoVuelo, datos.fecha);
    else if (accion === 'obtenerInfoViaje') respuesta = obtenerInfoViaje(datos.idViaje);
    else if (accion === 'obtenerClientes') respuesta = obtenerClientes(datos.rol); 
    else if (accion === 'obtenerPasajeros') respuesta = obtenerPasajeros(datos.rol);
    else if (accion === 'obtenerListas') respuesta = obtenerListas(); 
    else if (accion === 'obtenerNacionalidades') respuesta = obtenerNacionalidades();
    else if (accion === 'obtenerUsuariosLibres') respuesta = obtenerUsuariosLibres(); 
    else if (accion === 'obtenerProveedores') respuesta = obtenerProveedores();

    // --- NUEVO (Opción B): VIAJES POR LISTA DE CLIENTES ---
    else if (accion === 'obtenerViajesPorClientes') respuesta = obtenerViajesPorClientes(datos.idClientes);

    // --- ESCRITURA (CRUDS) ---
    else if (accion === 'agregarCotizacion') respuesta = agregarCotizacion(datos.cotizacion);
    else if (accion === 'editarCotizacion') respuesta = editarCotizacion(datos.cotizacion);
    else if (accion === 'eliminarCotizacion') respuesta = eliminarCotizacion(datos.idCotizacion);
    else if (accion === 'agregarCliente') respuesta = agregarCliente(datos.cliente); 
    else if (accion === 'agregarPasajero') respuesta = agregarPasajero(datos.pasajero);
    else if (accion === 'agregarViaje') respuesta = agregarViaje(datos.viaje); 
    else if (accion === 'agregarServicio') respuesta = agregarServicio(datos.servicio); 
    else if (accion === 'editarServicio') respuesta = editarServicio(datos.servicio);    
    else if (accion === 'eliminarServicio') respuesta = eliminarServicio(datos.idServicio, datos.idPasajero);
    else if (accion === 'agregarProveedor') respuesta = agregarProveedor(datos.proveedor);
    else if (accion === 'editarProveedor') respuesta = editarProveedor(datos.proveedor);
    else if (accion === 'eliminarProveedor') respuesta = eliminarProveedor(datos.idProveedor);
    else if (accion === 'editarPerfilCliente') respuesta = editarPerfilCliente(datos.cliente);
    else if (accion === 'editarPasajero') respuesta = editarPasajero(datos.pasajero);
    else if (accion === 'desvincularPasajero') respuesta = desvincularPasajero(datos.idPasajero, datos.idCliente);
    // NUEVO: GESTIÓN DE DOCUMENTOS
    else if (accion === 'subirDocumento') respuesta = subirDocumento(datos);
    else if (accion === 'eliminarDocumento') respuesta = eliminarDocumento(datos.idDocumento);
    // NUEVO: AGREGAR CUENTA
    else if (accion === 'agregarCuentaEmpresa') respuesta = agregarCuentaEmpresa(datos);

    // --- BULK UPLOAD ---
    else if (accion === 'procesarUploadMasivo') respuesta = procesarUploadMasivo(datos.datos, datos.erroresIgnorados);
    else if (accion === 'obtenerEstadisticasEntidades') respuesta = obtenerEstadisticasEntidades();

    // --- FINANZAS Y REPORTES ---
    else if (accion === 'obtenerListasFinancieras') respuesta = obtenerListasFinancieras();
    else if (accion === 'obtenerFinanzasViaje') respuesta = obtenerFinanzasViaje(datos.idViaje);
    else if (accion === 'obtenerResumenFinancieroViaje') respuesta = obtenerResumenFinancieroViaje(datos.idViaje);
    else if (accion === 'registrarTransaccion') respuesta = registrarTransaccion(datos.transaccion);
    else if (accion === 'obtenerSaldoCliente') respuesta = obtenerSaldoCliente(datos.idCliente);
    else if (accion === 'obtenerEstadoCuentaGlobal') respuesta = obtenerEstadoCuentaGlobal(datos.idCliente, datos.idViaje);
    else if (accion === 'obtenerTodasTransacciones') respuesta = obtenerTodasTransacciones(datos.rol);
    else if (accion === 'editarTransaccion') respuesta = editarTransaccion(datos.rol, datos.transaccion);
    else if (accion === 'eliminarTransaccion') respuesta = eliminarTransaccion(datos.rol, datos.idTransaccion);

    // --- DASHBOARDS ---
    else if (accion === 'obtenerDashboardAdmin') respuesta = obtenerDashboardAdmin();
    else if (accion === 'obtenerDashboardUsuario') respuesta = obtenerDashboardUsuario(datos.idUsuario, datos.tipoPerfil, datos.idPerfil);
    else if (accion === 'obtenerDesgloseKpi') respuesta = obtenerDesgloseKpi(datos.tipo);


    // --- UTILIDADES (TOKENS, CALIFICACIONES, ETC) ---
    else if (accion === 'generarTokenInvitacion') respuesta = generarTokenInvitacion(datos.idPasajero);
    else if (accion === 'generarTokenInvitacionCliente') respuesta = generarTokenInvitacionCliente(datos.idCliente);
    else if (accion === 'validarTokenInvitacion') respuesta = validarTokenInvitacion(datos.token);
    else if (accion === 'completarRegistroPasajero') respuesta = completarRegistroPasajero(datos);
    else if (accion === 'completarRegistroCliente') respuesta = completarRegistroCliente(datos);
    else if (accion === 'crearPerfilPasajeroPropio') respuesta = crearPerfilPasajeroPropio(datos);
    else if (accion === 'calificarViaje') respuesta = calificarViaje(datos.id, datos.calificacion, datos.comentarios, datos.estatus);
    else if (accion === 'calificarServicio') respuesta = calificarServicio(datos.id, datos.calificacion, datos.comentarios, datos.estatus);

    else respuesta = { exito: false, error: "Acción desconocida: " + accion };

    output.setContent(JSON.stringify(respuesta));
    return output;

  } catch (error) {
    return output.setContent(JSON.stringify({ exito: false, error: error.toString() }));
  }
}

// ==========================================
// 3. ESTADO DE CUENTA UNIFICADO (LÓGICA CORE MULTI-SELECCIÓN - CORREGIDA)
// ==========================================
function obtenerEstadoCuentaGlobal(idCliente, idViaje) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  
  // 1. NORMALIZACIÓN DE ENTRADAS (Array vs String) & Limpieza de Tipos
  const cleanId = (val) => (val === null || val === undefined) ? "" : String(val).trim();

  let targetClients = [];
  let isAgencyReport = false;
  let isAllClients = false;

  // Lógica Cliente
  if (Array.isArray(idCliente)) {
      targetClients = idCliente.map(cleanId).filter(id => id !== "");
      isAgencyReport = targetClients.includes("AGENCY_INTERNAL");
      isAllClients = targetClients.includes("ALL") || targetClients.includes("ALL_MINE");
  } else {
      const sId = cleanId(idCliente);
      if (sId) targetClients = [sId];
      isAgencyReport = (sId === "AGENCY_INTERNAL");
      isAllClients = (sId === "ALL" || sId === "ALL_MINE");
  }

  // Lógica Viajes
  let targetTrips = [];
  let filterByTrip = false;
  
  if (idViaje) {
      if (Array.isArray(idViaje)) {
          targetTrips = idViaje.map(cleanId).filter(id => id !== "");
      } else {
          const tId = cleanId(idViaje);
          if (tId) targetTrips = [tId];
      }
      if (targetTrips.length > 0) filterByTrip = true;
  }

  // A. MAPEAR CLIENTE (INFO DE CABECERA)
  let infoCliente = { nombre: "Varios Clientes", rfc: "" };
  
  if (isAgencyReport) {
      infoCliente = { nombre: "REPORTE INTERNO AGENCIA", rfc: "Flujo de Caja Real" };
  } else if (isAllClients) {
      infoCliente = { nombre: "CONSOLIDADO GLOBAL", rfc: "Todos los Clientes" };
  } else if (targetClients.length === 1) {
      // Si es un solo cliente específico, buscamos sus datos para el encabezado
      const hojaClientes = ss.getSheetByName("Clientes");
      const datosClientes = hojaClientes.getDataRange().getValues();
      const mapaClientes = obtenerMapaColumnas(hojaClientes);
      const row = datosClientes.slice(1).find(r => cleanId(r[mapaClientes["ID Cliente"]]) === targetClients[0]);
      if (row) {
          infoCliente = { 
              nombre: row[mapaClientes["Nombre Completo"]], 
              rfc: row[mapaClientes["RFC"]] || "" 
          };
      }
  } else {
      infoCliente = { nombre: "SELECCIÓN MÚLTIPLE", rfc: `${targetClients.length} Clientes Seleccionados` };
  }

  // B. MAPEAR VIAJES, CATEGORÍAS Y CLIENTES (Para mostrar nombres en la tabla)
  const hojaViajes = ss.getSheetByName("Viajes");
  const datosViajes = hojaViajes.getDataRange().getValues();
  const mapaViajes = obtenerMapaColumnas(hojaViajes);
  const viajesMap = {};
  for(let i=1; i<datosViajes.length; i++) {
      const vid = cleanId(datosViajes[i][mapaViajes["ID Viaje"]]);
      if(vid) viajesMap[vid] = datosViajes[i][mapaViajes["Nombre Viaje"]];
  }

  // Siempre cargamos mapa de nombres clientes para la columna "Cliente"
  const clientesNombreMap = {};
  const hojaCli = ss.getSheetByName("Clientes");
  const datosCli = hojaCli.getDataRange().getValues();
  const mapaCli = obtenerMapaColumnas(hojaCli);
  
  for(let i=1; i<datosCli.length; i++){
      const cid = cleanId(datosCli[i][mapaCli["ID Cliente"]]);
      if(cid) clientesNombreMap[cid] = datosCli[i][mapaCli["Nombre Completo"]];
  }

  const hojaListas = ss.getSheetByName("Listas");
  const datosListas = hojaListas.getDataRange().getValues();
  const mapaListas = obtenerMapaColumnas(hojaListas);
  const categoriasMap = {};
  const formasPagoMap = {}; // AÑADIDO: Para formas de pago

  const idxCatId = mapaListas["Categoría"] + 1; 
  const idxCatNom = mapaListas["Categoría"];
  const idxFpId = mapaListas["Forma de Pago"] ? mapaListas["Forma de Pago"] + 1 : undefined;
  const idxFpNom = mapaListas["Forma de Pago"];

  for(let i=2; i<datosListas.length; i++) {
      // Categorías
      if (idxCatNom !== undefined) {
          const id = cleanId(datosListas[i][idxCatId]);
          const nom = datosListas[i][idxCatNom];
          if(id) categoriasMap[id] = nom;
      }
      // Formas de pago
      if (idxFpId !== undefined) {
          const fId = cleanId(datosListas[i][idxFpId]);
          const fNom = datosListas[i][idxFpNom];
          if(fId) formasPagoMap[fId] = String(fNom).toLowerCase();
      }
  }

  let movimientos = [];

  // C. OBTENER CARGOS (Desde Servicios) 
  if (!isAgencyReport) {
      const hojaServ = ss.getSheetByName("Servicios");
      const datosServ = hojaServ.getDataRange().getValues();
      const mapaServ = obtenerMapaColumnas(hojaServ);

      for(let i=1; i<datosServ.length; i++) {
          const rowClientId = cleanId(datosServ[i][mapaServ["ID Cliente"]]);
          const rowViajeId = cleanId(datosServ[i][mapaServ["ID Viaje"]]);
          
          // FILTROS ROBUSTOS
          const passClient = isAllClients || targetClients.includes(rowClientId);
          const passTrip = !filterByTrip || targetTrips.includes(rowViajeId);
          
          if (passClient && passTrip) {
              const precioVenta = parseFloat(String(datosServ[i][mapaServ["Precio Venta"]]).replace(/[^0-9.-]+/g,"")) || 0;
              const estatus = datosServ[i][mapaServ["Estatus"]]; // 3 = Cancelado
              
              if (precioVenta > 0 && estatus != 3) {
                  const catId = cleanId(datosServ[i][mapaServ["Categoria"]]);
                  const destino = datosServ[i][mapaServ["Destino"]];
                  let fechaServ = "";
                  try { fechaServ = new Date(datosServ[i][mapaServ["Fecha Inicio del Servicio"]]).toLocaleDateString(); } catch(e){}

                  movimientos.push({
                      fecha: fechaServ,
                      fechaObj: datosServ[i][mapaServ["Fecha Inicio del Servicio"]] ? new Date(datosServ[i][mapaServ["Fecha Inicio del Servicio"]]) : new Date(0),
                      concepto: `${categoriasMap[catId] || 'Servicio'} - ${destino}`,
                      viaje: viajesMap[rowViajeId] || "General",
                      nombreCliente: clientesNombreMap[rowClientId] || "Desconocido",
                      cargo: precioVenta,
                      abono: 0,
                      tipo: 'CARGO',
                      esServicio: true
                  });
              }
          }
      }
  }

  // D. OBTENER TRANSACCIONES (Realidad Financiera)
  const hojaTrans = ss.getSheetByName("Transacciones");
  const datosTrans = hojaTrans.getDataRange().getValues();
  const mapaTrans = obtenerMapaColumnas(hojaTrans);

  let proveedoresMap = {};
  if (isAgencyReport) {
      const hProv = ss.getSheetByName("Proveedores");
      const dProv = hProv.getDataRange().getValues();
      const mProv = obtenerMapaColumnas(hProv);
      for(let i=1; i<dProv.length; i++){
          const pid = cleanId(dProv[i][mProv["ID Proveedor"]]);
          if(pid) proveedoresMap[pid] = dProv[i][mProv["Nombre Completo"]];
      }
  }

  for(let i=1; i<datosTrans.length; i++) {
      const rowClientId = cleanId(datosTrans[i][mapaTrans["ID Cliente"]]);
      const rowViajeId = cleanId(datosTrans[i][mapaTrans["ID Viaje"]]);
      const tipo = datosTrans[i][mapaTrans["Tipo de Transacción"]]; // 1=Ingreso, 2=Egreso, 3=Abono
      const provId = cleanId(datosTrans[i][mapaTrans["Proveedor"]]);

      // Filtros
      let passClient = true;
      if (!isAgencyReport) {
          passClient = isAllClients || targetClients.includes(rowClientId);
      }
      
      const passTrip = !filterByTrip || targetTrips.includes(rowViajeId);

      if (passClient && passTrip) {
          const monto = parseFloat(String(datosTrans[i][mapaTrans["Monto"]]).replace(/[^0-9.-]+/g,"")) || 0;
          let fechaTrans = "";
          try { fechaTrans = new Date(datosTrans[i][mapaTrans["Fecha Transacción"]]).toLocaleDateString(); } catch(e){}
          const fechaObj = datosTrans[i][mapaTrans["Fecha Transacción"]] ? new Date(datosTrans[i][mapaTrans["Fecha Transacción"]]) : new Date(0);
          const concepto = datosTrans[i][mapaTrans["Concepto"]] || "Movimiento";
          const viajeNombre = viajesMap[rowViajeId] || "General";

            if (isAgencyReport) {
              // Lógica Agencia: Ver entradas y salidas de dinero reales
              const idFormaPago = cleanId(datosTrans[i][mapaTrans["Forma de Pago"]]);
              const nombreFormaPago = formasPagoMap[idFormaPago] || "";
              const esPagoConSaldo = nombreFormaPago.includes("saldo");
              
              // FIX: Si es un Ingreso pagado con saldo, omitimos para no duplicar el flujo de caja
              if (tipo == 1 && esPagoConSaldo) {
                  continue; 
              }

              let nombreEntidad = "";
              let esIngreso = false;

              if (tipo == 1 || tipo == 3) {
                  esIngreso = true;
                  nombreEntidad = clientesNombreMap[rowClientId] || "Cliente";
              } else if (tipo == 2) {
                  esIngreso = false;
                  nombreEntidad = proveedoresMap[provId] || "Proveedor";
              }

              movimientos.push({
                  fecha: fechaTrans,
                  fechaObj: fechaObj,
                  concepto: concepto,
                  viaje: viajeNombre,
                  nombreCliente: nombreEntidad, 
                  cargo: esIngreso ? 0 : monto, // Egreso es cargo para la agencia (salida de dinero)
                  abono: esIngreso ? monto : 0,
                  tipo: esIngreso ? 'INGRESO' : 'EGRESO',
                  esServicio: false
              });
          } else {
              // Lógica Cliente: Solo me interesan mis Pagos (Abonos)
              if (tipo == 1 || tipo == 3) {
                  movimientos.push({
                      fecha: fechaTrans,
                      fechaObj: fechaObj,
                      concepto: concepto,
                      viaje: viajeNombre,
                      nombreCliente: clientesNombreMap[rowClientId] || "",
                      cargo: 0,
                      abono: monto,
                      tipo: tipo == 1 ? 'PAGO' : 'ABONO',
                      esServicio: false
                  });
              }
          }
      }
  }

  // E. ORDENAR Y RESUMIR
  movimientos.sort((a, b) => b.fechaObj - a.fechaObj); // Orden descendente

  let totalCargos = 0;
  let totalAbonos = 0;

  const movimientosLimpios = movimientos.map(m => {
      totalCargos += m.cargo;
      totalAbonos += m.abono;
      const { fechaObj, ...resto } = m; 
      return resto;
  });

  return {
      exito: true,
      cliente: infoCliente,
      datos: movimientosLimpios,
      resumen: {
          totalCargos: totalCargos,
          totalAbonos: totalAbonos,
          saldoPendiente: totalCargos - totalAbonos
      },
      // Indicadores para el Frontend
      esGeneral: (targetClients.length > 1 || isAllClients), 
      esAgencia: isAgencyReport
  };
}

// ==========================================
// 4. AUTENTICACIÓN
// ==========================================
function verificarLogin(correo, passwordInput) {
  const libro = SpreadsheetApp.openById(ID_HOJA);
  const hojaUsuarios = libro.getSheetByName("Usuarios");
  const datos = hojaUsuarios.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hojaUsuarios);

  if (mapa["Correo"] === undefined) return { exito: false, error: "Error DB Usuarios" };

  const usuario = datos.slice(1).find(fila => 
    fila[mapa["Correo"]] && fila[mapa["Correo"]].toString().toLowerCase() == correo.toLowerCase()
  );

  if (!usuario) return { exito: false, error: "Usuario no encontrado" };

  const salt = usuario[mapa["Salt"]]; 
  const hashReal = usuario[mapa["Hash"]];
  const input = passwordInput + salt;
  const hashIntento = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input);
    
  let hashHex = "";
  for (let j = 0; j < hashIntento.length; j++) {
      let byteStr = (hashIntento[j] & 0xFF).toString(16);
      if (byteStr.length < 2) byteStr = "0" + byteStr;
      hashHex += byteStr;
  }

  if (hashHex === hashReal) {
    const idUsuario = usuario[mapa["ID Usuario"]];
    const rolBase = usuario[mapa["Rol"]];
    const nombreBase = usuario[mapa["Nombre(s)"]];
    const perfiles = obtenerPerfilesUsuario(idUsuario, rolBase, nombreBase);

    return {
      exito: true,
      usuario: { id: idUsuario, nombre: nombreBase, email: correo, rolBase: rolBase },
      perfiles: perfiles
    };
  } else {
    return { exito: false, error: "Contraseña incorrecta" };
  }
}

function obtenerPerfilesUsuario(idUsuario, rolBase, nombreBase) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  let perfiles = [];

  // 1. Admin
  if (rolBase === 'Administrador' || rolBase === 'Asistente') {
    perfiles.push({ tipo: 'Administrador', id: idUsuario, nombre: 'Vista Administrativa', descripcion: 'Gestión Global' });
  }

  // 2. Cliente
  const hojaClientes = ss.getSheetByName("Clientes");
  const dataClientes = hojaClientes.getDataRange().getValues();
  const mapaClientes = obtenerMapaColumnas(hojaClientes);
    
  if (mapaClientes["ID Usuario"] !== undefined) {
    for (let i = 1; i < dataClientes.length; i++) {
      if (dataClientes[i][mapaClientes["ID Usuario"]] == idUsuario) {
        perfiles.push({
          tipo: 'Cliente',
          id: dataClientes[i][mapaClientes["ID Cliente"]],
          nombre: dataClientes[i][mapaClientes["Nombre Completo"]] || dataClientes[i][mapaClientes["Razón Social"]],
          descripcion: 'Panel Corporativo'
        });
      }
    }
  }

  // 3. Pasajero
  const hojaPas = ss.getSheetByName("Pasajeros");
  const dataPas = hojaPas.getDataRange().getValues();
  const mapaPas = obtenerMapaColumnas(hojaPas);

  if (mapaPas["ID Usuario"] !== undefined) {
    for (let i = 1; i < dataPas.length; i++) {
      if (dataPas[i][mapaPas["ID Usuario"]] == idUsuario) {
        perfiles.push({
          tipo: 'Pasajero',
          id: dataPas[i][mapaPas["ID Pasajero"]],
          nombre: dataPas[i][mapaPas["Nombre(s)"]] + " " + (dataPas[i][mapaPas["Apellido Paterno"]] || ""),
          descripcion: 'Mis Viajes'
        });
      }
    }
  }

  if (perfiles.length === 0) {
     perfiles.push({ tipo: 'SinAsignar', id: 0, nombre: 'Sin Perfil Asignado', descripcion: 'Contacte a soporte' });
  }

  return perfiles;
}

// ==========================================
// 5. REGISTRO Y GESTIÓN DE USUARIOS
// ==========================================
function registrarUsuario(datos) {
  const libro = SpreadsheetApp.openById(ID_HOJA);
  const hojaUsuarios = libro.getSheetByName("Usuarios");
  const mapa = obtenerMapaColumnas(hojaUsuarios);
  const dataUsuarios = hojaUsuarios.getDataRange().getValues();
  const correo = datos.correo.trim().toLowerCase();
    
  if (mapa["Correo"] !== undefined) {
    const existe = dataUsuarios.slice(1).find(u => u[mapa["Correo"]].toString().toLowerCase() === correo);
    if (existe) return { exito: false, error: "Este correo ya está registrado." };
  }

  let nuevoId = 1;
  if (dataUsuarios.length > 1 && mapa["ID Usuario"] !== undefined) {
      const ultimoId = dataUsuarios[dataUsuarios.length - 1][mapa["ID Usuario"]];
      nuevoId = parseInt(ultimoId) + 1;
  }

  const salt = Utilities.getUuid();
  const input = datos.password + salt;
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input);
  let hashHex = "";
  for (let j = 0; j < hash.length; j++) {
      let byteStr = (hash[j] & 0xFF).toString(16);
      if (byteStr.length < 2) byteStr = "0" + byteStr;
      hashHex += byteStr;
  }

  const numCols = hojaUsuarios.getLastColumn();
  const nuevaFila = new Array(numCols).fill("");

  if (mapa["ID Usuario"] !== undefined) nuevaFila[mapa["ID Usuario"]] = nuevoId;
  const rolAsignado = datos.rolManual ? datos.rolManual : "Cliente";
  if (mapa["Rol"] !== undefined) nuevaFila[mapa["Rol"]] = rolAsignado;
    
  if (mapa["Nombre(s)"] !== undefined) nuevaFila[mapa["Nombre(s)"]] = datos.nombre;
  if (mapa["Apellido Paterno"] !== undefined) nuevaFila[mapa["Apellido Paterno"]] = datos.apellido;
  if (mapa["Correo"] !== undefined) nuevaFila[mapa["Correo"]] = correo;
  if (mapa["Contraseña"] !== undefined) nuevaFila[mapa["Contraseña"]] = "********";
  if (mapa["Salt"] !== undefined) nuevaFila[mapa["Salt"]] = salt;
  if (mapa["Hash"] !== undefined) nuevaFila[mapa["Hash"]] = hashHex;

  hojaUsuarios.appendRow(nuevaFila);
    
  if (rolAsignado !== "Pasajero" && !datos.evitarCrearCliente) {
      crearClientePlaceholder(nuevoId, datos.nombre + " " + datos.apellido, correo);
  }

  return { exito: true, mensaje: "Usuario creado", usuario: { id: nuevoId, nombre: datos.nombre, rol: rolAsignado } };
}

function crearClientePlaceholder(idUsuario, nombreCompleto, correo) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Clientes");
  const mapa = obtenerMapaColumnas(hoja);
    
  let nuevoId = 1;
  const colIdIdx = mapa["ID Cliente"];
  if (hoja.getLastRow() > 1 && colIdIdx !== undefined) {
    const valoresIds = hoja.getRange(2, colIdIdx + 1, hoja.getLastRow() - 1, 1).getValues().flat();
    const idsNumericos = valoresIds.map(v => parseInt(v)).filter(v => !isNaN(v));
    if(idsNumericos.length > 0) nuevoId = Math.max(...idsNumericos) + 1;
  }

  const numCols = hoja.getLastColumn();
  const nuevaFila = new Array(numCols).fill("");

  if (mapa["ID Cliente"] !== undefined) nuevaFila[mapa["ID Cliente"]] = nuevoId;
  if (mapa["Nombre Completo"] !== undefined) nuevaFila[mapa["Nombre Completo"]] = nombreCompleto;
  if (mapa["ID Usuario"] !== undefined) nuevaFila[mapa["ID Usuario"]] = idUsuario;
  if (mapa["Correo"] !== undefined) nuevaFila[mapa["Correo"]] = correo;

  hoja.appendRow(nuevaFila);
}

// ==========================================
// 6. FUNCIONES OPERATIVAS (VIAJES)
// ==========================================
function obtenerViajes(idUsuario, rol) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Viajes");
  const datos = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja);
  const filas = datos.slice(1);
  let viajesFiltrados = [];

  if (rol === 'Administrador' || rol === 'Asistente') {
    viajesFiltrados = filas;
  } else if (rol === 'Cliente') {
    const idCliente = buscarIdCliente(idUsuario);
    if (!idCliente) return { exito: true, datos: [] };
    if (mapa["ID Cliente"] !== undefined) {
      viajesFiltrados = filas.filter(r => r[mapa["ID Cliente"]] == idCliente);
    }
  } else {
    return { exito: true, datos: [] };
  }

  const viajesMap = new Map();
  viajesFiltrados.forEach(fila => {
      const id = mapa["ID Viaje"] !== undefined ? fila[mapa["ID Viaje"]] : "";
      if (id && !viajesMap.has(id)) {
          viajesMap.set(id, {
              idViaje: id,
              nombre: mapa["Nombre Viaje"] !== undefined ? fila[mapa["Nombre Viaje"]] : "",
              fecha: mapa["Fecha Inicio"] !== undefined ? (fila[mapa["Fecha Inicio"]] ? new Date(fila[mapa["Fecha Inicio"]]).toLocaleDateString() : 'Pendiente') : "",
              destino: mapa["Nombre Viaje"] !== undefined ? fila[mapa["Nombre Viaje"]] : "" 
          });
      }
  });

  return { exito: true, datos: Array.from(viajesMap.values()) };
}

function buscarIdCliente(idUsuario) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Clientes");
  const datos = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja);
  if (mapa["ID Usuario"] === undefined || mapa["ID Cliente"] === undefined) return null;
  const filaCliente = datos.slice(1).find(r => r[mapa["ID Usuario"]] == idUsuario);
  return filaCliente ? filaCliente[mapa["ID Cliente"]] : null;
}

function agregarViaje(viaje) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Viajes");
  const mapa = obtenerMapaColumnas(hoja);
    
  let maxConsecutivo = 0;
  const colIdIdx = mapa["ID Viaje"];
  
  // 1. OBTENER EL ÚLTIMO CONSECUTIVO DE LA BASE DE DATOS
  if (hoja.getLastRow() > 1 && colIdIdx !== undefined) {
    const valoresIds = hoja.getRange(2, colIdIdx + 1, hoja.getLastRow() - 1, 1).getValues().flat();
    
    valoresIds.forEach(v => {
        const strVal = String(v).trim();
        if (!strVal) return;

        // Buscamos extraer el consecutivo del nuevo formato: I2-6001-2
        // Expresión Regular: captura los números después del guion y del dígito del año
        const match = strVal.match(/^I\d-\d(\d+)-/);
        if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxConsecutivo) {
                maxConsecutivo = num;
            }
        } else {
            // Compatibilidad para seguir contando a partir de los IDs antiguos (1, 2, 3...)
            const num = parseInt(strVal, 10);
            if (!isNaN(num) && num > maxConsecutivo && !strVal.includes("-")) {
                maxConsecutivo = num;
            }
        }
    });
  }

  // 2. GENERAR LAS PARTES DEL NUEVO FOLIO
  const nuevoConsecutivo = maxConsecutivo + 1;
  const consecutivoStr = nuevoConsecutivo.toString().padStart(3, '0'); // Rellena con ceros: "001"

  const fechaActual = new Date();
  const year = fechaActual.getFullYear();
  const decada = Math.floor((year % 100) / 10); // Ej: 2026 -> 2, 2030 -> 3
  const ultimoDigito = year % 10;               // Ej: 2026 -> 6, 2030 -> 0

  let listaClientes = [];
  if (Array.isArray(viaje.idCliente)) {
      listaClientes = viaje.idCliente;
  } else {
      listaClientes = [viaje.idCliente];
  }

  // Tomamos el primer cliente como Titular para armar la terminación del ID
  const idClienteTitular = listaClientes.length > 0 ? listaClientes[0] : "X";

  // 3. ARMADO DEL ID FINAL (Ej: I2-6001-2)
  const nuevoId = `I${decada}-${ultimoDigito}${consecutivoStr}-${idClienteTitular}`;

  const numCols = hoja.getLastColumn();

  // 4. GUARDAR EN LA BASE DE DATOS
  listaClientes.forEach(idCliente => {
      const nuevaFila = new Array(numCols).fill("");
      if (mapa["ID Viaje"] !== undefined) nuevaFila[mapa["ID Viaje"]] = nuevoId;
      if (mapa["Nombre Viaje"] !== undefined) nuevaFila[mapa["Nombre Viaje"]] = viaje.nombre;
      if (mapa["Tipo de Viaje"] !== undefined) nuevaFila[mapa["Tipo de Viaje"]] = viaje.tipo; 
      if (mapa["Fecha Inicio"] !== undefined) nuevaFila[mapa["Fecha Inicio"]] = viaje.fechaInicio;
      if (mapa["Fecha Fin"] !== undefined) nuevaFila[mapa["Fecha Fin"]] = viaje.fechaFin;
      if (mapa["ID Cliente"] !== undefined) nuevaFila[mapa["ID Cliente"]] = idCliente;
      
      hoja.appendRow(nuevaFila);
  });

  return { exito: true, mensaje: "Viaje creado exitosamente", id: nuevoId };
}

function obtenerInfoViaje(idViaje) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Viajes");
  const datos = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja);
    
  const filaViaje = datos.slice(1).find(r => r[mapa["ID Viaje"]] == idViaje);
  if (!filaViaje) return { exito: false, error: "Viaje no encontrado" };

  return {
    exito: true,
    viaje: {
      id: filaViaje[mapa["ID Viaje"]],
      nombre: filaViaje[mapa["Nombre Viaje"]],
      idCliente: filaViaje[mapa["ID Cliente"]],
      fechaInicio: filaViaje[mapa["Fecha Inicio"]] ? new Date(filaViaje[mapa["Fecha Inicio"]]).toLocaleDateString() : "",
      fechaFin: filaViaje[mapa["Fecha Fin"]] ? new Date(filaViaje[mapa["Fecha Fin"]]).toLocaleDateString() : "",
      calificacion: mapa["Calificación"] !== undefined ? filaViaje[mapa["Calificación"]] : "",
      comentarios: mapa["Comentarios"] !== undefined ? filaViaje[mapa["Comentarios"]] : ""
    }
  };
}

// ==========================================
// 7. GESTIÓN DE SERVICIOS
// ==========================================
function obtenerDetallesViaje(idViaje) {
  const libro = SpreadsheetApp.openById(ID_HOJA);
    
  const hojaServ = libro.getSheetByName("Servicios");
  const mapaServ = obtenerMapaColumnas(hojaServ);
  const datosServ = hojaServ.getDataRange().getValues().slice(1);
  const timezone = Session.getScriptTimeZone();
    
  if (mapaServ["ID Viaje"] === undefined) return { exito: true, datos: [], error: "Falta columna ID Viaje" };

  const serviciosEncontrados = datosServ.filter(s => s[mapaServ["ID Viaje"]] == idViaje);

  const hojaPas = libro.getSheetByName("Pasajeros");
  const mapaPas = obtenerMapaColumnas(hojaPas);
  const datosPas = hojaPas.getDataRange().getValues();
    
  const mapaNombresPasajeros = {};
  for(let i=1; i<datosPas.length; i++) {
    const id = datosPas[i][mapaPas["ID Pasajero"]];
    const nom = datosPas[i][mapaPas["Nombre(s)"]];
    const ape = datosPas[i][mapaPas["Apellido Paterno"]] || "";
    if(id) mapaNombresPasajeros[id] = nom + " " + ape;
  }

  const detalles = serviciosEncontrados.map(s => {
    const formatFecha = (val) => {
      if (!val) return "";
      try {
        const d = new Date(val);
        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      } catch(e) { return val; }
    };

    const fechaFinRaw = s[mapaServ["Fecha Fin del Servicio"]];
    const fechaFinISO = fechaFinRaw ? Utilities.formatDate(new Date(fechaFinRaw), timezone, "yyyy-MM-dd'T'HH:mm:ss") : null;

    return {
      idServicio: s[mapaServ["ID Servicio"]],
      idPasajero: s[mapaServ["ID Pasajero"]],
      nombrePasajero: mapaNombresPasajeros[s[mapaServ["ID Pasajero"]]] || "Pasajero Desconocido",
      categoriaId: s[mapaServ["Categoria"]],
      destino: s[mapaServ["Destino"]],
      clave: s[mapaServ["Clave de Reservación"]],
      numeroVuelo: mapaServ["Número de Vuelo"] !== undefined ? s[mapaServ["Número de Vuelo"]] : "",
      fechaInicio: formatFecha(s[mapaServ["Fecha Inicio del Servicio"]]),
      fechaFin: formatFecha(s[mapaServ["Fecha Fin del Servicio"]]),
      fechaFinISO: fechaFinISO,
      estatusId: s[mapaServ["Estatus"]],
      
      // P&L
      costoProveedor: mapaServ["Costo Proveedor"] !== undefined ? parseFloat(String(s[mapaServ["Costo Proveedor"]]).replace(/[^0-9.-]+/g,"")) || 0 : 0,
      precioVenta: mapaServ["Precio Venta"] !== undefined ? parseFloat(String(s[mapaServ["Precio Venta"]]).replace(/[^0-9.-]+/g,"")) || 0 : 0,
      idProveedor: mapaServ["ID Proveedor"] !== undefined ? s[mapaServ["ID Proveedor"]] : "",
      fechaLimitePagoProv: mapaServ["Fecha Límite Pago Proveedor"] !== undefined ? s[mapaServ["Fecha Límite Pago Proveedor"]] : "",
      estatusPagoProv: mapaServ["Estatus Pago Proveedor"] !== undefined ? s[mapaServ["Estatus Pago Proveedor"]] : "Pendiente",

      calificacion: mapaServ["Calificación"] !== undefined ? s[mapaServ["Calificación"]] : "",
      comentarios: mapaServ["Comentarios"] !== undefined ? s[mapaServ["Comentarios"]] : ""
    };
  });

  // --- OBTENER DOCUMENTOS DEL VIAJE ---
  const hojaDocs = libro.getSheetByName("Documentos");
  let documentosA = [];
  if (hojaDocs) {
      const mDocs = obtenerMapaColumnas(hojaDocs);
      const dDocs = hojaDocs.getDataRange().getValues();
      for(let i=1; i<dDocs.length; i++) {
          if(dDocs[i][mDocs["ID Viaje"]] == idViaje) {
              documentosA.push({
                  id: dDocs[i][mDocs["ID Documento"]],
                  idServicio: dDocs[i][mDocs["ID Servicio"]],
                  nombre: dDocs[i][mDocs["Nombre Archivo"]],
                  url: dDocs[i][mDocs["URL"]],
                  tipo: dDocs[i][mDocs["Tipo"]],
                  fecha: dDocs[i][mDocs["Fecha Subida"]] ? new Date(dDocs[i][mDocs["Fecha Subida"]]).toLocaleDateString() : ""
              });
          }
      }
  }

  // --- VINCULAR DOCUMENTO AL SERVICIO SI APLICA ---
  detalles.forEach(serv => {
      serv.documentoUrl = null;
      serv.documentos = [];
      const docsDelServicio = documentosA.filter(d => String(d.idServicio) === String(serv.idServicio));
      if (docsDelServicio.length > 0) {
          serv.documentos = docsDelServicio;
          serv.documentoUrl = docsDelServicio[0].url; // El más relevante / principal
      }
  });

  return { exito: true, datos: detalles, documentos: documentosA };
}

// ==========================================
// RASTREO DE VUELOS (AVIATIONSTACK)
// ==========================================
function obtenerEstatusVuelo(codigoVuelo, fecha) {
  if (!codigoVuelo) return { exito: false, error: "Código de vuelo no proporcionado" };
  
  const strVuelo = String(codigoVuelo).trim().replace(/\s+/g, ''); // AM 405 -> AM405
  const match = strVuelo.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return { exito: false, error: "Formato de vuelo inválido. Ejemplo: AM405" };
  
  const airlineIata = match[1].toUpperCase();
  // Quitar ceros a la izquierda: 037 -> 37
  const flightNumber = parseInt(match[2], 10).toString();
  
  // ==========================================
  // CONFIGURACIÓN DE API_KEY (Reemplazar aquí)
  // ==========================================
  const API_KEY = "861794b26dfb4b57d9d5cf8781dbee43"; 
  
  if (API_KEY === "TU_API_KEY_AQUI") {
       return { 
           exito: true, 
           simulado: true,
           vuelo: {
              flight_status: "scheduled",
              departure: { estimated: "Por definir", gate: "N/A" },
              arrival: { estimated: "Por definir", gate: "N/A" }
           }
       };
  }

  let url = `http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&airline_iata=${airlineIata}&flight_number=${flightNumber}`;
  
  try {
    const respuesta = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const responseCode = respuesta.getResponseCode();
    const textResponse = respuesta.getContentText();
    
    let json = {};
    try {
        json = JSON.parse(textResponse);
    } catch(errParse) {
        return { exito: false, error: `La API no devolvió JSON válido. Código: ${responseCode}. Texto crudo: ${textResponse.substring(0, 100)}...` };
    }
    
    // Si la API de AviationStack devuelve su propio formato de error:
    if (json.error) {
        let msg = json.error.info || json.error.message || json.error.code || "Error desconocido en AviationStack.";
        return { exito: false, error: `Error de API: ${msg}` };
    }

    if (json.data && json.data.length > 0) {
      // Priorizar el vuelo "active", luego "scheduled", luego el primero
      let vueloElegido = json.data.find(v => v.flight_status === 'active');
      if (!vueloElegido) vueloElegido = json.data.find(v => v.flight_status === 'scheduled');
      if (!vueloElegido) vueloElegido = json.data[0];

      return { exito: true, vuelo: vueloElegido, arrData: json.data };
    } else {
      return { exito: false, error: `Vuelo no localizado en radares activos para ${airlineIata}${flightNumber}.` };
    }
  } catch(e) {
    return { exito: false, error: `Falla de solicitud GAS: ${e.toString()}` };
  }
}

function agregarServicio(datos) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const hojaServ = ss.getSheetByName("Servicios");
  const mapaServ = obtenerMapaColumnas(hojaServ);
 
  let listaPasajeros = Array.isArray(datos.idPasajero) ? datos.idPasajero : [datos.idPasajero];

  let nuevoIdServicio = 1;
  const colIdIdx = mapaServ["ID Servicio"];
 
  if (hojaServ.getLastRow() > 1 && colIdIdx !== undefined) {
    const valoresIds = hojaServ.getRange(2, colIdIdx + 1, hojaServ.getLastRow() - 1, 1).getValues().flat();
    const idsNumericos = valoresIds.map(v => parseInt(v)).filter(v => !isNaN(v));
    if (idsNumericos.length > 0) nuevoIdServicio = Math.max(...idsNumericos) + 1;
  }

  let claveGrupo = datos.clave ? datos.clave.trim() : "";

  listaPasajeros.forEach(pasajeroId => {
      const filaServ = new Array(hojaServ.getLastColumn()).fill("");
      
      if (mapaServ["ID Servicio"] !== undefined) filaServ[mapaServ["ID Servicio"]] = nuevoIdServicio;
      if (mapaServ["ID Pasajero"] !== undefined) filaServ[mapaServ["ID Pasajero"]] = pasajeroId;
      
      if (mapaServ["ID Viaje"] !== undefined) filaServ[mapaServ["ID Viaje"]] = datos.idViaje; 
      if (mapaServ["ID Cliente"] !== undefined) filaServ[mapaServ["ID Cliente"]] = datos.idCliente;
      if (mapaServ["Categoria"] !== undefined) filaServ[mapaServ["Categoria"]] = datos.categoria;
      if (mapaServ["Destino"] !== undefined) filaServ[mapaServ["Destino"]] = datos.destino;
      if (mapaServ["Clave de Reservación"] !== undefined) filaServ[mapaServ["Clave de Reservación"]] = claveGrupo;
      if (mapaServ["Número de Vuelo"] !== undefined) filaServ[mapaServ["Número de Vuelo"]] = datos.numeroVuelo || "";
      if (mapaServ["Fecha Inicio del Servicio"] !== undefined) filaServ[mapaServ["Fecha Inicio del Servicio"]] = datos.fechaInicio;
      if (mapaServ["Fecha Fin del Servicio"] !== undefined) filaServ[mapaServ["Fecha Fin del Servicio"]] = datos.fechaFin;
      if (mapaServ["Estatus"] !== undefined) filaServ[mapaServ["Estatus"]] = datos.estatus;

      // FINANZAS
      if (mapaServ["Costo Proveedor"] !== undefined) filaServ[mapaServ["Costo Proveedor"]] = datos.costoProveedor || 0;
      if (mapaServ["Precio Venta"] !== undefined) filaServ[mapaServ["Precio Venta"]] = datos.precioVenta || 0;
      if (mapaServ["ID Proveedor"] !== undefined) filaServ[mapaServ["ID Proveedor"]] = datos.idProveedor || "";
      if (mapaServ["Fecha Límite Pago Proveedor"] !== undefined) filaServ[mapaServ["Fecha Límite Pago Proveedor"]] = datos.fechaLimitePagoProv || "";
      if (mapaServ["Estatus Pago Proveedor"] !== undefined) filaServ[mapaServ["Estatus Pago Proveedor"]] = datos.estatusPagoProv || "Pendiente";

      hojaServ.appendRow(filaServ);
  });
 
  SpreadsheetApp.flush(); 
  return { exito: true, mensaje: "Servicio registrado correctamente", id: nuevoIdServicio };
}

function editarServicio(datos) {
  const hojaServ = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Servicios");
  const mapaServ = obtenerMapaColumnas(hojaServ);
  const data = hojaServ.getDataRange().getValues();
  const idCol = mapaServ["ID Servicio"];
 
  if (idCol === undefined) return { exito: false, error: "Error en estructura DB" };

  let filasEditadas = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == datos.idServicio) {
        const rowIndex = i + 1;
        
        if (mapaServ["Categoria"] !== undefined) hojaServ.getRange(rowIndex, mapaServ["Categoria"] + 1).setValue(datos.categoria);
        if (mapaServ["Destino"] !== undefined) hojaServ.getRange(rowIndex, mapaServ["Destino"] + 1).setValue(datos.destino);
        if (mapaServ["Clave de Reservación"] !== undefined) hojaServ.getRange(rowIndex, mapaServ["Clave de Reservación"] + 1).setValue(datos.clave);
        if (mapaServ["Número de Vuelo"] !== undefined) hojaServ.getRange(rowIndex, mapaServ["Número de Vuelo"] + 1).setValue(datos.numeroVuelo || "");
        if (mapaServ["Fecha Inicio del Servicio"] !== undefined) hojaServ.getRange(rowIndex, mapaServ["Fecha Inicio del Servicio"] + 1).setValue(datos.fechaInicio);
        if (mapaServ["Fecha Fin del Servicio"] !== undefined) hojaServ.getRange(rowIndex, mapaServ["Fecha Fin del Servicio"] + 1).setValue(datos.fechaFin);
        if (mapaServ["Estatus"] !== undefined) hojaServ.getRange(rowIndex, mapaServ["Estatus"] + 1).setValue(datos.estatus);
        
        if (mapaServ["Costo Proveedor"] !== undefined) hojaServ.getRange(rowIndex, mapaServ["Costo Proveedor"] + 1).setValue(datos.costoProveedor || 0);
        if (mapaServ["Precio Venta"] !== undefined) hojaServ.getRange(rowIndex, mapaServ["Precio Venta"] + 1).setValue(datos.precioVenta || 0);
        if (mapaServ["ID Proveedor"] !== undefined) hojaServ.getRange(rowIndex, mapaServ["ID Proveedor"] + 1).setValue(datos.idProveedor || "");
        
        if (mapaServ["Fecha Límite Pago Proveedor"] !== undefined) hojaServ.getRange(rowIndex, mapaServ["Fecha Límite Pago Proveedor"] + 1).setValue(datos.fechaLimitePagoProv || "");
        if (mapaServ["Estatus Pago Proveedor"] !== undefined) hojaServ.getRange(rowIndex, mapaServ["Estatus Pago Proveedor"] + 1).setValue(datos.estatusPagoProv || "");

        filasEditadas++;
    }
  }

  if (filasEditadas === 0) return { exito: false, error: "Servicio no encontrado" };
  return { exito: true, mensaje: `Servicio actualizado (${filasEditadas} registros afectados)` };
}

function eliminarServicio(idServicio, idPasajeroEspecifico) {
  const hojaServ = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Servicios");
  const mapaServ = obtenerMapaColumnas(hojaServ);
  const data = hojaServ.getDataRange().getValues();
  const idCol = mapaServ["ID Servicio"];
  const pasCol = mapaServ["ID Pasajero"];

  if (idCol === undefined) return { exito: false, error: "Error en estructura DB" };

  let filasEliminadas = 0;
 
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][idCol] == idServicio) {
        let borrar = false;
        if (idPasajeroEspecifico) {
            if (data[i][pasCol] == idPasajeroEspecifico) borrar = true;
        } else {
            borrar = true;
        }

        if (borrar) {
            hojaServ.deleteRow(i + 1);
            filasEliminadas++;
        }
    }
  }

  if (filasEliminadas === 0) return { exito: false, error: "No se encontraron registros para eliminar" };
  return { exito: true, mensaje: `Se eliminaron ${filasEliminadas} registros.` };
}

// ==========================================
// 8. FINANZAS Y TRANSACCIONES
// ==========================================
function obtenerListasFinancieras() {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Listas");
  const datos = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja); 
    
  // Helper mejorado con offset opcional para casos como "Moneda"
  const extraerLista = (colName, offsetID = 1) => {
    const idx = mapa[colName];
    const lista = [];
    if (idx !== undefined) {
      for(let i = 2; i < datos.length; i++) { 
        const nombre = datos[i][idx];
        const id = datos[i][idx + offsetID]; // Usamos el offset dinámico
        if(nombre && id) lista.push({ nombre: String(nombre), id: String(id) });
      }
    }
    return lista;
  };

  // --- NUEVA LÓGICA: LEER CUENTAS EMPRESA ---
  let cuentasEmpresa = [];
  const hojaCuentas = SpreadsheetApp.openById(ID_HOJA).getSheetByName("CuentasEmpresa");
  if (hojaCuentas) {
      const datosCuentas = hojaCuentas.getDataRange().getValues();
      const mapaCuentas = obtenerMapaColumnas(hojaCuentas);
      const idIdx = mapaCuentas["ID"] !== undefined ? mapaCuentas["ID"] : 0;
      const nomIdx = mapaCuentas["Nombre"] !== undefined ? mapaCuentas["Nombre"] : 1;
      
      for(let i=1; i<datosCuentas.length; i++) {
          if(datosCuentas[i][idIdx]) {
              cuentasEmpresa.push({
                  id: String(datosCuentas[i][idIdx]), 
                  nombre: String(datosCuentas[i][nomIdx])
              });
          }
      }
  }

  return { 
    exito: true, 
    listas: { 
      tipos: extraerLista("Tipo de Transacción"),
      formasPago: extraerLista("Forma de Pago"),
      monedas: extraerLista("Moneda", 3), 
      cuentasEmpresa: cuentasEmpresa
    } 
  };
}

function agregarCuentaEmpresa(datos) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("CuentasEmpresa");
  if (!hoja) return { exito: false, error: "Hoja CuentasEmpresa no existe" };
  
  const mapa = obtenerMapaColumnas(hoja);
  let nuevoId = 1;
  
  // Calcular nuevo ID
  if (hoja.getLastRow() > 1 && mapa["ID"] !== undefined) {
    const valoresIds = hoja.getRange(2, mapa["ID"] + 1, hoja.getLastRow() - 1, 1).getValues().flat();
    const idsNumericos = valoresIds.map(v => parseInt(v)).filter(v => !isNaN(v));
    if(idsNumericos.length > 0) nuevoId = Math.max(...idsNumericos) + 1;
  }

  const numCols = hoja.getLastColumn();
  const nuevaFila = new Array(numCols).fill("");

  // LLENADO DE COLUMNAS SOLICITADAS: ID, Nombre, Tipo, Banco, Cuenta
  if (mapa["ID"] !== undefined) nuevaFila[mapa["ID"]] = nuevoId;
  if (mapa["Nombre"] !== undefined) nuevaFila[mapa["Nombre"]] = datos.nombre;
  if (mapa["Tipo"] !== undefined) nuevaFila[mapa["Tipo"]] = datos.tipo;
  if (mapa["Banco"] !== undefined) nuevaFila[mapa["Banco"]] = datos.nombre; // Usamos nombre como banco si no viene separado
  if (mapa["Cuenta"] !== undefined) nuevaFila[mapa["Cuenta"]] = ""; // Opcional, vacío por ahora

  hoja.appendRow(nuevaFila);
  return { exito: true, mensaje: "Cuenta agregada", id: nuevoId };
}

function registrarTransaccion(t) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Transacciones");
  const mapa = obtenerMapaColumnas(hoja);
 
  let servicios = Array.isArray(t.idServicio) ? t.idServicio : (t.idServicio ? [t.idServicio] : [null]);

  // EL MONTO YA VIENE TOTALIZADO DESDE EL FRONTEND (Subtotal + IVA)
  const montoTotal = parseFloat(t.monto);
  const montoUnitario = servicios.length > 0 ? (montoTotal / servicios.length) : montoTotal;

  // Prorrateo de IVA y Subtotal
  const subtotalUnitario = t.subtotal ? (parseFloat(t.subtotal) / (servicios.length || 1)) : 0;
  const ivaUnitario = t.montoIVA ? (parseFloat(t.montoIVA) / (servicios.length || 1)) : 0;

  servicios.forEach(idServ => {
      const numCols = hoja.getLastColumn();
      const nuevaFila = new Array(numCols).fill("");

      if (mapa["ID Transacción"] !== undefined) {
         nuevaFila[mapa["ID Transacción"]] = `TRX-${Utilities.getUuid().substring(0,8).toUpperCase()}`;
      }

      if (mapa["ID Viaje"] !== undefined) nuevaFila[mapa["ID Viaje"]] = t.idViaje;
      if (mapa["ID Cliente"] !== undefined) nuevaFila[mapa["ID Cliente"]] = t.idCliente;
      if (t.idPasajero && mapa["ID Pasajero"] !== undefined) nuevaFila[mapa["ID Pasajero"]] = t.idPasajero;
      if (t.idProveedor && mapa["Proveedor"] !== undefined) nuevaFila[mapa["Proveedor"]] = t.idProveedor;

      if (idServ && mapa["ID Servicio"] !== undefined) nuevaFila[mapa["ID Servicio"]] = idServ;

      if (mapa["Fecha Transacción"] !== undefined) nuevaFila[mapa["Fecha Transacción"]] = t.fecha;
      if (mapa["Tipo de Transacción"] !== undefined) nuevaFila[mapa["Tipo de Transacción"]] = t.tipo;
      if (mapa["Forma de Pago"] !== undefined) nuevaFila[mapa["Forma de Pago"]] = t.formaPago;
      
      if (t.idCuentaEmpresa && mapa["Cuenta Empresa"] !== undefined) nuevaFila[mapa["Cuenta Empresa"]] = t.idCuentaEmpresa;
        
      let conceptoFinal = t.concepto;
      if (servicios.length > 1) conceptoFinal += ` (Parte ${servicios.indexOf(idServ) + 1}/${servicios.length})`;
      if (mapa["Concepto"] !== undefined) nuevaFila[mapa["Concepto"]] = conceptoFinal;
        
      if (mapa["Monto"] !== undefined) nuevaFila[mapa["Monto"]] = montoUnitario;
        
      if (mapa["Moneda"] !== undefined) nuevaFila[mapa["Moneda"]] = t.moneda;
      if (mapa["Tipo de Cambio"] !== undefined) nuevaFila[mapa["Tipo de Cambio"]] = t.tipoCambio || 1;

      // Desglose de Impuestos
      if (t.aplicaIVA) {
         if (mapa["Subtotal"] !== undefined) nuevaFila[mapa["Subtotal"]] = subtotalUnitario;
         if (mapa["Tasa IVA"] !== undefined) nuevaFila[mapa["Tasa IVA"]] = t.tasaIVA;
         if (mapa["Monto IVA"] !== undefined) nuevaFila[mapa["Monto IVA"]] = ivaUnitario;
      }
      
      if (t.noFactura && mapa["No. Factura"] !== undefined) nuevaFila[mapa["No. Factura"]] = t.noFactura;
      if (t.uuidFactura && mapa["UUID / XML"] !== undefined) nuevaFila[mapa["UUID / XML"]] = t.uuidFactura;
      if (mapa["Conciliado"] !== undefined) nuevaFila[mapa["Conciliado"]] = t.conciliado ? true : false;

      hoja.appendRow(nuevaFila);
  });

  return { exito: true, mensaje: servicios.length > 1 ? `Monto dividido y registrado en ${servicios.length} servicios.` : "Transacción registrada" };
}

function obtenerFinanzasViaje(idViaje) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Transacciones");
  const datos = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja);
    
  if (mapa["ID Viaje"] === undefined) return { exito: false, error: "No existe columna ID Viaje en Transacciones" };

  const transacciones = [];
  const filas = datos.slice(1);
  const transaccionesFiltradas = filas.filter(r => r[mapa["ID Viaje"]] == idViaje);

  transaccionesFiltradas.forEach(fila => {
    let fecha = "";
    try { fecha = new Date(fila[mapa["Fecha Transacción"]]).toLocaleDateString(); } catch(e) {}

    transacciones.push({
      idServicio: fila[mapa["ID Servicio"]] || "", 
      fecha: fecha,
      tipoId: fila[mapa["Tipo de Transacción"]], 
      formaPagoId: fila[mapa["Forma de Pago"]],
      concepto: fila[mapa["Concepto"]],
      monto: fila[mapa["Monto"]],
      moneda: fila[mapa["Moneda"]],
      proveedorId: fila[mapa["Proveedor"]]
    });
  });

  return { exito: true, datos: transacciones };
}

function obtenerResumenFinancieroViaje(idViaje) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
 
  // 1. PRESUPUESTO (Servicios)
  const hojaServ = ss.getSheetByName("Servicios");
  const datosServ = hojaServ.getDataRange().getValues();
  const mapaServ = obtenerMapaColumnas(hojaServ);
 
  let totalVentaTeorica = 0;
  let totalCostoTeorico = 0;
 
  for (let i = 1; i < datosServ.length; i++) {
      if (datosServ[i][mapaServ["ID Viaje"]] == idViaje) {
          const estatus = datosServ[i][mapaServ["Estatus"]];
          if (estatus != 3) {
              const costo = parseFloat(String(datosServ[i][mapaServ["Costo Proveedor"]]).replace(/[^0-9.-]+/g,"")) || 0;
              const precio = parseFloat(String(datosServ[i][mapaServ["Precio Venta"]]).replace(/[^0-9.-]+/g,"")) || 0;
              
              totalVentaTeorica += precio;
              totalCostoTeorico += costo;
          }
      }
  }

  // 2. REALIDAD (Transacciones)
  const hojaTrans = ss.getSheetByName("Transacciones");
  const datosTrans = hojaTrans.getDataRange().getValues();
  const mapaTrans = obtenerMapaColumnas(hojaTrans);
 
  let totalCobradoCliente = 0;
  let totalPagadoProveedor = 0;
 
  for (let i = 1; i < datosTrans.length; i++) {
      if (datosTrans[i][mapaTrans["ID Viaje"]] == idViaje) {
          const tipo = datosTrans[i][mapaTrans["Tipo de Transacción"]];
          const monto = parseFloat(String(datosTrans[i][mapaTrans["Monto"]]).replace(/[^0-9.-]+/g,"")) || 0;
          
          if (tipo == 1 || tipo == 3) { 
              totalCobradoCliente += monto;
          } else if (tipo == 2) { 
              totalPagadoProveedor += monto;
          }
      }
  }

  return {
      exito: true,
      datos: {
          ventaTotal: totalVentaTeorica,
          costoTotal: totalCostoTeorico,
          utilidadTeorica: totalVentaTeorica - totalCostoTeorico,
          cobradoCliente: totalCobradoCliente,
          pagadoProveedor: totalPagadoProveedor,
          porCobrar: totalVentaTeorica - totalCobradoCliente,
          porPagar: totalCostoTeorico - totalPagadoProveedor
      }
  };
}

function obtenerSaldoCliente(idCliente) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Saldo a Favor");
  const datos = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja);
    
  if (mapa["ID Cliente"] === undefined || mapa["Saldo"] === undefined) return { exito: false, error: "Error en hoja Saldo" };

  const fila = datos.slice(1).find(r => r[mapa["ID Cliente"]] == idCliente);
  let saldo = 0;
    
  if (fila) {
     const val = String(fila[mapa["Saldo"]]);
     saldo = parseFloat(val.replace(/[^0-9.-]+/g,"")) || 0;
  }
    
  return { exito: true, saldo: saldo };
}

function obtenerTodasTransacciones(rol) {
  if (rol !== 'Administrador' && rol !== 'Asistente') return { exito: false, error: "Acceso denegado" };

  const ss = SpreadsheetApp.openById(ID_HOJA);
  const hoja = ss.getSheetByName("Transacciones");
  const datos = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja);

  const hojaClientes = ss.getSheetByName("Clientes");
  const datosClientes = hojaClientes.getDataRange().getValues();
  const mapaClientes = obtenerMapaColumnas(hojaClientes);
  const clientesMap = {};
  for(let i=1; i<datosClientes.length; i++) {
     const cid = String(datosClientes[i][mapaClientes["ID Cliente"]]).trim();
     if(cid) clientesMap[cid] = datosClientes[i][mapaClientes["Nombre Completo"]];
  }

  const hojaViajes = ss.getSheetByName("Viajes");
  const datosViajes = hojaViajes.getDataRange().getValues();
  const mapaViajes = obtenerMapaColumnas(hojaViajes);
  const viajesMap = {};
  for(let i=1; i<datosViajes.length; i++) {
      const vid = String(datosViajes[i][mapaViajes["ID Viaje"]]).trim();
      if(vid) viajesMap[vid] = datosViajes[i][mapaViajes["Nombre Viaje"]];
  }

  const hojaProv = ss.getSheetByName("Proveedores");
  const datosProv = hojaProv.getDataRange().getValues();
  const mapaProv = obtenerMapaColumnas(hojaProv);
  const provMap = {};
  for(let i=1; i<datosProv.length; i++) {
      const pid = String(datosProv[i][mapaProv["ID Proveedor"]]).trim();
      if (pid) provMap[pid] = datosProv[i][mapaProv["Nombre Completo"]];
  }

  const hojaListas = ss.getSheetByName("Listas");
  const datosListas = hojaListas.getDataRange().getValues();
  const mapaListas = obtenerMapaColumnas(hojaListas);
  const fpMap = {};
  const monedasMap = {};
  if (mapaListas["Forma de Pago"] !== undefined && mapaListas["Forma de Pago"] + 1 < datosListas[0].length) {
      for(let i=2; i<datosListas.length; i++){
          const fid = String(datosListas[i][mapaListas["Forma de Pago"]+1]).trim();
          if(fid) fpMap[fid] = String(datosListas[i][mapaListas["Forma de Pago"]]);
      }
  }
  if (mapaListas["Moneda"] !== undefined && mapaListas["Moneda"] + 3 < datosListas[0].length) {
      for(let i=2; i<datosListas.length; i++){
          const mid = String(datosListas[i][mapaListas["Moneda"]+3]).trim();
          if(mid) monedasMap[mid] = String(datosListas[i][mapaListas["Moneda"]]);
      }
  }

  let transacciones = [];
  for (let i = 1; i < datos.length; i++) {
      const dbId = mapa["ID Transacción"] !== undefined ? datos[i][mapa["ID Transacción"]] : "";
      const isIdValid = dbId !== undefined && dbId !== null && String(dbId).trim() !== "";
      const tId = isIdValid ? String(dbId).trim() : "ROW_" + (i + 1);

      const tDate = datos[i][mapa["Fecha Transacción"]];
      let fechaFormat = "";
      if (tDate) {
          try { fechaFormat = new Date(tDate).toISOString().split('T')[0]; } catch(e){}
      }
      
      const tipoId = String(datos[i][mapa["Tipo de Transacción"]]);
      const cliId = String(datos[i][mapa["ID Cliente"]]).trim();
      const provId = String(datos[i][mapa["Proveedor"]]).trim();
      const idViaje = String(datos[i][mapa["ID Viaje"]]).trim();
      const fpId = String(datos[i][mapa["Forma de Pago"]]).trim();
      const monId = String(datos[i][mapa["Moneda"]]).trim();

      transacciones.push({
          idTransaccion: tId,
          _rowIndex: i + 1,
          fecha: fechaFormat,
          tipo: tipoId,
          monto: parseFloat(String(datos[i][mapa["Monto"]]).replace(/[^0-9.-]+/g,"")) || 0,
          moneda: monId,
          nombreMoneda: monedasMap[monId] || monId,
          concepto: datos[i][mapa["Concepto"]] || "",
          idCliente: cliId,
          nombreCliente: clientesMap[cliId] || cliId,
          idProveedor: provId,
          nombreProveedor: provMap[provId] || provId,
          idViaje: idViaje,
          nombreViaje: viajesMap[idViaje] || idViaje,
          formaPago: fpId,
          nombreFormaPago: fpMap[fpId] || fpId,
          idCuentaEmpresa: mapa["Cuenta Empresa"] !== undefined ? datos[i][mapa["Cuenta Empresa"]] : "",
          idServicio: mapa["ID Servicio"] !== undefined ? datos[i][mapa["ID Servicio"]] : "",
          idPasajero: mapa["ID Pasajero"] !== undefined ? datos[i][mapa["ID Pasajero"]] : "",
          tipoCambio: mapa["Tipo de Cambio"] !== undefined ? datos[i][mapa["Tipo de Cambio"]] : 1,
          aplicaIVA: mapa["Tasa IVA"] !== undefined && (parseFloat(datos[i][mapa["Tasa IVA"]]) > 0),
          tasaIVA: mapa["Tasa IVA"] !== undefined ? datos[i][mapa["Tasa IVA"]] : 16,
          noFactura: mapa["No. Factura"] !== undefined ? datos[i][mapa["No. Factura"]] : ""
      });
  }
  
  transacciones.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  return { exito: true, datos: transacciones };
}

function editarTransaccion(rol, t) {
  if (rol !== 'Administrador') return { exito: false, error: "Sólo los administradores pueden editar transacciones." };

  const ss = SpreadsheetApp.openById(ID_HOJA);
  const hoja = ss.getSheetByName("Transacciones");
  const data = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja);

  const idStr = String(t.idTransaccion);
  let rowIndex = -1;

  if (idStr.startsWith("ROW_")) {
      rowIndex = parseInt(idStr.split("_")[1]);
      if (rowIndex > data.length || rowIndex < 2) rowIndex = -1;
  } else if (mapa["ID Transacción"] !== undefined) {
      for (let i = 1; i < data.length; i++) {
          if (String(data[i][mapa["ID Transacción"]]).trim() === idStr) {
              rowIndex = i + 1;
              break;
          }
      }
  }

  if (rowIndex === -1) {
      return { exito: false, error: "Transacción no encontrada o formato de ID inválido." };
  }

  const subtotal = t.subtotal ? parseFloat(t.subtotal) : 0;
  const iva = t.montoIVA ? parseFloat(t.montoIVA) : 0;
  const total = parseFloat(t.monto) || 0;

  if (mapa["ID Viaje"] !== undefined) hoja.getRange(rowIndex, mapa["ID Viaje"] + 1).setValue(t.idViaje || "");
  if (mapa["ID Cliente"] !== undefined) hoja.getRange(rowIndex, mapa["ID Cliente"] + 1).setValue(t.idCliente || "");
  if (mapa["ID Pasajero"] !== undefined) hoja.getRange(rowIndex, mapa["ID Pasajero"] + 1).setValue(t.idPasajero || "");
  if (mapa["Proveedor"] !== undefined) hoja.getRange(rowIndex, mapa["Proveedor"] + 1).setValue(t.idProveedor || "");
  if (mapa["ID Servicio"] !== undefined) {
      let servVal = Array.isArray(t.idServicio) && t.idServicio.length > 0 ? t.idServicio[0] : (t.idServicio || "");
      hoja.getRange(rowIndex, mapa["ID Servicio"] + 1).setValue(servVal);
  }
  if (mapa["Fecha Transacción"] !== undefined) hoja.getRange(rowIndex, mapa["Fecha Transacción"] + 1).setValue(t.fecha);
  if (mapa["Tipo de Transacción"] !== undefined) hoja.getRange(rowIndex, mapa["Tipo de Transacción"] + 1).setValue(t.tipo);
  if (mapa["Forma de Pago"] !== undefined) hoja.getRange(rowIndex, mapa["Forma de Pago"] + 1).setValue(t.formaPago || "");
  if (mapa["Cuenta Empresa"] !== undefined) hoja.getRange(rowIndex, mapa["Cuenta Empresa"] + 1).setValue(t.idCuentaEmpresa || "");
  if (mapa["Concepto"] !== undefined) hoja.getRange(rowIndex, mapa["Concepto"] + 1).setValue(t.concepto || "Movimiento");
  if (mapa["Monto"] !== undefined) hoja.getRange(rowIndex, mapa["Monto"] + 1).setValue(total);
  if (mapa["Moneda"] !== undefined) hoja.getRange(rowIndex, mapa["Moneda"] + 1).setValue(t.moneda || "1");
  if (mapa["Tipo de Cambio"] !== undefined) hoja.getRange(rowIndex, mapa["Tipo de Cambio"] + 1).setValue(t.tipoCambio || 1);
  if (mapa["No. Factura"] !== undefined) hoja.getRange(rowIndex, mapa["No. Factura"] + 1).setValue(t.noFactura || "");
  
  if (t.aplicaIVA) {
      if (mapa["Subtotal"] !== undefined) hoja.getRange(rowIndex, mapa["Subtotal"] + 1).setValue(subtotal);
      if (mapa["Tasa IVA"] !== undefined) hoja.getRange(rowIndex, mapa["Tasa IVA"] + 1).setValue(t.tasaIVA);
      if (mapa["Monto IVA"] !== undefined) hoja.getRange(rowIndex, mapa["Monto IVA"] + 1).setValue(iva);
  } else {
      if (mapa["Subtotal"] !== undefined) hoja.getRange(rowIndex, mapa["Subtotal"] + 1).setValue("");
      if (mapa["Tasa IVA"] !== undefined) hoja.getRange(rowIndex, mapa["Tasa IVA"] + 1).setValue("");
      if (mapa["Monto IVA"] !== undefined) hoja.getRange(rowIndex, mapa["Monto IVA"] + 1).setValue("");
  }

  return { exito: true, mensaje: "Transacción actualizada correctamente." };
}

function eliminarTransaccion(rol, idTransaccion) {
  if (rol !== 'Administrador') return { exito: false, error: "Sólo administradores pueden eliminar transacciones." };

  const ss = SpreadsheetApp.openById(ID_HOJA);
  const hoja = ss.getSheetByName("Transacciones");
  const data = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja);

  const idStr = String(idTransaccion);
  let rowIndex = -1;

  if (idStr.startsWith("ROW_")) {
      rowIndex = parseInt(idStr.split("_")[1]);
      if (rowIndex > data.length || rowIndex < 2) rowIndex = -1;
  } else if (mapa["ID Transacción"] !== undefined) {
      for (let i = 1; i < data.length; i++) {
          if (String(data[i][mapa["ID Transacción"]]).trim() === idStr) {
              rowIndex = i + 1;
              break;
          }
      }
  }

  if (rowIndex === -1) {
      return { exito: false, error: "Transacción no encontrada." };
  }

  hoja.deleteRow(rowIndex);
  return { exito: true, mensaje: "Transacción eliminada exitosamente." };
}

// ==========================================
// 9. CLIENTES Y PASAJEROS
// ==========================================
function obtenerClientes(rol) {
  if (rol !== 'Administrador' && rol !== 'Asistente') return { exito: false, error: "Acceso denegado" };

  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Clientes");
  const datos = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja);
    
  if (mapa["ID Cliente"] === undefined) return { exito: false, error: "Error DB Clientes" };

  const clientes = [];
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    if (fila[mapa["ID Cliente"]]) {
      let telefonos = [];
      if (mapa["Lista Telefonos"] !== undefined && fila[mapa["Lista Telefonos"]]) {
          try { telefonos = JSON.parse(fila[mapa["Lista Telefonos"]]); } catch(e) {}
      }
      
      if (telefonos.length === 0 && mapa["Teléfono"] !== undefined) {
          const tel = fila[mapa["Teléfono"]];
          const lada = mapa["Lada"] !== undefined ? fila[mapa["Lada"]] : "";
          if (tel) telefonos.push({ tipo: 'Principal', lada: lada, numero: tel });
      }

      clientes.push({
        id: fila[mapa["ID Cliente"]],
        nombre: fila[mapa["Nombre Completo"]],
        razonSocial: mapa["Razón Social"] !== undefined ? fila[mapa["Razón Social"]] : "",
        rfc: mapa["RFC"] !== undefined ? fila[mapa["RFC"]] : "",
        ciudad: mapa["Ciudad"] !== undefined ? fila[mapa["Ciudad"]] : "",
        telefonos: telefonos, 
        telefono: mapa["Teléfono"] !== undefined ? fila[mapa["Teléfono"]] : "",
        correo: mapa["Correo"] !== undefined ? fila[mapa["Correo"]] : "",
        calle: mapa["Calle"] !== undefined ? fila[mapa["Calle"]] : "",
        colonia: mapa["Colonia"] !== undefined ? fila[mapa["Colonia"]] : "",
        cp: mapa["CP"] !== undefined ? fila[mapa["CP"]] : "",
        pais: mapa["País"] !== undefined ? fila[mapa["País"]] : "",
        estado: mapa["Estado"] !== undefined ? fila[mapa["Estado"]] : "",
        numExt: mapa["Número Exterior"] !== undefined ? fila[mapa["Número Exterior"]] : "",
        numInt: mapa["Número Interior"] !== undefined ? fila[mapa["Número Interior"]] : "",
        tipoPersona: mapa["Tipo Persona"] !== undefined ? fila[mapa["Tipo Persona"]] : "Física",
        token: mapa["Token Invitacion"] !== undefined ? (fila[mapa["Token Invitacion"]] || "") : "",
        idUsuario: mapa["ID Usuario"] !== undefined ? (fila[mapa["ID Usuario"]] || "") : "" 
      });
    }
  }
  
  clientes.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { exito: true, datos: clientes };
}

function agregarCliente(cliente) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Clientes");
  const mapa = obtenerMapaColumnas(hoja);
    
  let nuevoId = 1;
  const colIdIdx = mapa["ID Cliente"];
  if (hoja.getLastRow() > 1 && colIdIdx !== undefined) {
    const valoresIds = hoja.getRange(2, colIdIdx + 1, hoja.getLastRow() - 1, 1).getValues().flat();
    const idsNumericos = valoresIds.map(v => parseInt(v)).filter(v => !isNaN(v));
    if(idsNumericos.length > 0) nuevoId = Math.max(...idsNumericos) + 1;
  }

  const numCols = hoja.getLastColumn();
  const nuevaFila = new Array(numCols).fill("");

  if (mapa["ID Cliente"] !== undefined) nuevaFila[mapa["ID Cliente"]] = nuevoId;
  if (mapa["Nombre Completo"] !== undefined) nuevaFila[mapa["Nombre Completo"]] = cliente.nombre;
  if (mapa["Razón Social"] !== undefined) nuevaFila[mapa["Razón Social"]] = cliente.razonSocial;
  if (mapa["RFC"] !== undefined) nuevaFila[mapa["RFC"]] = cliente.rfc;
  if (mapa["ID Usuario"] !== undefined) nuevaFila[mapa["ID Usuario"]] = cliente.idUsuario; 
  if (mapa["Tipo Persona"] !== undefined) nuevaFila[mapa["Tipo Persona"]] = cliente.tipoPersona;

  if (mapa["País"] !== undefined) nuevaFila[mapa["País"]] = cliente.pais; 
  if (mapa["Ciudad"] !== undefined) nuevaFila[mapa["Ciudad"]] = cliente.ciudad;
  if (mapa["Estado"] !== undefined) nuevaFila[mapa["Estado"]] = cliente.estado;
  if (mapa["Colonia"] !== undefined) nuevaFila[mapa["Colonia"]] = cliente.colonia;
  if (mapa["Calle"] !== undefined) nuevaFila[mapa["Calle"]] = cliente.calle;
  if (mapa["Número Exterior"] !== undefined) nuevaFila[mapa["Número Exterior"]] = cliente.numExt;
  if (mapa["Número Interior"] !== undefined) nuevaFila[mapa["Número Interior"]] = cliente.numInt;
  if (mapa["CP"] !== undefined) nuevaFila[mapa["CP"]] = cliente.cp;
  if (mapa["Correo"] !== undefined) nuevaFila[mapa["Correo"]] = cliente.correo;

  if (mapa["Lista Telefonos"] !== undefined && cliente.telefonos) {
      nuevaFila[mapa["Lista Telefonos"]] = JSON.stringify(cliente.telefonos);
  }

  if (cliente.telefonos && cliente.telefonos.length > 0) {
      const principal = cliente.telefonos[0];
      if (mapa["Lada"] !== undefined) nuevaFila[mapa["Lada"]] = principal.lada;
      if (mapa["Teléfono"] !== undefined) nuevaFila[mapa["Teléfono"]] = principal.numero;
  }

  hoja.appendRow(nuevaFila);
  return { exito: true, mensaje: "Cliente creado exitosamente", id: nuevoId };
}

function editarPerfilCliente(c) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Clientes");
  const mapa = obtenerMapaColumnas(hoja);
  const data = hoja.getDataRange().getValues();
  const idCol = mapa["ID Cliente"];
    
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == c.id) { rowIndex = i + 1; break; }
  }
    
  if (rowIndex === -1) return { exito: false, error: "Cliente no encontrado" };

  if (mapa["Nombre Completo"] !== undefined) hoja.getRange(rowIndex, mapa["Nombre Completo"] + 1).setValue(c.nombre);
  if (mapa["Razón Social"] !== undefined) hoja.getRange(rowIndex, mapa["Razón Social"] + 1).setValue(c.razonSocial);
  if (mapa["RFC"] !== undefined) hoja.getRange(rowIndex, mapa["RFC"] + 1).setValue(c.rfc);
  if (mapa["Teléfono"] !== undefined) hoja.getRange(rowIndex, mapa["Teléfono"] + 1).setValue(c.telefono);
  if (mapa["Correo"] !== undefined) hoja.getRange(rowIndex, mapa["Correo"] + 1).setValue(c.correo);
    
  if (mapa["Lada"] !== undefined) hoja.getRange(rowIndex, mapa["Lada"] + 1).setValue(c.lada);
  if (mapa["País"] !== undefined) hoja.getRange(rowIndex, mapa["País"] + 1).setValue(c.pais);
  if (mapa["Estado"] !== undefined) hoja.getRange(rowIndex, mapa["Estado"] + 1).setValue(c.estado);
  if (mapa["Ciudad"] !== undefined) hoja.getRange(rowIndex, mapa["Ciudad"] + 1).setValue(c.ciudad);
  if (mapa["Colonia"] !== undefined) hoja.getRange(rowIndex, mapa["Colonia"] + 1).setValue(c.colonia);
  if (mapa["Calle"] !== undefined) hoja.getRange(rowIndex, mapa["Calle"] + 1).setValue(c.calle);
  if (mapa["Número Exterior"] !== undefined) hoja.getRange(rowIndex, mapa["Número Exterior"] + 1).setValue(c.numExt);
  if (mapa["Número Interior"] !== undefined) hoja.getRange(rowIndex, mapa["Número Interior"] + 1).setValue(c.numInt);
  if (mapa["CP"] !== undefined) hoja.getRange(rowIndex, mapa["CP"] + 1).setValue(c.cp);

  return { exito: true, mensaje: "Perfil actualizado correctamente" };
}

// ------------------------------------------------------------------
// PROVEEDORES
// ------------------------------------------------------------------
function obtenerProveedores() {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Proveedores");
  const datos = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja);
    
  if (mapa["ID Proveedor"] === undefined) return { exito: true, datos: [] };

  const proveedores = [];
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    if (fila[mapa["ID Proveedor"]]) {
      
      let telefonos = [];
      if (mapa["Lista Telefonos"] !== undefined && fila[mapa["Lista Telefonos"]]) {
          try { telefonos = JSON.parse(fila[mapa["Lista Telefonos"]]); } catch(e) {}
      }
      if (telefonos.length === 0 && mapa["Teléfono"] !== undefined) {
          const tel = fila[mapa["Teléfono"]];
          const lada = mapa["Lada"] !== undefined ? fila[mapa["Lada"]] : "52";
          if (tel) telefonos.push({ tipo: 'Oficina', lada: lada, numero: tel });
      }

      proveedores.push({
        id: fila[mapa["ID Proveedor"]],
        nombre: fila[mapa["Nombre Completo"]] || "Proveedor sin nombre",
        razonSocial: fila[mapa["Razón Social"]] || "",
        rfc: fila[mapa["RFC"]] || "",
        pais: fila[mapa["País"]] || "",
        estado: mapa["Estado"] !== undefined ? fila[mapa["Estado"]] : "",
        ciudad: fila[mapa["Ciudad"]] || "",
        colonia: fila[mapa["Colonia"]] || "",
        calle: fila[mapa["Calle"]] || "",
        numExt: fila[mapa["Número Exterior"]] || "",
        numInt: fila[mapa["Número Interior"]] || "",
        cp: fila[mapa["CP"]] || "",
        lada: fila[mapa["Lada"]] || "",
        telefono: fila[mapa["Teléfono"]] || "",
        telefonos: telefonos,
        correo: fila[mapa["Correo"]] || ""
      });
    }
  }
  proveedores.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { exito: true, datos: proveedores };
}

function agregarProveedor(p) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Proveedores");
  const mapa = obtenerMapaColumnas(hoja);
    
  let nuevoId = 1;
  const colIdIdx = mapa["ID Proveedor"];
  if (hoja.getLastRow() > 1 && colIdIdx !== undefined) {
    const valoresIds = hoja.getRange(2, colIdIdx + 1, hoja.getLastRow() - 1, 1).getValues().flat();
    const idsNumericos = valoresIds.map(v => parseInt(v)).filter(v => !isNaN(v));
    if(idsNumericos.length > 0) nuevoId = Math.max(...idsNumericos) + 1;
  }

  const numCols = hoja.getLastColumn();
  const nuevaFila = new Array(numCols).fill("");

  if (mapa["ID Proveedor"] !== undefined) nuevaFila[mapa["ID Proveedor"]] = nuevoId;
  if (mapa["Nombre Completo"] !== undefined) nuevaFila[mapa["Nombre Completo"]] = p.nombre;
  if (mapa["Razón Social"] !== undefined) nuevaFila[mapa["Razón Social"]] = p.razonSocial;
  if (mapa["RFC"] !== undefined) nuevaFila[mapa["RFC"]] = p.rfc;
  if (mapa["País"] !== undefined) nuevaFila[mapa["País"]] = p.pais;
  if (mapa["Estado"] !== undefined) nuevaFila[mapa["Estado"]] = p.estado;
  if (mapa["Ciudad"] !== undefined) nuevaFila[mapa["Ciudad"]] = p.ciudad;
  if (mapa["Colonia"] !== undefined) nuevaFila[mapa["Colonia"]] = p.colonia;
  if (mapa["Calle"] !== undefined) nuevaFila[mapa["Calle"]] = p.calle;
  if (mapa["Número Exterior"] !== undefined) nuevaFila[mapa["Número Exterior"]] = p.numExt;
  if (mapa["Número Interior"] !== undefined) nuevaFila[mapa["Número Interior"]] = p.numInt;
  if (mapa["CP"] !== undefined) nuevaFila[mapa["CP"]] = p.cp;
    
  if (p.telefonos && p.telefonos.length > 0) {
      const principal = p.telefonos[0];
      if (mapa["Lada"] !== undefined) nuevaFila[mapa["Lada"]] = principal.lada;
      if (mapa["Teléfono"] !== undefined) nuevaFila[mapa["Teléfono"]] = principal.numero;
      if (mapa["Lista Telefonos"] !== undefined) {
          nuevaFila[mapa["Lista Telefonos"]] = JSON.stringify(p.telefonos);
      }
  } else {
      if (mapa["Lada"] !== undefined) nuevaFila[mapa["Lada"]] = p.lada;
      if (mapa["Teléfono"] !== undefined) nuevaFila[mapa["Teléfono"]] = p.telefono;
  }

  if (mapa["Correo"] !== undefined) nuevaFila[mapa["Correo"]] = p.correo;

  hoja.appendRow(nuevaFila);
  return { exito: true, mensaje: "Proveedor creado", id: nuevoId };
}

function editarProveedor(p) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Proveedores");
  const mapa = obtenerMapaColumnas(hoja);
  const data = hoja.getDataRange().getValues();
  const idCol = mapa["ID Proveedor"];
    
  if (idCol === undefined) return { exito: false, error: "Error DB" };

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == p.id) { rowIndex = i + 1; break; }
  }

  if (rowIndex === -1) return { exito: false, error: "Proveedor no encontrado" };

  if (mapa["Nombre Completo"] !== undefined) hoja.getRange(rowIndex, mapa["Nombre Completo"] + 1).setValue(p.nombre);
  if (mapa["Razón Social"] !== undefined) hoja.getRange(rowIndex, mapa["Razón Social"] + 1).setValue(p.razonSocial);
  if (mapa["RFC"] !== undefined) hoja.getRange(rowIndex, mapa["RFC"] + 1).setValue(p.rfc);
  if (mapa["País"] !== undefined) hoja.getRange(rowIndex, mapa["País"] + 1).setValue(p.pais);
  if (mapa["Estado"] !== undefined) hoja.getRange(rowIndex, mapa["Estado"] + 1).setValue(p.estado);
  if (mapa["Ciudad"] !== undefined) hoja.getRange(rowIndex, mapa["Ciudad"] + 1).setValue(p.ciudad);
  if (mapa["Colonia"] !== undefined) hoja.getRange(rowIndex, mapa["Colonia"] + 1).setValue(p.colonia);
  if (mapa["Calle"] !== undefined) hoja.getRange(rowIndex, mapa["Calle"] + 1).setValue(p.calle);
  if (mapa["Número Exterior"] !== undefined) hoja.getRange(rowIndex, mapa["Número Exterior"] + 1).setValue(p.numExt);
  if (mapa["Número Interior"] !== undefined) hoja.getRange(rowIndex, mapa["Número Interior"] + 1).setValue(p.numInt);
  if (mapa["CP"] !== undefined) hoja.getRange(rowIndex, mapa["CP"] + 1).setValue(p.cp);
    
  if (p.telefonos && p.telefonos.length > 0) {
      const principal = p.telefonos[0];
      if (mapa["Lada"] !== undefined) hoja.getRange(rowIndex, mapa["Lada"] + 1).setValue(principal.lada);
      if (mapa["Teléfono"] !== undefined) hoja.getRange(rowIndex, mapa["Teléfono"] + 1).setValue(principal.numero);
      if (mapa["Lista Telefonos"] !== undefined) {
          hoja.getRange(rowIndex, mapa["Lista Telefonos"] + 1).setValue(JSON.stringify(p.telefonos));
      }
  } else {
      if (mapa["Lada"] !== undefined) hoja.getRange(rowIndex, mapa["Lada"] + 1).setValue(p.lada);
      if (mapa["Teléfono"] !== undefined) hoja.getRange(rowIndex, mapa["Teléfono"] + 1).setValue(p.telefono);
  }

  if (mapa["Correo"] !== undefined) hoja.getRange(rowIndex, mapa["Correo"] + 1).setValue(p.correo);

  return { exito: true, mensaje: "Proveedor actualizado" };
}

function eliminarProveedor(id) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Proveedores");
  const mapa = obtenerMapaColumnas(hoja);
  const data = hoja.getDataRange().getValues();
  const idCol = mapa["ID Proveedor"];

  if (idCol === undefined) return { exito: false, error: "Error DB" };

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) { rowIndex = i + 1; break; }
  }

  if (rowIndex === -1) return { exito: false, error: "Proveedor no encontrado" };

  hoja.deleteRow(rowIndex);
  return { exito: true, mensaje: "Proveedor eliminado" };
}

// ==========================================
// 10. PASAJEROS Y TOKENS (SOLUCIÓN: Funciones Restauradas)
// ==========================================
function obtenerPasajeros(rol) {
  // Validación de seguridad básica
  if (rol !== 'Administrador' && rol !== 'Asistente' && rol !== 'Cliente') return { exito: false, error: "Acceso denegado" };

  const ss = SpreadsheetApp.openById(ID_HOJA);
  const timezone = Session.getScriptTimeZone();
  const hoja = ss.getSheetByName("Pasajeros");
  const datos = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja);
   
  const hojaCli = ss.getSheetByName("Clientes");
  const datosCli = hojaCli.getDataRange().getValues();
  const mapaCli = obtenerMapaColumnas(hojaCli);
  const mapaNombresClientes = {};
   
  if (mapaCli["ID Cliente"] !== undefined) {
      for(let i=1; i<datosCli.length; i++){
          const id = datosCli[i][mapaCli["ID Cliente"]];
          const nom = datosCli[i][mapaCli["Nombre Completo"]] || datosCli[i][mapaCli["Razón Social"]];
          if(id) mapaNombresClientes[id] = nom;
      }
  }

  const pasajeros = [];
   
  if (mapa["ID Pasajero"] !== undefined) {
      for (let i = 1; i < datos.length; i++) {
        const fila = datos[i];
        if (fila[mapa["ID Pasajero"]]) {
            
            let telefonos = [];
            if (mapa["Lista Telefonos"] !== undefined && fila[mapa["Lista Telefonos"]]) {
                try { telefonos = JSON.parse(fila[mapa["Lista Telefonos"]]); } catch(e) {}
            }
            if (telefonos.length === 0 && mapa["Teléfono"] !== undefined) {
                const tel = fila[mapa["Teléfono"]];
                const lada = mapa["Lada"] !== undefined ? fila[mapa["Lada"]] : "52";
                if (tel) telefonos.push({ tipo: 'Móvil', lada: lada, numero: tel });
            }

            let fechaNac = "";
            if (mapa["Fecha de Nacimiento"] !== undefined && fila[mapa["Fecha de Nacimiento"]]) {
                fechaNac = formatearFechaUniversal(fila[mapa["Fecha de Nacimiento"]]);
            }

            const idCliente = fila[mapa["ID Cliente"]];

            pasajeros.push({
                id: fila[mapa["ID Pasajero"]],
                idCliente: idCliente,
                nombreCliente: mapaNombresClientes[idCliente] || "Sin Cliente",
                nombre: fila[mapa["Nombre(s)"]],
                apellidoP: fila[mapa["Apellido Paterno"]],
                apellidoM: mapa["Apellido Materno"] !== undefined ? fila[mapa["Apellido Materno"]] : "",
                fechaNacimiento: fechaNac,
                nacionalidad: mapa["Nacionalidad"] !== undefined ? fila[mapa["Nacionalidad"]] : "",
                pasaporte: mapa["ID Pasaporte"] !== undefined ? fila[mapa["ID Pasaporte"]] : "",
                visa: mapa["ID Visa"] !== undefined ? fila[mapa["ID Visa"]] : "",
                
                // Dirección
                pais: mapa["País"] !== undefined ? fila[mapa["País"]] : "",
                estado: mapa["Estado"] !== undefined ? fila[mapa["Estado"]] : "",
                ciudad: mapa["Ciudad"] !== undefined ? fila[mapa["Ciudad"]] : "",
                colonia: mapa["Colonia"] !== undefined ? fila[mapa["Colonia"]] : "",
                calle: mapa["Calle"] !== undefined ? fila[mapa["Calle"]] : "",
                numExt: mapa["Número Exterior"] !== undefined ? fila[mapa["Número Exterior"]] : "",
                numInt: mapa["Número Interior"] !== undefined ? fila[mapa["Número Interior"]] : "",
                cp: mapa["CP"] !== undefined ? fila[mapa["CP"]] : "",
                
                // Contacto
                telefonos: telefonos,
                telefono: mapa["Teléfono"] !== undefined ? fila[mapa["Teléfono"]] : "", // Legacy support
                lada: mapa["Lada"] !== undefined ? fila[mapa["Lada"]] : "",
                correo: mapa["Correo"] !== undefined ? fila[mapa["Correo"]] : "",
                
                // Estado del usuario
                registrado: mapa["ID Usuario"] !== undefined && fila[mapa["ID Usuario"]] ? true : false,
                idUsuario: mapa["ID Usuario"] !== undefined ? fila[mapa["ID Usuario"]] : "",
                token: mapa["Token Invitacion"] !== undefined ? fila[mapa["Token Invitacion"]] : ""
            });
        }
      }
  }
   
  pasajeros.sort((a, b) => a.nombre.localeCompare(b.nombre));
   
  return { exito: true, datos: pasajeros };
}

function agregarPasajero(p) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Pasajeros");
  const mapa = obtenerMapaColumnas(hoja);
   
  let nuevoId = 1;
  const colIdIdx = mapa["ID Pasajero"];
  if (hoja.getLastRow() > 1 && colIdIdx !== undefined) {
    const valoresIds = hoja.getRange(2, colIdIdx + 1, hoja.getLastRow() - 1, 1).getValues().flat();
    const idsNumericos = valoresIds.map(v => parseInt(v)).filter(v => !isNaN(v));
    if(idsNumericos.length > 0) nuevoId = Math.max(...idsNumericos) + 1;
  }

  const numCols = hoja.getLastColumn();
  const nuevaFila = new Array(numCols).fill("");

  const setVal = (campo, col) => { if(campo !== undefined && mapa[col] !== undefined) nuevaFila[mapa[col]] = campo; };

  setVal(nuevoId, "ID Pasajero");
  setVal(p.idCliente, "ID Cliente");
  setVal(p.nombre, "Nombre(s)");
  setVal(p.apellidoP, "Apellido Paterno");
  setVal(p.apellidoM, "Apellido Materno");
  setVal(p.fechaNacimiento, "Fecha de Nacimiento");
  setVal(p.nacionalidad, "Nacionalidad");
  setVal(p.pasaporte, "ID Pasaporte");
  setVal(p.visa, "ID Visa");
   
  setVal(p.pais, "País");
  setVal(p.estado, "Estado");
  setVal(p.ciudad, "Ciudad");
  setVal(p.colonia, "Colonia");
  setVal(p.calle, "Calle");
  setVal(p.numExt, "Número Exterior");
  setVal(p.numInt, "Número Interior");
  setVal(p.cp, "CP");
  setVal(p.correo, "Correo");
  setVal(p.idUsuario, "ID Usuario");

  if (p.telefonos && p.telefonos.length > 0) {
      const principal = p.telefonos[0];
      setVal(principal.lada, "Lada");
      setVal(principal.numero, "Teléfono");
      if (mapa["Lista Telefonos"] !== undefined) nuevaFila[mapa["Lista Telefonos"]] = JSON.stringify(p.telefonos);
  } else {
      setVal(p.lada, "Lada");
      setVal(p.telefono, "Teléfono");
  }

  hoja.appendRow(nuevaFila);
  return { exito: true, mensaje: "Pasajero agregado", id: nuevoId };
}

function editarPasajero(p) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Pasajeros");
  const mapa = obtenerMapaColumnas(hoja);
  const data = hoja.getDataRange().getValues();
  const idCol = mapa["ID Pasajero"];
   
  if (idCol === undefined) return { exito: false, error: "Error DB" };

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == p.id) { rowIndex = i + 1; break; }
  }

  if (rowIndex === -1) return { exito: false, error: "Pasajero no encontrado" };

  const update = (campo, col) => { if(campo !== undefined && mapa[col] !== undefined) hoja.getRange(rowIndex, mapa[col] + 1).setValue(campo); };

  update(p.nombre, "Nombre(s)");
  update(p.apellidoP, "Apellido Paterno");
  update(p.apellidoM, "Apellido Materno");
  update(p.fechaNacimiento, "Fecha de Nacimiento");
  update(p.nacionalidad, "Nacionalidad");
  update(p.pasaporte, "ID Pasaporte");
  update(p.visa, "ID Visa");
   
  update(p.pais, "País");
  update(p.estado, "Estado");
  update(p.ciudad, "Ciudad");
  update(p.colonia, "Colonia");
  update(p.calle, "Calle");
  update(p.numExt, "Número Exterior");
  update(p.numInt, "Número Interior");
  update(p.cp, "CP");
  update(p.correo, "Correo");
  update(p.idUsuario, "ID Usuario");

  if (p.telefonos && p.telefonos.length > 0) {
      const principal = p.telefonos[0];
      update(principal.lada, "Lada");
      update(principal.numero, "Teléfono");
      update(JSON.stringify(p.telefonos), "Lista Telefonos");
  } else {
      update(p.lada, "Lada");
      update(p.telefono, "Teléfono");
  }

  return { exito: true, mensaje: "Pasajero actualizado" };
}

function generarTokenInvitacion(idPasajero) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Pasajeros");
  const mapa = obtenerMapaColumnas(hoja);
  const datos = hoja.getDataRange().getValues();
  let rowIndex = -1;
  const colId = mapa["ID Pasajero"];
    
  if (mapa["Token Invitacion"] === undefined) return { exito: false, error: "Falta columna Token" };

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][colId] == idPasajero) { rowIndex = i + 1; break; }
  }

  if (rowIndex === -1) return { exito: false, error: "Pasajero no encontrado" };
  const token = Utilities.getUuid();
  hoja.getRange(rowIndex, mapa["Token Invitacion"] + 1).setValue(token);
  return { exito: true, token: token };
}

function generarTokenInvitacionCliente(idCliente) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Clientes");
  const mapa = obtenerMapaColumnas(hoja);
  const datos = hoja.getDataRange().getValues();
  let rowIndex = -1;
  const colId = mapa["ID Cliente"];
    
  if (mapa["Token Invitacion"] === undefined) return { exito: false, error: "Falta columna Token" };

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][colId] == idCliente) { rowIndex = i + 1; break; }
  }

  if (rowIndex === -1) return { exito: false, error: "Cliente no encontrado" };
  const token = Utilities.getUuid();
  hoja.getRange(rowIndex, mapa["Token Invitacion"] + 1).setValue(token);
  return { exito: true, token: token };
}

function validarTokenInvitacion(token) {
  const libro = SpreadsheetApp.openById(ID_HOJA);
    
  const hojaPas = libro.getSheetByName("Pasajeros");
  const mapaPas = obtenerMapaColumnas(hojaPas);
  if (mapaPas["Token Invitacion"] !== undefined) {
      const datosPas = hojaPas.getDataRange().getValues();
      const pasajero = datosPas.slice(1).find(r => r[mapaPas["Token Invitacion"]] == token);
      if (pasajero) {
          return { 
            exito: true, 
            tipo: 'Pasajero',
            datos: {
              id: pasajero[mapaPas["ID Pasajero"]],
              nombre: pasajero[mapaPas["Nombre(s)"]],
              apellido: pasajero[mapaPas["Apellido Paterno"]],
              correo: pasajero[mapaPas["Correo"]] 
            }
          };
      }
  }

  const hojaCli = libro.getSheetByName("Clientes");
  const mapaCli = obtenerMapaColumnas(hojaCli);
  if (mapaCli["Token Invitacion"] !== undefined) {
      const datosCli = hojaCli.getDataRange().getValues();
      const cliente = datosCli.slice(1).find(r => r[mapaCli["Token Invitacion"]] == token);
      if (cliente) {
          return { 
            exito: true, 
            tipo: 'Cliente',
            datos: {
              id: cliente[mapaCli["ID Cliente"]],
              nombre: cliente[mapaCli["Nombre Completo"]], 
              empresa: cliente[mapaCli["Razón Social"]] || "Sin Razón Social",
              correo: cliente[mapaCli["Correo"]] 
            }
          };
      }
  }

  return { exito: false, error: "El enlace es inválido o ha caducado." };
}

function completarRegistroPasajero(datos) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const hojaPas = ss.getSheetByName("Pasajeros");
  const mapaPas = obtenerMapaColumnas(hojaPas);
  const dataPas = hojaPas.getDataRange().getValues();
    
  let rowIndex = -1;
  let filaPasajero = null;
    
  for (let i = 1; i < dataPas.length; i++) {
    if (dataPas[i][mapaPas["Token Invitacion"]] == datos.token) {
      rowIndex = i + 1;
      filaPasajero = dataPas[i];
      break;
    }
  }

  if (rowIndex === -1) return { exito: false, error: "Token inválido o expirado." };

  const resRegistro = registrarUsuario({
    nombre: filaPasajero[mapaPas["Nombre(s)"]],
    apellido: filaPasajero[mapaPas["Apellido Paterno"]],
    correo: filaPasajero[mapaPas["Correo"]],
    password: datos.password,
    rolManual: "Pasajero" 
  });
    
  if (!resRegistro.exito && resRegistro.error !== "Este correo ya está registrado.") { 
      return resRegistro; 
  }

  const guardarDato = (campoFormulario, nombreColumna) => {
      if (datos[campoFormulario] !== undefined && mapaPas[nombreColumna] !== undefined) {
          hojaPas.getRange(rowIndex, mapaPas[nombreColumna] + 1).setValue(datos[campoFormulario]);
      }
  };

  guardarDato("apellidoM", "Apellido Materno");
  guardarDato("nacionalidad", "Nacionalidad");
  guardarDato("fechaNacimiento", "Fecha de Nacimiento");
  guardarDato("lada", "Lada");
  guardarDato("telefono", "Teléfono");
  guardarDato("pasaporte", "ID Pasaporte");
  guardarDato("visa", "ID Visa");
  guardarDato("pais", "País");
  guardarDato("estado", "Estado");
  guardarDato("cp", "CP");
  guardarDato("ciudad", "Ciudad");
  guardarDato("colonia", "Colonia");
  guardarDato("calle", "Calle");
  guardarDato("numExt", "Número Exterior");
  guardarDato("numInt", "Número Interior");

  if (resRegistro.usuario && resRegistro.usuario.id) {
      if (mapaPas["ID Usuario"] !== undefined) {
          hojaPas.getRange(rowIndex, mapaPas["ID Usuario"] + 1).setValue(resRegistro.usuario.id);
      }
  }

  if (mapaPas["Token Invitacion"] !== undefined) {
      hojaPas.getRange(rowIndex, mapaPas["Token Invitacion"] + 1).setValue("");
  }

  return { exito: true, mensaje: "Cuenta de pasajero activada y perfil completado correctamente." };
}

function completarRegistroCliente(datos) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Clientes");
  const mapa = obtenerMapaColumnas(hoja);
  const data = hoja.getDataRange().getValues();
  let rowIndex = -1;
  let filaCliente = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][mapa["Token Invitacion"]] == datos.token) {
      rowIndex = i + 1;
      filaCliente = data[i];
      break;
    }
  }

  if (rowIndex === -1) return { exito: false, error: "Token inválido." };

  const nombreCompleto = filaCliente[mapa["Nombre Completo"]] || "Usuario Cliente";
  const nombres = nombreCompleto.split(" ")[0];
  const apellidos = nombreCompleto.substring(nombres.length).trim();

  const resRegistro = registrarUsuario({
    nombre: nombres,
    apellido: apellidos,
    correo: filaCliente[mapa["Correo"]],
    password: datos.password,
    rolManual: "Cliente",
    evitarCrearCliente: true 
  });

  if (!resRegistro.exito && resRegistro.error !== "Este correo ya está registrado.") { 
      return resRegistro; 
  }

  const guardar = (campo, col) => { if(datos[campo] && mapa[col] !== undefined) hoja.getRange(rowIndex, mapa[col] + 1).setValue(datos[campo]); };
    
  guardar("razonSocial", "Razón Social");
  guardar("rfc", "RFC");
  guardar("telefono", "Teléfono");
  guardar("lada", "Lada");
  guardar("pais", "País");
  guardar("estado", "Estado");
  guardar("ciudad", "Ciudad");
  guardar("colonia", "Colonia");
  guardar("calle", "Calle");
  guardar("numExt", "Número Exterior");
  guardar("numInt", "Número Interior");
  guardar("cp", "CP");
    
  if (resRegistro.usuario && resRegistro.usuario.id && mapa["ID Usuario"] !== undefined) {
      hoja.getRange(rowIndex, mapa["ID Usuario"] + 1).setValue(resRegistro.usuario.id);
  }

  if (mapa["Token Invitacion"] !== undefined) {
      hoja.getRange(rowIndex, mapa["Token Invitacion"] + 1).setValue("");
  }

  return { exito: true, mensaje: "Cuenta de cliente activada y perfil actualizado." };
}

function crearPerfilPasajeroPropio(datos) {
    const idUsuario = datos.idUsuario;
    const nombreCompleto = datos.nombre || "Nuevo Pasajero";
      
    const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Pasajeros");
    const mapa = obtenerMapaColumnas(hoja);
    const data = hoja.getDataRange().getValues();
      
    if (mapa["ID Usuario"] !== undefined) {
        const existe = data.slice(1).find(r => r[mapa["ID Usuario"]] == idUsuario);
        if (existe) return { exito: false, error: "Ya tienes un perfil de viajero." };
    }

    let idClienteDefault = 1; 

    const partes = nombreCompleto.split(" ");
    const nombre = partes[0];
    const apellido = partes.slice(1).join(" ");

    const resCreacion = agregarPasajero({
        idCliente: idClienteDefault,
        nombre: nombre,
        apellidoP: apellido,
        idUsuario: idUsuario, 
        nacionalidad: 1 
    });

    if (resCreacion.exito) {
        const hojaUsers = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Usuarios");
        const mapaUsers = obtenerMapaColumnas(hojaUsers);
        const dataUsers = hojaUsers.getDataRange().getValues();
        const usuario = dataUsers.slice(1).find(r => r[mapaUsers["ID Usuario"]] == idUsuario);
        
        let perfiles = [];
        if (usuario) {
            const rolBase = usuario[mapaUsers["Rol"]];
            const nombreBase = usuario[mapaUsers["Nombre(s)"]];
            perfiles = obtenerPerfilesUsuario(idUsuario, rolBase, nombreBase);
        }

        return {
            exito: true,
            mensaje: "Perfil creado y lista actualizada",
            perfiles: perfiles
        };
    }

    return resCreacion;
}

function desvincularPasajero(idPasajero, idCliente) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Pasajeros");
  const mapa = obtenerMapaColumnas(hoja);
  const data = hoja.getDataRange().getValues();
  const colId = mapa["ID Pasajero"];
  const colCliente = mapa["ID Cliente"];

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][colId] == idPasajero) {
        if (data[i][colCliente] != idCliente) {
            return { exito: false, error: "No tienes permiso para desvincular a este pasajero." };
        }
        rowIndex = i + 1; 
        break; 
    }
  }

  if (rowIndex === -1) return { exito: false, error: "Pasajero no encontrado" };

  hoja.getRange(rowIndex, colCliente + 1).setValue("");
    
  return { exito: true, mensaje: "Pasajero desvinculado correctamente" };
}

// ==========================================
// 11. DASHBOARDS Y OTROS
// ==========================================
function obtenerDashboardAdmin() {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const now = new Date();
  const timeWindow = new Date(now.getTime() + (3 * 60 * 60 * 1000)); 

  // Listas Rápidas
  const hojaClientes = ss.getSheetByName("Clientes");
  const datosClientes = hojaClientes.getDataRange().getValues();
  const mapaClientes = obtenerMapaColumnas(hojaClientes);
  const listaClientes = [];
  const clientesMap = {};

  for(let i=1; i<datosClientes.length; i++) {
     const id = datosClientes[i][mapaClientes["ID Cliente"]];
     const nom = datosClientes[i][mapaClientes["Nombre Completo"]];
     if(id) {
         listaClientes.push({id, nombre: nom});
         clientesMap[id] = nom;
     }
  }

  // Viajes Activos
  const hojaViajes = ss.getSheetByName("Viajes");
  const datosViajes = hojaViajes.getDataRange().getValues();
  const mapaViajes = obtenerMapaColumnas(hojaViajes);
  const viajesActivos = [];
  const todosViajes = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let i = 1; i < datosViajes.length; i++) {
    const row = datosViajes[i];
    const inicioStr = row[mapaViajes["Fecha Inicio"]];
    const finStr = row[mapaViajes["Fecha Fin"]];
    const id = row[mapaViajes["ID Viaje"]];
    const nombre = row[mapaViajes["Nombre Viaje"]];
    const idCliente = row[mapaViajes["ID Cliente"]];

    if (id) {
        todosViajes.push({id, nombre, idCliente});
          
        if (inicioStr && finStr) {
            const fin = new Date(finStr);
            if (fin >= today) { 
                viajesActivos.push({
                    id, 
                    nombre, 
                    inicio: new Date(inicioStr).toLocaleDateString(), 
                    fin: fin.toLocaleDateString(),
                    cliente: clientesMap[idCliente] || "Sin Cliente",
                    diasRestantes: Math.ceil((fin - today) / (1000 * 60 * 60 * 24))
                });
            }
        }
    }
  }
  viajesActivos.sort((a,b) => a.diasRestantes - b.diasRestantes);

  // Recordatorios (Próximos Servicios)
  const hojaServ = ss.getSheetByName("Servicios");
  const datosServ = hojaServ.getDataRange().getValues();
  const mapaServ = obtenerMapaColumnas(hojaServ);
  const recordatorios = [];

  for (let i = 1; i < datosServ.length; i++) {
      const row = datosServ[i];
      const fechaStr = row[mapaServ["Fecha Inicio del Servicio"]];
        
      if (fechaStr) {
          const fechaInicio = new Date(fechaStr);
          if (fechaInicio >= now && fechaInicio <= timeWindow) {
            recordatorios.push({
                idServicio: row[mapaServ["ID Servicio"]],
                idViaje: row[mapaServ["ID Viaje"]],
                categoria: row[mapaServ["Categoria"]],
                destino: row[mapaServ["Destino"]],
                fecha: fechaInicio.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            });
          }
      }
  }

  // --- MAPA DE FORMAS DE PAGO ---
  const hojaListas = ss.getSheetByName("Listas");
  const datosListas = hojaListas.getDataRange().getValues();
  const mapaListas = obtenerMapaColumnas(hojaListas);
  const formasPagoMap = {};
  if (mapaListas["Forma de Pago"] !== undefined) {
      for(let i=2; i<datosListas.length; i++) {
          const nombre = datosListas[i][mapaListas["Forma de Pago"]];
          const id = datosListas[i][mapaListas["Forma de Pago"] + 1];
          if(id) formasPagoMap[id] = String(nombre).toLowerCase();
      }
  }

  // Control Financiero Integral (Ingresos, Egresos, CXC, CXP)
  const hojaTrans = ss.getSheetByName("Transacciones");
  let ingresos = 0;
  let egresos = 0;
  let devoluciones = 0;
  let reembolsosProv = 0;
  
  if (hojaTrans) {
    const datosTrans = hojaTrans.getDataRange().getValues();
    const mapaTrans = obtenerMapaColumnas(hojaTrans);

    for (let i = 1; i < datosTrans.length; i++) {
        const row = datosTrans[i];
        const tipo = row[mapaTrans["Tipo de Transacción"]];
        const monto = parseFloat(String(row[mapaTrans["Monto"]]).replace(/[^0-9.-]+/g,"")) || 0;
        
        const idFormaPago = row[mapaTrans["Forma de Pago"]];
        const nombreFormaPago = formasPagoMap[idFormaPago] || "";
        const esPagoConSaldo = nombreFormaPago.includes("saldo");

        // Lógica extendida para reembolsos y devoluciones si los estatus están presentes
        // Por ahora asumimos: 1=Ingreso, 2=Egreso, 3=Abono, 4=Reembolso a Cliente, 5=Devolución de Proveedor
        if ((tipo == 1 || tipo == 3) && !esPagoConSaldo) {
            ingresos += monto;
        } 
        else if (tipo == 2) {
            egresos += monto;
        }
        else if (tipo == 4) {
             devoluciones += monto; // Dinero que salió hacia el cliente
        }
        else if (tipo == 5) {
             reembolsosProv += monto; // Dinero que regresó del proveedor
        }
    }
  }
  
  // Calcular CXC y CXP basado en Servicios
  let ventaTotalPresupuestada = 0;
  let costoTotalPresupuestado = 0;
  for (let i = 1; i < datosServ.length; i++) {
      const row = datosServ[i];
      const estatus = row[mapaServ["Estatus"]]; // 3 = Cancelado
      if (estatus != 3) {
          ventaTotalPresupuestada += parseFloat(String(row[mapaServ["Precio Venta"]]).replace(/[^0-9.-]+/g,"")) || 0;
          costoTotalPresupuestado += parseFloat(String(row[mapaServ["Costo Proveedor"]]).replace(/[^0-9.-]+/g,"")) || 0;
      }
  }

  const cxc = Math.max(0, ventaTotalPresupuestada - ingresos);
  const cxp = Math.max(0, costoTotalPresupuestado - egresos);
  const utilidadProyectada = ventaTotalPresupuestada - costoTotalPresupuestado;
  const flujoLibre = (ingresos + reembolsosProv) - (egresos + devoluciones);

  return {
      exito: true,
      datos: {
          viajesActivos: viajesActivos, // Enviaremos todos, el frontend los corta o pagina 
          recordatorios: recordatorios, 
          balance: { 
             ingresos, 
             egresos, 
             utilidad: flujoLibre,
             cxc: cxc,
             cxp: cxp,
             utilidadProyectada: utilidadProyectada,
             ventaTotal: ventaTotalPresupuestada,
             costoTotal: costoTotalPresupuestado
          },
          listasRapidas: { clientes: listaClientes, viajes: todosViajes }
      }
  };
}

function obtenerDesgloseKpi(tipo) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  
  // Mapeos rápidos
  const hojaListas = ss.getSheetByName("Listas");
  const datosListas = hojaListas ? hojaListas.getDataRange().getValues() : [];
  const mapaListas = hojaListas ? obtenerMapaColumnas(hojaListas) : {};
  const formasPagoMap = {};
  if (mapaListas["Forma de Pago"] !== undefined) {
      for(let i=2; i<datosListas.length; i++) {
          const nombre = datosListas[i][mapaListas["Forma de Pago"]];
          const id = datosListas[i][mapaListas["Forma de Pago"] + 1];
          if(id) formasPagoMap[id] = String(nombre).toLowerCase();
      }
  }

  const hojaClientes = ss.getSheetByName("Clientes");
  const clientes = hojaClientes.getDataRange().getValues();
  const mapC = obtenerMapaColumnas(hojaClientes);
  const cliMap = {};
  for(let i=1;i<clientes.length;i++){
    cliMap[clientes[i][mapC["ID Cliente"]]] = clientes[i][mapC["Nombre Completo"]];
  }
  
  const hojaViajes = ss.getSheetByName("Viajes");
  const viajes = hojaViajes.getDataRange().getValues();
  const mapV = obtenerMapaColumnas(hojaViajes);
  const vMap = {};
  for(let i=1;i<viajes.length;i++){
    vMap[viajes[i][mapV["ID Viaje"]]] = { 
        nombre: viajes[i][mapV["Nombre Viaje"]], 
        cliente: cliMap[viajes[i][mapV["ID Cliente"]]] 
    };
  }

  const hojaTrans = ss.getSheetByName("Transacciones");
  const datosTrans = hojaTrans ? hojaTrans.getDataRange().getValues() : [];
  const mapaTrans = hojaTrans ? obtenerMapaColumnas(hojaTrans) : {};
  
  const datos = [];

  if (tipo === 'ingresos') {
      for (let i = 1; i < datosTrans.length; i++) {
          const r = datosTrans[i];
          const t = r[mapaTrans["Tipo de Transacción"]];
          const fp = r[mapaTrans["Forma de Pago"]];
          const isSaldo = (formasPagoMap[fp] || "").includes("saldo");
          if ((t == 1 || t == 3) && !isSaldo) {
              datos.push({
                  fecha: formatearFechaUniversal(r[mapaTrans["Fecha"]]),
                  concepto: r[mapaTrans["Concepto"]],
                  entidad: cliMap[r[mapaTrans["ID Cliente (Origen)"]]] || "Desconocido",
                  viaje: vMap[r[mapaTrans["ID Viaje Vinculado"]]]?.nombre || "N/A",
                  monto: parseFloat(String(r[mapaTrans["Monto"]]).replace(/[^0-9.-]+/g,"")) || 0
              });
          }
      }
      return { exito: true, datos, tipo };
  }
  else if (tipo === 'egresos') {
      const hojaProv = ss.getSheetByName("Proveedores");
      const prov = hojaProv.getDataRange().getValues();
      const mapP = obtenerMapaColumnas(hojaProv);
      const provMap = {};
      for(let i=1;i<prov.length;i++){ provMap[prov[i][mapP["ID Proveedor"]]] = prov[i][mapP["Nombre Comercial"]]; }
      
      for (let i = 1; i < datosTrans.length; i++) {
          const r = datosTrans[i];
          const t = r[mapaTrans["Tipo de Transacción"]];
          if (t == 2) {
              datos.push({
                  fecha: formatearFechaUniversal(r[mapaTrans["Fecha"]]),
                  concepto: r[mapaTrans["Concepto"]],
                  entidad: provMap[r[mapaTrans["ID Proveedor (Destino)"]]] || "Desconocido",
                  viaje: vMap[r[mapaTrans["ID Viaje Vinculado"]]]?.nombre || "N/A",
                  monto: parseFloat(String(r[mapaTrans["Monto"]]).replace(/[^0-9.-]+/g,"")) || 0
              });
          }
      }
      return { exito: true, datos, tipo };
  }
  else if (tipo === 'cxc' || tipo === 'cxp') {
      const hojaServ = ss.getSheetByName("Servicios");
      const datosServ = hojaServ.getDataRange().getValues();
      const mapaServ = obtenerMapaColumnas(hojaServ);
      
      const tripsStatus = {};
      
      for (let i = 1; i < datosServ.length; i++) {
          const s = datosServ[i];
          const estatus = s[mapaServ["Estatus"]];
          if (estatus != 3) {
              let idViaje = String(s[mapaServ["ID Viaje"]]).trim();
              if(!idViaje || idViaje==="0" || idViaje==="undefined" || idViaje==="") idViaje = "GLOBAL";
              
              if(!tripsStatus[idViaje]) tripsStatus[idViaje] = { ventaTotal: 0, costoTotal: 0, ingresos: 0, egresos: 0 };
              tripsStatus[idViaje].ventaTotal += parseFloat(String(s[mapaServ["Precio Venta"]]).replace(/[^0-9.-]+/g,"")) || 0;
              tripsStatus[idViaje].costoTotal += parseFloat(String(s[mapaServ["Costo Proveedor"]]).replace(/[^0-9.-]+/g,"")) || 0;
          }
      }
      
      for (let i = 1; i < datosTrans.length; i++) {
          const r = datosTrans[i];
          const t = r[mapaTrans["Tipo de Transacción"]];
          const fp = r[mapaTrans["Forma de Pago"]];
          const isSaldo = (formasPagoMap[fp] || "").includes("saldo");
          const monto = parseFloat(String(r[mapaTrans["Monto"]]).replace(/[^0-9.-]+/g,"")) || 0;
          let idViaje = String(r[mapaTrans["ID Viaje Vinculado"]]).trim();
          if(!idViaje || idViaje==="0" || idViaje==="undefined" || idViaje==="") idViaje = "GLOBAL";
          
          if(!tripsStatus[idViaje]) tripsStatus[idViaje] = { ventaTotal: 0, costoTotal: 0, ingresos: 0, egresos: 0 };
          
          if ((t == 1 || t == 3) && !isSaldo) { tripsStatus[idViaje].ingresos += monto; }
          else if (t == 2) { tripsStatus[idViaje].egresos += monto; }
      }
      
      const datosCx = [];
      
      for(const tripId in tripsStatus) {
         const t = tripsStatus[tripId];
         if (tipo === 'cxc') {
             const cxc = t.ventaTotal - t.ingresos;
             if (cxc > 0.01 || cxc < -0.01) {
                datosCx.push({
                   viaje: tripId === "GLOBAL" ? "Saldo Global (Sin asignar)" : ("Viaje #"+tripId + " - " + (vMap[tripId]?.nombre || "")),
                   cliente: tripId === "GLOBAL" ? "Múltiples" : (vMap[tripId]?.cliente || "N/A"),
                   presupuestado: t.ventaTotal,
                   pagado: t.ingresos,
                   saldo: cxc
                });
             }
         } else {
             const cxp = t.costoTotal - t.egresos;
             if (cxp > 0.01 || cxp < -0.01) {
                datosCx.push({
                   viaje: tripId === "GLOBAL" ? "Saldo Global (Sin asignar)" : ("Viaje #"+tripId + " - " + (vMap[tripId]?.nombre || "")),
                   cliente: tripId === "GLOBAL" ? "Múltiples" : (vMap[tripId]?.cliente || "N/A"),
                   presupuestado: t.costoTotal,
                   pagado: t.egresos,
                   saldo: cxp
                });
             }
         }
      }
      
      datosCx.sort((a,b) => Math.abs(b.saldo) - Math.abs(a.saldo));
      return { exito: true, datos: datosCx, tipo };
  }
  
  return { exito: false, error: "Tipo de desglose no válido" };
}

function obtenerDashboardUsuario(idUsuario, tipoPerfil, idPerfil) {
  if (!validarAccesoPerfil(idUsuario, tipoPerfil, idPerfil)) {
    return { exito: false, error: "Acceso denegado a este perfil." };
  }

  if (tipoPerfil === 'Cliente') {
    return generarDataCliente(idPerfil);
  } else if (tipoPerfil === 'Pasajero') {
    return generarDataPasajero(idPerfil);
  } else {
    return { exito: false, error: "Tipo de perfil no soportado" };
  }
}

function validarAccesoPerfil(idUsuario, tipo, id) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  let hoja, mapa;

  if (tipo === 'Cliente') {
    hoja = ss.getSheetByName("Clientes");
    mapa = obtenerMapaColumnas(hoja);
    const datos = hoja.getDataRange().getValues();
    const match = datos.slice(1).find(r => r[mapa["ID Cliente"]] == id && r[mapa["ID Usuario"]] == idUsuario);
    return !!match;
  } 
    
  if (tipo === 'Pasajero') {
    hoja = ss.getSheetByName("Pasajeros");
    mapa = obtenerMapaColumnas(hoja);
    const datos = hoja.getDataRange().getValues();
    const match = datos.slice(1).find(r => r[mapa["ID Pasajero"]] == id && r[mapa["ID Usuario"]] == idUsuario);
    return !!match;
  }

  return false;
}

function generarDataCliente(idCliente) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const hojaC = ss.getSheetByName("Clientes");
  const dataC = hojaC.getDataRange().getValues();
  const mapaC = obtenerMapaColumnas(hojaC);
  const rowC = dataC.slice(1).find(r => r[mapaC["ID Cliente"]] == idCliente);
    
  const perfil = rowC ? {
      id: idCliente,
      nombre: rowC[mapaC["Nombre Completo"]],
      razonSocial: rowC[mapaC["Razón Social"]],
      rfc: rowC[mapaC["RFC"]],
      correo: rowC[mapaC["Correo"]],
      telefono: rowC[mapaC["Teléfono"]],
      lada: rowC[mapaC["Lada"]], 
      calle: rowC[mapaC["Calle"]],
      numExt: rowC[mapaC["Número Exterior"]],
      numInt: rowC[mapaC["Número Interior"]],
      colonia: rowC[mapaC["Colonia"]],
      ciudad: rowC[mapaC["Ciudad"]],
      cp: rowC[mapaC["CP"]],
      pais: rowC[mapaC["País"]],
      estado: rowC[mapaC["Estado"]]
  } : {};

  const hojaViajes = ss.getSheetByName("Viajes");
  const datosViajes = hojaViajes.getDataRange().getValues();
  const mapaViajes = obtenerMapaColumnas(hojaViajes);
  const viajesActivos = [];
  const historialViajes = [];

  for (let i = 1; i < datosViajes.length; i++) {
    const row = datosViajes[i];
    if (row[mapaViajes["ID Cliente"]] != idCliente) continue; 

    const idViaje = String(row[mapaViajes["ID Viaje"]]);
    const inicioStr = row[mapaViajes["Fecha Inicio"]];
    const finStr = row[mapaViajes["Fecha Fin"]];
      
    const viajeObj = {
      id: idViaje,
      nombre: row[mapaViajes["Nombre Viaje"]],
      destino: row[mapaViajes["Nombre Viaje"]], 
      inicio: inicioStr ? new Date(inicioStr).toLocaleDateString() : 'Pendiente',
      fin: finStr ? new Date(finStr).toLocaleDateString() : 'Pendiente',
      tipo: row[mapaViajes["Tipo de Viaje"]] == 1 ? 'Vacacional' : 'Negocios'
    };

    let esActivo = false;
    if (finStr) {
       const finDate = new Date(finStr);
       if (finDate >= today) esActivo = true;
    }
      
    if (esActivo) viajesActivos.push(viajeObj);
    else historialViajes.push(viajeObj);
  }

  const resPasajeros = obtenerPasajeros('Administrador'); 
  const misPasajeros = resPasajeros.exito ? resPasajeros.datos.filter(p => p.idCliente == idCliente) : [];

  return {
    exito: true,
    datos: {
      perfil,
      viajesActivos,
      historialViajes,
      finanzas: { pagado: 0, costoTotal: 0, saldo: 0 }, // Se llena con obtenerEstadoCuentaGlobal en frontend
      pasajeros: misPasajeros
    }
  };
}

function generarDataPasajero(idPasajero) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const timezone = Session.getScriptTimeZone(); 

  const hojaPas = ss.getSheetByName("Pasajeros");
  const dataPas = hojaPas.getDataRange().getValues();
  const mapaPas = obtenerMapaColumnas(hojaPas);
  const rowPas = dataPas.slice(1).find(r => r[mapaPas["ID Pasajero"]] == idPasajero);

  const perfil = rowPas ? {
      id: idPasajero,
      idCliente: rowPas[mapaPas["ID Cliente"]],
      nombre: rowPas[mapaPas["Nombre(s)"]],
      apellidoP: rowPas[mapaPas["Apellido Paterno"]],
      apellidoM: rowPas[mapaPas["Apellido Materno"]],
      fechaNacimiento: rowPas[mapaPas["Fecha de Nacimiento"]] ? Utilities.formatDate(new Date(rowPas[mapaPas["Fecha de Nacimiento"]]), timezone, "yyyy-MM-dd") : "",
      nacionalidad: rowPas[mapaPas["Nacionalidad"]],
      pasaporte: rowPas[mapaPas["ID Pasaporte"]],
      visa: rowPas[mapaPas["ID Visa"]],
      pais: rowPas[mapaPas["País"]],
      estado: rowPas[mapaPas["Estado"]],
      ciudad: rowPas[mapaPas["Ciudad"]],
      colonia: rowPas[mapaPas["Colonia"]],
      calle: rowPas[mapaPas["Calle"]],
      numExt: rowPas[mapaPas["Número Exterior"]],
      numInt: rowPas[mapaPas["Número Interior"]],
      cp: rowPas[mapaPas["CP"]],
      lada: rowPas[mapaPas["Lada"]],
      telefono: rowPas[mapaPas["Teléfono"]],
      correo: rowPas[mapaPas["Correo"]]
  } : {};

  const hojaServ = ss.getSheetByName("Servicios");
  const datosServ = hojaServ.getDataRange().getValues();
  const mapaServ = obtenerMapaColumnas(hojaServ);
  const viajesPermitidos = new Set();

  for (let i = 1; i < datosServ.length; i++) {
      if (datosServ[i][mapaServ["ID Pasajero"]] == idPasajero) {
          viajesPermitidos.add(String(datosServ[i][mapaServ["ID Viaje"]]));
      }
  }

  const hojaViajes = ss.getSheetByName("Viajes");
  const datosViajes = hojaViajes.getDataRange().getValues();
  const mapaViajes = obtenerMapaColumnas(hojaViajes);
  const viajesActivos = [];
  const historialViajes = [];

  for (let i = 1; i < datosViajes.length; i++) {
    const row = datosViajes[i];
    const idViaje = String(row[mapaViajes["ID Viaje"]]);

    if (!viajesPermitidos.has(idViaje)) continue; 

    const inicioRaw = row[mapaViajes["Fecha Inicio"]];
    const finRaw = row[mapaViajes["Fecha Fin"]];
      
    const inicioISO = inicioRaw ? Utilities.formatDate(new Date(inicioRaw), timezone, "yyyy-MM-dd") : 'Pendiente';
    const finISO = finRaw ? Utilities.formatDate(new Date(finRaw), timezone, "yyyy-MM-dd") : 'Pendiente';
      
    const viajeObj = {
      id: idViaje,
      nombre: row[mapaViajes["Nombre Viaje"]],
      inicio: inicioISO,
      fin: finISO,
      tipo: row[mapaViajes["Tipo de Viaje"]] == 1 ? 'Vacacional' : 'Negocios',
      calificacion: mapaViajes["Calificación"] !== undefined ? row[mapaViajes["Calificación"]] : "",
      comentarios: mapaViajes["Comentarios"] !== undefined ? row[mapaViajes["Comentarios"]] : ""
    };

    let esActivo = false;
    if (finRaw) {
       const finDate = new Date(finRaw);
       if (finDate >= today) esActivo = true;
    }
      
    if (esActivo) viajesActivos.push(viajeObj);
    else historialViajes.push(viajeObj);
  }

  return {
    exito: true,
    datos: {
      perfil,
      viajesActivos,
      historialViajes,
      finanzas: null, 
      pasajeros: []
    }
  };
}

// ==========================================
// 12. OTROS HELPER
// ==========================================
function obtenerListas() {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Listas");
  const datos = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja); 
    
  const extraerLista = (colName) => {
    const idx = mapa[colName];
    const lista = [];
    if (idx !== undefined) {
      for(let i = 2; i < datos.length; i++) { 
        const nombre = datos[i][idx];
        if (colName === "Calificación") {
             if (nombre !== "" && nombre !== undefined) lista.push({ nombre: String(nombre), id: String(nombre) });
        } else {
             const id = datos[i][idx + 1]; 
             if(nombre && id) lista.push({ nombre: String(nombre), id: String(id) });
        }
      }
    }
    return lista;
  };

  return { 
    exito: true, 
    listas: { 
      paises: extraerLista("Países"),
      nacionalidades: extraerLista("Nacionalidades"),
      categorias: extraerLista("Categoría"), 
      estatus: extraerLista("Estatus"),
      calificaciones: extraerLista("Calificación")
    } 
  };
}

// ==========================================
// CRUD COTIZACIONES
// ==========================================
function obtenerCotizaciones(rol) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const hoja = ss.getSheetByName("Cotizaciones");
  if (!hoja) return { exito: true, datos: [] }; // Si no existe la hoja aún
  const datos = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja);
  
  let cotizaciones = [];
  for(let i = 1; i < datos.length; i++) {
      cotizaciones.push({
          id: datos[i][mapa["ID Cotización"]],
          idCliente: datos[i][mapa["ID Cliente"]],
          destino: datos[i][mapa["Destino"]],
          fechaTentativa: datos[i][mapa["Fecha Tentativa"]] ? new Date(datos[i][mapa["Fecha Tentativa"]]).toLocaleDateString() : '',
          montoEstimado: datos[i][mapa["Monto Estimado"]],
          estatus: datos[i][mapa["Estatus"]] || 'Pendiente'
      });
  }
  return { exito: true, datos: cotizaciones };
}

function agregarCotizacion(c) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Cotizaciones");
  if (!hoja) return { exito: false, error: "La hoja 'Cotizaciones' no existe en el Excel." };
  const mapa = obtenerMapaColumnas(hoja);
  
  let nuevoId = 1;
  const colIdIdx = mapa["ID Cotización"];
  if (hoja.getLastRow() > 1 && colIdIdx !== undefined) {
    const valoresIds = hoja.getRange(2, colIdIdx + 1, hoja.getLastRow() - 1, 1).getValues().flat();
    const idsNumericos = valoresIds.map(v => parseInt(v)).filter(v => !isNaN(v));
    if(idsNumericos.length > 0) nuevoId = Math.max(...idsNumericos) + 1;
  }
  
  const numCols = hoja.getLastColumn();
  const nuevaFila = new Array(numCols).fill("");

  if (mapa["ID Cotización"] !== undefined) nuevaFila[mapa["ID Cotización"]] = nuevoId;
  if (mapa["ID Cliente"] !== undefined) nuevaFila[mapa["ID Cliente"]] = c.idCliente;
  if (mapa["Destino"] !== undefined) nuevaFila[mapa["Destino"]] = c.destino;
  if (mapa["Fecha Tentativa"] !== undefined) nuevaFila[mapa["Fecha Tentativa"]] = c.fechaTentativa;
  if (mapa["Monto Estimado"] !== undefined) nuevaFila[mapa["Monto Estimado"]] = c.montoEstimado;
  if (mapa["Estatus"] !== undefined) nuevaFila[mapa["Estatus"]] = c.estatus || 'Pendiente';

  hoja.appendRow(nuevaFila);
  return { exito: true, mensaje: "Cotización creada", id: nuevoId };
}

function editarCotizacion(c) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Cotizaciones");
  if (!hoja) return { exito: false, error: "La hoja 'Cotizaciones' no existe en el Excel." };
  const mapa = obtenerMapaColumnas(hoja);
  const data = hoja.getDataRange().getValues();
  const idCol = mapa["ID Cotización"];
  
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == c.id) { rowIndex = i + 1; break; }
  }
  if (rowIndex === -1) return { exito: false, error: "No encontrada" };

  if (mapa["ID Cliente"] !== undefined) hoja.getRange(rowIndex, mapa["ID Cliente"] + 1).setValue(c.idCliente);
  if (mapa["Destino"] !== undefined) hoja.getRange(rowIndex, mapa["Destino"] + 1).setValue(c.destino);
  if (mapa["Fecha Tentativa"] !== undefined) hoja.getRange(rowIndex, mapa["Fecha Tentativa"] + 1).setValue(c.fechaTentativa);
  if (mapa["Monto Estimado"] !== undefined) hoja.getRange(rowIndex, mapa["Monto Estimado"] + 1).setValue(c.montoEstimado);
  if (mapa["Estatus"] !== undefined) hoja.getRange(rowIndex, mapa["Estatus"] + 1).setValue(c.estatus);

  return { exito: true, mensaje: "Cotización actualizada" };
}

function eliminarCotizacion(id) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Cotizaciones");
  if (!hoja) return { exito: false, error: "La hoja 'Cotizaciones' no existe." };
  const mapa = obtenerMapaColumnas(hoja);
  const data = hoja.getDataRange().getValues();
  const idCol = mapa["ID Cotización"];

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == id) { rowIndex = i + 1; break; }
  }

  if (rowIndex === -1) return { exito: false, error: "No encontrada" };
  hoja.deleteRow(rowIndex);
  return { exito: true, mensaje: "Cotización eliminada" };
}

function obtenerNacionalidades() {
  return obtenerListas(); 
}

function obtenerConfiguracion() {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Configuracion");
  if (!hoja) return { exito: true, config: {} };
  const datos = hoja.getDataRange().getValues();
  let config = {};
  for (let i = 1; i < datos.length; i++) {
    if(datos[i][0]) config[datos[i][0]] = datos[i][1];
  }
  return { exito: true, config: config };
}

function obtenerUsuariosLibres() {
  const hojaUsers = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Usuarios");
  const datosUsers = hojaUsers.getDataRange().getValues();
  const mapaUsers = obtenerMapaColumnas(hojaUsers);
    
  if (mapaUsers["ID Usuario"] === undefined || mapaUsers["Rol"] === undefined) return { exito: true, usuarios: [] };

  const usuariosCandidatos = [];
  for(let i=1; i<datosUsers.length; i++) {
    const rol = String(datosUsers[i][mapaUsers["Rol"]]).trim().toLowerCase();
    if(rol.includes('cliente') || rol.includes('pasajero')) {
      usuariosCandidatos.push({
        id: datosUsers[i][mapaUsers["ID Usuario"]],
        nombre: datosUsers[i][mapaUsers["Nombre(s)"]] + " " + (datosUsers[i][mapaUsers["Apellido Paterno"]] || ""),
        correo: datosUsers[i][mapaUsers["Correo"]]
      });
    }
  }
  return { exito: true, usuarios: usuariosCandidatos };
}

function calificarViaje(idViaje, calificacion, comentarios, estatus) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Viajes");
  const mapa = obtenerMapaColumnas(hoja);
  const data = hoja.getDataRange().getValues();
  const idCol = mapa["ID Viaje"];
   
  if (idCol === undefined) return { exito: false, error: "Error estructura DB Viajes" };

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == idViaje) { rowIndex = i + 1; break; }
  }

  if (rowIndex === -1) return { exito: false, error: "Viaje no encontrado" };

  if (mapa["Calificación"] !== undefined) {
    hoja.getRange(rowIndex, mapa["Calificación"] + 1).setValue(calificacion);
  }
  if (mapa["Comentarios"] !== undefined) {
    hoja.getRange(rowIndex, mapa["Comentarios"] + 1).setValue(comentarios);
  }

  return { exito: true, mensaje: "Viaje calificado correctamente" };
}

function calificarServicio(idServicio, calificacion, comentarios, estatus) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName("Servicios");
  const mapa = obtenerMapaColumnas(hoja);
  const data = hoja.getDataRange().getValues();
  const idCol = mapa["ID Servicio"];
   
  if (idCol === undefined) return { exito: false, error: "Error estructura DB Servicios" };

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] == idServicio) { rowIndex = i + 1; break; }
  }

  if (rowIndex === -1) return { exito: false, error: "Servicio no encontrado" };

  if (mapa["Calificación"] !== undefined) {
    hoja.getRange(rowIndex, mapa["Calificación"] + 1).setValue(calificacion);
  }
  if (mapa["Comentarios"] !== undefined) {
    hoja.getRange(rowIndex, mapa["Comentarios"] + 1).setValue(comentarios);
  }
  
  const nuevoEstatus = estatus ? estatus : 2; 

  if (mapa["Estatus"] !== undefined) {
    hoja.getRange(rowIndex, mapa["Estatus"] + 1).setValue(nuevoEstatus);
  }

  return { exito: true, mensaje: "Servicio calificado correctamente" };
}

// ==========================================
// 13. NUEVO ENDPOINT (Opción B): OBTENER VIAJES POR CLIENTES
// ==========================================
function obtenerViajesPorClientes(idClientes) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const hoja = ss.getSheetByName("Viajes");
  if (!hoja) return { exito: false, error: "Hoja Viajes no encontrada" };

  const datos = hoja.getDataRange().getValues();
  const mapa = obtenerMapaColumnas(hoja);

  // Validación de estructura mínima
  if (mapa["ID Viaje"] === undefined || mapa["ID Cliente"] === undefined || mapa["Nombre Viaje"] === undefined) {
    return { exito: false, error: "Estructura de columnas incompleta en Viajes" };
  }

  // Normalización de entrada (string o array) y soportes especiales
  const normalize = (v) => String(v).trim();
  let ids = [];
  if (Array.isArray(idClientes)) {
    ids = idClientes.map(normalize).filter(x => x);
  } else if (idClientes !== undefined && idClientes !== null) {
    const s = normalize(idClientes);
    if (s) ids = [s];
  }

  // Tokens especiales:
  // - "ALL" / "ALL_MINE": devolver TODOS los viajes
  // - "AGENCY_INTERNAL": devolver TODOS (si en el futuro se usa en Cliente)
  const includeAll = ids.includes("ALL") || ids.includes("ALL_MINE") || ids.includes("AGENCY_INTERNAL");

  const viajes = [];
  for (let i = 1; i < datos.length; i++) {
    const row = datos[i];
    const idViaje = row[mapa["ID Viaje"]];
    const idCliente = String(row[mapa["ID Cliente"]] || "").trim();
    const nombre = row[mapa["Nombre Viaje"]] || "";

    if (!idViaje) continue;

    if (includeAll || ids.includes(idCliente)) {
      viajes.push({
        id: String(idViaje),
        nombre: nombre,
        idCliente: idCliente
      });
    }
  }

  // Eliminar duplicados y ordenar
  const uniq = Array.from(new Map(viajes.map(v => [v.id, v])).values());
  uniq.sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));

  return { exito: true, datos: uniq };
}

// ==========================================
// 15. CARGA MASIVA (BULK UPLOAD EN CASCADA)
// ==========================================
function procesarUploadMasivo(datos, erroresIgnorados) {
  try {
    const libro = SpreadsheetApp.openById(ID_HOJA);
    
    // --- MAPAS GLOBALES PARA REFERENCIA CRUZADA ---
    const idsClientesMap = {};   // { "juan perez": "2" }
    const idsViajesMap = {};     // { "viaje a paris": "I2-6001-X" }

    // UTILIDADES
    const normalizar = (txt) => String(txt || '').trim().toLowerCase();
    
    // --- 1. PROCESAR CLIENTES ---
    if (datos.clientes && datos.clientes.length > 0) {
      const hCl = libro.getSheetByName("Clientes");
      const mCl = obtenerMapaColumnas(hCl);
      const colsCL = hCl.getLastColumn();
      
      let nuevoIdCliente = 1;
      const colIdIdx = mCl["ID Cliente"];
      if (hCl.getLastRow() > 1 && colIdIdx !== undefined) {
          const valoresIds = hCl.getRange(2, colIdIdx + 1, hCl.getLastRow() - 1, 1).getValues().flat();
          const idsNumericos = valoresIds.map(v => parseInt(v)).filter(v => !isNaN(v));
          if(idsNumericos.length > 0) nuevoIdCliente = Math.max(...idsNumericos) + 1;
      }

      datos.clientes.forEach((cli, idx) => {
          // Ignorar si el front reportó error en esta fila
          if(erroresIgnorados && erroresIgnorados.find(e => e.hoja === 'Clientes' && e.fila === (idx + 2))) return;

          let nomCorto = cli["Nombre Completo"] || cli["Razón Social"];
          if(!nomCorto) return;
          
          let filaToInsert = new Array(colsCL).fill("");
          let currId = nuevoIdCliente++;
          
          if(mCl["ID Cliente"]!==undefined) filaToInsert[mCl["ID Cliente"]] = currId;
          if(mCl["Razón Social"]!==undefined) filaToInsert[mCl["Razón Social"]] = cli["Razón Social"] || "";
          if(mCl["Nombre Completo"]!==undefined) filaToInsert[mCl["Nombre Completo"]] = cli["Nombre Completo"] || "";
          if(mCl["Correo"]!==undefined) filaToInsert[mCl["Correo"]] = cli["Correo"] || "";
          if(mCl["Teléfono"]!==undefined) filaToInsert[mCl["Teléfono"]] = cli["Teléfono"] || "";
          if(mCl["RFC"]!==undefined) filaToInsert[mCl["RFC"]] = cli["RFC"] || "";

          hCl.appendRow(filaToInsert);
          idsClientesMap[normalizar(nomCorto)] = currId;
      });
    }

    // --- 2. PRE-CARGA CLIENTES EXISTENTES ---
    // Si un viaje o pasajero hace referencia a un cliente que ya existía en la DB, tenemos que mapearlo
    const hojaClEx = libro.getSheetByName("Clientes");
    const clData = hojaClEx.getDataRange().getValues();
    const mapClEx = obtenerMapaColumnas(hojaClEx);
    for(let i=1; i<clData.length; i++) {
        let nom = clData[i][mapClEx["Nombre Completo"]] || clData[i][mapClEx["Razón Social"]];
        let idCl = clData[i][mapClEx["ID Cliente"]];
        if(nom) idsClientesMap[normalizar(nom)] = idCl;
    }

    // --- 3. PROCESAR VIAJES ---
    if (datos.viajes && datos.viajes.length > 0) {
      const hVi = libro.getSheetByName("Viajes");
      const mVi = obtenerMapaColumnas(hVi);
      const colsVI = hVi.getLastColumn();

      let maxConsecutivo = 0;
      const colIdIdxV = mVi["ID Viaje"];
      
      if (hVi.getLastRow() > 1 && colIdIdxV !== undefined) {
        const valoresIds = hVi.getRange(2, colIdIdxV + 1, hVi.getLastRow() - 1, 1).getValues().flat();
        valoresIds.forEach(v => {
            const strVal = String(v).trim();
            if (!strVal) return;
            const match = strVal.match(/^I\d-\d(\d+)-/);
            if (match && match[1]) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maxConsecutivo) maxConsecutivo = num;
            } else {
                const num = parseInt(strVal, 10);
                if (!isNaN(num) && num > maxConsecutivo && !strVal.includes("-")) maxConsecutivo = num;
            }
        });
      }

      datos.viajes.forEach((viaje, idx) => {
          if(erroresIgnorados && erroresIgnorados.find(e => e.hoja === 'Viajes' && e.fila === (idx + 2))) return;
          if(!viaje["Nombre Viaje"]) return;

          // Genera el ID
          maxConsecutivo++;
          const consecutivoStr = maxConsecutivo.toString().padStart(3, '0');
          const year = new Date().getFullYear();
          const decada = Math.floor((year % 100) / 10);
          const ultimoDigito = year % 10;
          
          let clTitular = viaje["Cliente Titular"];
          let idClienteReal = clTitular ? idsClientesMap[normalizar(clTitular)] : "X";
          if (!idClienteReal) idClienteReal = "X";

          const nuevoId = `I${decada}-${ultimoDigito}${consecutivoStr}-${idClienteReal}`;
          
          let filaToInsert = new Array(colsVI).fill("");
          if (mVi["ID Viaje"] !== undefined) filaToInsert[mVi["ID Viaje"]] = nuevoId;
          if (mVi["Nombre Viaje"] !== undefined) filaToInsert[mVi["Nombre Viaje"]] = viaje["Nombre Viaje"];
          if (mVi["Tipo de Viaje"] !== undefined) filaToInsert[mVi["Tipo de Viaje"]] = viaje["Tipo"] || "Agencia"; 
          if (mVi["Fecha Inicio"] !== undefined) filaToInsert[mVi["Fecha Inicio"]] = formatearFechaUniversal(viaje["Fecha Inicio"]);
          if (mVi["Fecha Fin"] !== undefined) filaToInsert[mVi["Fecha Fin"]] = formatearFechaUniversal(viaje["Fecha Fin"]);
          if (mVi["ID Cliente"] !== undefined) filaToInsert[mVi["ID Cliente"]] = idClienteReal;
          
          hVi.appendRow(filaToInsert);
          idsViajesMap[normalizar(viaje["Nombre Viaje"])] = nuevoId;
      });
    }

    // --- 4. PRE-CARGA VIAJES EXISTENTES ---
    const hojaViEx = libro.getSheetByName("Viajes");
    const viData = hojaViEx.getDataRange().getValues();
    const mapViEx = obtenerMapaColumnas(hojaViEx);
    for(let i=1; i<viData.length; i++) {
        let nomV = viData[i][mapViEx["Nombre Viaje"]];
        let idV = viData[i][mapViEx["ID Viaje"]];
        if(nomV) idsViajesMap[normalizar(nomV)] = idV;
    }

    // --- 5. OBTENER MAPAS LISTAS (CATEGORIAS/PROVEEDORES) PARA SERVICIOS ---
    const catMap = {};
    const provMap = {};
    const hLi = libro.getSheetByName("Listas");
    const mLi = obtenerMapaColumnas(hLi);
    const dLi = hLi.getDataRange().getValues();
    for(let i=2; i<dLi.length; i++){
        let cN = dLi[i][mLi["Categoría"]];
        let cId = dLi[i][mLi["Categoría"] + 1];
        if(cN) catMap[normalizar(cN)] = cId;
    }

    const hPr = libro.getSheetByName("Proveedores");
    const mPr = obtenerMapaColumnas(hPr);
    const dPr = hPr.getDataRange().getValues();
    for(let i=1; i<dPr.length; i++){
        let pN = dPr[i][mPr["Nombre Completo"]];
        let pId = dPr[i][mPr["ID Proveedor"]];
        if(pN) provMap[normalizar(pN)] = pId;
    }

    // --- 6. PROCESAR PASAJEROS ---
    const idsPasajerosMap = {};
    if (datos.pasajeros && datos.pasajeros.length > 0) {
      const hPa = libro.getSheetByName("Pasajeros");
      const mPa = obtenerMapaColumnas(hPa);
      const colsPA = hPa.getLastColumn();
      
      let nuevoIdPas = 1;
      const colIdIdxP = mPa["ID Pasajero"];
      if (hPa.getLastRow() > 1 && colIdIdxP !== undefined) {
          const valoresIds = hPa.getRange(2, colIdIdxP + 1, hPa.getLastRow() - 1, 1).getValues().flat();
          const idsNumericos = valoresIds.map(v => parseInt(v)).filter(v => !isNaN(v));
          if(idsNumericos.length > 0) nuevoIdPas = Math.max(...idsNumericos) + 1;
      }

      datos.pasajeros.forEach((pas, idx) => {
          if(erroresIgnorados && erroresIgnorados.find(e => e.hoja === 'Pasajeros' && e.fila === (idx + 2))) return;
          if(!pas["Nombre(s)"]) return;

          let clAso = pas["Cliente Asociado"];
          let idClienteReal = clAso ? idsClientesMap[normalizar(clAso)] : "";

          let filaToInsert = new Array(colsPA).fill("");
          let currId = nuevoIdPas++;
          
          if(mPa["ID Pasajero"]!==undefined) filaToInsert[mPa["ID Pasajero"]] = currId;
          if(mPa["ID Cliente"]!==undefined) filaToInsert[mPa["ID Cliente"]] = idClienteReal;
          if(mPa["Nombre(s)"]!==undefined) filaToInsert[mPa["Nombre(s)"]] = pas["Nombre(s)"] || "";
          if(mPa["Apellido Paterno"]!==undefined) filaToInsert[mPa["Apellido Paterno"]] = pas["Apellido Paterno"] || "";
          if(mPa["Correo"]!==undefined) filaToInsert[mPa["Correo"]] = pas["Correo"] || "";
          
          hPa.appendRow(filaToInsert);
          
          let nomCorto = pas["Nombre(s)"] + " " + (pas["Apellido Paterno"] || "");
          idsPasajerosMap[normalizar(nomCorto)] = currId;
      });
    }

    // --- PRE-CARGA PASAJEROS EXISTENTES ---
    const hojaPaEx = libro.getSheetByName("Pasajeros");
    const paData = hojaPaEx.getDataRange().getValues();
    const mapPaEx = obtenerMapaColumnas(hojaPaEx);
    for(let i=1; i<paData.length; i++) {
        let nomP = (paData[i][mapPaEx["Nombre(s)"]] || "") + " " + (paData[i][mapPaEx["Apellido Paterno"]] || "");
        let idP = paData[i][mapPaEx["ID Pasajero"]];
        if(nomP.trim()) idsPasajerosMap[normalizar(nomP)] = idP;
    }

    // --- 7. PROCESAR SERVICIOS ---
    if (datos.servicios && datos.servicios.length > 0) {
      const hSe = libro.getSheetByName("Servicios");
      const mSe = obtenerMapaColumnas(hSe);
      const colsSE = hSe.getLastColumn();
      
      let nuevoIdServ = 1;
      const colIdIdxS = mSe["ID Servicio"];
      if (hSe.getLastRow() > 1 && colIdIdxS !== undefined) {
          const valoresIds = hSe.getRange(2, colIdIdxS + 1, hSe.getLastRow() - 1, 1).getValues().flat();
          const idsNumericos = valoresIds.map(v => parseInt(String(v).substring(1))).filter(v => !isNaN(v)); // S1, S2, etc
          if(idsNumericos.length > 0) nuevoIdServ = Math.max(...idsNumericos) + 1;
      }

      datos.servicios.forEach((serv, idx) => {
          if(erroresIgnorados && erroresIgnorados.find(e => e.hoja === 'Servicios' && e.fila === (idx + 2))) return;

          let vAso = serv["Viaje"];
          let cAso = serv["Cliente Asociado"];
          let pAso = serv["Pasajero"];
          let idViajeReal = vAso ? idsViajesMap[normalizar(vAso)] : "";
          let idClienteReal = cAso ? idsClientesMap[normalizar(cAso)] : "";
          let idPasajeroReal = pAso ? idsPasajerosMap[normalizar(pAso)] : "";

          if(!idViajeReal && !idClienteReal) return;

          let catNombre = serv["Categoría"];
          let idCatFormated = catNombre ? catMap[normalizar(catNombre)] : "";

          let provNombre = serv["Proveedor"];
          let idProvFormated = provNombre ? provMap[normalizar(provNombre)] : "";

          let currId = `S${nuevoIdServ++}`;
          let filaToInsert = new Array(colsSE).fill("");

          if(mSe["ID Servicio"]!==undefined) filaToInsert[mSe["ID Servicio"]] = currId;
          if(mSe["ID Viaje"]!==undefined) filaToInsert[mSe["ID Viaje"]] = idViajeReal || "";
          if(mSe["ID Cliente"]!==undefined) filaToInsert[mSe["ID Cliente"]] = idClienteReal || "";
          if(mSe["ID Pasajero"]!==undefined) filaToInsert[mSe["ID Pasajero"]] = idPasajeroReal || "";
          if(mSe["Categoria"]!==undefined) filaToInsert[mSe["Categoria"]] = idCatFormated || catNombre || "";
          if(mSe["Destino"]!==undefined) filaToInsert[mSe["Destino"]] = serv["Destino"] || "";
          if(mSe["Fecha Inicio del Servicio"]!==undefined) filaToInsert[mSe["Fecha Inicio del Servicio"]] = formatearFechaUniversal(serv["Fecha Inicio"]);
          if(mSe["Costo Proveedor"]!==undefined) filaToInsert[mSe["Costo Proveedor"]] = parseFloat(serv["Costo Proveedor"]) || 0;
          if(mSe["Precio Venta"]!==undefined) filaToInsert[mSe["Precio Venta"]] = parseFloat(serv["Precio Venta"]) || 0;
          if(mSe["Proveedor"]!==undefined) filaToInsert[mSe["Proveedor"]] = idProvFormated || provNombre || "";
          if(mSe["Estatus"]!==undefined) filaToInsert[mSe["Estatus"]] = serv["Estatus"] || 0;
          
          hSe.appendRow(filaToInsert);
      });
    }

    return { exito: true, mensaje: "Carga Masiva completada correctamente. Los registros sin errores fueron procesados." };

  } catch (error) {
    return { exito: false, error: "Error de ejecución: " + error.toString() };
  }
}

// ==========================================
// 16. ESTADÍSTICAS GLOBALES DE ENTIDADES
// ==========================================
function obtenerEstadisticasEntidades() {
  try {
    const ss = SpreadsheetApp.openById(ID_HOJA);
    const conteos = {
      clientes: 0,
      proveedores: 0,
      pasajeros: 0,
      viajes: 0,
      servicios: 0
    };

    const getCount = (sheetName) => {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return 0;
      const lastRow = sheet.getLastRow();
      return lastRow > 1 ? lastRow - 1 : 0;
    };

    conteos.clientes = getCount("Clientes");
    conteos.proveedores = getCount("Proveedores");
    conteos.pasajeros = getCount("Pasajeros");
    conteos.viajes = getCount("Viajes");
    conteos.servicios = getCount("Servicios");

    return { exito: true, conteos: conteos };
  } catch (error) {
    return { exito: false, error: "Error: " + error.toString() };
  }
}

// ==========================================
// 17. GESTIÓN DE DOCUMENTOS
// ==========================================
function obtenerCarpetaDocumentos() {
  const nombreCarpeta = "IGO Viajes - Documentos";
  const folders = DriveApp.getFoldersByName(nombreCarpeta);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    const nuevaCarpeta = DriveApp.createFolder(nombreCarpeta);
    nuevaCarpeta.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return nuevaCarpeta;
  }
}

function subirDocumento(datos) {
  try {
    const { idViaje, idServicio, nombreArchivo, base64Data, tipo } = datos;
    if (!idViaje || !base64Data) return { exito: false, error: "Datos faltantes" };

    const carpeta = obtenerCarpetaDocumentos();
    
    // Decodificar Base64
    let cleanBase64 = base64Data;
    let mimeType = MimeType.PDF;
    if (base64Data.includes("data:")) {
      const parts = base64Data.split(",");
      cleanBase64 = parts[1];
      const mimeMatch = parts[0].match(/:(.*?);/);
      if(mimeMatch && mimeMatch[1]) mimeType = mimeMatch[1];
    }
    
    const decodificado = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decodificado, mimeType, nombreArchivo);
    
    const archivoD = carpeta.createFile(blob);
    const idDrive = archivoD.getId();
    const urlDrive = archivoD.getUrl();
    
    // Guardar en Sheet
    const ss = SpreadsheetApp.openById(ID_HOJA);
    let hojaDocs = ss.getSheetByName("Documentos");
    if (!hojaDocs) {
       hojaDocs = ss.insertSheet("Documentos");
       hojaDocs.appendRow(["ID Documento", "ID Viaje", "ID Servicio", "Nombre Archivo", "URL", "Tipo", "Fecha Subida", "ID Drive"]);
    }
    
    const mapa = obtenerMapaColumnas(hojaDocs);
    let nuevoId = 1;
    let colIdIdx = mapa["ID Documento"];
    if (colIdIdx === undefined) { 
        colIdIdx = 0; // fallback si no parsea la cabecera rápido
    }

    if (hojaDocs.getLastRow() > 1 && colIdIdx !== undefined) {
      const valoresIds = hojaDocs.getRange(2, colIdIdx + 1, hojaDocs.getLastRow() - 1, 1).getValues().flat();
      const idsNumericos = valoresIds.map(v => parseInt(v)).filter(v => !isNaN(v));
      if(idsNumericos.length > 0) nuevoId = Math.max(...idsNumericos) + 1;
    }
    
    const numCols = hojaDocs.getLastColumn() || 8;
    const nuevaFila = new Array(numCols).fill("");
    
    // Asumir posiciones si el mapa falló temporalmente después de inserción
    const mID = mapa["ID Documento"] !== undefined ? mapa["ID Documento"] : 0;
    const mViaje = mapa["ID Viaje"] !== undefined ? mapa["ID Viaje"] : 1;
    const mServ = mapa["ID Servicio"] !== undefined ? mapa["ID Servicio"] : 2;
    const mNombre = mapa["Nombre Archivo"] !== undefined ? mapa["Nombre Archivo"] : 3;
    const mUrl = mapa["URL"] !== undefined ? mapa["URL"] : 4;
    const mTipo = mapa["Tipo"] !== undefined ? mapa["Tipo"] : 5;
    const mFecha = mapa["Fecha Subida"] !== undefined ? mapa["Fecha Subida"] : 6;
    const mIdDrive = mapa["ID Drive"] !== undefined ? mapa["ID Drive"] : 7;

    nuevaFila[mID] = nuevoId;
    nuevaFila[mViaje] = idViaje;
    nuevaFila[mServ] = idServicio || "";
    nuevaFila[mNombre] = nombreArchivo;
    nuevaFila[mUrl] = urlDrive;
    nuevaFila[mTipo] = tipo || "Documento";
    nuevaFila[mFecha] = new Date();
    nuevaFila[mIdDrive] = idDrive;
    
    hojaDocs.appendRow(nuevaFila);
    
    return { exito: true, documento: { id: nuevoId, idServicio: idServicio, nombre: nombreArchivo, url: urlDrive, tipo: tipo || "Documento" } };
  } catch(e) {
    return { exito: false, error: e.toString() };
  }
}

function eliminarDocumento(idDocumento) {
  try {
    const ss = SpreadsheetApp.openById(ID_HOJA);
    const hojaDocs = ss.getSheetByName("Documentos");
    if(!hojaDocs) return { exito: false, error: "No existe tabla Documentos" };
    
    const mapa = obtenerMapaColumnas(hojaDocs);
    const datos = hojaDocs.getDataRange().getValues();
    
    let filaIndex = -1;
    let driveId = "";
    
    for(let i=1; i<datos.length; i++) {
        if(datos[i][mapa["ID Documento"]] == idDocumento) {
            filaIndex = i + 1; // 1-index 
            driveId = mapa["ID Drive"] !== undefined ? datos[i][mapa["ID Drive"]] : "";
            break;
        }
    }
    
    if(filaIndex === -1) return { exito: false, error: "Documento no encontrado en tabla" };
    
    if(driveId) {
       try { DriveApp.getFileById(driveId).setTrashed(true); } catch(e){}
    }
    
    hojaDocs.deleteRow(filaIndex);
    return { exito: true };
  } catch(e) {
    return { exito: false, error: e.toString() };
  }
}
