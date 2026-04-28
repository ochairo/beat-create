export type BeatTemplateName = "starter" | "router";

export interface ScaffoldBeatAppOptions {
  force: boolean;
  packageName: string;
  targetDirectory: string;
  template?: BeatTemplateName;
}

export interface ScaffoldBeatAppResult {
  packageName: string;
  targetDirectory: string;
  template: BeatTemplateName;
}

export function scaffoldBeatApp(
  options: ScaffoldBeatAppOptions,
): Promise<ScaffoldBeatAppResult>;

export function main(argv?: string[]): Promise<void>;
