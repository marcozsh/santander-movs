// types.ts
export interface Movimiento {
  mov: string;
  descripcion: string;
}

export interface MovimientosPorDia {
  abonos: Movimiento[];
  gastosDebito: Movimiento[];
  gastosCredito: Movimiento[];
}

export interface MovimientosResponse {
  [fecha: string]: MovimientosPorDia;
}

export interface ContenidoOriginal {
  deleted: boolean;
  deviceFound: boolean;
  hidden: boolean;
  id: number;
  idMsgExt: string;
  idTransaction: string;
  idUser: number;
  privateContentText: string;
  publicContentText: string;
  read: boolean;
  readByDevice: boolean;
  received: boolean;
  receivedByDevice: boolean;
  refUser: string;
  tsCreate: number;
  tsExpire: number;
  tsUpdate: number;
}

export interface APIResponse {
  METADATA: {
    STATUS: string;
    DESCRIPCION: string;
  };
  DATA: {
    Informacion: {
      Codigo: string;
      Resultado: string;
      Mensaje: string;
    };
    "ns2:listContentsResponse": {
      return: {
        contents: ContenidoOriginal[];
        moreElements: boolean;
        refUser: string;
      };
    };
  };
}

export interface RequestHeaders {
  authorization: string;
  clientId: string;
}

export interface RequestBody {
  rutCliente: string;
  rutUsuario: string;
  usuarioAlt?: string;
  terminalAlt?: string;
  canalId?: string;
  canalFisico?: string;
  canalLogico?: string;
  ipCliente?: string;
  infoDispositivo?: string;
  limit?: string;
  refApp?: string;
  refCompany?: string;
}

// movimientos.service.ts
export class MovimientosService {
  private static readonly API_URL =
    "https://api-dsk.santander.cl/perdsk/datosCliente/mensajeriaPush/serviciosAlmacenamiento";

  async obtenerMovimientos(
    headers: RequestHeaders,
    body: RequestBody,
  ): Promise<MovimientosResponse> {
    try {
      const requestBody = this.construirBody(body);

      const response = await fetch(MovimientosService.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${headers.authorization}`,
          "x-santander-client-id": headers.clientId,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: APIResponse = await response.json();

      // Debug: Imprimir la respuesta completa
      //console.log("Respuesta de la API:", JSON.stringify(data, null, 2));

      return this.procesarMovimientos(data);
    } catch (error) {
      console.error("Error al obtener movimientos:", error);
      throw error;
    }
  }

  private construirBody(params: RequestBody): any {
    return {
      Cabecera: {
        HOST: {
          "USUARIO-ALT": params.usuarioAlt || "GHOBP",
          "TERMINAL-ALT": params.terminalAlt || "",
          "CANAL-ID": params.canalId || "078",
        },
        CanalFisico: params.canalFisico || "003",
        CanalLogico: params.canalLogico || "74",
        RutCliente: params.rutCliente,
        RutUsuario: params.rutUsuario,
        IpCliente: params.ipCliente || "",
        InfoDispositivo: params.infoDispositivo || "valor InfoDispositivo",
      },
      Entrada: {
        RutCliente: params.rutCliente,
        listContents: {
          params: {
            keyValue: params.rutCliente,
            limit: params.limit || "25",
            read: null,
            refApp: params.refApp || "santander_movil",
            refCompany: params.refCompany || "SCHCL",
          },
        },
      },
    };
  }

  private procesarMovimientos(data: APIResponse): MovimientosResponse {
    const movimientosPorFecha: MovimientosResponse = {};

    // Validar que exista la estructura esperada
    if (!data || !data.DATA) {
      console.error(
        "La respuesta no tiene la estructura esperada (falta DATA)",
      );
      return movimientosPorFecha;
    }

    if (!data.DATA["ns2:listContentsResponse"]) {
      console.error("La respuesta no tiene 'ns2:listContentsResponse'");
      console.log("Estructura de DATA:", Object.keys(data.DATA));
      return movimientosPorFecha;
    }

    if (!data.DATA["ns2:listContentsResponse"].return) {
      console.error("La respuesta no tiene 'return'");
      return movimientosPorFecha;
    }

    if (!data.DATA["ns2:listContentsResponse"].return.contents) {
      console.error("La respuesta no tiene 'contents'");
      return movimientosPorFecha;
    }

    const contents = data.DATA["ns2:listContentsResponse"].return.contents;

    contents.forEach((contenido) => {
      const texto = contenido.publicContentText;

      // Extraer fecha (formato: DD-MM-YYYY)
      const fechaMatch = texto.match(/(\d{2}-\d{2}-\d{4})/);
      if (!fechaMatch) return;

      const fecha = fechaMatch[1];

      // Extraer monto
      const montoMatch = texto.match(/\$\s*([\d.,]+)/);
      if (!montoMatch) return;

      const monto = `$ ${montoMatch[1]}`;

      // Extraer descripción según el tipo de movimiento
      let descripcion = "";

      // Inicializar estructura si no existe
      if (!movimientosPorFecha[fecha]) {
        movimientosPorFecha[fecha] = {
          abonos: [],
          gastosDebito: [],
          gastosCredito: [],
        };
      }

      // Clasificar como abono o gasto (débito/crédito)
      if (texto.includes("Transferencia hacia")) {
        // Para abonos: extraer número de cuenta
        const cuentaMatch = texto.match(/cuenta (\d+)/);
        descripcion = cuentaMatch
          ? `Transferencia recibida en cuenta ${cuentaMatch[1]}`
          : "Transferencia recibida";
        movimientosPorFecha[fecha].abonos.push({ mov: monto, descripcion });
      } else if (texto.includes("Tarjeta de Débito")) {
        // Para débito: extraer nombre del comercio
        const comercioMatch = texto.match(/en ([A-Z\s\*\.]+?),?\s+el\s+\d/);
        descripcion = comercioMatch
          ? comercioMatch[1].trim()
          : "Compra con tarjeta de débito";
        movimientosPorFecha[fecha].gastosDebito.push({
          mov: monto,
          descripcion,
        });
      } else if (texto.includes("Tarjeta de Crédito")) {
        // Para crédito: extraer nombre del comercio
        const comercioMatch = texto.match(/en ([A-Z\s\*\.]+?),?\s+el\s+\d/);
        descripcion = comercioMatch
          ? comercioMatch[1].trim()
          : "Compra con tarjeta de crédito";
        movimientosPorFecha[fecha].gastosCredito.push({
          mov: monto,
          descripcion,
        });
      } else if (texto.includes("Transferencia desde")) {
        // Para transferencias salientes
        const cuentaMatch = texto.match(/cuenta (\d+)/);
        descripcion = cuentaMatch
          ? `Transferencia enviada desde cuenta ${cuentaMatch[1]}`
          : "Transferencia enviada";
        movimientosPorFecha[fecha].gastosDebito.push({
          mov: monto,
          descripcion,
        });
      } else if (texto.includes("pago de tu TC")) {
        // Para pago de tarjeta de crédito
        descripcion = "Pago de tarjeta de crédito";
        movimientosPorFecha[fecha].gastosDebito.push({
          mov: monto,
          descripcion,
        });
      } else {
        // Si no se puede determinar, lo ponemos en débito por defecto
        descripcion = "Movimiento";
        movimientosPorFecha[fecha].gastosDebito.push({
          mov: monto,
          descripcion,
        });
      }
    });

    return movimientosPorFecha;
  }

  // Método auxiliar para obtener total de abonos por fecha
  calcularTotalAbonos(fecha: string, movimientos: MovimientosResponse): number {
    if (!movimientos[fecha]) return 0;

    return movimientos[fecha].abonos.reduce((total, mov) => {
      const monto = parseFloat(
        mov.mov.replace("$ ", "").replace(/\./g, "").replace(",", "."),
      );
      return total + monto;
    }, 0);
  }

  // Método auxiliar para obtener total de gastos débito por fecha
  calcularTotalGastosDebito(
    fecha: string,
    movimientos: MovimientosResponse,
  ): number {
    if (!movimientos[fecha]) return 0;

    return movimientos[fecha].gastosDebito.reduce((total, mov) => {
      const monto = parseFloat(
        mov.mov.replace("$ ", "").replace(/\./g, "").replace(",", "."),
      );
      return total + monto;
    }, 0);
  }

  // Método auxiliar para obtener total de gastos crédito por fecha
  calcularTotalGastosCredito(
    fecha: string,
    movimientos: MovimientosResponse,
  ): number {
    if (!movimientos[fecha]) return 0;

    return movimientos[fecha].gastosCredito.reduce((total, mov) => {
      const monto = parseFloat(
        mov.mov.replace("$ ", "").replace(/\./g, "").replace(",", "."),
      );
      return total + monto;
    }, 0);
  }

  // Método auxiliar para obtener total de gastos (débito + crédito) por fecha
  calcularTotalGastos(fecha: string, movimientos: MovimientosResponse): number {
    return (
      this.calcularTotalGastosDebito(fecha, movimientos) +
      this.calcularTotalGastosCredito(fecha, movimientos)
    );
  }

  // Método para calcular el total general de abonos y gastos
  async calcularTotalesGenerales(movimientos: MovimientosResponse): Promise<{
    totalAbonos: number;
    totalGastosDebito: number;
    totalGastosCredito: number;
    totalGastos: number;
    balance: number;
  }> {
    let totalAbonos = 0;
    let totalGastosDebito = 0;
    let totalGastosCredito = 0;

    // Recorrer todas las fechas
    Object.keys(movimientos).forEach((fecha) => {
      // Sumar abonos de esta fecha
      movimientos[fecha].abonos.forEach((mov) => {
        const monto = parseFloat(
          mov.mov.replace("$ ", "").replace(/\./g, "").replace(",", "."),
        );
        totalAbonos += monto;
      });

      // Sumar gastos débito de esta fecha
      movimientos[fecha].gastosDebito.forEach((mov) => {
        const monto = parseFloat(
          mov.mov.replace("$ ", "").replace(/\./g, "").replace(",", "."),
        );
        totalGastosDebito += monto;
      });

      // Sumar gastos crédito de esta fecha
      movimientos[fecha].gastosCredito.forEach((mov) => {
        const monto = parseFloat(
          mov.mov.replace("$ ", "").replace(/\./g, "").replace(",", "."),
        );
        totalGastosCredito += monto;
      });
    });

    const totalGastos = totalGastosDebito + totalGastosCredito;

    return {
      totalAbonos,
      totalGastosDebito,
      totalGastosCredito,
      totalGastos,
      balance: totalAbonos - totalGastos,
    };
  }
}
