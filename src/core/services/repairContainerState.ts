export interface RepairContainerDecisionInput {
  currentHtml: string;
  sourceHtml: string;
  rawSourceHtml: string;
  latexEnabled: boolean;
  markdownEnabled: boolean;
  forceMarkdownRefresh: boolean;
  hasLatexPatchMarkers: boolean;
  hasMarkdownPatchMarkers: boolean;
}

export type RepairContainerAction =
  | 'none'
  | 'rebuild-markdown'
  | 'reset-to-source'
  | 'reset-to-raw-source';

export const decideRepairContainerAction = ({
  currentHtml,
  sourceHtml,
  rawSourceHtml,
  latexEnabled,
  markdownEnabled,
  forceMarkdownRefresh,
  hasLatexPatchMarkers,
  hasMarkdownPatchMarkers,
}: RepairContainerDecisionInput): RepairContainerAction => {
  if (forceMarkdownRefresh && markdownEnabled && hasMarkdownPatchMarkers) {
    return 'rebuild-markdown';
  }

  if (!latexEnabled && hasLatexPatchMarkers && currentHtml !== rawSourceHtml) {
    return 'reset-to-raw-source';
  }

  if (!markdownEnabled && hasMarkdownPatchMarkers) {
    return 'reset-to-source';
  }

  if (currentHtml !== sourceHtml && !hasLatexPatchMarkers && !hasMarkdownPatchMarkers) {
    return 'reset-to-source';
  }

  return 'none';
};
