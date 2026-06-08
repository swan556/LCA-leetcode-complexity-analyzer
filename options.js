const apiKeyInput = document.getElementById("apiKey");

const saveBtn = document.getElementById("saveBtn");

browser.storage.local.get("mistralApiKey").then((result) => {
  if (result.mistralApiKey) {
    apiKeyInput.value = result.mistralApiKey;
  }
});

saveBtn.addEventListener("click", async () => {
  await browser.storage.local.set({
    mistralApiKey: apiKeyInput.value,
  });

  alert("Saved");
});
