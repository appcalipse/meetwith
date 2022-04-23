# Module Alias

We do have module alias configured in order to avoid relative imports hell. The idea is pretty simple, instead of having this:

`import { formatName } from '../../helpers/format-name'`

We now use this:

`import { formatName } from '@/helpers/format-name'`

Where `@/` denotes the `src` folder. That way you can choose when to use relative imports, or absolute imports.

## References

If you want a better understanding on how module alias are configured here, please take a look at:

- tsconfig.json
- package.json
- jest.config.js

Everyone of these files has a configuration section related to the module alias setup.
