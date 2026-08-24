# LinkedEmpire Extension V2 Scaffold

This folder contains the modular v2 extension baseline.

## Modules
- `src/content`: LinkedIn page bootstrap hooks
- `src/ui`: lightweight UI shell
- `src/service-worker`: runtime orchestration and CRM communication
- `src/service-worker/orchestrator`: campaign and action orchestration
- `src/service-worker/workers`: periodic background workers

## Notes
- This scaffold intentionally keeps provider calls out of the extension.
- All provider-side behavior should flow through CRM v2 endpoints under `/api/v2`.
