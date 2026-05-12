-- 1. Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Populate id_hash for existing records that have a national_id but no hash
UPDATE public.beneficiaries_individual 
SET id_hash = encode(digest(lower(trim(national_id)), 'sha256'), 'hex')
WHERE national_id IS NOT NULL AND (id_hash IS NULL OR id_hash = '');

-- 3. Sync with registry if missing
INSERT INTO public.beneficiaries_registry (id_hash, full_name, nationality, birthdate, phone)
SELECT DISTINCT bi.id_hash, bi.full_name, bi.nationality, bi.birthdate, bi.phone
FROM public.beneficiaries_individual bi
LEFT JOIN public.beneficiaries_registry br ON br.id_hash = bi.id_hash
WHERE bi.id_hash IS NOT NULL AND br.id IS NULL
ON CONFLICT (id_hash) DO NOTHING;

-- 4. Update registry_id for individual records
UPDATE public.beneficiaries_individual bi
SET registry_id = br.id
FROM public.beneficiaries_registry br
WHERE bi.id_hash = br.id_hash AND bi.registry_id IS NULL;

-- 5. [DISABLED] PRIVACY CLEANUP: The user wants to keep the IDs in the team-specific table
-- UPDATE public.beneficiaries_individual
-- SET national_id = NULL
-- WHERE id_hash IS NOT NULL;

-- 6. Also clean up registry if national_id was accidentally stored there (it wasn't in the schema but just in case)
-- (The schema for beneficiaries_registry didn't even have national_id, so it's fine)
