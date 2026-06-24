-- Migration: Resolve staff shift dynamically from assignments instead of staff.shift_id
-- We deprecate staff.shift_id, so submit_qr_attendance must look up daily/weekly assignments.

DROP FUNCTION IF EXISTS public.submit_qr_attendance(text, text, double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION public.submit_qr_attendance(p_code text, p_credential text, p_latitude double precision, p_longitude double precision, p_accuracy double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  v_today date := (timezone('Asia/Jakarta', now()))::date;
  v_now timestamp without time zone := timezone('Asia/Jakarta', now())::timestamp;
  v_current_time time := (timezone('Asia/Jakarta', now()))::time;

  v_code public.presence_code%rowtype;
  v_store public.store_settings%rowtype;
  v_staff public.staff%rowtype;
  v_shift public.shifts%rowtype;
  v_attendance public.attendance%rowtype;

  v_assigned_shift_id uuid;
  v_max_accuracy_meters double precision := 100;
  v_credential text := btrim(coalesce(p_credential, ''));
  v_matched_by text := null;
  v_distance numeric;
  v_check_status text;
  v_status_label text;
  v_status_tone text;
  v_action text;
  v_title text;
  v_message text;
  v_attendance_id uuid;
begin
  if coalesce(btrim(p_code), '') = '' then
    raise exception 'Kode QR tidak ditemukan. Silakan scan QR absensi ulang.';
  end if;

  if v_credential = '' then
    raise exception 'Masukkan Staff ID atau kode login terlebih dahulu.';
  end if;

  if p_latitude is null or p_longitude is null then
    raise exception 'Lokasi tidak dapat diakses. Izinkan lokasi untuk melakukan absensi.';
  end if;

  if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Data lokasi tidak valid. Aktifkan lokasi perangkat lalu coba lagi.';
  end if;

  -- Lock token agar tidak bisa dipakai paralel oleh request spam/double submit.
  select *
  into v_code
  from public.presence_code pc
  where pc.code = btrim(p_code)
  for update;

  if not found
    or v_code.attendance_date <> v_today
    or v_code.is_active is not true
    or v_code.expires_at <= v_now then
    raise exception 'QR sudah expired atau sudah digunakan. Silakan scan QR terbaru.';
  end if;

  select *
  into v_store
  from public.store_settings ss
  where ss.is_active = true
  order by ss.created_at desc
  limit 1;

  if not found then
    raise exception 'Pengaturan lokasi cafe belum tersedia.';
  end if;

  if v_store.store_latitude is null or v_store.store_longitude is null then
    raise exception 'Lokasi cafe belum diatur. Owner perlu mengatur lokasi di menu Presensi.';
  end if;

  if v_store.attendance_radius_meters is null or v_store.attendance_radius_meters <= 0 then
    raise exception 'Radius absensi cafe belum valid. Owner perlu mengatur radius presensi.';
  end if;

  if p_accuracy is null then
    raise exception 'Akurasi lokasi tidak tersedia. Aktifkan mode lokasi akurat lalu coba lagi.';
  end if;

  if p_accuracy > v_max_accuracy_meters then
    raise exception 'Akurasi lokasi belum cukup. Akurasi saat ini sekitar % meter, maksimal % meter.', round(p_accuracy), round(v_max_accuracy_meters);
  end if;

  v_distance := round((
    6371000 * 2 * atan2(
      sqrt(
        power(sin(radians(p_latitude - v_store.store_latitude) / 2), 2) +
        cos(radians(v_store.store_latitude)) *
        cos(radians(p_latitude)) *
        power(sin(radians(p_longitude - v_store.store_longitude) / 2), 2)
      ),
      sqrt(
        1 - (
          power(sin(radians(p_latitude - v_store.store_latitude) / 2), 2) +
          cos(radians(v_store.store_latitude)) *
          cos(radians(p_latitude)) *
          power(sin(radians(p_longitude - v_store.store_longitude) / 2), 2)
        )
      )
    )
  )::numeric, 2);

  if v_distance > v_store.attendance_radius_meters then
    raise exception 'Lokasi Anda di luar radius absensi. Jarak saat ini % meter dari cafe.', round(v_distance);
  end if;

  select *
  into v_staff
  from public.staff s
  where s.staff_code = v_credential
  limit 1;

  if found then
    v_matched_by := 'staff_code';
  else
    select *
    into v_staff
    from public.staff s
    where s.login_code = v_credential
    limit 1;

    if found then
      v_matched_by := 'login_code';
    end if;
  end if;

  if v_matched_by is null then
    raise exception 'Staff ID atau kode login tidak ditemukan.';
  end if;

  if v_staff.status <> 'active' then
    raise exception 'Akun staff tidak aktif dan tidak bisa melakukan absensi.';
  end if;

  if v_matched_by = 'login_code'
    and v_staff.login_code_expires_at is not null
    and v_staff.login_code_expires_at <= v_now then
    raise exception 'Kode login staff sudah expired. Minta generate ulang ke owner.';
  end if;

  -- Resolve active shift dynamically
  -- 1. Try finding daily assignment
  select shift_id into v_assigned_shift_id
  from public.staff_shift_daily_assignments
  where staff_id = v_staff.id
    and work_date = v_today
    and (status = 'assigned' or status is null)
  limit 1;

  -- 2. Try finding weekly assignment
  if v_assigned_shift_id is null then
    select shift_id into v_assigned_shift_id
    from public.staff_shift_weekly_assignments
    where staff_id = v_staff.id
      and weekday = extract(dow from v_today)
      and (status = 'assigned' or status is null)
  limit 1;
  end if;

  if v_assigned_shift_id is null then
    raise exception 'Staff belum memiliki shift. Owner perlu assign shift terlebih dahulu di kalender hari ini.';
  end if;

  select *
  into v_shift
  from public.shifts sh
  where sh.id = v_assigned_shift_id
    and sh.is_active = true
  limit 1;

  if not found then
    raise exception 'Shift staff tidak ditemukan atau sudah tidak aktif.';
  end if;

  select *
  into v_attendance
  from public.attendance a
  where a.staff_id = v_staff.id
    and a.shift_id = v_shift.id
    and a.attendance_date = v_today
  for update;

  if not found then
    -- CLOCK IN LOGIC
    if v_shift.check_in_window_start is null then
      if v_current_time < v_shift.start_time then
        v_check_status := 'early';
        v_status_label := 'Datang Lebih Awal';
        v_status_tone := 'blue';
      elsif v_current_time <= v_shift.check_in_grace_until then
        v_check_status := 'on_time';
        v_status_label := 'Masuk Tepat Waktu';
        v_status_tone := 'green';
      else
        v_check_status := 'late';
        v_status_label := 'Terlambat';
        v_status_tone := 'red';
      end if;
    else
      if not public.is_time_between(v_current_time, v_shift.check_in_window_start, v_shift.end_time) then
        v_check_status := 'out_of_shift';
        v_status_label := 'Di Luar Shift (Awal)';
        v_status_tone := 'gray';
      elsif public.is_time_between(v_current_time, v_shift.check_in_window_start, (v_shift.start_time - interval '1 second')::time) then
        v_check_status := 'early';
        v_status_label := 'Datang Lebih Awal';
        v_status_tone := 'blue';
      elsif public.is_time_between(v_current_time, v_shift.start_time, v_shift.check_in_grace_until) then
        v_check_status := 'on_time';
        v_status_label := 'Masuk Tepat Waktu';
        v_status_tone := 'green';
      else
        v_check_status := 'late';
        v_status_label := 'Terlambat';
        v_status_tone := 'red';
      end if;
    end if;

    insert into public.attendance (
      id,
      staff_id,
      shift_id,
      presence_code_id,
      attendance_date,
      clock_in_at,
      clock_in_latitude,
      clock_in_longitude,
      clock_in_distance_meters,
      clock_in_method,
      check_in_status,
      created_at,
      updated_at
    ) values (
      public.generate_uuid_safe(),
      v_staff.id,
      v_shift.id,
      v_code.id,
      v_today,
      v_now,
      p_latitude,
      p_longitude,
      v_distance,
      'qr',
      v_check_status,
      v_now,
      v_now
    )
    returning id into v_attendance_id;

    v_action := 'clock_in';
    v_title := 'Clock In Berhasil';
    v_message := v_staff.name || ' berhasil clock in untuk ' || v_shift.shift_name || '.';

  elsif v_attendance.clock_in_at is not null and v_attendance.clock_out_at is null then
    -- CLOCK OUT LOGIC
    if v_shift.check_out_window_end is null then
      if v_current_time < v_shift.end_time then
        v_check_status := 'early_leave';
        v_status_label := 'Pulang Lebih Awal';
        v_status_tone := 'orange';
      elsif v_current_time <= v_shift.check_out_grace_until then
        v_check_status := 'on_time';
        v_status_label := 'Pulang Tepat Waktu';
        v_status_tone := 'green';
      else
        v_check_status := 'overtime';
        v_status_label := 'Lembur';
        v_status_tone := 'purple';
      end if;
    else
      if not public.is_time_between(v_current_time, v_shift.start_time, v_shift.check_out_window_end) then
        v_check_status := 'out_of_shift';
        v_status_label := 'Di Luar Shift (Akhir)';
        v_status_tone := 'gray';
      elsif public.is_time_between(v_current_time, v_shift.start_time, (v_shift.end_time - interval '1 second')::time) then
        v_check_status := 'early_leave';
        v_status_label := 'Pulang Lebih Awal';
        v_status_tone := 'orange';
      elsif public.is_time_between(v_current_time, v_shift.end_time, v_shift.check_out_grace_until) then
        v_check_status := 'on_time';
        v_status_label := 'Pulang Tepat Waktu';
        v_status_tone := 'green';
      else
        v_check_status := 'overtime';
        v_status_label := 'Lembur';
        v_status_tone := 'purple';
      end if;
    end if;

    update public.attendance
    set
      presence_code_id = v_code.id,
      clock_out_at = v_now,
      clock_out_latitude = p_latitude,
      clock_out_longitude = p_longitude,
      clock_out_distance_meters = v_distance,
      clock_out_method = 'qr',
      check_out_status = v_check_status,
      updated_at = v_now
    where id = v_attendance.id
      and clock_out_at is null
    returning id into v_attendance_id;

    if v_attendance_id is null then
      raise exception 'Absensi sudah diproses. Silakan refresh dan cek status terbaru.';
    end if;

    v_action := 'clock_out';
    v_title := 'Clock Out Berhasil';
    v_message := v_staff.name || ' berhasil clock out dari ' || v_shift.shift_name || '.';

  else
    v_attendance_id := v_attendance.id;
    v_action := 'complete';
    v_title := 'Absensi Hari Ini Sudah Lengkap';
    v_message := v_staff.name || ' sudah memiliki clock in dan clock out untuk hari ini.';
    v_status_label := 'Selesai';
    v_status_tone := 'green';
  end if;

  update public.presence_code pc
  set
    used_count = coalesce(pc.used_count, 0) + 1,
    is_active = false
  where pc.id = v_code.id;

  if v_action in ('clock_in', 'clock_out') then
    perform public.rotate_presence_code();
  end if;

  return jsonb_build_object(
    'success', true,
    'action', v_action,
    'title', v_title,
    'message', v_message,
    'statusLabel', v_status_label,
    'statusTone', v_status_tone,
    'attendanceId', v_attendance_id,
    'distanceMeters', v_distance,
    'accuracyMeters', p_accuracy
  );
exception
  when unique_violation then
    raise exception 'Absensi sudah tercatat. Silakan refresh dan cek status terbaru.';
end;
$function$
;
