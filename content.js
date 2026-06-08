let analysisWindow;
let analysisContent;
let footerBar;
let lastPromptString = "";

(function injectButton() {
  console.log("CONTENT SCRIPT LOADED");
  if (document.getElementById("lc-llm-analyze-btn")) return;

  const btn = document.createElement("button");
  makeDraggable(btn, btn);

  btn.id = "lc-llm-analyze-btn";
  btn.textContent = "⚡︎ Analyze";
  Object.assign(btn.style, {
    position: "fixed",
    top: "12px",
    right: "12px",
    padding: "8px 12px",
    borderRadius: "8px",
    background: "#f97316",
    color: "#fff",
    border: "none",
    zIndex: "999999",
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    fontWeight: "bold",
  });

  // --- Helper to extract LeetCode Data ---
  function extractLeetCodeData() {
    let code = "";
    let problemText = "Problem text not found.";
    let constraintText = "Constraints not found.";

    // 1. Extract Code
    const monacoView = document.querySelector(".view-lines");
    if (monacoView) {
      code = Array.from(monacoView.querySelectorAll(".view-line"))
        .map((l) => l.innerText)
        .join("\n");
    }

    // 2. Extract Problem Statement and Constraints
    // LeetCode usually stores the main description inside a div with this data attribute
    const descContainer = document.querySelector(
      '[data-track-load="description_content"]',
    );
    if (descContainer) {
      const fullText = descContainer.innerText;

      // Split the text at the "Constraints:" header if it exists
      const parts = fullText.split("Constraints:");
      problemText = parts[0].trim();

      if (parts.length > 1) {
        constraintText = parts[1].trim();
      }
    }

    return { code, problemText, constraintText };
  }

  btn.onclick = async () => {
    console.log("Extracting data from LeetCode...");

    const { code, problemText, constraintText } = extractLeetCodeData();

    if (!code || code.trim().length < 3) {
      console.log("Could not read code. Ensure the editor is visible.");
      return;
    }

    // Creating the EXACT JSON structure you requested
    const llmInputPayload = {
      problemText: problemText,
      constraintText: constraintText,
      code: code,
    };

    // We stringify it because the LLM expects a single string prompt in the 'content' field
    const promptString = JSON.stringify(llmInputPayload, null, 2);

    console.log("Sending to Mistral Agent...");
    lastPromptString = promptString;
    chrome.runtime.sendMessage(
      { action: "analyze", prompt: promptString },
      (resp) => {
        if (chrome.runtime.lastError) {
          console.log("Extension Error: " + chrome.runtime.lastError.message);
          return;
        }
        if (!resp) {
          console.log("No response from background script.");
          return;
        }
        if (resp.error) {
          console.log("API Error: " + resp.error);
          return;
        }

        try {
          const cleanJson = resp.result
            .replace(/^```json\s*/i, "")
            .replace(/```$/i, "")
            .trim();

          const analysis = JSON.parse(cleanJson);

          console.log("Parsed analysis:", analysis);

          renderAnalysis(analysis);
        } catch (err) {
          console.error("JSON Parse Error:", err);
        }
      },
    );
  };
  createAnalysisWindow();
  document.body.appendChild(btn);
})();

function createAnalysisWindow() {
  analysisWindow = document.createElement("div");

  Object.assign(analysisWindow.style, {
    display: "none",
    flexDirection: "column",
    position: "fixed",
    top: "80px",
    right: "20px",
    width: "520px",
    maxHeight: "80vh",
    overflowY: "auto",
    background: "#111827",
    color: "white",
    resize: "both",
    borderRadius: "12px",
    zIndex: "999999",
    boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
    display: "none",
    fontFamily: "Inter, sans-serif",
  });

  const header = document.createElement("div");

  Object.assign(header.style, {
    padding: "12px",
    background: "#1f2937",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "move",
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "12px",
  });

  header.innerHTML = `
    <strong>Complexity Analysis</strong>
    <button id="lc-close-btn">✕</button>
  `;

  analysisContent = document.createElement("div");
  analysisContent.style.padding = "16px";

  analysisContent = document.createElement("div");

  Object.assign(analysisContent.style, {
    padding: "16px",
    overflowY: "auto",
    flex: "1",
  });

  footerBar = document.createElement("div");

  Object.assign(footerBar.style, {
    padding: "12px",
    background: "#1f2937",
    borderBottomLeftRadius: "12px",
    borderBottomRightRadius: "12px",
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
  });

  analysisWindow.appendChild(header);
  analysisWindow.appendChild(analysisContent);
  analysisWindow.appendChild(footerBar);

  document.body.appendChild(analysisWindow);

  document.getElementById("lc-close-btn").onclick = () => {
    analysisWindow.style.display = "none";
  };

  makeDraggable(analysisWindow, header);
}

function makeDraggable(element, handle) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener("mousedown", (e) => {
    isDragging = true;

    const rect = element.getBoundingClientRect();

    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    element.style.left = rect.left + "px";
    element.style.top = rect.top + "px";
    element.style.right = "auto";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    element.style.left = e.clientX - offsetX + "px";
    element.style.top = e.clientY - offsetY + "px";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
}

function getVerdictColor(isOptimal) {
  return isOptimal ? "#22c55e" : "#ef4444";
}

function getTleColor(tle) {
  const value = tle.toLowerCase();

  if (value.includes("no")) return "#22c55e";
  if (value.includes("high")) return "#f59e0b";

  return "#ef4444";
}

function createCostAuditTable(audit) {
  return `
    <table style="
      width:100%;
      border-collapse:collapse;
      margin-top:10px;
      font-size:12px;
    ">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #374151;">Code Segment</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #374151;">Time</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #374151;">Space</th>
        </tr>
      </thead>
      <tbody>
        ${audit
          .map(
            (item) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #1f2937;">
              <code>${item.code_segment}</code>
            </td>
            <td style="padding:8px;border-bottom:1px solid #1f2937;">
              ${item.exact_time_cost_contribution}
            </td>
            <td style="padding:8px;border-bottom:1px solid #1f2937;">
              ${item.exact_space_cost_contribution}
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderAnalysis(a) {
  analysisWindow.style.display = "flex";

  const verdictText = a.approach_evaluation.is_optimal
    ? "Optimal"
    : "Not Optimal";

  const verdictColor = getVerdictColor(a.approach_evaluation.is_optimal);

  const tleColor = getTleColor(a.worst_case_execution_estimate.will_it_tle);

  analysisContent.innerHTML = `
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:12px;
      margin-bottom:20px;
    ">

      <div style="
        background:#1f2937;
        padding:12px;
        border-radius:10px;
      ">
        <div style="font-size:11px;color:#9ca3af">
          BIG-O TIME
        </div>

        <div style="font-size:20px;font-weight:bold;">
          ${a.asymptotic_complexity.time_complexity_big_o}
        </div>
      </div>

      <div style="
        background:#1f2937;
        padding:12px;
        border-radius:10px;
      ">
        <div style="font-size:11px;color:#9ca3af">
          BIG-O SPACE
        </div>

        <div style="font-size:20px;font-weight:bold;">
          ${a.asymptotic_complexity.space_complexity_big_o}
        </div>
      </div>

      <div style="
        background:#1f2937;
        padding:12px;
        border-radius:10px;
      ">
        <div style="font-size:11px;color:#9ca3af">
          VERDICT
        </div>

        <div style="
          font-size:18px;
          font-weight:bold;
          color:${verdictColor};
        ">
          ${verdictText}
        </div>
      </div>

      <div style="
        background:#1f2937;
        padding:12px;
        border-radius:10px;
      ">
        <div style="font-size:11px;color:#9ca3af">
          TLE RISK
        </div>

        <div style="
          font-size:18px;
          font-weight:bold;
          color:${tleColor};
        ">
          ${a.worst_case_execution_estimate.will_it_tle}
        </div>
      </div>
    </div>

    <div style="
      background:#1f2937;
      padding:12px;
      border-radius:10px;
      margin-bottom:16px;
    ">
      <div style="font-size:11px;color:#9ca3af">
        RECOMMENDED APPROACH
      </div>

      <div style="
        font-size:16px;
        font-weight:bold;
        margin-top:4px;
      ">
        ${a.approach_evaluation.optimal_method_recommended}
      </div>
    </div>

    <details>
      <summary>Constraints</summary>

      <div style="margin-top:10px;">
        <strong>Variables:</strong>
        ${a.problem_constraints_extracted.variables.join(", ")}

        <br><br>

        <strong>Maximum Bounds:</strong>
        ${a.problem_constraints_extracted.max_bounds.join(", ")}
      </div>
    </details>

    <details>
      <summary>Cost Audit</summary>

      ${createCostAuditTable(a.block_by_block_cost_audit)}
    </details>

    <details>
      <summary>Formula Derivation</summary>

      <div style="margin-top:10px;">
        <p>
          <strong>Exact Time Formula</strong>
        </p>

        <code>
          ${a.exact_performance_formulas.exact_time_formula}
        </code>

        <p style="margin-top:15px;">
          <strong>Exact Space Formula</strong>
        </p>

        <code>
          ${a.exact_performance_formulas.exact_space_formula}
        </code>

        <p style="margin-top:15px;">
          <strong>Maximum Operations</strong>
        </p>

        <code>
          ${a.worst_case_execution_estimate.max_calculated_operations}
        </code>
      </div>
    </details>

    <details>
      <summary>Optimization Suggestions</summary>

      <div style="
        margin-top:10px;
        line-height:1.6;
      ">
        ${a.detailed_optimization_feedback}
      </div>
    </details>
  `;
  footerBar.innerHTML = `
  <button id="copy-analysis-btn">
    ⧉
  </button>

  <button id="reanalyze-btn">
    ⟳
  </button>
`;

  document.getElementById("copy-analysis-btn").onclick = () => {
    const summary = `
Time Complexity: ${a.asymptotic_complexity.time_complexity_big_o}
Space Complexity: ${a.asymptotic_complexity.space_complexity_big_o}
Verdict: ${verdictText}
Recommended: ${a.approach_evaluation.optimal_method_recommended}
TLE Risk: ${a.worst_case_execution_estimate.will_it_tle}
`;

    navigator.clipboard.writeText(summary);
  };

  document.getElementById("close-analysis-btn").onclick = () => {
    analysisWindow.style.display = "none";
  };

  document.getElementById("reanalyze-btn").onclick = () => {
    document.getElementById("lc-llm-analyze-btn").click();
  };
}
