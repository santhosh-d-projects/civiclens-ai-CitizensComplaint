-- 03_duplicate_guard.sql — exact-duplicate complaint detection (2026-11-21).
-- A citizen re-submitting the EXACT same complaint (same citizen, same ward,
-- same category, identical description after lowercase + whitespace
-- normalisation, within the last 7 days, not closed) is rejected with
-- DUPLICATE_COMPLAINT:<ticket_no>:<id> and NO new ticket is generated —
-- the check runs before the INSERT, so complaint_seq never advances.
-- Scope is deliberately per-citizen: a different citizen reporting the same
-- issue is a separate, legitimate complaint.
create or replace function create_complaint(
  p_citizen uuid, p_title text, p_description text, p_language text,
  p_category int, p_severity severity_level,
  p_ai_category int, p_ai_severity severity_level, p_ai_conf numeric, p_ai_reason text,
  p_ai_dept uuid, p_department uuid, p_ward int,
  p_address text, p_lat double precision, p_lng double precision, p_photos text[]
) returns complaints language plpgsql security definer
  set search_path = public, extensions as $$
declare c complaints; v_hours int; v_norm text; v_dup_id uuid; v_dup_ticket text;
begin
  if not exists (select 1 from departments where id = p_department and status = 'active') then
    raise exception 'DEPARTMENT_NOT_ACTIVE';
  end if;
  if not exists (select 1 from department_wards where department_id = p_department and ward_id = p_ward) then
    raise exception 'DEPARTMENT_DOES_NOT_COVER_WARD';
  end if;
  if not exists (select 1 from department_categories where department_id = p_department and category_id = p_category) then
    raise exception 'DEPARTMENT_DOES_NOT_HANDLE_CATEGORY';
  end if;

  -- Exact-duplicate guard (normalised: lowercase, trim, collapse whitespace;
  -- keeps Kannada/Hindi script intact — no ASCII-only stripping).
  v_norm := regexp_replace(lower(btrim(p_description)), '\s+', ' ', 'g');
  select id, ticket_no into v_dup_id, v_dup_ticket from complaints
   where citizen_id = p_citizen and ward_id = p_ward and category_id = p_category
     and status <> 'closed'
     and created_at >= now() - interval '7 days'
     and regexp_replace(lower(btrim(description)), '\s+', ' ', 'g') = v_norm
   order by created_at desc limit 1;
  if found then
    raise exception 'DUPLICATE_COMPLAINT:%:%', v_dup_ticket, v_dup_id;
  end if;

  v_hours := case p_severity when 'critical' then 6 when 'high' then 24 when 'medium' then 72 else 168 end;

  insert into complaints(citizen_id,title,description,language,category_id,severity,
        ai_category_id,ai_severity,ai_confidence,ai_reason,ai_suggested_department_id,
        citizen_changed_suggestion,department_id,ward_id,address,lat,lng,photo_paths,sla_due_at)
  values (p_citizen,p_title,p_description,p_language,p_category,p_severity,
        p_ai_category,p_ai_severity,p_ai_conf,p_ai_reason,p_ai_dept,
        (p_ai_dept is distinct from p_department),p_department,p_ward,p_address,p_lat,p_lng,
        coalesce(p_photos,'{}'), now() + make_interval(hours => v_hours))
  returning * into c;

  insert into complaint_events(complaint_id,event,actor_id,meta)
  values (c.id,'submitted',p_citizen,jsonb_build_object('department',p_department));
  return c;
end $$;
