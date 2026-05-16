# WhatsApp Bot Automatizador

Bot profesional de WhatsApp con **respuestas automáticas por palabras clave** y **mensajes programados diarios**, construido con Node.js y [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js).

---

## Características

- Conexión por WhatsApp Web con código QR
- Sesión persistente (no escanear QR cada vez)
- Respuestas automáticas: `horario`, `ubicacion`, `oracion`
- Mensaje diario programado a las 8:00 AM
- Reconexión automática si se pierde la conexión
- Anti-crash y manejo de errores async
- **ChatGPT (OpenAI)** para preguntas complejas (opcional)
- Variables de entorno con `dotenv`

---

## Estructura del proyecto

```
bots/
├── index.js                 # Punto de entrada
├── package.json
├── .env                     # Configuración (no subir a Git)
├── .env.example
├── .gitignore
├── config/
│   ├── env.js               # Variables de entorno
│   ├── client.js            # Cliente WhatsApp
│   ├── keywords.js          # Palabras clave y respuestas
│   └── openai.js            # Prompt y reglas de ChatGPT
├── handlers/
│   ├── messageHandler.js    # Listener de mensajes
│   └── connectionHandler.js   # QR, ready, reconexión
├── services/
│   ├── autoReplyService.js  # Lógica de auto-respuesta
│   ├── schedulerService.js    # Mensajes programados (cron)
│   └── openaiService.js     # Integración ChatGPT
├── utils/
│   ├── logger.js            # Logs en consola
│   ├── asyncHandler.js      # Errores async seguros
│   ├── phone.js             # Formato de números/chatId
│   └── complexMessage.js    # Detecta preguntas complejas
└── sessions/                # Datos de sesión (ignorado por Git)
```

---

## Requisitos previos

- **Node.js 18+** — [https://nodejs.org](https://nodejs.org)
- **npm** (incluido con Node.js)
- Cuenta de WhatsApp activa en el teléfono
- Windows, Linux o macOS

---

## Instalación paso a paso

### 1. Abrir terminal en la carpeta del proyecto

```powershell
cd C:\Users\raull\Documents\bots
```

### 2. Instalar dependencias

```powershell
npm install
```

### 3. Configurar variables de entorno

Copia el ejemplo si no tienes `.env`:

```powershell
copy .env.example .env
```

Edita `.env` y configura al menos:

```env
SCHEDULED_RECIPIENTS=34612345678
CRON_TIMEZONE=Europe/Madrid
```

> **SCHEDULED_RECIPIENTS**: número con código de país, sin `+` ni espacios.  
> Ejemplo España: `34612345678` para +34 612 345 678.

### 4. Ejecutar el bot

```powershell
npm start
```

### 5. Escanear el código QR

1. En el teléfono abre **WhatsApp**
2. Ve a **Ajustes → Dispositivos vinculados → Vincular dispositivo**
3. Escanea el QR que aparece en la consola
4. Cuando veas `[OK] Bot Iglesia conectado y listo`, el bot está activo

La sesión se guarda en `sessions/`. En los próximos arranques no necesitarás escanear el QR (salvo que cierres sesión en el teléfono).

---

## Comandos npm

| Comando       | Descripción                          |
|---------------|--------------------------------------|
| `npm install` | Instala dependencias                 |
| `npm start`   | Inicia el bot                        |
| `npm run dev` | Inicia con recarga automática (Node 18+) |

---

## Respuestas automáticas

| Palabra clave   | Respuesta                                              |
|-----------------|--------------------------------------------------------|
| horario         | Nuestros cultos son miércoles y sábado a las 7PM       |
| ubicacion       | Estamos ubicados en Madrid                             |
| oracion         | Envíanos tu petición y estaremos orando por ti         |

### Agregar nuevas respuestas

Edita `config/keywords.js`:

```javascript
{
  triggers: ['contacto', 'telefono', 'teléfono'],
  response: 'Llámanos al 600 000 000',
},
```

Reinicia el bot: `Ctrl+C` y luego `npm start`.

---

## Mensajes programados

Por defecto, todos los días a las **8:00 AM** (zona `Europe/Madrid`) se envía:

> Dios bendiga tu día. Todo lo puedo en Cristo.

### Cambiar hora o mensaje

En `.env`:

```env
DAILY_MESSAGE_HOUR=8
DAILY_MESSAGE_MINUTE=0
DAILY_MESSAGE_TEXT=Tu mensaje aquí
CRON_TIMEZONE=Europe/Madrid
SCHEDULED_RECIPIENTS=34612345678,34698765432
```

### Agregar otro horario automático

En cualquier archivo que tengas acceso al `client` (por ejemplo al iniciar en `connectionHandler.js` tras `ready`):

```javascript
const { registerCustomJob } = require('../services/schedulerService');

// Domingos a las 12:00 — recordatorio
registerCustomJob('0 12 * * 0', async () => {
  await client.sendMessage('34612345678@c.us', '¡Nos vemos en el culto!');
}, 'Europe/Madrid');
```

Formato cron: `minuto hora día-mes mes día-semana`  
Herramienta útil: [crontab.guru](https://crontab.guru)

### Enviar a un grupo

1. Escribe algo en el grupo con el bot activo y revisa los logs (`from` del mensaje).
2. O usa el ID del grupo: termina en `@g.us`.
3. Añádelo en `SCHEDULED_RECIPIENTS`:

```env
SCHEDULED_RECIPIENTS=120363123456789012@g.us
```

---

## ChatGPT (OpenAI) — Preguntas complejas

El bot usa **palabras clave primero**; si no hay coincidencia y el mensaje es una pregunta sobre **la iglesia o la fe**, consulta ChatGPT. Preguntas ajenas (deportes, tecnología, etc.) reciben un mensaje amable sin gastar la API.

### Activar

1. Crea una API key en [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. En `.env`:

```env
OPENAI_ENABLED=true
OPENAI_API_KEY=sk-proj-tu-clave-real
OPENAI_MODEL=gpt-4o-mini
```

3. Reinicia: `npm start`

### Qué responde ChatGPT

Debe ser **pregunta compleja** Y **tema de iglesia**, por ejemplo:

- ¿Qué significa la fe en tiempos difíciles?
- ¿Cómo puedo unirme al grupo de jóvenes?
- ¿Tienen estudio bíblico?

**No responde** (mensaje automático sin API):

- ¿Quién ganó el partido de ayer?
- ¿Cómo programo en Python?

Palabras clave de iglesia en `config/openai.js` → `churchTopicKeywords`.  
Para desactivar el filtro: `OPENAI_CHURCH_TOPICS_ONLY=false` en `.env`.

### Comandos útiles en WhatsApp

| Mensaje | Efecto |
|---------|--------|
| `reiniciar` | Borra el historial de ChatGPT para ese chat |

### Personalizar el tono

Edita el prompt en `config/openai.js` o define `OPENAI_SYSTEM_PROMPT` en `.env`.

### Volver atrás (sin ChatGPT)

Ver [RESTORE_POINT.md](RESTORE_POINT.md) o ejecuta `.\scripts\restore-pre-openai.ps1`

---

## Ejecutar en Windows (24/7 en tu PC)

### Opción A: Ventana siempre abierta

```powershell
cd C:\Users\raull\Documents\bots
npm start
```

Deja la ventana de PowerShell abierta.

### Opción B: PM2 (recomendado en PC o VPS)

```powershell
npm install -g pm2
cd C:\Users\raull\Documents\bots
pm2 start index.js --name whatsapp-bot
pm2 save
pm2 startup
```

Comandos útiles:

```powershell
pm2 logs whatsapp-bot
pm2 restart whatsapp-bot
pm2 stop whatsapp-bot
```

---

## Mantener el bot 24/7 en un VPS (Linux)

### 1. Subir el proyecto al servidor

```bash
# Ejemplo con git o scp
scp -r ./bots usuario@tu-servidor:/home/usuario/bots
```

### 2. Instalar Node.js 18+ en el VPS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Instalar dependencias del sistema (Puppeteer/Chromium)

```bash
sudo apt update
sudo apt install -y chromium-browser \
  fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
  libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 \
  libnss3 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 \
  xdg-utils
```

### 4. Configurar y arrancar con PM2

```bash
cd /home/usuario/bots
cp .env.example .env
nano .env   # editar SCHEDULED_RECIPIENTS, timezone, etc.
npm install
pm2 start index.js --name whatsapp-bot
pm2 save
pm2 startup   # seguir instrucciones para auto-inicio al reiniciar VPS
```

### 5. Primera conexión (QR en VPS sin pantalla)

- Usa **SSH con terminal** y escanea el QR que imprime la consola, o
- Conéctate una vez en local, copia la carpeta `sessions/` al VPS (misma ruta del proyecto).

### 6. Firewall y seguridad

- No expongas puertos innecesarios
- No subas `sessions/` ni `.env` a repositorios públicos
- Usa usuario no-root para ejecutar el bot

---

## Solución de problemas

| Problema | Solución |
|----------|----------|
| No aparece QR | Borra `sessions/` y reinicia; escanea de nuevo |
| `Auth failure` | Cierra sesión en WhatsApp → Dispositivos vinculados y vuelve a vincular |
| No envía mensaje diario | Revisa `SCHEDULED_RECIPIENTS` y `CRON_TIMEZONE` en `.env` |
| Bot no responde | El mensaje debe contener la palabra clave (ej: "¿cuál es el horario?") |
| Error Puppeteer en Linux | Instala dependencias de Chromium (ver sección VPS) |

---

## Licencia

MIT
