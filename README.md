# Mitra Functions SDK for JavaScript

SDK JavaScript e TypeScript para código que roda dentro de uma Server Function da Mitra: dados do app, outras Functions, queries, integrações, agentes e notificações, sempre no escopo do app da Function. Para app de browser, use [`@mitralab.io/platform-sdk`](https://www.npmjs.com/package/@mitralab.io/platform-sdk).

## Instalação

```bash
npm install @mitralab.io/functions-sdk
```

No runtime de Server Functions da Mitra o pacote já vem instalado; instale no projeto para ter os tipos ou para rodar fora do runtime. Node 18 ou mais novo, ou outro runtime com `fetch` global.

## Início rápido

```javascript
const { createClient } = require("@mitralab.io/functions-sdk")

exports.handler = async (event, context) => {
  const mitra = createClient()

  const order = await mitra.entities.Order.get(event.orderId)
  const { data: items } = await mitra.entities.OrderItem.filter({ order_id: event.orderId })

  return { order, items }
}
```

Dentro do runtime, `createClient()` lê a URL, o token e o app das variáveis de ambiente que a Mitra injeta, então não precisa de argumento.

Fora do runtime, num processo seu, autentique com uma API key criada em Configurações, API keys. `createClientFromApiKey()` lê `MITRA_API_URL`, `MITRA_APP_ID` e `MITRA_API_KEY` e já troca a chave por um token, para uma chave errada falhar ali:

```javascript
const { createClientFromApiKey } = require("@mitralab.io/functions-sdk")

async function loadOrder(orderId) {
  const mitra = await createClientFromApiKey()
  return mitra.entities.Order.get(orderId)
}
```

## O que dá para fazer

- `entities.<Tabela>`: `list`, `filter`, `get`, `create`, `bulkCreate`, `update`, `delete` e `deleteMany` nas tabelas do app.
- `queries`, `customQueries`, `sql` e `schema`: queries salvas, SQL parametrizado e estrutura das tabelas.
- `functions`, `publicFunctions` e `workflows`: chamar outras Server Functions e workflows do app.
- `integration.executeByAlias(alias, request)`: chama uma API externa configurada no app, com a credencial guardada na Mitra.
- `messenger.notify(texto)`: manda uma notificação ao usuário autenticado.
- `agentTasks.session(...)`: chat com agente, com envio durante a resposta, a fila do T3, subagentes e o histórico ao vivo. Veja [Sessão de agente](#sessão-de-agente).
- `currentApp`: definição, arquivos, build e publicação do app da Function.
- `functionsAdmin`, `integrationAdmin`, `agents`, `agentConnections`, `agentCredentials`, `imports` e `dataSources`: administração dos recursos do app.

## Sessão de agente

A sessão vem do `@mitralab.io/sdk-core` e segue o T3, o harness que roda o agente. A box é o ambiente isolado onde o agente e o T3 rodam, um por chat, e é a fonte da verdade da conversa. A sessão não guarda fila própria: `queue`, `subagents` e `backgroundTasks` são o que a box informou por último.

```javascript
const { createClient } = require("@mitralab.io/functions-sdk")

exports.handler = async (event, context) => {
  const mitra = createClient()
  const session = mitra.agentTasks.session({ taskId: event.taskId })

  try {
    const result = await session.sendAndWait(event.prompt, { timeoutMs: 120000 })
    return { answer: result.content }
  } finally {
    session.close()
  }
}
```

Function que só dispara o prompt usa `send` e espera o evento `accepted` antes de chamar `session.close()` e retornar; antes dele, o prompt pode se perder.

- `send(prompt, options?)` manda na hora e devolve o `clientMessageId` da mensagem, ou `undefined` para texto em branco, que não sai. Sem turno rodando, a mensagem abre um turno. Com turno rodando e sem `mode`, o T3 decide como no composer dele: entra no turno em andamento quando o provedor aceita steer, ou espera na fila do T3. `mode: "steer"` pede o turno em andamento (o T3 recusa enquanto ele ainda não está rodando) e `mode: "queue"` pede a fila. O `mode` só vale no canal da box: quando a mensagem vai pelo Copilot (socket reconectando ou chat sem canal direto), ela sai sem `mode` e o T3 decide. `sendAndWait` aceita as mesmas opções e resolve com o turno que respondeu a mensagem.
- `queue` é a fila do T3 como a box informa, de qualquer cliente do chat, com `id` (o `clientMessageId`), `text`, `position` e `queueHeld`; o evento `queueChange` avisa quando ela muda. `steerQueueItem(id)` leva um item para o turno em andamento, `editQueueItem(id, text)`, `removeQueueItem(id)` e `clearQueue()` mexem na fila, e `resumeQueue()` retoma a fila que o Stop segurou. A fila muda quando a box responde, não antes.
- Quando o T3 coloca a mensagem no turno em andamento, sai o evento `steered`, com `text` e `messageId`, sem turno novo; o `turnEnd` daquele turno responde a ela.
- `backgroundTasks` é o trabalho que o provedor mantém em segundo plano (comando, Monitor ou subagente), como a box informou por último, com o evento `backgroundTasks`. É estado, não histórico.
- `subagents` guarda o último estado de cada subagente, com os eventos `subagent`, `subagentDelta` e `subagentTool`. `stopSubagent(subagentId)` para só ele e deixa o turno seguir.
- Os comandos da fila e o `stopSubagent` vão só pelo canal da box: com ele fora, sai um evento `error` e nada é enviado.
- `history` cresce ao vivo enquanto o turno roda, uma peça por item na ordem da box, e é o mesmo que volta ao recarregar o chat. A pergunta entra no ponto em que a box a pegou; até lá ela está em `queue`. Os kinds que já existiam mantêm o formato da 0.2.13, com a chamada e o resultado de uma ferramenta em dois itens `tool`. A 0.3.0 soma os kinds `reasoning`, `approval` e `userInputRequest`, e o texto de subagente como item `agent` com `parentToolId`: quem filtra o histórico por kind precisa tratar os novos.

Os tipos `AgentQueueItem`, `AgentBackgroundTask`, `AgentSubagent`, `AgentSubagentFrame` e `AgentSendOptions` saem deste pacote. O comportamento completo, com reconexão e replay, está no [README do Core](https://www.npmjs.com/package/@mitralab.io/sdk-core).

## Configuração

`createClient(config?)` usa o campo de `config` e, quando ele falta, a variável de ambiente. Em teste, `createClientFromEnvironment(env)` lê só do objeto que você passar.

| Campo         | Variável                                       | Obrigatório                    | Uso                                                                                                                                          |
| ------------- | ---------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiUrl`      | `MITRA_API_URL` ou `MITRA_BASE_URL`            | sim                            | URL HTTP ou HTTPS do API gateway da Mitra, sem credencial, query ou fragmento                                                                |
| `accessToken` | `MITRA_PLATFORM_ACCESS_TOKEN` ou `MITRA_TOKEN` | sim, exceto com API key        | token do runtime, enviado como `Bearer`                                                                                                      |
| `appId`       | `MITRA_APP_ID` ou `MITRA_PROJECT_ID`           | sim                            | app em que o cliente atua                                                                                                                    |
| `apiKey`      | `MITRA_API_KEY`                                | só em `createClientFromApiKey` | chave do app, para processo fora do runtime                                                                                                  |
| `timeoutMs`   |                                                | não                            | prazo por requisição; sem ele, o SDK não impõe prazo, e dentro de uma Function vale o limite de tempo dela                                   |
| `fetch`       |                                                | não                            | implementação de `fetch`; sem ela, usa a global                                                                                              |
| `WebSocket`   |                                                | não                            | implementação de WebSocket, como a do pacote `ws`, para a sessão de agente usar socket; sem ela, vale o WebSocket global, se houver, ou HTTP |

## Erros

`MitraApiError` traz `status`, `code`, `details`, `requestId`, `retryable` e `retryAfterSeconds`. O token não aparece na mensagem nem nos detalhes. `retryAfterSeconds` é quanto o servidor pediu para esperar, lido de `retry_after_seconds` no corpo ou do header `Retry-After` em segundos; sem valor inteiro válido, fica vazio.

| Erro                                           | Quando                                                          | O que fazer                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `MitraConfigurationError`                      | configuração ausente ou inválida, ou `apps` usado com outro app | confira variáveis e argumentos; para o próprio app, use `currentApp`                |
| `MitraApiError` `401` ou `403`                 | o token não dá acesso ao recurso                                | confira as permissões do app; nem todo módulo está liberado para o token do runtime |
| `MitraApiError` `429` ou `5xx`                 | limite de requisições ou falha no servidor                      | repita só se a operação puder ser repetida; espere `retryAfterSeconds`, se vier     |
| `REQUEST_TIMEOUT`, `NETWORK_ERROR`             | prazo estourado ou falha de rede, com `status` `0`              | aumente `timeoutMs` ou repita, se a operação permitir                               |
| `INVALID_CREDENTIALS`, `AUTHENTICATION_FAILED` | a troca da API key falhou                                       | confira a chave e o `appId`                                                         |
| `INVALID_RESPONSE`                             | resposta fora do formato esperado                               | atualize o SDK; se continuar, abra uma issue                                        |
| `AgentTaskTurnError`                           | o turno do agente foi recusado ou terminou com erro             | leia o `code` e decida se manda de novo                                             |

## Boas práticas

- Crie o cliente dentro do handler. O token do runtime vale para aquela execução e dura pouco.
- O SDK faz uma tentativa por requisição e não repete, para não gravar duas vezes. `retryable` é só uma dica. O cliente por API key é a exceção: num `401`, ele pega um token novo e repete aquela requisição uma vez.
- Para o app da Function, use `currentApp`. `apps` só aceita o próprio app, e `apps.list()` e `apps.create()` não existem aqui.
- Function que só dispara um prompt para um agente pode retornar depois do evento `accepted`. Antes dele, o prompt pode se perder.
- `cancel()` chamado enquanto o prompt ainda está a caminho espera a box aceitar a mensagem e só então interrompe o turno; aguarde a promessa dele antes de dar o chat por parado. Se a box recusar a mensagem, nenhum stop sai e o evento `cancelled` não é emitido, então o stop não interrompe um turno seguinte.
- API key fica em variável de ambiente de processo de servidor, nunca em código de browser nem no repositório.

## Migração do `mitra-sdk`

Os exports do SDK legado continuam neste pacote, marcados `@deprecated`, para código de Function existente trocar a dependência sem reescrever os imports. `createClient()` configura o legado com o mesmo token e o mesmo app. Os tipos do Core que têm nome igual a um tipo legado saem com prefixo `Core`, como `CoreAgentConnection`.

## Desenvolvimento

```bash
npm ci
npm run check
```

O `check` roda format, lint, typecheck, testes, build, a conferência dos exports e do contrato com o Core, e um smoke test do pacote. A publicação no npm sai do workflow Release.
