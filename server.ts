import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to securely fetch the Gemini SDK client (Lazy Initializer pattern to prevent server crashes if key is initially absent)
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ─── API ENDPOINTS ───────────────────────────────────────────────────────────

// Health & Config Check
app.get("/api/config", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    apiKeyConfigured: hasKey,
    hasAppUrl: !!process.env.APP_URL,
  });
});

// Primary Orchestrator Flow: Accepts user code instructions and simulates the entire agentic run
app.post("/api/agent/chat", async (req, res) => {
  try {
    const { prompt, files, plan, currentFile } = req.body;

    // Verify Gemini configuration
    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      return res.status(403).json({
        error: "API_KEY_MISSING",
        message: err.message || "Gemini API Key is missing. Add GEMINI_API_KEY in the Secrets panel."
      });
    }

    // Format the simulated workspace files for Gemini context
    const workspaceSnapshot = files.map((f: any) => {
      return `### FILE: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``;
    }).join("\n\n");

    const activeFileInfo = currentFile ? `Current Active File in Editor: ${currentFile}` : "No file is active currently.";

    const systemInstruction = `You are the FLUX Core Engine Routing Coordinator, a powerful agent orchestrator residing inside a high-performance IDE.
Your purpose is to model agentic workspace operations based on the user's manual coding request.
You collaborate with several sub-agents:
- File Agent: Reads, edits, or creates files in the layout.
- Terminal Agent: Executes commands, runs dev/build systems, and lints code.
- LLM Router: Directs requests and reasoning.
- Vector Memory Layer: Embeds project context, tracks semantic research index.

Given the existing workspace snapshot, current task list, active file, and user prompt, you MUST calculate:
1. Your internal reasoning process ('thoughts').
2. An updated checklist of tasks for the todo planning board. Update existing tasks or inject detailed new ones. Keep tasks realistic and professional.
3. A list of tool operations ('operations') to execute sequentially. Make these tools write valid mock output logs, search outputs, terminal results, or save vectors.
4. If writing or modifying a file, pass "write_file" as the operation type, define the exact file path, and provide the updated complete code.
5. In the final human "response", supply a clean, highly descriptive response in elegant developer markdown summarizing how the system collaborated to complete the task.

You must reply in rigid JSON according to the schema provided. No conversational wrappers outside the JSON structure.`;

    const userPrompt = `
=== CURRENT VIRTUAL WORKSPACE FILES ===
${workspaceSnapshot}

=== PLANNING DB (TODO LIST) ===
${JSON.stringify(plan, null, 2)}

=== ACTIVE STATE ===
${activeFileInfo}

=== USER MANUAL REQUEST ===
"${prompt}"

Please process this through the FLUX core orchestration pipeline and respond with the operations, thoughts, response, and updated plan. Include standard steps such as 'search_memory' (doing vector indexing), 'write_file' (if changing code), 'run_terminal' (running tests/compilation with output logs), or 'save_memory' when completed.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            thoughts: {
              type: Type.STRING,
              description: "Direct internal reasoning thoughts of the Flux Routing Agent."
            },
            plan: {
              type: Type.ARRAY,
              description: "The updated task list array reflecting completed or newly identified tasks.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  status: { type: Type.STRING, description: "Must be 'pending', 'in-progress', or 'done'" },
                  priority: { type: Type.STRING, description: "Must be 'low', 'medium', or 'high'" },
                  dependencies: {
                    type: Type.ARRAY,
                    description: "List of task IDs that this task depends on (optional)",
                    items: { type: Type.STRING }
                  }
                },
                required: ["id", "label", "status", "priority"]
              }
            },
            operations: {
              type: Type.ARRAY,
              description: "Array of simulated sub-agent tool runs",
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: "One of: 'search_memory', 'read_file', 'write_file', 'run_terminal', 'git_commit', 'save_memory'"
                  },
                  label: { type: Type.STRING, description: "Title describing the action taken" },
                  filepath: { type: Type.STRING, description: "The path of the file if type is write_file or read_file" },
                  code: { type: Type.STRING, description: "The content of the file for write_file operations" },
                  command: { type: Type.STRING, description: "The command executed for run_terminal operations" },
                  output: { type: Type.STRING, description: "The output logs or search outcomes generated of the tool execution" }
                },
                required: ["type", "label", "output"]
              }
            },
            response: {
              type: Type.STRING,
              description: "Human response explanation written in friendly markdown detailing the agent's collaboration."
            }
          },
          required: ["thoughts", "plan", "operations", "response"]
        }
      }
    });

    const bodyText = response.text;
    if (!bodyText) {
      throw new Error("Empty response from Gemini Orchestration engine.");
    }

    try {
      const parsedData = JSON.parse(bodyText.trim());
      res.json(parsedData);
    } catch (parseErr) {
      console.error("Failed to parse agent JSON:", bodyText);
      res.status(500).json({
        error: "PARSING_FAILED",
        message: "The core engine returned invalid JSON format.",
        details: bodyText
      });
    }

  } catch (err: any) {
    console.error("Error running FLUX coordinator agent:", err);
    res.status(500).json({
      error: "AGENT_RUNTIME_ERROR",
      message: err.message || "An error occurred while simulating agent workflows."
    });
  }
});


// ─── VITE / STATIC ROUTING MIDWLEWARE ────────────────────────────────────────

// In Express v4, we mount Vite middleware for asset resolution and fallback
async function bootServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting FLUX Express IDE server in DEV mode with dynamic Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting FLUX Express IDE server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Flux Agentic Workspace Server listening at http://localhost:${PORT}`);
  });
}

bootServer().catch((err) => {
  console.error("Critical error booting full-stack server:", err);
  process.exit(1);
});
