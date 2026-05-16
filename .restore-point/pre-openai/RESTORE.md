# Punto de restauración — Antes de OpenAI

**Fecha:** 2026-05-16  
**Etiqueta git:** `restore-point-pre-openai` (si existe repo git)

## Cómo volver atrás

Dile al asistente: **"regresa el punto de restauración"** o **"revierte OpenAI"**.

O ejecuta en PowerShell desde la carpeta `bots`:

```powershell
.\scripts\restore-pre-openai.ps1
```

## Archivos respaldados

- `services/openaiService.js`
- `services/autoReplyService.js`
- `config/env.js`
- `package.json`
- `.env.example`

## Con git (si inicializaste el repo)

```powershell
git checkout restore-point-pre-openai -- .
npm install
```
