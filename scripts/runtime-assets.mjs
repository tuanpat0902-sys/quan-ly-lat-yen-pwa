// Root runtime policy: production only contains maintained ly-*.js modules.
// Legacy chat experiments were removed from the repository in Ver 2.1.75.
export const UNUSED_ROOT_RUNTIME_FILES=new Set();

export function isProductionRootRuntime(file){
  return /^ly-.*\.js$/.test(String(file||''))&&!UNUSED_ROOT_RUNTIME_FILES.has(file);
}
