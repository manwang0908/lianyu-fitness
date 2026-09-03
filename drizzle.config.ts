import { defineConfig } from 'drizzle-kit';
export default defineConfig({schema:'./db/schema.ts',out:'./.openai/drizzle',dialect:'sqlite'});
