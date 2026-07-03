# Gilfforever — Projeto do App

App de **memórias de casais** (linha do tempo + fotos + mensagens + cápsulas do tempo), modelo de assinatura. Aquisição via quiz de astrologia do casal → funil conversacional → app (recorrência honesta).

## Estrutura do projeto
```
gilfforever/
├── docs/                 ← briefing completo (App Builder Wizard)
│   ├── prd.md            ← Documento de Produto
│   ├── trd.md            ← Documento Técnico
│   ├── userflow.md       ← Fluxo do Usuário
│   ├── design-system.md  ← Sistema de Design
│   ├── backend.md        ← Schema do Backend
│   └── game-plan.md      ← Plano de Execução
├── marketing/            ← funis de aquisição
│   ├── funil-quiz-astro.md   ← topo de funil (quiz de astrologia, isca honesta)
│   └── funil-gilfforever.md  ← funil principal → entrega o app
├── identidade-visual/    ← paleta, logos, prints de referência do design
└── referencias/          ← prints de apps que inspiraram
```

## Passo 2 — Prompt para iniciar o build no Claude Code
Abra o Claude Code no terminal dentro desta pasta e cole:

> Leia todos os arquivos dentro da pasta /docs antes de começar. Eles contêm o PRD, TRD, UserFlow, Design System, Backend Schema e Game Plan do app. Use esse contexto completo para criar o projeto. Comece pela Fase 0/1 do game-plan.md (web-first, Next.js, para preview no navegador e deploy na Vercel).

## Princípio inegociável
Tudo que o funil promete, o app entrega. Assinatura transparente, cancelável, dados sempre nas mãos do casal. Astrologia só como entretenimento honesto — sem promessa sobrenatural, urgência falsa ou funil pra jogo.

## Próximo passo
Fase 0 (ver docs/game-plan.md): subir landing + quiz e captar interessados/beta antes de construir o MVP completo.
