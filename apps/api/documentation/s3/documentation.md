# Quizaroni S3

## Buckets
- quizaroni-{deploymentType}-main

## Card file keys
Card images live in the main bucket under `${studysetUUID}/${fileUUID}`. The key must never contain the owner id or the uploaded file name: a presigned URL carries its key in the path, and public study sets serve presigned URLs (#152). The original file name is stored on the card as `name`.

Files stored under the old `${studysetUUID}/${userUUID}/${fileName}` layout are moved by `pnpm --filter @quizaroni/api migrate:card-file-keys` (see the header of `scripts/rekeyCardFiles.ts`). Its re-key pass copies them to opaque keys; its later `DELETE_OLD=1` pass deletes the old objects. Until a set is migrated, the public endpoint leaves its legacy-keyed images out.
