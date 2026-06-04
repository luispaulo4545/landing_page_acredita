select
  users.id,
  users.email,
  users.email_confirmed_at is not null as email_confirmed,
  profiles.role
from auth.users
left join public.profiles
  on profiles.id = users.id
where lower(users.email) = lower('luis.lspco@gmail.com');
