 
 
import "obsidian";

declare module "obsidian" {
  interface App {
    plugins: {
      enablePlugin(id: string): Promise<void>;
      disablePlugin(id: string): Promise<void>;
    };
    setting: {
      openTabById(id: string): any;
    };
  }
  interface Vault {
    getConfig(key: string): unknown;
  }
}

declare global {
  var CodeMirrorAdapter: any;
}

declare module "*.wasm" {
  const content: Uint8Array;
  export default content;
}
