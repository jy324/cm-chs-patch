import { debounce, PluginSettingTab, Setting } from "obsidian";
import type CMChsPatch from "./chsp-main";

type TextAreaSize = Partial<Record<"cols" | "rows", number>>;

export interface ChsPatchSetting {
  useJieba: boolean;
  hmm: boolean;
  dict: string;
  moveByChineseWords: boolean;
  moveTillChinesePunctuation: boolean;
  chsRangeLimit: number;
  maxIterations: number;
}

export const DEFAULT_SETTINGS: ChsPatchSetting = {
  useJieba: false,
  hmm: false,
  dict: "",
  moveByChineseWords: true,
  moveTillChinesePunctuation: true,
  chsRangeLimit: 10,
  maxIterations: 1000,
};

type SettingKeyWithType<T> = {
  [K in keyof ChsPatchSetting]: ChsPatchSetting[K] extends T ? K : never;
}[keyof ChsPatchSetting];

export class ChsPatchSettingTab extends PluginSettingTab {
  constructor(public plugin: CMChsPatch) {
    super(plugin.app, plugin);
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    this.addToggle(containerEl, "useJieba")
      .setName("使用结巴分词")
      .setDesc("支持新词发现、自定义词典，需要额外下载，重启 Obsidian 生效");

    if (this.plugin.settings.useJieba || !(window.Intl as any)?.Segmenter) {
      this.addToggle(containerEl, "hmm")
        .setName("新词发现功能")
        .setDesc(
          "采用基于汉字成词能力的 HMM 模型，使用 Viterbi 算法推算未存在于词库内的词。若效果不理想，可选择关闭此选项",
        );
      // TODO: 增加添加词的界面、导入词库文件
      this.addTextField(
        containerEl,
        { get: "dict", set: "dict" },
        { cols: 30, rows: 5 },
      )
        .setName("用户自定义词典")
        .setDesc(
          createFragment((el) => {
            el.appendText("通过用户自定义词典来增强歧义纠错能力");
            el.createEl("br");
            el.appendText(
              "词典格式：一个词占一行；每一行分三部分：词语、词频（可省略）、词性（可省略），用空格隔开，顺序不可颠倒",
            );
            el.createEl("br");
            el.appendText("按下按钮生效");
          }),
        )
        .addButton((btn) =>
          btn
            .setIcon("reset")
            .setTooltip("重新加载词典")
            .onClick(async () => {
              await this.app.plugins.disablePlugin(this.plugin.manifest.id);
              await this.app.plugins.enablePlugin(this.plugin.manifest.id);
              this.app.setting.openTabById(this.plugin.manifest.id);
            }),
        );
    }

    if (
      (this.plugin.settings.useJieba || (window.Intl as any)?.Segmenter) &&
      this.app.vault.getConfig("vimMode") == true
    ) {
      this.addToggle(containerEl, "moveByChineseWords")
        .setName("【Vim Mode】使用结巴分词移动光标")
        .setDesc(
          "Motion w/e/b/ge 使用结巴分词移动光标 in Vim Normal Mode, 重启Obsidian生效",
        );

      this.addToggle(containerEl, "moveTillChinesePunctuation")
        .setName("【Vim Mode】f/t<character> 支持输入英文标点跳转到中文标点")
        .setDesc(
          "Motion f/t<character> 支持输入英文标点跳转到中文标点 in Vim Normal Mode, 重启Obsidian生效",
        );
    }

    new Setting(containerEl)
      .setName("高级设置")
      .setHeading();

    new Setting(containerEl)
      .setName("中文范围限制")
      .setDesc("限制分词时扫描的中文字符数量，默认为 10。增加此值可以提高长文本的分词准确度，但可能影响性能。")
      .addText((text) =>
        text
          .setPlaceholder("10")
          .setValue(String(this.plugin.settings.chsRangeLimit))
          .onChange(async (value) => {
            const numValue = parseInt(value, 10);
            if (!isNaN(numValue) && numValue > 0) {
              this.plugin.settings.chsRangeLimit = numValue;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("最大迭代次数")
      .setDesc("防止无限循环的安全限制，默认为 1000。如果遇到特殊字符导致卡死的问题，保持此默认值即可。")
      .addText((text) =>
        text
          .setPlaceholder("1000")
          .setValue(String(this.plugin.settings.maxIterations))
          .onChange(async (value) => {
            const numValue = parseInt(value, 10);
            if (!isNaN(numValue) && numValue > 0) {
              this.plugin.settings.maxIterations = numValue;
              await this.plugin.saveSettings();
            }
          })
      );
  }

  addToggle(addTo: HTMLElement, key: SettingKeyWithType<boolean>): Setting {
    return new Setting(addTo).addToggle((toggle) => {
      toggle.setValue(this.plugin.settings[key]).onChange((value) => {
        this.plugin.settings[key] = value;
        this.plugin.saveSettings();
        if (key == "useJieba") {
          this.display();
        }
      });
    });
  }
  addTextField(
    addTo: HTMLElement,
    key: {
      get: SettingKeyWithType<string> | (() => string);
      set: SettingKeyWithType<string> | ((value: string) => void);
    },
    size: TextAreaSize = {},
    timeout = 500,
  ): Setting {
    return new Setting(addTo).addTextArea((text) => {
      const { get, set } = key;
      const getter =
        typeof get === "function" ? get : () => this.plugin.settings[get],
        setter =
          typeof set === "function"
            ? set
            : (value: string) => (this.plugin.settings[set] = value);
      const onChange = async (value: string) => {
        setter(value);
        await this.plugin.saveSettings();
      };
      text.setValue(getter()).onChange(debounce(onChange, timeout, true));
      Object.assign(text.inputEl, { cols: 30, rows: 5, ...size });
    });
  }
}
