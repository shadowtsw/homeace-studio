import { HaRestError, HaRestService } from "./ha-rest.service";

const ENDPOINT = {
  restUrl: "http://ha.local:8123/api",
  websocketUrl: "ws://ha.local:8123/api/websocket",
  token: "secret",
  isAddon: false,
};

function answer(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("HaRestService", () => {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
  const service = new HaRestService(ENDPOINT);

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it("sends the token and returns the JSON answer", async () => {
    fetchMock.mockResolvedValue(answer(200, { id: "1" }));

    await expect(service.get("config/automation/config/1")).resolves.toEqual({ id: "1" });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("http://ha.local:8123/api/config/automation/config/1");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer secret" });
  });

  it("returns null for resources HA does not know", async () => {
    fetchMock.mockResolvedValue(answer(404, { message: "Resource not found" }));

    await expect(service.get("config/automation/config/x")).resolves.toBeNull();
  });

  it("posts JSON and throws HA's message on errors", async () => {
    fetchMock.mockResolvedValue(answer(400, { message: "Message malformed: bad" }));

    const result = service.post({ path: "config/automation/config/1", body: { alias: "A" } });

    await expect(result).rejects.toEqual(new HaRestError(400, "Message malformed: bad"));
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ alias: "A" }),
    });
  });
});
