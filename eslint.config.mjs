import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Pages (src/app) can call server actions but must NOT import Prisma directly
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@prisma/client"], message: "UI no puede importar Prisma directamente. Usa server actions." },
        ]
      }]
    }
  },
  {
    // lib/ must not import Prisma nor anything from server/
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@prisma/client"], message: "lib no puede importar Prisma directamente. Usa server actions." },
          { group: ["**/server/**"], message: "lib no puede importar desde server/. Usa server actions." },
        ]
      }]
    }
  }
];

export default eslintConfig;
