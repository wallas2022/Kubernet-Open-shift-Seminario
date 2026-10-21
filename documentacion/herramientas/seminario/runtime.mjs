import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
export async function load_workspace_dependencies() {
  const root=process.env.CODEX_PRIMARY_RUNTIME_ROOT || path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime');
  const manifest=JSON.parse(await fs.readFile(path.join(root,'runtime.json'),'utf8'));
  const runtime={root,version:manifest.bundleVersion,node:path.join(root,'dependencies/node/bin/node.exe'),nodeModules:path.join(root,'dependencies/node/node_modules'),python:path.join(root,'dependencies/python/python.exe'),bin:path.join(root,'dependencies/bin'),skill:path.join(root,'plugins/openai-primary-runtime/plugins/presentations/skills/presentations')};
  for(const key of ['node','nodeModules','python','bin','skill'])await fs.access(runtime[key]);
  for(const [key,value] of Object.entries({RUNTIME_NODE:runtime.node,RUNTIME_NODE_MODULES:runtime.nodeModules,RUNTIME_PYTHON:runtime.python,RUNTIME_BIN_DIR:runtime.bin})) process.env[key]=value;
  return runtime;
}
