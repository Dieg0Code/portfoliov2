# Micrographics Workflow

Usa `docs/component-library-name-map.md` como fuente de verdad para nombres y descripciones. El estado compartido vive en `data/micrographics-manifest.json`, que se regenera y preserva metadatos de trabajo.

## Comandos

- `npm run micro:sync`
  Sincroniza el mapa Markdown hacia el manifiesto JSON y regenera `src/lib/micrographics/registry.ts`.
- `npm run micro:next -- --count 5`
  Muestra los siguientes componentes pendientes con estado `mapped`.
- `npm run micro:claim -- --count 5 --by codex-main`
  Reserva automaticamente el siguiente batch para una instancia o rama.
- `npm run micro:mark -- --ids 1,2,3 --status component-ready`
  Cambia el estado de componentes ya trabajados.
- `npm run micro:report`
  Resume el avance total por estado.

## Flujo recomendado

1. La instancia que mapea nombres actualiza `docs/component-library-name-map.md`.
2. Cualquier instancia ejecuta `npm run micro:claim -- --count 5 --by <nombre>`.
3. Esa instancia convierte los SVGs o implementa los componentes.
4. Al terminar, ejecuta `npm run micro:mark -- --ids ... --status component-ready` o `implemented`.

Con eso, el siguiente agente puede pedir trabajo directamente al repo en vez de esperar instrucciones manuales.
