-- Prefix is mandatory; owner alone must not allow writing into another user's
-- namespace. Service-role policies and signed server uploads are unchanged.
DO $policies$
DECLARE
  bucket text;
  predicate text;
BEGIN
  FOREACH bucket IN ARRAY ARRAY['user-photos', 'chat-media'] LOOP
    predicate := format(
      'bucket_id = %L AND split_part(name, ''/'', 1) = (SELECT auth.uid())::text '
      || 'AND strpos(name, ''/'') > 0 AND name !~ ''(^|/)[.]{1,2}(/|$)'' '
      || 'AND strpos(name, chr(92)) = 0 AND strpos(name, ''%%'') = 0', bucket
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', bucket || ': owners can read');
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated USING (%s)',
      bucket || ': owners can read', predicate);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', bucket || ': owners can insert');
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (%s)',
      bucket || ': owners can insert', predicate);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', bucket || ': owners can update');
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      bucket || ': owners can update', predicate, predicate);
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', bucket || ': owners can delete');
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (%s)',
      bucket || ': owners can delete', predicate);
  END LOOP;
END;
$policies$;
