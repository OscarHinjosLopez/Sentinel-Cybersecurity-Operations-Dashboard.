import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const stats = JSON.parse(
  await readFile(process.argv[2] ?? 'dist/sentinel/browser-stats.json', 'utf8'),
);
const outputs = stats.outputs;
const entry = (source) => Object.keys(outputs).find((file) => outputs[file].entryPoint === source);
const initial = new Set();
function visit(file) {
  if (!outputs[file] || initial.has(file)) return;
  initial.add(file);
  for (const dependency of outputs[file].imports) {
    if (dependency.kind !== 'dynamic-import') visit(dependency.path);
  }
}
visit(entry('src/main.ts'));
visit(entry('angular:styles/global:styles'));
const failures = [];
// Component-style outputs in the builder's metafile are virtual: their CSS is inlined in JS.
const chunks = await Promise.all(
  Object.entries(outputs)
    .filter(
      ([file, output]) =>
        file.endsWith('.js') || output.entryPoint === 'angular:styles/global:styles',
    )
    .map(async ([file, output]) => ({
      file,
      entryPoint: output.entryPoint ?? null,
      initial: initial.has(file),
      rawBytes: output.bytes,
      gzipBytes: gzipSync(await readFile(`dist/sentinel/browser/${file}`)).length,
    })),
);
const limits = {
  'src/app/features/auth/login/login.ts': 16000,
  'src/app/layout/shell/shell.ts': 100000,
  'src/app/features/dashboard/dashboard.ts': 30000,
  'src/app/features/threats/threats.ts': 25000,
  'src/app/features/devices/devices.ts': 27000,
  'src/app/features/settings/settings.ts': 40000,
  'src/app/features/audit/audit.ts': 5000,
  'src/app/features/dashboard/ui/dashboard-chart.ts': 600000,
};
for (const [source, limit] of Object.entries(limits)) {
  const file = entry(source);
  if (!file) {
    failures.push(`Missing lazy entry: ${source}`);
    continue;
  }
  if (initial.has(file)) failures.push(`Feature moved into bootstrap: ${source}`);
  if (outputs[file].bytes > limit)
    failures.push(`${source}: ${outputs[file].bytes} bytes exceeds ${limit}`);
}
for (const [file, output] of Object.entries(outputs)) {
  for (const [source, contribution] of Object.entries(output.inputs)) {
    if (!contribution.bytesInOutput) continue;
    if (
      /node_modules\/(?:@playwright|playwright|vitest|@vitest|axe-core|@axe-core)\//.test(source) ||
      /src\/testing\//.test(source) ||
      /\.(?:spec|test-fixtures)\.ts$/.test(source)
    ) {
      failures.push(`Test code in production: ${source}`);
    }
    if (initial.has(file) && /node_modules\/(?:echarts|zrender)\//.test(source)) {
      failures.push(`Chart engine in bootstrap: ${source}`);
    }
    if (
      /echarts\/lib\/(?:chart\/(?:map|graph|sankey|scatter)\/.*install|renderer\/installCanvasRenderer)\.js$/.test(
        source,
      )
    ) {
      failures.push(`Unused chart registration: ${source}`);
    }
  }
}
const initialRawBytes = chunks
  .filter((chunk) => chunk.initial)
  .reduce((total, chunk) => total + chunk.rawBytes, 0);
const initialGzipBytes = chunks
  .filter((chunk) => chunk.initial)
  .reduce((total, chunk) => total + chunk.gzipBytes, 0);
await writeFile(
  'dist/sentinel/bundle-report.json',
  JSON.stringify({ initialRawBytes, initialGzipBytes, limits, chunks }, null, 2),
);
console.info(
  `Initial: ${(initialRawBytes / 1000).toFixed(2)} kB raw / ${(initialGzipBytes / 1000).toFixed(2)} kB gzip`,
);
for (const chunk of chunks.filter((chunk) => chunk.entryPoint && limits[chunk.entryPoint]))
  console.info(
    `${chunk.entryPoint}: ${(chunk.rawBytes / 1000).toFixed(2)} kB raw / ${(chunk.gzipBytes / 1000).toFixed(2)} kB gzip`,
  );
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
