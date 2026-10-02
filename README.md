# Mitra Functions SDK for JavaScript

SDK JavaScript e TypeScript para código que roda dentro de Server Functions: entidades, queries, Functions, integrações, Code Studio do app atual, agentes e notificações, sempre no escopo de um app. Usa o access token de curta duração do runtime, sem login nem refresh. Os módulos e contratos vêm de `@mitralab.io/sdk-core`; este pacote é o adaptador do runtime (configuração, headers, prazo, mascaramento de token, recusa de redirect). App de browser usa `@mitralab.io/platform-sdk`.

## Instalação

```bash
npm install @mitralab.io/functions-sdk
```

Node 18 ou mais novo, ou outro runtime com `fetch` global. Traz `@mitralab.io/sdk-core` e o SDK legado `mitra-sdk` com versão exata, travados por integridade no `package-lock.json`.

## Configuração

`createClient(config?)` usa cada campo de `config` e cai na variável de ambiente quando o campo falta. `createClientFromEnvironment(env)` lê só de um objeto de ambiente, útil em teste.

No runtime de Functions, o serviço injeta `MITRA_BASE_URL` (com `/legacy` no fim), `MITRA_TOKEN` e `MITRA_PROJECT_ID`, então `createClient()` funciona sem argumento.

| Campo                | Variável                                                    | Obrigatória                    | Uso                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiUrl`             | `MITRA_API_URL`, ou `MITRA_BASE_URL` sem o `/legacy` do fim | sim                            | URL HTTP(S) do API gateway, sem credencial, query ou fragmento; os serviços saem dela (`/iam`, `/data-manager`, `/functions`, `/integration`, `/code-studio`, `/copilot`, `/messenger`) |
| `accessToken`        | `MITRA_PLATFORM_ACCESS_TOKEN` ou `MITRA_TOKEN`              | sim                            | token de runtime da plataforma, enviado como `Bearer` sem ser inspecionado                                                                                                              |
| `appId`              | `MITRA_APP_ID` ou `MITRA_PROJECT_ID`                        | sim                            | escopo do app, enviado em `X-App-Id`                                                                                                                                                    |
| `apiKey`             | `MITRA_API_KEY`                                             | só em `createClientFromApiKey` | chave criada em Configurações, API keys, para processo fora do runtime de Functions                                                                                                     |
| `dataSourceId`       | `MITRA_DATA_SOURCE_ID`                                      | não                            | só compatibilidade; entidades e queries não usam                                                                                                                                        |
| `legacyBaseUrl`      | `MITRA_BASE_URL`                                            | não                            | base do BFF (Backend for Frontend) usada pelos exports legados; sem ela, vale `apiUrl`                                                                                                  |
| `timeoutMs`          |                                                             | não                            | prazo por requisição; sem valor, não há prazo no adaptador e vale o limite do runtime                                                                                                   |
| `fetch`, `WebSocket` |                                                             | não                            | implementações a usar; `fetch` cai em `globalThis.fetch`                                                                                                                                |

## Uso

```typescript
import { createClient, MitraApiError } from "@mitralab.io/functions-sdk"

const mitra = createClient()

export async function handler(input: { orderId: string }) {
  try {
    const order = await mitra.entities.Order.get(input.orderId)
    const completed = await mitra.functions.execute("function-id", { orderId: input.orderId })
    return { order, completed }
  } catch (error) {
    if (error instanceof MitraApiError && error.status === 404) return { order: null }
    throw error
  }
}
```

Fora do runtime, `await createClientFromApiKey({ apiUrl, apiKey, appId })` troca a chave por um token já na criação, para chave inválida falhar ali e não numa chamada qualquer depois.

## Contratos e armadilhas

- O SDK faz uma tentativa por requisição e não repete, para não reexecutar escrita. `retryable` é só diagnóstico. A exceção é o cliente por API key: num `401`, ele troca a chave por um token novo e repete aquela requisição uma vez.
- `apps.list()` e `apps.create()` falham localmente com `MitraConfigurationError`, e os demais métodos de `apps` recusam um `appId` diferente do configurado. Prefira `currentApp`. Essa checagem evita engano, mas não é fronteira de segurança: quem autoriza é a claim `app_id` do JWT (JSON Web Token) no serviço.
- O token do runtime não tem `MEMBER_READ` nem as permissões de secret de Function: `members.list()` e as operações de secret respondem `403`. Os métodos ficam no tipo porque outro token pode ter a permissão.
- `agentTasks.session()` chega à box do agente por WebSocket ou, sem ele, pelas rotas HTTP da box. O runtime de Functions roda Node 20, sem `WebSocket` global; passe `ws` em `createClient({ WebSocket })` se quiser o socket. As rotas da box usam o `fetch` global, nunca o `fetch` do cliente, para um `fetch` que injeta `Authorization` não vazar o token para a box.
- Um `timeoutMs` curto também corta o `POST /channel`, que o Copilot segura enquanto a box sobe, e a sessão cai no stream do Copilot com `channelDeclined`. Nesse stream, 60 segundos sem evento contam como queda.
- Function que só dispara um prompt pode retornar depois do evento `accepted`: dali em diante o turno roda e é registrado sem ela. Retornar antes de `accepted` pode perder a mensagem.

## Contrato com o Core

`contracts/sdk-core-v<versão>.manifest.json` fixa a versão do Core, o SHA-256 do corpus SDK-PARITY-001 e o commit de origem no `mitra-core-sdk`. `npm run check:contracts` compara o corpus instalado com o manifest; `npm run check:contracts:source`, que também roda no `prepublishOnly`, compara com o arquivo no GitHub byte a byte. Trocar a versão do Core pede um manifest novo e apontar `scripts/check-contract-corpus.mjs` para ele.

## SDK legado

A superfície de runtime e de tipos do `mitra-sdk` é reexportada como `@deprecated`, para código de Function existente trocar a dependência sem reescrever imports. `createClient()` configura o SDK legado com `legacyBaseUrl`, o token e o `appId` como `projectId`. Fluxos de Git do builder (`getGitConfigMitra`) e S3 direto (`deployToS3Mitra`) só existem no legado. Os nomes legados `AgentConnection`, `AgentMessage`, `AgentModel` e `ListTablesOptions` mantêm o significado antigo; os do Core saem com prefixo `Core`.

## Erros

`MitraApiError` traz `status`, `code`, `details`, `requestId` e `retryable`. O token é mascarado na mensagem e nos detalhes.

| Classe e `code`                                                   | Quando                                                                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `MitraConfigurationError`                                         | configuração ausente ou inválida, path vazio, operação de app fora do escopo                                    |
| `MitraApiError` com o código da API                               | resposta HTTP de erro, inclusive 3xx (redirect não é seguido); `retryable` vem do corpo ou é `true` só para 5xx |
| `MitraApiError`, `REQUEST_TIMEOUT` ou `NETWORK_ERROR`             | prazo estourado ou falha de rede, com `status` `0` e `retryable` `true`                                         |
| `MitraApiError`, `INVALID_RESPONSE`                               | resposta de sucesso fora do contrato                                                                            |
| `MitraApiError`, `INVALID_CREDENTIALS` ou `AUTHENTICATION_FAILED` | a troca da API key falhou (`401` ou outro status)                                                               |
| `AgentTaskTurnError`                                              | `sendAndWait()` com turno de agente recusado ou com erro; `code` traz o código do serviço, quando veio          |

## Desenvolvimento

```bash
npm install
npm run check
```

O `check` roda format, lint, typecheck, testes (cobertura mínima de 80%), build, conferência dos exports e do contrato, e um smoke test do tarball. Para validar contra um Core ainda não publicado, aponte `MITRA_SDK_CORE_TARBALL` para o tarball no `smoke:package`. Não use dependência `file:` nem `npm link`.
