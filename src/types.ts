/** Explicit project destination, template choice, and optional trusted workspace. */
export interface ScaffoldOptions {
  readonly force: boolean;
  readonly packageName: string;
  readonly targetDirectory: string;
  readonly ui?: boolean;
  /** Explicitly trust local package sources under this workspace instead of npm. */
  readonly workspaceRoot?: string;
}

export interface ScaffoldResult {
  readonly packageName: string;
  readonly targetDirectory: string;
  readonly ui: boolean;
}

export interface WorkspacePackages {
  readonly beatDirectory: string;
  readonly pulseDirectory: string;
  readonly beatUiDirectory: string | null;
}
