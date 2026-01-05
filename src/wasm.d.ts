declare module "*.wasm" {
  const wasm: string | ArrayBuffer | WebAssembly.Module;
  export default wasm;
}
