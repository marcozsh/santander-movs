export interface SantanderTokenRequest {
  username: string;
  password: string;
  clientId: string;
  akamaiTelemetry: string;
  tokenTbk?: string;
  nroSer?: string;
}

export interface SantanderTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Obtiene un token de autenticación de la API de Santander
 * @param params - Parámetros necesarios para la autenticación
 * @returns Promise con la respuesta del token
 */
export async function getSantanderToken(
  params: SantanderTokenRequest,
): Promise<SantanderTokenResponse> {
  const {
    username,
    password,
    clientId,
    akamaiTelemetry,
    tokenTbk = "TOKEN@4152811016027300",
    nroSer = "",
  } = params;

  const url =
    "https://apideveloper.santander.cl/sancl/privado/party_authentication_restricted/party_auth_dss/v1/oauth2/token";

  // Construir el cuerpo de la petición
  const body = new URLSearchParams({
    scope: "Completa",
    username: username,
    password: password,
    client_id: clientId,
  });

  //console.log(akamaiTelemetry);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        referrer: "https://mibanco.santander.cl/",
        "Content-Type": "application/x-www-form-urlencoded",
        accept: "application/json",
        "Akamai-BM-Telemetry": akamaiTelemetry,
        app: "007",
        canal: "003",
        nro_ser: nroSer,
        //tokentbk: tokenTbk,
        //grant_type: "password",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error en la autenticación: ${response.status} - ${errorText}`,
      );
    }

    const data: SantanderTokenResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error al obtener token de Santander:", error);
    throw error;
  }
}
