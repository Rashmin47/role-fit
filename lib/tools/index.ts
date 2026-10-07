/**
 * Nirman Tool & Function Calling Registry
 * Exposes deterministic internal tools callable by local AI providers and pipeline stages.
 * Zero LangChain bloat — lightweight, strongly-typed internal functions.
 */

import { normalizeSkillName, matchSkills } from "../normalization/skills";
import { SAMPLE_CAREER_ROLES } from "../data/sample-data";
import { calculateFinalMatchScore, DEFAULT_SCORING_WEIGHTS } from "../scoring";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  handler: (args: any) => Promise<any> | any;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerDefaults();
  }

  register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async execute(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found in Nirman Tool Registry.`);
    }
    return await tool.handler(args);
  }

  private registerDefaults() {
    // 1. normalize_skill
    this.register({
      name: "normalize_skill",
      description: "Normalizes raw skill names and aliases into canonical taxonomy entities.",
      parameters: {
        type: "object",
        properties: {
          skillName: { type: "string", description: "The raw skill or keyword (e.g. 'psql', 'fast-api')" },
        },
        required: ["skillName"],
      },
      handler: (args: { skillName: string }) => {
        return {
          original: args.skillName,
          canonical: normalizeSkillName(args.skillName),
        };
      },
    });

    // 2. calculate_experience
    this.register({
      name: "calculate_experience",
      description: "Calculates total verified working years from employment date intervals.",
      parameters: {
        type: "object",
        properties: {
          intervals: {
            type: "array",
            description: "List of employment intervals with startDate and optional endDate in YYYY-MM",
          },
        },
        required: ["intervals"],
      },
      handler: (args: { intervals: Array<{ startYear: number; endYear?: number }> }) => {
        const currentYear = new Date().getFullYear();
        let total = 0;
        for (const item of args.intervals || []) {
          const end = item.endYear || currentYear;
          const diff = Math.max(0, end - item.startYear);
          total += diff;
        }
        return {
          totalYears: Math.min(20, Math.max(0.5, total)),
        };
      },
    });

    // 3. retrieve_market_requirements
    this.register({
      name: "retrieve_market_requirements",
      description: "Retrieves observed market requirement frequencies and distributions for a role.",
      parameters: {
        type: "object",
        properties: {
          roleId: { type: "string", description: "Normalized role identifier (e.g. 'python-backend-developer')" },
        },
        required: ["roleId"],
      },
      handler: (args: { roleId: string }) => {
        const role = SAMPLE_CAREER_ROLES[args.roleId] || SAMPLE_CAREER_ROLES["python-backend-developer"];
        return {
          roleTitle: role.roleTitle,
          postingsCount: role.totalPostingsAnalyzed,
          topSkills: role.requirements.slice(0, 5),
          skillPriorities: role.skillPriorities,
        };
      },
    });

    // 4. search_skill_taxonomy
    this.register({
      name: "search_skill_taxonomy",
      description: "Searches the skill taxonomy for related technologies, categories, and alternatives.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query or technology keyword" },
        },
        required: ["query"],
      },
      handler: (args: { query: string }) => {
        const normalized = normalizeSkillName(args.query);
        return {
          query: args.query,
          canonicalName: normalized,
          matches: [normalized],
        };
      },
    });
  }
}

export const defaultToolRegistry = new ToolRegistry();
