import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { compileMarkdown } from "../lib/markdown-compiler";

const bodyMarkdown = `Misalkan $a, b,$ dan $x$ adalah bilangan real, berlaku teorema-teorema manipulasi nilai mutlak berikut:

* Refleksi Tanda: $$|-a| = |a|$$
* **Perkalian**: $$|ab| = |a||b|$$
* **Pembagian**: $$\\left|\\frac{a}{b}\\right| = \\frac{|a|}{|b|}, \\quad b \\neq 0$$`;

const res = compileMarkdown(bodyMarkdown);
console.log(JSON.stringify(res.ast.blocks, null, 2));
