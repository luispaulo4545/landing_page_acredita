insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where email = 'luis.lspco@gmail.com'
on conflict (id) do update
set role = 'admin',
    email = excluded.email;
