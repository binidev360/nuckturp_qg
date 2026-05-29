
-- Step 1: Add new columns to campaigns
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS arc_summary text,
  ADD COLUMN IF NOT EXISTS is_one_shot boolean NOT NULL DEFAULT false;

-- Step 2: Migrate each adventure into a new campaign
DO $$
DECLARE
  adv RECORD;
  parent RECORD;
  new_id uuid;
BEGIN
  FOR adv IN SELECT * FROM adventures ORDER BY campaign_id, sort_order LOOP
    SELECT * INTO parent FROM campaigns WHERE id = adv.campaign_id;
    
    INSERT INTO campaigns (
      tenant_id, name, description, setting, system, worldcraft_url, vtt_url,
      status, cover_url, arc_summary, is_one_shot, created_at, updated_at
    ) VALUES (
      adv.tenant_id, adv.name, adv.description,
      parent.setting, parent.system, parent.worldcraft_url, parent.vtt_url,
      CASE adv.status WHEN 'completed' THEN 'finished' ELSE 'active' END,
      COALESCE(adv.cover_url, parent.cover_url),
      adv.arc_summary, adv.is_one_shot,
      adv.created_at, adv.updated_at
    ) RETURNING id INTO new_id;
    
    -- Reassign sessions
    UPDATE sessions SET campaign_id = new_id WHERE adventure_id = adv.id;
    
    -- Reassign whiteboards
    UPDATE whiteboards SET campaign_id = new_id WHERE adventure_id = adv.id;
    
    -- Copy campaign_shares from parent
    INSERT INTO campaign_shares (campaign_id, shared_by, shared_with_email, shared_with_user_id, permission, share_notes, share_whiteboard, share_sessions, accepted)
    SELECT new_id, shared_by, shared_with_email, shared_with_user_id, permission, share_notes, share_whiteboard, share_sessions, accepted
    FROM campaign_shares WHERE campaign_id = adv.campaign_id;
  END LOOP;
  
  -- Delete old parent campaigns that had adventures (they were just containers)
  DELETE FROM campaigns WHERE id IN (
    SELECT DISTINCT campaign_id FROM adventures
  );
END $$;

-- Step 3: Clean up - drop adventures table (sessions.adventure_id will be handled)
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_adventure_id_fkey;
ALTER TABLE whiteboards DROP CONSTRAINT IF EXISTS whiteboards_adventure_id_fkey;
DROP TABLE IF EXISTS adventures;

-- Step 4: Remove adventure_id column from sessions and whiteboards
ALTER TABLE sessions DROP COLUMN IF EXISTS adventure_id;
ALTER TABLE whiteboards DROP COLUMN IF EXISTS adventure_id;
