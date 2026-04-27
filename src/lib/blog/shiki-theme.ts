import type { ThemeRegistrationRaw } from "shiki";

const BG = "#14141a";
const FG = "#e8e3d4";
const COMMENT = "#8a8273";
const KEYWORD = "#f5a3b0";
const STRING = "#b8d27a";
const NUMBER = "#8ec5e8";
const FUNCTION = "#e6a4d8";
const TYPE = "#7fd4cf";
const CONSTANT = "#f0b173";
const PUNCT = "#aea592";

const themeRaw = {
  name: "archive-dark",
  type: "dark",
  colors: {
    "editor.foreground": FG,
    "editor.background": BG
  },
  tokenColors: [
    { settings: { foreground: FG, background: BG } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: COMMENT, fontStyle: "italic" } },
    { scope: ["string", "string.quoted", "string.template", "meta.string"], settings: { foreground: STRING } },
    { scope: ["punctuation.definition.string"], settings: { foreground: STRING } },
    { scope: ["constant.numeric", "constant.language"], settings: { foreground: NUMBER } },
    { scope: ["constant.character", "constant.other"], settings: { foreground: CONSTANT } },
    { scope: ["keyword", "keyword.control", "keyword.operator.new", "keyword.operator.expression", "storage", "storage.type", "storage.modifier"], settings: { foreground: KEYWORD, fontStyle: "bold" } },
    { scope: ["keyword.operator"], settings: { foreground: PUNCT } },
    { scope: ["punctuation", "meta.brace", "meta.bracket", "meta.delimiter"], settings: { foreground: PUNCT } },
    { scope: ["entity.name.function", "support.function", "meta.function-call entity.name.function", "meta.function entity.name.function"], settings: { foreground: FUNCTION } },
    { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class"], settings: { foreground: TYPE } },
    { scope: ["variable", "variable.other", "variable.parameter", "meta.parameter"], settings: { foreground: FG } },
    { scope: ["variable.language", "variable.language.this", "variable.language.self"], settings: { foreground: KEYWORD, fontStyle: "italic" } },
    { scope: ["entity.name.tag", "punctuation.definition.tag"], settings: { foreground: KEYWORD } },
    { scope: ["entity.other.attribute-name"], settings: { foreground: FUNCTION } },
    { scope: ["meta.import", "meta.export"], settings: { foreground: FG } },
    { scope: ["markup.heading", "entity.name.section"], settings: { foreground: KEYWORD, fontStyle: "bold" } },
    { scope: ["markup.bold"], settings: { fontStyle: "bold" } },
    { scope: ["markup.italic"], settings: { fontStyle: "italic" } },
    { scope: ["markup.inline.raw", "markup.fenced_code"], settings: { foreground: STRING } },
    { scope: ["invalid", "invalid.illegal"], settings: { foreground: "#ff6b6b" } }
  ]
};

export const archiveDark = themeRaw as unknown as ThemeRegistrationRaw;
