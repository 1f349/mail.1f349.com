import {defineConfig} from "vite";
import {svelte} from "@sveltejs/vite-plugin-svelte";
import {exec} from "child_process";
import {promisify} from "util";

// Get current tag/commit and last commit date from git
const pexec = promisify(exec);
let [version, lastmod] = (
  await Promise.allSettled([
    pexec("git describe --tags || git rev-parse --short HEAD"),
    pexec('git log -1 --format=%cd --date=format:"%Y-%m-%d %H:%M"'),
  ])
).map(v => (v as {value?: {stdout: string}}).value?.stdout.trim());

process.env.VITE_APP_VERSION = version;
process.env.VITE_APP_LASTMOD = lastmod;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
});
