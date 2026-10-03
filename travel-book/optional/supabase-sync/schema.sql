-- Travel Book Template · 可选的跨设备待办同步
-- 在自己的 Supabase 项目里，进 SQL Editor 整段粘贴执行一次即可。

create table if not exists todo_items (
  id text primary key,                      -- 'preset:<data-id>' 或 'custom:<随机串>'
  trip_id text not null,                    -- 对应 template/index.html 里 SYNC.tripId
  kind text not null default 'custom',      -- 'preset'（预设待办的勾选状态）| 'custom'（朋友自己加的）
  text text,                                -- custom 才用得到；preset 的文字写在页面 HTML 里，这里不存
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists todo_items_trip_id_idx on todo_items (trip_id);

alter table todo_items enable row level security;

-- 简化处理：同一个 trip_id 下的人互相信任，谁都能读/加/改/删。
-- 想收紧权限（比如只允许 delete 自己加的那条），按需改写下面的策略。
drop policy if exists "todo_items anyone select" on todo_items;
create policy "todo_items anyone select" on todo_items for select using (true);

drop policy if exists "todo_items anyone insert" on todo_items;
create policy "todo_items anyone insert" on todo_items for insert with check (true);

drop policy if exists "todo_items anyone update" on todo_items;
create policy "todo_items anyone update" on todo_items for update using (true);

drop policy if exists "todo_items anyone delete" on todo_items;
create policy "todo_items anyone delete" on todo_items for delete using (true);

-- 打开 Realtime：Supabase Dashboard → Database → Replication，把 todo_items 这张表的开关打开，
-- 或者执行下面这行（项目已开启 supabase_realtime publication 的情况下）：
alter publication supabase_realtime add table todo_items;
