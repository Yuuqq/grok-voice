create table if not exists tts_rate_limits (
  user_id text not null,
  window_start timestamp not null,
  request_count integer not null,
  primary key (user_id, window_start)
);
