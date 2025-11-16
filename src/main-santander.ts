import { getSantanderToken } from "./santander-token";
import {
  MovimientosService,
  MovimientosResponse,
  RequestHeaders,
  RequestBody,
} from "./santander-movs";
import { getAkamaiTelemetry } from "./santander-scraper";

interface SantanderCredentials {
  username: string;
  password: string;
  clientId: string;
  apiClientId: string;
}

interface SantanderMainOptions {
  headless?: boolean;
  verbose?: boolean;
  limit?: string;
}

interface SantanderResult {
  success: boolean;
  data?: {
    token: string;
    movimientos: MovimientosResponse;
    totales?: {
      totalAbonos: number;
      totalGastosDebito: number;
      totalGastosCredito: number;
      totalGastos: number;
      balance: number;
    };
  };
  error?: string;
}

/**
 * Función principal para obtener movimientos de Santander
 * Ejecuta el flujo completo: scraper -> token -> movimientos
 */
export async function obtenerMovimientosSantander(
  credentials: SantanderCredentials,
  options: SantanderMainOptions = {},
): Promise<SantanderResult> {
  const { headless = true, verbose = false, limit = "50" } = options;

  try {
    // PASO 1: Obtener Akamai-BM-Telemetry usando el scraper
    if (verbose) {
      console.log("PASO 1: Capturando Akamai-BM-Telemetry...");
    }

    const akamaiTelemetry = await getAkamaiTelemetry(
      credentials.username,
      credentials.password,
      {
        headless,
        verbose,
      },
    );

    if (!akamaiTelemetry) {
      throw new Error("No se pudo capturar el Akamai-BM-Telemetry");
    }

    if (verbose) {
      console.log("Akamai-BM-Telemetry capturado");
    }

    // PASO 2: Obtener token de autenticación
    if (verbose) {
      console.log("PASO 2: Obteniendo token de autenticación...");
    }

    const tokenResponse = await getSantanderToken({
      username: credentials.username,
      password: credentials.password,
      clientId: credentials.clientId,
      akamaiTelemetry: akamaiTelemetry,
    });

    if (!tokenResponse.access_token) {
      throw new Error("No se pudo obtener el token de autenticación");
    }

    if (verbose) {
      console.log("Token obtenido exitosamente");
      console.log(`   Token type: ${tokenResponse.token_type}`);
      console.log(`   Expires in: ${tokenResponse.expires_in} segundos\n`);
    }

    // PASO 3: Obtener movimientos usando el token
    if (verbose) {
      console.log("PASO 3: Obteniendo movimientos bancarios...");
    }

    const movimientosService = new MovimientosService();

    const headers: RequestHeaders = {
      authorization: tokenResponse.access_token,
      clientId: credentials.apiClientId,
    };

    const body: RequestBody = {
      rutCliente: credentials.username,
      rutUsuario: credentials.username,
      limit: limit,
    };

    const movimientos = await movimientosService.obtenerMovimientos(
      headers,
      body,
    );

    if (verbose) {
      console.log("Movimientos obtenidos exitosamente");
      console.log(
        `   Fechas encontradas: ${Object.keys(movimientos).length}\n`,
      );
    }

    return {
      success: true,
      data: {
        token: tokenResponse.access_token,
        movimientos,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (verbose) {
      console.error("\n Error en el proceso:", errorMessage);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Función simplificada para obtener solo los movimientos
 */
export async function getMovimientos(
  credentials: SantanderCredentials,
  options: SantanderMainOptions = {},
): Promise<MovimientosResponse> {
  const result = await obtenerMovimientosSantander(credentials, options);

  if (!result.success || !result.data) {
    throw new Error(result.error || "Error desconocido al obtener movimientos");
  }

  return result.data.movimientos;
}

/**
 * Función simplificada para obtener solo los totales
 */
export async function getTotales(
  credentials: SantanderCredentials,
  options: SantanderMainOptions = {},
) {
  const result = await obtenerMovimientosSantander(credentials, options);

  if (!result.success || !result.data) {
    throw new Error(result.error || "Error desconocido al obtener totales");
  }

  return result.data.totales;
}
