// tests/whatsapp.test.ts
import { sendResultadoListo } from "@/lib/whatsapp/send-template";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-id";
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  mockFetch.mockReset();
});

describe("sendResultadoListo", () => {
  it("calls Meta API with correct URL and Authorization header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.test123" }] }),
    });

    await sendResultadoListo("573001234567", "Ana", "Lab Central", "abc123");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/test-phone-id/messages",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      })
    );
  });

  it("builds correct template body with three parameters", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.test456" }] }),
    });

    await sendResultadoListo("573001234567", "Ana", "Lab Central", "code123");

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.template.name).toBe("resultado_listo");
    expect(callBody.template.language.code).toBe("es");
    const params = callBody.template.components[0].parameters;
    expect(params[0].text).toBe("Ana");
    expect(params[1].text).toBe("Lab Central");
    expect(params[2].text).toBe("https://labflash.co/r/code123");
  });

  it("returns wamid from API response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.returned" }] }),
    });

    const wamid = await sendResultadoListo("573001234567", "Ana", "Lab Central", "abc");
    expect(wamid).toBe("wamid.returned");
  });

  it("throws error on non-200 Meta API response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Bad request",
    });

    await expect(
      sendResultadoListo("573001234567", "Ana", "Lab Central", "abc")
    ).rejects.toThrow("WhatsApp API error 400");
  });
});
