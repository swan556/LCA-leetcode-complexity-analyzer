// Replace with your actual Mistral API Key

const MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/agents/completions";
const AGENT_ID = "ag_019ea15e364c72e69f2b9c1309eea0a1";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== "analyze") return;

  (async () => {
    try {
      const { mistralApiKey } =
        await browser.storage.local.get("mistralApiKey");
      if (!mistralApiKey) {
        sendResponse({
          error: "No API key configured. Open extension settings.",
        });
        return;
      }
      const body = {
        agent_id: AGENT_ID,
        messages: [
          // Sending the exact stringified JSON you requested as the user prompt
          { role: "user", content: msg.prompt },
        ],
      };

      const response = await fetch(MISTRAL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${mistralApiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Mistral API Error (${response.status}): ${errorData}`);
      }

      const data = await response.json();

      // Extract the response text from Mistral's standard JSON shape
      const resultText =
        data?.choices?.[0]?.message?.content || "No content returned.";

      sendResponse({ result: resultText });
    } catch (err) {
      console.error("Fetch error:", err);
      sendResponse({ error: String(err) });
    }
  })();

  // Return true to keep the message channel open for the async response
  return true;
});
