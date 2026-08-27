export const UNUSED_ROOT_RUNTIME_FILES=new Set([
  'ly-chat-command-normalizer.js',
  'ly-chat-command-normalizer-v2.js',
  'ly-chat-command-normalizer-v3.js',
  'ly-chat-multi-item-normalizer.js',
  'ly-chat-unit-normalizer.js',
  'ly-chat-stock-command-normalizer.js',
  'ly-chat-stock-command-normalizer-v4.js',
  'ly-chat-stock-core-v5.js',
  'ly-chat-stock-submit-gate.js',
  'ly-chat-submit-controller-v6.js'
]);

export function isProductionRootRuntime(file){
  return /^ly-.*\.js$/.test(String(file||''))&&!UNUSED_ROOT_RUNTIME_FILES.has(file);
}
