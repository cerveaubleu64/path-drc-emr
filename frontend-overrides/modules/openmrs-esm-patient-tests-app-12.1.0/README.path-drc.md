# path-drc override of @openmrs/esm-patient-tests-app 12.1.0

This bundle is a patched build of the upstream `@openmrs/esm-patient-tests-app`
v12.1.0 (from `openmrs/openmrs-esm-patient-chart`, tag `v12.1.0`).

## Why

The lab results viewer ("Résultats de labo") showed a single result several
times — once per branch the obstree backend returns for the same concept (the
backend can emit the same orderable-test concept under multiple branches of the
orderable-tests tree, e.g. one per order, each carrying the same single obs).

## Patch

`src/test-results/filter/filter-context.tsx`, in the `tableData` builder, the
de-duplication key was changed from the tree `flatName` to the observation's
**conceptUuid**:

```
// before
const testKey = `${test.flatName}_${obs.obsDatetime}_${obs.value}`;
// after
const testKey = `${test.conceptUuid ?? test.flatName}_${obs.obsDatetime}_${obs.value}`;
```

`flatName` differs per tree branch, so the same observation reached via several
branches was not merged. `conceptUuid` identifies the actual observation, so a
single result now renders once, while genuinely different tests stay separate.

## Rebuild

```
# in a clone of openmrs-esm-patient-chart at tag v12.1.0, with the patch applied
yarn install
yarn workspace @openmrs/esm-patient-tests-app build
cp -R packages/esm-patient-tests-app/dist/. \
  <roland-emr>/frontend-overrides/modules/openmrs-esm-patient-tests-app-12.1.0/
```

The bundle is bind-mounted over the image copy via `docker-compose.override.yml`.
