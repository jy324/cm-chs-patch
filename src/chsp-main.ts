import { Platform, Plugin } from "obsidian";

import { VimPatcher } from "./chsp-vim.js";
import setupCM6 from "./cm6";
import GoToDownloadModal from "./install-guide";
import { cut, cutForSearch, initJieba } from "./jieba";
import { ChsPatchSettingTab, DEFAULT_SETTINGS } from "./settings";
import { chsPatternGlobal, isChs } from "./utils.js";

// Special repeat characters that may cause issues
const SPECIAL_REPEAT_CHARS = /[々〻ゝゞヽヾ]/;

const userDataDir = Platform.isDesktopApp
  ? // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("@electron/remote").app.getPath("userData")
  : null;

export default class CMChsPatch extends Plugin {
  libName = "jieba_rs_wasm_bg.wasm";
  async loadLib(): Promise<ArrayBuffer | null> {
    if (userDataDir) {
      const { readFile } =
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/consistent-type-imports
        require("fs/promises") as typeof import("fs/promises");
      // read file to arraybuffer in nodejs
      try {
        const buf = await readFile(this.libPath);
        return buf;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") {
          return null;
        }
        throw e;
      }
    } else {
      if (!(await app.vault.adapter.exists(this.libPath, true))) {
        return null;
      }
      const buf = await app.vault.adapter.readBinary(this.libPath);
      return buf;
    }
  }
  async libExists(): Promise<boolean> {
    if (userDataDir) {
      const { access } =
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/consistent-type-imports
        require("fs/promises") as typeof import("fs/promises");
      try {
        await access(this.libPath);
        return true;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") {
          return false;
        }
        throw e;
      }
    } else {
      return await app.vault.adapter.exists(this.libPath, true);
    }
  }
  async saveLib(ab: ArrayBuffer): Promise<void> {
    if (userDataDir) {
      const { writeFile } =
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/consistent-type-imports
        require("fs/promises") as typeof import("fs/promises");
      await writeFile(this.libPath, Buffer.from(ab));
    } else {
      await app.vault.adapter.writeBinary(this.libPath, ab);
    }
  }
  get libPath(): string {
    if (userDataDir) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/consistent-type-imports
      const { join } = require("path") as typeof import("path");
      return join(userDataDir, this.libName);
    } else {
      return [app.vault.configDir, this.libName].join("/");
    }
  }

  async onload() {
    this.addSettingTab(new ChsPatchSettingTab(this));

    await this.loadSettings();

    if (await this.loadSegmenter()) {
      setupCM6(this);
      console.info("editor word splitting patched");
    }
    this.addChild(new VimPatcher(this));
  }

  settings = DEFAULT_SETTINGS;

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  segmenter?: Intl.Segmenter;

  async loadSegmenter(): Promise<boolean> {
    if (!this.settings.useJieba && window.Intl?.Segmenter) {
      this.segmenter = new Intl.Segmenter("zh-CN", {
        granularity: "word",
      });
      console.info("window.Intl.Segmenter loaded");
      return true;
    }

    const jiebaBinary = await this.loadLib();
    if (!jiebaBinary) {
      new GoToDownloadModal(this).open();
      return false;
    }
    await initJieba(jiebaBinary, this.settings.dict);
    console.info("Jieba loaded");
    return true;
  }

  /**
   * Cut text into segments using configured segmenter (Jieba or Intl.Segmenter)
   * @param text - The text to segment
   * @param options - Options for segmentation
   * @param options.search - If true, uses cutForSearch mode for better search results
   * @returns Array of text segments
   */
  cut(text: string, { search = false }: { search?: boolean } = {}): string[] {
    // Input validation
    if (!text || text.length === 0) {
      return [];
    }
    
    try {
      if (!this.settings.useJieba && this.segmenter) {
        return Array.from(this.segmenter.segment(text)).map((seg) => seg.segment);
      }
      if (search) {
        return cutForSearch(text, this.settings.hmm);
      }
      return cut(text, this.settings.hmm);
    } catch (error) {
      console.error('Error in cut:', error);
      // Return fallback: split by characters
      return text.split('');
    }
  }

  /**
   * Get the segment range at the cursor position
   * @param cursor - The cursor position
   * @param params - Text range parameters
   * @param params.from - Start position of the range
   * @param params.to - End position of the range
   * @param params.text - The text content
   * @returns Range object with from and to positions, or null if not a Chinese text
   */
  getSegRangeFromCursor(
    cursor: number,
    { from, to, text }: { from: number; to: number; text: string },
  ) {
    // Boundary checks
    if (!text || text.length === 0) {
      return null;
    }
    if (cursor < from || cursor > to) {
      return null;
    }
    
    const chsRangeLimit = this.settings.chsRangeLimit;
    
    if (!isChs(text)) {
      // 匹配中文字符
      return null;
    } else {
      // trim long text
      if (cursor - from > chsRangeLimit) {
        const newFrom = cursor - chsRangeLimit;
        if (isChs(text.slice(newFrom, cursor))) {
          // 英文单词超过 RANGE_LIMIT 被截断，不执行截断优化策略
          text = text.slice(newFrom - from);
          from = newFrom;
        }
      }
      if (to - cursor > chsRangeLimit) {
        const newTo = cursor + chsRangeLimit;
        if (isChs(text.slice(cursor, newTo))) {
          // 英文单词超过 RANGE_LIMIT 被截断，不执行截断优化策略
          text = text.slice(0, newTo - to);
          to = newTo;
        }
      }
      
      try {
        const segResult = this.cut(text);

        if (cursor === to) {
          const lastSeg = segResult.last()!;
          return { from: to - lastSeg.length, to };
        }

        let chunkStart = 0,
          chunkEnd = 0;
        const relativePos = cursor - from;

        for (const seg of segResult) {
          chunkEnd = chunkStart + seg.length;
          if (relativePos >= chunkStart && relativePos < chunkEnd) {
            break;
          }
          chunkStart += seg.length;
        }
        to = chunkEnd + from;
        from += chunkStart;
        return { from, to };
      } catch (error) {
        console.error('Error in getSegRangeFromCursor:', error);
        return null;
      }
    }
  }

  /**
   * Get the destination position for a segment-based movement
   * Used by Vim mode for Chinese word navigation
   * @param startPos - The starting position
   * @param nextPos - The target position (determines direction)
   * @param sliceDoc - Function to slice document text between two positions
   * @returns The destination position, or null if movement is not possible
   */
  getSegDestFromGroup(
    startPos: number,
    nextPos: number,
    sliceDoc: (from: number, to: number) => string,
  ): number | null {
    try {
      const forward = startPos < nextPos;
      const text = this.limitChsChars(
        forward ? sliceDoc(startPos, nextPos) : sliceDoc(nextPos, startPos),
        forward,
      );
      
      // Safety check: prevent processing if text contains special repeat characters
      if (SPECIAL_REPEAT_CHARS.test(text)) {
        // For special characters, return a safe single-character movement
        // Validate bounds to ensure position is valid
        const newPos = forward ? startPos + 1 : startPos - 1;
        // Return null if new position would be invalid (let default handler take over)
        if (forward ? newPos > nextPos : newPos < nextPos) {
          return null;
        }
        return newPos;
      }
      
      const segResult = this.cut(text);
      if (segResult.length === 0) return null;

      let length = 0;
      let seg: string | undefined;
      let iterations = 0;
      const maxIterations = this.settings.maxIterations;
      do {
        // Check if we've exceeded max iterations
        if (iterations++ >= maxIterations) {
          console.warn('Maximum iterations reached in getSegDestFromGroup');
          return null;
        }
        // Check if array is empty before shifting/popping
        if (segResult.length === 0) {
          break;
        }
        seg = forward ? segResult.shift() : segResult.pop();
        if (seg) {
          length += seg.length;
        }
      } while (seg && /\s+/.test(seg));

      return forward ? startPos + length : startPos - length;
    } catch (error) {
      console.error('Error in getSegDestFromGroup:', error);
      return null;
    }
  }

  /**
   * Limit the number of Chinese characters in the input string
   * This prevents processing very long text which could impact performance
   * @param input - The input string to limit
   * @param forward - If true, limit from start; if false, limit from end
   * @returns Limited string with at most chsRangeLimit Chinese characters
   */
  private limitChsChars(input: string, forward: boolean): string {
    // Safety check for empty or invalid input
    if (!input || input.length === 0) {
      return "";
    }
    
    // Safety check for special repeat characters
    if (SPECIAL_REPEAT_CHARS.test(input)) {
      // Limit to a single character to avoid issues
      return forward ? input.charAt(0) : input.charAt(input.length - 1);
    }
    
    if (!forward) {
      input = [...input].reverse().join("");
    }
    let endingIndex = input.length - 1;
    let chsCount = 0;
    let iterations = 0;
    const maxIterations = this.settings.maxIterations;
    const chsRangeLimit = this.settings.chsRangeLimit;
    
    for (const { index } of input.matchAll(chsPatternGlobal)) {
      // Iteration protection
      if (iterations++ >= maxIterations) {
        console.warn('Maximum iterations reached in limitChsChars');
        break;
      }
      chsCount++;
      endingIndex = index;
      if (chsCount > chsRangeLimit) break;
    }
    const output = input.slice(0, endingIndex + 1);
    if (!forward) {
      return [...output].reverse().join("");
    }
    return output;
  }
}
