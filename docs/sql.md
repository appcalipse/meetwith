# SQL Scripts

The sql directory contains custom sql scripts for creating sql functions leveraged with supabase functions.

```ts
const { data, error } = await db.supabase.rpc<TgConnectedAccounts>(
  'function_name_*'
)
```
