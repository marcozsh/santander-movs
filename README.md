# 🏦 Santander Movimientos API

API REST para obtener movimientos bancarios de Santander Chile utilizando web scraping y automatización.

## 📋 Características

- 🔐 Autenticación automática con Santander
- 📊 Obtención de movimientos bancarios
- 💰 Cálculo automático de totales (abonos, gastos, balance)
- 🚀 API REST con Express
- 🤖 Web scraping con Puppeteer
- 📝 TypeScript para type safety

## 🛠️ Requisitos

- Node.js >= 18.x
- npm o yarn
- Credenciales de Santander Chile

## 📦 Instalación

1. **Clonar o descargar el proyecto**

```bash
cd santander-movs
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Copia el archivo `.env.example` a `.env` y completa tus credenciales:

```bash
cp .env.example .env
```

Edita el archivo `.env`:

```env
# Credenciales de Santander
# ⚠️ IMPORTANTE: Si tu contraseña contiene caracteres especiales (#, @, $, etc.)
# usa comillas dobles: SANTANDER_PASSWORD="MiClave#123"
SANTANDER_USERNAME=tu_rut_sin_puntos
SANTANDER_PASSWORD="tu_contraseña"
SANTANDER_CLIENT_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
SANTANDER_API_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Configuración del servidor
PORT=3000

# Opciones de scraping
HEADLESS=true
VERBOSE=true
LIMIT=50
```

> ⚠️ **ADVERTENCIA IMPORTANTE**: Si tu contraseña contiene caracteres especiales como `#`, `@`, `$`, `%`, `&`, etc., **DEBES** usar comillas dobles alrededor del valor. Ejemplo: `SANTANDER_PASSWORD="Jetblack3#"`. Para más información, consulta el archivo [CONFIGURAR-ENV.md](CONFIGURAR-ENV.md).

## 🚀 Uso

### Modo Desarrollo (con hot reload)

```bash
npm run dev
```

### Modo Producción

1. Compilar TypeScript:
```bash
npm run build
```

2. Iniciar servidor:
```bash
npm start
```

### Ejecutar script de prueba

```bash
npm test
```

## 📡 API Endpoints

### 1. Health Check

**GET** `/`

Verifica que el servidor esté activo.

**Respuesta:**
```json
{
  "message": "API de Santander - Servidor activo",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /",
    "movimientos": "POST /api/movimientos",
    "totales": "POST /api/totales",
    "completo": "POST /api/completo"
  }
}
```

### 2. Obtener Movimientos

**POST** `/api/movimientos`

Obtiene los movimientos bancarios organizados por fecha.

**Body (opcional - usa .env si no se proporciona):**
```json
{
  "username": "00tu_rut_sin_puntos_ni_guion",
  "password": "tu_contraseña",
  "clientId": "xxxxxx-xxxx-xxxx-xxxx-xxxxx",
  "apiClientId": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "headless": true,
  "verbose": false,
  "limit": "50"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "12-11-2025": {
      "abonos": [
        {
          "mov": "$ 50.000",
          "descripcion": "Transferencia recibida"
        }
      ],
      "gastosDebito": [
        {
          "mov": "$ 15.000",
          "descripcion": "MERCADO LIBRE"
        }
      ],
      "gastosCredito": [
        {
          "mov": "$ 8.500",
          "descripcion": "STARBUCKS"
        }
      ]
    }
  }
}
```

### 3. Obtener Totales

**POST** `/api/totales`

Calcula los totales generales de todos los movimientos.

**Body:** Igual que `/api/movimientos` (opcional)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalAbonos": 150000,
    "totalGastosDebito": 45000,
    "totalGastosCredito": 25000,
    "totalGastos": 70000,
    "balance": 80000
  }
}
```

### 4. Obtener Información Completa

**POST** `/api/completo`

Obtiene movimientos, totales y el token de autenticación.

**Body:** Igual que `/api/movimientos` (opcional)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "movimientos": { /* ... */ },
    "totales": {
      "totalAbonos": 150000,
      "totalGastosDebito": 45000,
      "totalGastosCredito": 25000,
      "totalGastos": 70000,
      "balance": 80000
    }
  }
}
```

## 🧪 Ejemplos de Uso

### Con cURL

```bash
# Health check
curl http://localhost:3000/

# Obtener movimientos (usando credenciales del .env)
curl -X POST http://localhost:3000/api/movimientos \
  -H "Content-Type: application/json"

# Obtener totales con credenciales en el body
curl -X POST http://localhost:3000/api/totales \
  -H "Content-Type: application/json" \
  -d '{
    "username": "00tu_rut_sin_puntos_ni_guion",
    "password": "tu_contraseña",
    "clientId": "xxxxxx-xxxx-xxxx-xxxx-xxxxx",
    "apiClientId": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "headless": true,
    "limit": "50"
  }'
```

### Con JavaScript/Fetch

```javascript
// Obtener movimientos
const response = await fetch('http://localhost:3000/api/movimientos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    headless: true,
    verbose: false,
    limit: '50'
  })
});

const data = await response.json();
console.log(data);
```

### Con Python

```python
import requests

# Obtener totales
response = requests.post('http://localhost:3000/api/totales', json={
    'username': '00tu_rut_sin_puntos_ni_guion',
    'password': 'tu_contraseña',
    'clientId': 'xxxxxx-xxxx-xxxx-xxxx-xxxxx',
    'apiClientId': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'headless': True,
    'limit': '50'
})

data = response.json()
print(data)
```

## 📁 Estructura del Proyecto

```
santander-movs/
├── src/
│   ├── server.ts                 # Servidor Express
│   ├── main-santander.ts         # Flujo principal
│   ├── santander-scraper.ts      # Web scraper con Puppeteer
│   ├── santander-token.ts        # Autenticación API
│   └── santander.ts              # Servicio de movimientos
├── .env                          # Variables de entorno (no incluir en git)
├── .env.example                  # Ejemplo de variables de entorno
├── .gitignore                    # Archivos ignorados por git
├── package.json                  # Dependencias y scripts
├── tsconfig.json                 # Configuración de TypeScript
└── README.md                     # Este archivo
```

## 🔧 Configuración Avanzada

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3000` |
| `HEADLESS` | Ejecutar navegador sin interfaz | `true` |
| `VERBOSE` | Mostrar logs detallados | `true` |
| `LIMIT` | Número de movimientos a obtener | `50` |

### Opciones en el Body

Todas las variables de entorno pueden ser sobrescritas enviándolas en el body de la petición POST.

## ⚠️ Consideraciones de Seguridad

- ⚠️ **Nunca** compartas tu archivo `.env`
- ⚠️ **Nunca** subas credenciales a repositorios públicos
- 🔒 Considera usar variables de entorno del sistema en producción
- 🔒 Implementa autenticación adicional si expones la API públicamente
- 🔒 Usa HTTPS en producción

## 🐛 Troubleshooting

### Error: "No se pudo capturar el Akamai-BM-Telemetry"

- Asegúrate de tener una conexión a internet estable
- Intenta con `HEADLESS=false` para ver el proceso
- Verifica que tus credenciales sean correctas

### Error: "Chromium not found"

```bash
npx puppeteer browsers install chrome
```

### El servidor no inicia

- Verifica que el puerto no esté en uso
- Revisa que todas las dependencias estén instaladas
- Comprueba la sintaxis del archivo `.env`

## 📝 Scripts Disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| Desarrollo | `npm run dev` | Inicia servidor con hot reload |
| Build | `npm run build` | Compila TypeScript a JavaScript |
| Start | `npm start` | Inicia servidor compilado |
| Test | `npm test` | Ejecuta script de prueba |

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

ISC

## ⚠️ Disclaimer

Este proyecto es solo para fines educativos. El uso de web scraping puede violar los términos de servicio de Santander. Usa bajo tu propia responsabilidad.

## 📞 Soporte

Si encuentras problemas, por favor abre un issue en el repositorio.

---

Desarrollado con ❤️ usando TypeScript, Express y Puppeteer
