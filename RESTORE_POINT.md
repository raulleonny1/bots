# Punto de restauración — OpenAI

Si la integración con ChatGPT no te convence, puedes volver al bot **sin OpenAI**.

## Opción 1 — Dímelo en el chat

Escribe: **"regresa el punto de restauración"** o **"revierte OpenAI"**

## Opción 2 — Script automático

```powershell
cd C:\Users\raull\Documents\bots
.\scripts\restore-pre-openai.ps1
```

## Opción 3 — Git

```powershell
git checkout restore-point-pre-openai -- .
git clean -fd config/openai.js utils/complexMessage.js RESTORE_POINT.md 2>$null
npm install
```

Luego en `.env` pon `OPENAI_ENABLED=false` y borra `OPENAI_API_KEY` si quieres.

---

**Backup manual:** carpeta `.restore-point/pre-openai/`  
**Tag git:** `restore-point-pre-openai`
