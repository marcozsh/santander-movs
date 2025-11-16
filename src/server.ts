import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  obtenerMovimientosSantander,
  getMovimientos,
  getTotales,
} from "./main-santander.js";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Tipos para las credenciales
interface SantanderCredentials {
  username: string;
  password: string;
  clientId: string;
  apiClientId: string;
}

// Obtener credenciales desde request body
function getCredentials(
  body?: Partial<SantanderCredentials>,
): SantanderCredentials {
  return {
    username: body?.username || "",
    password: body?.password || "",
    clientId: body?.clientId || "",
    apiClientId: body?.apiClientId || "",
  };
}

// Validar credenciales
function validateCredentials(credentials: SantanderCredentials): boolean {
  return !!(
    credentials.username &&
    credentials.password &&
    credentials.clientId &&
    credentials.apiClientId
  );
}

// ============================================================================
// ENDPOINTS
// ============================================================================

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "API de Santander - Servidor activo",
    version: "1.0.0",
    endpoints: {
      health: "GET /",
      movimientos: "POST /api/movimientos",
      totales: "POST /api/totales",
      completo: "POST /api/completo",
    },
  });
});

// Endpoint para obtener solo movimientos
app.post("/api/movimientos", async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.body);

    if (!validateCredentials(credentials)) {
      return res.status(400).json({
        success: false,
        error:
          "Faltan credenciales. Debes enviar username, password, clientId y apiClientId en el body",
      });
    }

    const options = {
      headless:
        req.body.headless !== undefined
          ? req.body.headless
          : process.env.HEADLESS === "true",
      verbose:
        req.body.verbose !== undefined
          ? req.body.verbose
          : process.env.VERBOSE === "true",
      limit: req.body.limit || process.env.LIMIT || "50",
    };

    console.log("Obteniendo movimientos...");
    const movimientos = await getMovimientos(credentials, options);

    res.json({
      success: true,
      data: movimientos,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

// Endpoint para obtener solo totales
app.post("/api/totales", async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.body);

    if (!validateCredentials(credentials)) {
      return res.status(400).json({
        success: false,
        error:
          "Faltan credenciales. Debes enviar username, password, clientId y apiClientId en el body",
      });
    }

    const options = {
      headless:
        req.body.headless !== undefined
          ? req.body.headless
          : process.env.HEADLESS === "true",
      verbose:
        req.body.verbose !== undefined
          ? req.body.verbose
          : process.env.VERBOSE === "true",
      limit: req.body.limit || process.env.LIMIT || "50",
    };

    console.log("Calculando totales...");
    const totales = await getTotales(credentials, options);

    res.json({
      success: true,
      data: totales,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

// Endpoint para obtener movimientos y totales completos
app.post("/api/completo", async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.body);

    if (!validateCredentials(credentials)) {
      return res.status(400).json({
        success: false,
        error:
          "Faltan credenciales. Debes enviar username, password, clientId y apiClientId en el body",
      });
    }

    const options = {
      headless:
        req.body.headless !== undefined
          ? req.body.headless
          : process.env.HEADLESS === "true",
      verbose:
        req.body.verbose !== undefined
          ? req.body.verbose
          : process.env.VERBOSE === "true",
      limit: req.body.limit || process.env.LIMIT || "50",
    };

    console.log("Obteniendo información completa...");
    const result = await obtenerMovimientosSantander(credentials, options);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

app.listen(PORT, () => {
  console.log("═".repeat(60));
  console.log("Servidor de Santander API iniciado");
  console.log("═".repeat(60));
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log(`Headless: ${process.env.HEADLESS || "true"}`);
  console.log(`Verbose: ${process.env.VERBOSE || "true"}`);
  console.log(`Límite: ${process.env.LIMIT || "50"} movimientos`);
  console.log("═".repeat(60));
  console.log("\n Endpoints disponibles:");
  console.log(`  GET  /                  - Health check`);
  console.log(`  POST /api/movimientos   - Obtener movimientos`);
  console.log(`  POST /api/totales       - Obtener totales`);
  console.log(`  POST /api/completo      - Obtener todo`);
  console.log("\n Servidor listo para recibir peticiones\n");
});

export default app;
