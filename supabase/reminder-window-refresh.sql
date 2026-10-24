-- Refresh derived windows without rolling back task revisions or changing device grants.
create or replace function public.nav_desktop_manage(p_op text,p_owner text,p_value jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if p_owner is null or length(p_owner) not between 1 and 300 then raise exception 'Invalid owner'; end if;
 if p_op='list' then return coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',label,'expiresAt',expires_at,'revoked',revoked) order by created_at desc) from public.nav_desktop_links where user_id=p_owner),'[]'::jsonb); end if;
 if p_op='create' then
  perform pg_advisory_xact_lock(hashtextextended(p_owner,0));
  select count(*) into n from public.nav_desktop_links where user_id=p_owner and not revoked and expires_at>now();
  if n>=5 then return jsonb_build_object('full',true); end if;
  insert into public.nav_desktop_links(id,user_id,label,token_hash,expires_at) values((p_value->>'id')::uuid,p_owner,p_value->>'label',p_value->>'tokenHash',now()+interval '30 days');
  return (select jsonb_build_object('id',id,'expiresAt',expires_at) from public.nav_desktop_links where id=(p_value->>'id')::uuid and user_id=p_owner);
 end if;
 if p_op='revoke' then
  update public.nav_desktop_links set revoked=true where id=(p_value->>'id')::uuid and user_id=p_owner;
  get diagnostics n=row_count;return jsonb_build_object('revoked',n=1);
 end if;
 if p_op='publish' then
  -- Only opted-in owners get a snapshot. Monotonic revisions prevent late saves rolling it back.
  if exists(select 1 from public.nav_desktop_links where user_id=p_owner and not revoked and expires_at>now()) then
   insert into public.nav_reminder_snapshots(user_id,revision,payload) values(p_owner,(p_value->>'revision')::bigint,p_value->'data')
   on conflict(user_id) do update set revision=excluded.revision,payload=excluded.payload,updated_at=now() where public.nav_reminder_snapshots.revision<excluded.revision OR (public.nav_reminder_snapshots.revision=excluded.revision AND (public.nav_reminder_snapshots.payload-'advanced')=(excluded.payload-'advanced') AND (excluded.payload#>>'{advanced,generatedAt}')::bigint > coalesce((public.nav_reminder_snapshots.payload#>>'{advanced,generatedAt}')::bigint,0));
  else delete from public.nav_reminder_snapshots where user_id=p_owner; end if;
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'Invalid operation';
end $$;
create or replace function public.nav_mobile_manage(p_op text,p_owner text,p_value jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if p_owner is null or length(p_owner) not between 1 and 300 then raise exception 'Invalid owner'; end if;
 if p_op='list' then return coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',label,'expiresAt',expires_at,'revoked',revoked) order by created_at desc) from public.nav_mobile_links where user_id=p_owner),'[]'::jsonb); end if;
 if p_op='create' then
  perform pg_advisory_xact_lock(hashtextextended(p_owner,1));
  select count(*) into n from public.nav_mobile_links where user_id=p_owner and not revoked and expires_at>now();
  if n>=5 then return jsonb_build_object('full',true); end if;
  insert into public.nav_mobile_links(id,user_id,label,token_hash,expires_at) values((p_value->>'id')::uuid,p_owner,p_value->>'label',p_value->>'tokenHash',now()+interval '30 days');
  return (select jsonb_build_object('id',id,'expiresAt',expires_at) from public.nav_mobile_links where id=(p_value->>'id')::uuid and user_id=p_owner);
 end if;
 if p_op='revoke' then
  update public.nav_mobile_links set revoked=true where id=(p_value->>'id')::uuid and user_id=p_owner;
  get diagnostics n=row_count;return jsonb_build_object('revoked',n=1);
 end if;
 if p_op='publish' then
  if exists(select 1 from public.nav_mobile_links where user_id=p_owner and not revoked and expires_at>now()) then
   insert into public.nav_reminder_snapshots(user_id,revision,payload) values(p_owner,(p_value->>'revision')::bigint,p_value->'data')
   on conflict(user_id) do update set revision=excluded.revision,payload=excluded.payload,updated_at=now() where public.nav_reminder_snapshots.revision<excluded.revision OR (public.nav_reminder_snapshots.revision=excluded.revision AND (public.nav_reminder_snapshots.payload-'advanced')=(excluded.payload-'advanced') AND (excluded.payload#>>'{advanced,generatedAt}')::bigint > coalesce((public.nav_reminder_snapshots.payload#>>'{advanced,generatedAt}')::bigint,0));
  end if;
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'Invalid operation';
end $$;
