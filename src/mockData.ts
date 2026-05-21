import { VirtualFile, PlanItem, ToolItem, MemoryVector } from "./types";

export const initialFiles: VirtualFile[] = [
  {
    path: "README.md",
    language: "markdown",
    content: `# Simulated Cache Microservice Engine (v2.4)
This is an agentic showcase service representing a high-performance memory cache proxy.
Features in sync:
- Multi-region replication routes
- Semantic cache bypass invalidations
- Connection pooling limits

Run "npm test" to verify database connectors and state validation.
`,
  },
  {
    path: "package.json",
    language: "json",
    content: `{
  "name": "cache-proxy-service",
  "version": "2.4.0",
  "main": "src/index.js",
  "dependencies": {
    "redis": "^4.6.10",
    "express": "^4.18.2",
    "dotenv": "^16.3.1"
  },
  "scripts": {
    "start": "node src/index.js",
    "test": "node tests/cache.test.js"
  }
}`,
  },
  {
    path: "src/index.js",
    language: "javascript",
    content: `const express = require('express');
const { createClient } = require('redis');
require('dotenv').config();

const app = express();
const PORT = process.env.SERVICE_PORT || 8080;

app.use(express.json());

// Main diagnostics status entrypoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    uptime: process.uptime(),
    redisConnection: 'PENDING_CONFIG',
    nodeVersion: process.version
  });
});

app.listen(PORT, () => {
  console.log(\`Proxy caching system starting on port \${PORT}...\`);
});
`,
  },
  {
    path: "src/cache.js",
    language: "javascript",
    content: `// FLUX file agent initialized template
const cachedMap = new Map();

function getCachedItem(key) {
  if (cachedMap.has(key)) {
    const record = cachedMap.get(key);
    if (record.expiry > Date.now()) {
      return record.value;
    }
    // Lazy deletion
    cachedMap.delete(key);
  }
  return null;
}

function setCachedItem(key, value, ttlSeconds = 60) {
  cachedMap.set(key, {
    value,
    expiry: Date.now() + (ttlSeconds * 1000)
  });
}

module.exports = { getCachedItem, setCachedItem };
`,
  },
  {
    path: "tests/cache.test.js",
    language: "javascript",
    content: `// Auto-generated testing framework for Cache Proxy core
const assert = require('assert').strict;
const { getCachedItem, setCachedItem } = require('../src/cache');

console.log("=== RUNNING CACHE MECHANICS TESTS ===");
setCachedItem('test_key', 'golden_payload', 2);

const val = getCachedItem('test_key');
assert.equal(val, 'golden_payload', "Should recover item correctly");
console.log("PASS: Local storage standard verification Passed!");

setTimeout(() => {
  const expiredVal = getCachedItem('test_key');
  assert.equal(expiredVal, null, "Should return null for expired item");
  console.log("PASS: TTL Expiry verification Passed!");
  console.log("=== ALL TEST VERIFICATIONS COMPLETED SUCCESSFULLY ===");
}, 2100);
`,
  }
];

export const initialPlan: PlanItem[] = [
  {
    id: "task-1",
    label: "Initialize modern Redis connection client inside src/index.js",
    status: "done",
    priority: "high",
    dependencies: []
  },
  {
    id: "task-2",
    label: "Implement robust security headers or access list checking in main API routing",
    status: "pending",
    priority: "medium",
    dependencies: ["task-1"]
  },
  {
    id: "task-3",
    label: "Refactor memory cache.js logic to support dynamic standard deviation thresholds",
    status: "pending",
    priority: "low",
    dependencies: []
  },
  {
    id: "task-4",
    label: "Expose Prometheus style caching statistics endpoint inside cache proxy router",
    status: "pending",
    priority: "medium",
    dependencies: ["task-2"]
  }
];

export const defaultTools: ToolItem[] = [
  {
    id: "github",
    name: "GitHub Integrator",
    category: "vcs",
    status: "connected",
    icon: "Github",
    description: "Orchestrates direct commits, branch tracking, and pull request audits."
  },
  {
    id: "browser",
    name: "Browser Automation (Puppeteer)",
    category: "automation",
    status: "idle",
    icon: "Chrome",
    description: "Exposes headless browser runtime to debug full-stack UI workflows."
  },
  {
    id: "mcp",
    name: "MCP Registry Router",
    category: "infra",
    status: "connected",
    icon: "Share2",
    description: "Integrates external Model Context Protocol adapters instantly."
  },
  {
    id: "redis",
    name: "Redis Memory Store",
    category: "database",
    status: "configured",
    icon: "Database",
    description: "Connects cache records and volatile memory mappings."
  },
  {
    id: "supabase",
    name: "Supabase Platform",
    category: "database",
    status: "disconnected",
    icon: "Flame",
    description: "Cloud database tables, local storage buckets, and auth."
  },
  {
    id: "docker",
    name: "Docker Container Daemon",
    category: "infra",
    status: "connected",
    icon: "Layers",
    description: "Powers sandboxed evaluation terminals, clean micro-environments."
  },
  {
    id: "stripe",
    name: "Stripe Payment Proxy",
    category: "api",
    status: "disconnected",
    icon: "CreditCard",
    description: "Simulates and tests subscription models, billing checkout portals."
  },
  {
    id: "postgres",
    name: "PostgreSQL Connector",
    category: "database",
    status: "idle",
    icon: "Terminal",
    description: "Simulates transactional relational operations."
  },
  {
    id: "figma",
    name: "Figma Layer Inspector",
    category: "automation",
    status: "disconnected",
    icon: "Compass",
    description: "Retrieves design variables and exports high-quality asset templates."
  },
  {
    id: "search",
    name: "Google Search Grounding Engine",
    category: "api",
    status: "connected",
    icon: "Search",
    description: "Resolves dependency lookups and fetches latest documentation."
  }
];

export const defaultVectors: MemoryVector[] = [
  {
    id: "v-01",
    topic: "Connection Failures",
    content: "If Redis cluster node enters timeout, trigger reconnection retry backing off factor 1.5, ceiling at 10 attempts.",
    similarity: 0.94
  },
  {
    id: "v-02",
    topic: "Memory Threshold limits",
    content: "In cache proxy system, evict least recently used (LRU) records if heap memory usage crosses 80%.",
    similarity: 0.81
  },
  {
    id: "v-03",
    topic: "Prometheus Caching Metrics",
    content: "Route log counts for 'cache_hit_ratio' and 'cache_latency_ms' fields regularly using standard metrics gauges.",
    similarity: 0.76
  }
];
