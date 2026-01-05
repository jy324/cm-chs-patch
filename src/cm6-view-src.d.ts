// Type declarations for cm6-view-src
// This is an internal dependency pulled from GitHub tarball
// Types are not strictly needed as esbuild resolves these at build time

declare module "cm6-view-src/src/blockview" {
	import { ContentView } from "@codemirror/view";
	export class LineView extends ContentView {
		static find(docView: any, pos: number): LineView | null;
		posAtStart: number;
		length: number;
		coordsAt(off: number, side: number): { top: number; bottom: number; left: number; right: number } | null;
	}
}

declare module "cm6-view-src/src/dom" {
	export interface Rect {
		top: number;
		bottom: number;
		left: number;
		right: number;
	}
}

declare module "cm6-view-src/src/cursor" {
	export function groupAt(state: any, pos: number, bias: number): { from: number; to: number };
}
