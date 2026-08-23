import { dirname, join, resolve } from "node:path"
import process from "node:process"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)
const expectedLegacySymbolCount = 204
const requiredNativeDeclarations = ["FunctionBulkCreateInput", "FunctionBulkPatchInput"]
const forbiddenBrowserDeclarations = [
  "ExecutePublicServerFunctionResponse",
  "GetPublicServerFunctionExecutionOptions",
  "GetPublicServerFunctionExecutionResponse",
  "LoginOptions",
  "LoginResponse",
  "MitraInstance",
  "createMitraInstance",
  "exchangeSsoCodeMitra",
  "executePublicServerFunctionMitra",
  "getConfig",
  "getPublicServerFunctionExecutionMitra",
  "loginMitra",
  "loginWithGoogleMitra",
  "loginWithMicrosoftMitra",
  "refreshTokenSilently",
]

function packageDeclaration(packageName) {
  const entry = require.resolve(packageName)
  return join(resolve(dirname(entry), ".."), "dist", "index.d.ts")
}

function moduleExports(filePaths) {
  const program = ts.createProgram(filePaths, {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
  })
  const checker = program.getTypeChecker()
  const exportsByFile = new Map()

  for (const filePath of filePaths) {
    const source = program.getSourceFile(filePath)
    const moduleSymbol = source ? checker.getSymbolAtLocation(source) : undefined
    if (!source || !moduleSymbol) throw new Error(`Cannot inspect declarations in ${filePath}`)
    exportsByFile.set(
      filePath,
      new Set(checker.getExportsOfModule(moduleSymbol).map((symbol) => symbol.getName())),
    )
  }

  return exportsByFile
}

const legacyPaths = [packageDeclaration("mitra-sdk")]
const legacyExports = moduleExports(legacyPaths)
const expected = new Set(legacyPaths.flatMap((path) => [...legacyExports.get(path)]))

if (expected.size !== expectedLegacySymbolCount) {
  throw new Error(
    `Pinned legacy declaration union changed: expected ${expectedLegacySymbolCount}, found ${expected.size}`,
  )
}

const declarationPaths = ["index.d.ts", "index.d.cts"].map((filename) => resolve("dist", filename))
const actualExports = moduleExports(declarationPaths)

for (const declarationPath of declarationPaths) {
  const actual = actualExports.get(declarationPath)
  const missing = [...expected].filter((symbol) => !actual.has(symbol)).sort()
  if (missing.length > 0) {
    throw new Error(
      `${declarationPath} is missing ${missing.length} of ${expected.size} legacy declarations: ` +
        missing.join(", "),
    )
  }

  const missingNative = requiredNativeDeclarations.filter((symbol) => !actual.has(symbol))
  if (missingNative.length > 0) {
    throw new Error(
      `${declarationPath} is missing required native declarations: ${missingNative.join(", ")}`,
    )
  }

  const leakedBrowserDeclarations = forbiddenBrowserDeclarations.filter((symbol) =>
    actual.has(symbol),
  )
  if (leakedBrowserDeclarations.length > 0) {
    throw new Error(
      `${declarationPath} includes browser-only declarations: ${leakedBrowserDeclarations.join(", ")}`,
    )
  }
}

process.stdout.write(
  `Declaration export checks passed for all ${expected.size} legacy symbols and ${requiredNativeDeclarations.length} required native symbols in ESM and CommonJS\n`,
)
