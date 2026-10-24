# Quizaroni S3

## Buckets
- quizaroni-{deploymentType}-main

## Card file keys
Card images live in the main bucket under `${studysetUUID}/${fileUUID}`. The key must never contain the owner id or the uploaded file name: a presigned URL carries its key in the path, and public study sets serve presigned URLs (#152). The original file name is stored on the card as `name`.

Files stored under the old `${studysetUUID}/${userUUID}/${fileName}` layout are moved by `pnpm --filter @quizaroni/api migrate:card-file-keys` (see the header of `scripts/rekeyCardFiles.ts`). Its re-key pass copies them to opaque keys; its later `DELETE_OLD=1` pass deletes the old objects. Until a set is migrated, the public endpoint leaves its legacy-keyed images out.

## Ownership
A card file belongs to the set named by its key's first segment. `delete-file`, the multipart upload endpoints and `update-studyset` only act on keys under a set the caller owns: a real study set item (one whose `studysetUUID` matches its key) under the caller's PK. A save may also keep foreign keys the set already stores (sets duplicated before #126, until the migration re-keys them), and keys from the caller's other sets are copied into the saved set, as Combine needs (#188).

Files removed from a set are not deleted from S3 yet: `update-studyset` only logs the removed keys under the saved set's prefix (#191).
