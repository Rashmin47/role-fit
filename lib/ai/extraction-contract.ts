/**
 * Wire contract shared by the extraction routes and the browser client.
 * These types contain validated structured data only, never raw model output.
 */

import type { CandidateProfile, StructuredJobRequirements } from "./schemas";

export interface ExtractionProviderInfo {
  name: string;
  fallbackUsed: boolean;
  warning?: string;
}

export interface JobExtractionResponse {
  requirements: StructuredJobRequirements;
  warnings: string[];
  provider: ExtractionProviderInfo;
}

export interface CandidateExtractionResponse {
  profile: CandidateProfile;
  warnings: string[];
  provider: ExtractionProviderInfo;
}
