import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createClient, createClientFromEnvironment, getProjectsMitra } from "../index"
import type { Fetch, MitraEnvironment } from "../index"

const environment: MitraEnvironment = {
  MITRA_API_URL: "https://runtime.example.com",
  MITRA_PLATFORM_ACCESS_TOKEN: "runtime-token",
  MITRA_APP_ID: "runtime-app",
}

let globalFetch: ReturnType<typeof vi.fn<Fetch>>

function legacyRequest() {
  const call = globalFetch.mock.calls[0]
  if (!call) throw new Error("The legacy SDK did not issue a request")
  return { url: String(call[0]), init: call[1] as RequestInit }
}

beforeEach(() => {
  globalFetch = vi.fn<Fetch>(
    async () =>
      new Response(JSON.stringify([{ id: 1 }]), {
        headers: { "Content-Type": "application/json" },
      }),
  )
  vi.stubGlobal("fetch", globalFetch)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("legacy configuration bridge", () => {
  it("configures the legacy SDK from the runtime environment", async () => {
    vi.stubEnv("MITRA_API_URL", environment.MITRA_API_URL!)
    vi.stubEnv("MITRA_PLATFORM_ACCESS_TOKEN", environment.MITRA_PLATFORM_ACCESS_TOKEN!)
    vi.stubEnv("MITRA_APP_ID", environment.MITRA_APP_ID!)

    createClient()
    await getProjectsMitra()

    expect(legacyRequest().url).toBe("https://runtime.example.com/agentAiShortcut/getProjects")
    expect(legacyRequest().init.headers).toMatchObject({
      Authorization: "Bearer runtime-token",
    })
    expect(globalFetch).toHaveBeenCalledTimes(1)
  })

  it("configures the legacy SDK from an explicit environment", async () => {
    createClientFromEnvironment(environment)
    await getProjectsMitra()

    expect(legacyRequest().url).toBe("https://runtime.example.com/agentAiShortcut/getProjects")
    expect(legacyRequest().init.headers).toMatchObject({
      Authorization: "Bearer runtime-token",
    })
  })

  it("configures the legacy SDK from an explicit client configuration", async () => {
    createClient({
      apiUrl: "https://explicit.example.com/",
      accessToken: "explicit-token",
      appId: "explicit-app",
    })
    await getProjectsMitra()

    expect(legacyRequest().url).toBe("https://explicit.example.com/agentAiShortcut/getProjects")
    expect(legacyRequest().init.headers).toMatchObject({
      Authorization: "Bearer explicit-token",
    })
  })

  it("forwards the API URL without transforming it", async () => {
    createClientFromEnvironment({
      ...environment,
      MITRA_API_URL: "https://gateway.example.com/root",
    })
    await getProjectsMitra()

    expect(legacyRequest().url).toBe("https://gateway.example.com/root/agentAiShortcut/getProjects")
  })

  it("accepts a token that already carries the Bearer prefix", async () => {
    createClientFromEnvironment({
      ...environment,
      MITRA_PLATFORM_ACCESS_TOKEN: "Bearer runtime-token",
    })
    await getProjectsMitra()

    expect(legacyRequest().init.headers).toMatchObject({
      Authorization: "Bearer runtime-token",
    })
  })

  it("does not send a request while creating a client", () => {
    createClientFromEnvironment(environment)

    expect(globalFetch).not.toHaveBeenCalled()
  })
})
