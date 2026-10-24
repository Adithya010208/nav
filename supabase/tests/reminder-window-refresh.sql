-- Synthetic transaction only: no real owner, device token, task or permanent fixture data.
begin;
do $test$
declare fn text; owner_id text; payload jsonb; current_payload jsonb; current_revision bigint; table_name text;
begin
 foreach fn in array array['nav_desktop_manage','nav_mobile_manage'] loop
  owner_id:='nav-window-test-'||gen_random_uuid()::text;
  table_name:=case fn when 'nav_desktop_manage' then 'nav_desktop_links' else 'nav_mobile_links' end;
  execute format('insert into public.%I(id,user_id,label,token_hash,expires_at) values(gen_random_uuid(),$1,$2,$3,now()+interval ''1 hour'')',table_name) using owner_id,'Synthetic rollback fixture',md5(random()::text)||md5(random()::text);
  payload:='{"profile":{"onboarded":true,"timezone":"UTC","studyTime":"18:30"},"tasks":[]}'::jsonb;
  execute format('select public.%I(''publish'',$1,$2)',fn) using owner_id,jsonb_build_object('revision',10,'data',payload);
  payload:=payload||'{"advanced":{"version":2,"generatedAt":100,"expiresAt":200,"events":[],"truncated":false}}'::jsonb;
  execute format('select public.%I(''publish'',$1,$2)',fn) using owner_id,jsonb_build_object('revision',10,'data',payload);
  select s.payload into current_payload from public.nav_reminder_snapshots s where s.user_id=owner_id;
  if current_payload#>>'{advanced,generatedAt}' is distinct from '100' then raise exception 'Legacy to v2 refresh rejected';end if;
  payload:=jsonb_set(payload,'{advanced,generatedAt}','200');
  execute format('select public.%I(''publish'',$1,$2)',fn) using owner_id,jsonb_build_object('revision',10,'data',payload);
  execute format('select public.%I(''publish'',$1,$2)',fn) using owner_id,jsonb_build_object('revision',10,'data',jsonb_set(payload,'{advanced,generatedAt}','150'));
  select s.payload into current_payload from public.nav_reminder_snapshots s where s.user_id=owner_id;
  if current_payload#>>'{advanced,generatedAt}' is distinct from '200' then raise exception 'Newer refresh or stale guard failed';end if;
  payload:=jsonb_set(jsonb_set(payload,'{advanced,generatedAt}','300'),'{profile,studyTime}','"19:30"');
  execute format('select public.%I(''publish'',$1,$2)',fn) using owner_id,jsonb_build_object('revision',10,'data',payload);
  select s.payload into current_payload from public.nav_reminder_snapshots s where s.user_id=owner_id;
  if current_payload#>>'{profile,studyTime}' is distinct from '18:30' then raise exception 'Equal revision changed task/profile data';end if;
  execute format('select public.%I(''publish'',$1,$2)',fn) using owner_id,jsonb_build_object('revision',9,'data',payload);
  select s.revision into current_revision from public.nav_reminder_snapshots s where s.user_id=owner_id;
  if current_revision<>10 then raise exception 'Stale revision accepted';end if;
  execute format('select public.%I(''publish'',$1,$2)',fn) using owner_id,jsonb_build_object('revision',11,'data',payload);
  select s.revision,s.payload into current_revision,current_payload from public.nav_reminder_snapshots s where s.user_id=owner_id;
  if current_revision<>11 or current_payload#>>'{profile,studyTime}' is distinct from '19:30' then raise exception 'New owner revision rejected';end if;
  if has_function_privilege('anon',format('public.%I(text,text,jsonb)',fn),'EXECUTE') or has_function_privilege('authenticated',format('public.%I(text,text,jsonb)',fn),'EXECUTE') then raise exception 'Function became publicly executable';end if;
 end loop;
end $test$;
rollback;
