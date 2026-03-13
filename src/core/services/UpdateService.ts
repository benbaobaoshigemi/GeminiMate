import { compareVersions, EXTENSION_VERSION, parseVersion } from '@/core/utils/version';

const RELEASE_OWNER = 'benbaobaoshigemi';
const RELEASE_REPO = 'GeminiMate';
const LATEST_RELEASE_API_URL = `https://api.github.com/repos/${RELEASE_OWNER}/${RELEASE_REPO}/releases/latest`;
const LATEST_RELEASE_PAGE_URL = `https://github.com/${RELEASE_OWNER}/${RELEASE_REPO}/releases/latest`;
const GITHUB_URL_PREFIX = 'https://github.com/';

interface GitHubReleaseAsset {
  browser_download_url?: unknown;
}

interface GitHubLatestReleaseResponse {
  html_url?: unknown;
  tag_name?: unknown;
  published_at?: unknown;
  name?: unknown;
  assets?: unknown;
}

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  downloadUrl: string | null;
  publishedAt: string | null;
  releaseName: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isGitHubUrl = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(GITHUB_URL_PREFIX);

const normalizeTagVersion = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/^v/i, '');
  return parseVersion(normalized) ? normalized : null;
};

const normalizeAssets = (value: unknown): GitHubReleaseAsset[] =>
  Array.isArray(value) ? value.filter((item): item is GitHubReleaseAsset => isRecord(item)) : [];

const pickDownloadUrlFromAssets = (assets: GitHubReleaseAsset[]): string | null => {
  for (const asset of assets) {
    if (isGitHubUrl(asset.browser_download_url)) {
      return asset.browser_download_url;
    }
  }
  return null;
};

const extractVersionFromReleaseUrl = (value: string): string | null => {
  const match = value.match(/\/releases\/tag\/v?(\d+\.\d+\.\d+(?:-[^/?#]+)?)/i);
  return match ? match[1] : null;
};

const extractVersionFromHtml = (html: string): string | null => {
  const match = html.match(/\/releases\/tag\/v?(\d+\.\d+\.\d+(?:-[^"'<\s]+)?)/i);
  return match ? match[1] : null;
};

const extractDownloadUrlFromHtml = (html: string): string | null => {
  const match = html.match(/href="(\/[^"]*\/releases\/download\/[^"]+)"/i);
  if (!match) return null;
  return `https://github.com${match[1].replace(/&amp;/g, '&')}`;
};

const extractPublishedAtFromHtml = (html: string): string | null => {
  const match = html.match(/<relative-time[^>]*datetime="([^"]+)"/i);
  return match ? match[1] : null;
};

const extractReleaseNameFromHtml = (html: string): string | null => {
  const match = html.match(/<title>\s*Release\s+([^<]+?)\s+·/i);
  return match ? match[1].trim() : null;
};

const buildResult = (payload: {
  latestVersion: string;
  releaseUrl: string;
  downloadUrl: string | null;
  publishedAt: string | null;
  releaseName: string | null;
}): UpdateCheckResult => ({
  currentVersion: EXTENSION_VERSION,
  latestVersion: payload.latestVersion,
  updateAvailable: compareVersions(payload.latestVersion, EXTENSION_VERSION) > 0,
  releaseUrl: payload.releaseUrl,
  downloadUrl: payload.downloadUrl,
  publishedAt: payload.publishedAt,
  releaseName: payload.releaseName,
});

const checkLatestReleaseFromApi = async (): Promise<UpdateCheckResult> => {
  const response = await fetch(LATEST_RELEASE_API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`github_release_http_${response.status}`);
  }

  const payload = (await response.json()) as GitHubLatestReleaseResponse;
  const latestVersion = normalizeTagVersion(payload.tag_name);
  const releaseUrl = isGitHubUrl(payload.html_url) ? payload.html_url : null;

  if (!latestVersion || !releaseUrl) {
    throw new Error('github_release_payload_invalid');
  }

  return buildResult({
    latestVersion,
    releaseUrl,
    downloadUrl: pickDownloadUrlFromAssets(normalizeAssets(payload.assets)),
    publishedAt: typeof payload.published_at === 'string' ? payload.published_at : null,
    releaseName: typeof payload.name === 'string' ? payload.name : null,
  });
};

const checkLatestReleaseFromHtml = async (): Promise<UpdateCheckResult> => {
  const response = await fetch(LATEST_RELEASE_PAGE_URL, {
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`github_release_page_http_${response.status}`);
  }

  const html = await response.text();
  const releaseUrl = isGitHubUrl(response.url) ? response.url : null;
  const latestVersion =
    (releaseUrl ? extractVersionFromReleaseUrl(releaseUrl) : null) ?? extractVersionFromHtml(html);

  if (!releaseUrl || !latestVersion) {
    throw new Error('github_release_page_parse_failed');
  }

  return buildResult({
    latestVersion,
    releaseUrl,
    downloadUrl: extractDownloadUrlFromHtml(html),
    publishedAt: extractPublishedAtFromHtml(html),
    releaseName: extractReleaseNameFromHtml(html),
  });
};

export async function checkLatestRelease(): Promise<UpdateCheckResult> {
  try {
    return await checkLatestReleaseFromApi();
  } catch {
    return checkLatestReleaseFromHtml();
  }
}
