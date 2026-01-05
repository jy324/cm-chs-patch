import init, {
  add_word,
  cut as jiebaCut,
  cut_for_search as jiebaCutForSearch,
  with_dict,
} from "jieba-wasm/web";

import wasm_data from "./jieba_rs_wasm_bg.wasm";

const vaildateFreq = (freq: string): number | undefined =>
  freq && Number.isInteger(+freq) ? +freq : undefined;
const vaildateTag = (tag: string): keyof typeof vaildTags | undefined =>
  tag && tag in vaildTags ? (tag as any) : undefined;

let initialized = false;

/**
 * Initialize Jieba segmenter with optional custom dictionary
 * @param dict - Optional custom dictionary string, with one word per line
 * @returns Promise that resolves when initialization is complete
 */
export const initJieba = async (
  dict?: string,
) => {
  if (initialized) return;
  const invaildLines = [] as string[];
  await init(wasm_data);
  if (dict) {
    // Try to use with_dict for bulk loading first
    try {
      with_dict(dict);
    } catch {
      // Fallback to individual add_word calls
      for (const line of dict.split(/\r?\n/)) {
        // eg: 集团公司 1297 n
        const [word, freqOrTag, tag] = line.trim().split(/\s+/);
        let f: number | undefined, t: keyof typeof vaildTags | undefined;
        if (!word) {
          invaildLines.push(line);
          continue;
        }
        if (!freqOrTag && !tag) {
          add_word(word);
        } else if ((t = vaildateTag(freqOrTag))) {
          add_word(word, undefined, t);
        } else {
          t = vaildateTag(tag);
          f = vaildateFreq(freqOrTag);
          add_word(word, f, t);
        }
      }
    }
  }
  // initialize jieba.wasm
  jiebaCut("", true);
  initialized = true;
};

/**
 * Cut text into segments using Jieba
 * @param text - The text to segment
 * @param hmm - If true, uses HMM model for unknown word recognition
 * @returns Array of text segments
 * @throws Error if Jieba is not initialized
 */
export const cut = (text: string, hmm = false) => {
  if (!initialized) throw new Error("jieba not loaded");

  // Input validation
  if (!text || text.length === 0) {
    return [];
  }

  try {
    return jiebaCut(text, hmm);
  } catch (error) {
    console.error('Error in jieba cut:', error);
    // Return fallback: split by characters
    return text.split('');
  }
};

/**
 * Cut text into segments optimized for search
 * Generates more fine-grained segments for better search matching
 * @param text - The text to segment
 * @param hmm - If true, uses HMM model for unknown word recognition
 * @returns Array of text segments
 * @throws Error if Jieba is not initialized
 */
export const cutForSearch = (text: string, hmm = false) => {
  if (!initialized) throw new Error("jieba not loaded");

  // Input validation
  if (!text || text.length === 0) {
    return [];
  }

  try {
    return jiebaCutForSearch(text, hmm);
  } catch (error) {
    console.error('Error in jieba cutForSearch:', error);
    // Return fallback: split by characters
    return text.split('');
  }
};

const vaildTags = {
  n: undefined, // 普通名词
  f: undefined, // 方位名词
  s: undefined, // 处所名词
  t: undefined, // 时间
  nr: undefined, // 人名
  ns: undefined, // 地名
  nt: undefined, // 机构名
  nw: undefined, // 作品名
  nz: undefined, // 其他专名
  v: undefined, // 普通动词
  vd: undefined, // 动副词
  vn: undefined, // 名动词
  a: undefined, // 形容词
  ad: undefined, // 副形词
  an: undefined, // 名形词
  d: undefined, // 副词
  m: undefined, // 数量词
  q: undefined, // 量词
  r: undefined, // 代词
  p: undefined, // 介词
  c: undefined, // 连词
  u: undefined, // 助词
  xc: undefined, // 其他虚词
  w: undefined, // 标点符号
  PER: undefined, // 人名
  LOC: undefined, // 地名
  ORG: undefined, // 机构名
  TIME: undefined, // 时间
};
