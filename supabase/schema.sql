CREATE TABLE public.nav_server_keys(token_hash text PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'),enabled boolean NOT NULL DEFAULT true);
CREATE TABLE public.nav_devices(token_hash text PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'),id uuid NOT NULL UNIQUE,user_id text NOT NULL,group_name text NOT NULL CHECK(length(group_name) BETWEEN 1 AND 150),expires_at timestamptz NOT NULL,revoked boolean NOT NULL DEFAULT false,usage_day date NOT NULL DEFAULT current_date,usage_count integer NOT NULL DEFAULT 0,last_seen_at timestamptz);
CREATE INDEX nav_devices_user_idx ON public.nav_devices(user_id);
CREATE TABLE public.nav_notices(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,device_id uuid NOT NULL REFERENCES public.nav_devices(id),user_id text NOT NULL,group_name text NOT NULL,body text NOT NULL CHECK(length(body) BETWEEN 1 AND 12000),received_at bigint NOT NULL,content_hash text NOT NULL,queued_at timestamptz NOT NULL DEFAULT now(),consumed_at timestamptz,UNIQUE(user_id,group_name,received_at,content_hash));
CREATE INDEX nav_notices_pending_idx ON public.nav_notices(user_id,group_name,id) WHERE consumed_at IS NULL;
CREATE INDEX nav_notices_device_idx ON public.nav_notices(device_id);
ALTER TABLE public.nav_server_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nav_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nav_notices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nav_server_keys,public.nav_devices,public.nav_notices FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.nav_notices_id_seq FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.nav_server_keys,public.nav_devices,public.nav_notices TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.nav_notices_id_seq TO service_role;
CREATE FUNCTION public.nav_ingest(p_token_hash text,p_payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE d public.nav_devices%ROWTYPE;n jsonb;count_added integer:=0;affected integer;stamp bigint;clock_ms bigint:=(extract(epoch from now())*1000)::bigint;
BEGIN
 SELECT * INTO d FROM public.nav_devices WHERE token_hash=p_token_hash AND revoked=false AND expires_at>now() FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status',401,'error','Device expired or revoked.');END IF;
 IF p_payload->>'format' IS DISTINCT FROM 'nav-college-notices' OR p_payload->>'version' IS DISTINCT FROM '1' OR p_payload->>'group' IS DISTINCT FROM d.group_name OR jsonb_typeof(p_payload->'notices') IS DISTINCT FROM 'array' THEN RETURN jsonb_build_object('status',400,'error','Invalid notice bundle.');END IF;
 IF jsonb_array_length(p_payload->'notices') NOT BETWEEN 1 AND 100 OR length(p_payload::text)>500000 THEN RETURN jsonb_build_object('status',400,'error','Invalid batch size.');END IF;
 FOR n IN SELECT value FROM jsonb_array_elements(p_payload->'notices') LOOP
  IF n->>'group' IS DISTINCT FROM d.group_name OR length(trim(coalesce(n->>'text','')))=0 OR length(n->>'text')>12000 OR coalesce(n->>'receivedAt','') !~ '^[0-9]{13}$' THEN RETURN jsonb_build_object('status',400,'error','Invalid selected-group notice.');END IF;
  stamp:=(n->>'receivedAt')::bigint;
  IF stamp<clock_ms-604800000 OR stamp>clock_ms+60000 THEN RETURN jsonb_build_object('status',400,'error','Only recent notice timestamps are accepted.');END IF;
 END LOOP;
 IF d.usage_day=current_date AND d.usage_count>=240 THEN RETURN jsonb_build_object('status',429,'error','Daily sync limit reached.');END IF;
 DELETE FROM public.nav_notices WHERE received_at<clock_ms-604800000;
 IF (SELECT count(*) FROM public.nav_notices WHERE user_id=d.user_id AND consumed_at IS NULL)>=3000 THEN RETURN jsonb_build_object('status',409,'code','queue_full','error','Review your NAV inbox before uploading more.');END IF;
 UPDATE public.nav_devices SET usage_day=current_date,usage_count=CASE WHEN usage_day=current_date THEN usage_count+1 ELSE 1 END,last_seen_at=now() WHERE id=d.id;
 FOR n IN SELECT value FROM jsonb_array_elements(p_payload->'notices') LOOP
  INSERT INTO public.nav_notices(device_id,user_id,group_name,body,received_at,content_hash) VALUES(d.id,d.user_id,d.group_name,trim(n->>'text'),(n->>'receivedAt')::bigint,encode(sha256(convert_to(trim(n->>'text'),'UTF8')),'hex')) ON CONFLICT(user_id,group_name,received_at,content_hash) DO NOTHING;
  GET DIAGNOSTICS affected=ROW_COUNT;count_added:=count_added+affected;
 END LOOP;
 RETURN jsonb_build_object('status',200,'added',count_added,'duplicates',jsonb_array_length(p_payload->'notices')-count_added);
END;$$;
REVOKE ALL ON FUNCTION public.nav_ingest(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nav_ingest(text,jsonb) TO service_role;
