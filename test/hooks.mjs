// Rozlišení importů pro `node --test`: doplní příponu .ts/.tsx a přeloží
// alias "@/..." na složku src/. Díky tomu jdou testy spouštět rovnou nad
// zdrojovými soubory, bez build kroku a bez další závislosti.

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSIONS = [".ts", ".tsx", "/index.ts"];

export async function resolve(specifier, context, nextResolve) {
  let target = specifier;
  if (target.startsWith("@/")) {
    target = pathToFileURL(join(root, "src", target.slice(2))).href;
  }
  try {
    return await nextResolve(target, context);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
    for (const extension of EXTENSIONS) {
      try {
        return await nextResolve(target + extension, context);
      } catch {
        // zkusíme další příponu
      }
    }
    throw error;
  }
}
