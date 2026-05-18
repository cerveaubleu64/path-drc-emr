# openmrs-esm-service-queues-app — PATH DRC override

Pre-built bundle of a forked `@openmrs/esm-service-queues-app` v10.0.2 with
customizations applied. Mounted into the frontend container via
`docker-compose.override.yml` so it shadows the upstream module served from
the assembled image.

## Source

- **Repo**: https://github.com/cerveaubleu64/openmrs-esm-patient-management (private)
- **Branch**: `path-drc/friendly-queue-errors`
- **Source commit**: `07109556b0ac2a87f0fe8cd2e39de4bb34011dc5`
- **Based on upstream tag**: `v10.0.2` (https://github.com/openmrs/openmrs-esm-patient-management)

## What's customized

The POST `/ws/rest/v1/visit-queue-entry` 400 response is categorized into
translated FR/EN toast messages instead of the raw "Server responded with
400 — check err.responseBody" string. Patterns recognized:

| Backend message fragment              | Toast title (EN / FR)                                                |
|---------------------------------------|----------------------------------------------------------------------|
| `[queue.entry.duplicate.patient]`     | Patient already in queue / Patient déjà dans la file d'attente       |
| `no active visit` / `has no visit`    | No active visit / Aucune visite active                               |
| `before visit start` / `startedAt …`  | Time synchronization issue / Problème de synchronisation horaire     |
| (anything else)                       | Error adding patient to the queue / Erreur lors de l'ajout du patient |

The same call site (`AddPatientToQueueModal`) no longer shows a second
generic toast after `QueueFields` has already categorized the error.

## Rebuilding after a source change

```bash
git clone https://github.com/cerveaubleu64/openmrs-esm-patient-management.git
cd openmrs-esm-patient-management
git checkout path-drc/friendly-queue-errors
corepack enable && corepack prepare yarn@4.10.3 --activate
HUSKY=0 yarn install
cd packages/esm-service-queues-app && yarn build

# Replace the bundle in roland-emr:
rm -rf <roland-emr>/frontend-overrides/modules/openmrs-esm-service-queues-app-10.0.2/*.js \
       <roland-emr>/frontend-overrides/modules/openmrs-esm-service-queues-app-10.0.2/*.js.map
cp -R dist/. <roland-emr>/frontend-overrides/modules/openmrs-esm-service-queues-app-10.0.2/
# Keep this README.md, don't overwrite it.
```

Then restart the frontend container — no image rebuild needed because this
directory is a bind mount:

```bash
docker compose up -d --force-recreate frontend
```

## Rebasing onto a newer upstream

```bash
cd openmrs-esm-patient-management
git fetch upstream
git rebase v10.x.y path-drc/friendly-queue-errors
# resolve conflicts in:
#   packages/esm-service-queues-app/src/constants.ts
#   packages/esm-service-queues-app/src/modals/queue-entry-error.utils.ts
#   packages/esm-service-queues-app/src/create-queue-entry/queue-fields/queue-fields.component.tsx
#   packages/esm-service-queues-app/src/modals/add-or-move-modal/add-patient-to-queue.component.tsx
#   packages/esm-service-queues-app/translations/en.json
#   packages/esm-service-queues-app/translations/fr.json
# rebuild as above, and rename the destination dir if the upstream version bumped.
```

If the version bumps (e.g. 10.0.3), also update:
1. The directory name `openmrs-esm-service-queues-app-10.0.2` → `…-10.0.3`
2. The matching path in `frontend-overrides/importmap.json`
3. The matching path in `docker-compose.override.yml`
