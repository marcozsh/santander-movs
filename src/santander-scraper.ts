import puppeteer, { Browser, Page, HTTPRequest } from "puppeteer";

interface LoginCredentials {
  username: string;
  password: string;
}

class SantanderAkamaiCapture {
  private static readonly LOGIN_URL = "https://banco.santander.cl/personas";

  private browser: Browser | null = null;
  private page: Page | null = null;
  private akamaiTelemetry: string | null = null;
  private clientId: string | null = null;
  private credentials: LoginCredentials;
  private headless: boolean;
  private verbose: boolean;

  constructor(
    credentials: LoginCredentials,
    headless: boolean = true,
    verbose: boolean = false,
  ) {
    this.credentials = credentials;
    this.headless = headless;
    this.verbose = verbose;
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }

  async init(): Promise<void> {
    this.log("Inicializando navegador...");

    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });

    this.page = await this.browser.newPage();

    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });

    this.setupRequestInterceptor();
  }

  private setupRequestInterceptor(): void {
    if (!this.page) return;

    this.page.on("request", (request: HTTPRequest) => {
      const headers = request.headers();

      if (headers["akamai-bm-telemetry"]) {
        this.akamaiTelemetry = headers["akamai-bm-telemetry"];
        this.log("Header Akamai capturado");
      }
    });
  }

  async login(): Promise<string | null> {
    if (!this.page) throw new Error("Página no inicializada");

    try {
      this.log("Navegando a Santander...");
      await this.page.goto(SantanderAkamaiCapture.LOGIN_URL, {
        waitUntil: "networkidle2",
        timeout: 90000,
      });

      this.log("Click en botón de ingreso...");
      await this.page.waitForSelector(
        'a[aria-label="Ingresar al sitio privado"]',
        {
          timeout: 60000,
        },
      );
      await this.page.click('a[aria-label="Ingresar al sitio privado"]');

      this.log("Esperando iframe de login...");
      await this.page.waitForSelector("#login-frame", { timeout: 20000 });
      await new Promise((r) => setTimeout(r, 3000));

      const frames = this.page.frames();
      const loginFrame = frames.find(
        (frame: any) =>
          frame.url().includes("login") || frame.name() === "login-frame",
      );

      if (!loginFrame) {
        throw new Error("No se encontró el iframe de login");
      }

      this.log("Llenando formulario...");
      await loginFrame.waitForSelector('input[name="RUT"], input[id="rut"]', {
        timeout: 10000,
      });
      await loginFrame.waitForSelector(
        'input[name="Clave"], input[type="password"]',
        { timeout: 10000 },
      );

      // Llenar RUT
      const rutSelectors = [
        'input[name="RUT"]',
        'input[id="rut"]',
        'input[aria-label="RUT"]',
      ];
      for (const selector of rutSelectors) {
        try {
          await loginFrame.waitForSelector(selector, { timeout: 2000 });
          await loginFrame.type(selector, this.credentials.username, {
            delay: 100,
          });
          this.log("  ✓ RUT ingresado");
          break;
        } catch (e) {
          continue;
        }
      }

      await new Promise((r) => setTimeout(r, 500));

      // Llenar contraseña
      const passSelectors = [
        'input[name="Clave"]',
        'input[type="password"]',
        'input[aria-label="Clave"]',
      ];
      for (const selector of passSelectors) {
        try {
          await loginFrame.waitForSelector(selector, { timeout: 2000 });
          await loginFrame.type(selector, this.credentials.password, {
            delay: 100,
          });
          this.log("  ✓ Contraseña ingresada");
          break;
        } catch (e) {
          continue;
        }
      }

      this.log("Enviando formulario...");
      const submitSelectors = [
        'button[aria-label="Ingresar"]',
        'button[type="submit"]',
        'button:has-text("Ingresar")',
      ];
      for (const selector of submitSelectors) {
        try {
          await loginFrame.waitForSelector(selector, { timeout: 2000 });
          await loginFrame.click(selector);
          this.log("  ✓ Formulario enviado");
          break;
        } catch (e) {
          continue;
        }
      }

      this.log("Login exitoso");

      // Esperar un poco más para asegurar captura de headers
      await new Promise((r) => setTimeout(r, 3000));

      return this.akamaiTelemetry;
    } catch (error) {
      throw new Error(`Error durante el login: ${error}`);
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.log("Navegador cerrado");
    }
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL EXPORTABLE
// ============================================================================
export async function getAkamaiTelemetry(
  username: string,
  password: string,
  options?: { headless?: boolean; verbose?: boolean },
): Promise<string> {
  const scraper = new SantanderAkamaiCapture(
    { username, password },
    options?.headless ?? true,
    options?.verbose ?? false,
  );

  try {
    await scraper.init();
    const telemetry = await scraper.login();

    if (!telemetry) {
      throw new Error("No se pudo capturar el header Akamai-BM-Telemetry");
    }

    return telemetry;
  } finally {
    await scraper.close();
  }
}
