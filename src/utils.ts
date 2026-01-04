// Extended Chinese character range including:
// - CJK Unified Ideographs: \u4e00-\u9fff
const CJK_UNIFIED = /[\u4e00-\u9fff]/;
// - CJK Extension A: \u3400-\u4dbf
const CJK_EXT_A = /[\u3400-\u4dbf]/;
// - CJK Compatibility Ideographs: \uF900-\uFAFF
const CJK_COMPAT = /[\uF900-\uFAFF]/;
// - CJK Extension B-F: \u{20000}-\u{2CEAF}
const CJK_EXT_BF = /[\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}]/u;

// Combined pattern for all Chinese characters
const chsPattern = new RegExp(
  `${CJK_UNIFIED.source}|${CJK_EXT_A.source}|${CJK_COMPAT.source}|${CJK_EXT_BF.source}`,
  "u"
);
export const chsPatternGlobal = new RegExp(chsPattern, "gu");

// Pattern for non-Chinese Latin characters (including French, Spanish, etc.)
// Covers basic Latin (a-z, A-Z) and Latin Extended (À-ÿ) for accented characters
const nonChsLatinPattern = /[a-zA-ZÀ-ÿ]/;

// Pattern for non-Chinese Cyrillic characters
const nonChsCyrillicPattern = /[\u0400-\u04FF]/;

/**
 * Check if a string contains Chinese characters
 * @param str - The string to check
 * @returns true if the string contains Chinese characters and no non-Chinese characters
 */
export const isChs = (str: string) => {
  // Must contain Chinese characters
  if (!chsPattern.test(str)) {
    return false;
  }
  // Must not contain non-Chinese Latin or Cyrillic characters
  if (nonChsLatinPattern.test(str) || nonChsCyrillicPattern.test(str)) {
    return false;
  }
  return true;
};
