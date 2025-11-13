-- Supabase SQL Migration: set_primary_photo RPC function
-- This function allows users to set their primary photo with proper security checks

-- Drop function if exists (for re-running migration)
DROP FUNCTION IF EXISTS public.set_primary_photo(uuid);

-- Create RPC function to set primary photo
CREATE OR REPLACE FUNCTION public.set_primary_photo(p_photo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
  v_photo_user_id text;
BEGIN
  -- Get current authenticated user ID
  v_user_id := auth.uid()::text;

  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if photo exists and belongs to current user
  SELECT user_id INTO v_photo_user_id
  FROM public.user_photos
  WHERE id = p_photo_id;

  IF v_photo_user_id IS NULL THEN
    RAISE EXCEPTION 'Photo not found';
  END IF;

  IF v_photo_user_id != v_user_id THEN
    RAISE EXCEPTION 'Permission denied: photo belongs to another user';
  END IF;

  -- Set all user's photos to is_primary = false
  UPDATE public.user_photos
  SET is_primary = false
  WHERE user_id = v_user_id;

  -- Set selected photo to is_primary = true
  UPDATE public.user_photos
  SET is_primary = true
  WHERE id = p_photo_id AND user_id = v_user_id;

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_primary_photo(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.set_primary_photo(uuid) IS
'Sets a user photo as primary. Only the owner can set their own photos as primary. SECURITY DEFINER allows bypassing RLS.';
