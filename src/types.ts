export interface ScaffoldOptions {
  readonly force: boolean;
  readonly packageName: string;
  readonly targetDirectory: string;
  readonly ui?: boolean;
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
