type EnvironmentTarget = {
  name: 'local' | 'dev' | 'prod';
  hosts: string[];
  expectNoIndex: boolean;
};

const targets: EnvironmentTarget[] = [
  {
    name: 'dev',
    hosts: ['https://subhaul.dev', 'http://subhaul.dev'],
    expectNoIndex: true,
  },
  {
    name: 'prod',
    hosts: ['https://subhaul.com', 'http://subhaul.com'],
    expectNoIndex: false,
  },
];

function fail(message: string): never {
  throw new Error(message);
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function hasDirective(content: string, directive: string, value: string): boolean {
  const lines = content
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);

  const expected = `${directive.toLowerCase()}: ${value.toLowerCase()}`;
  return lines.some((line) => line === expected);
}

async function fetchWithTimeout(url: string, timeoutMs = 15_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'indexing-guard-check/1.0',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveReachableBaseUrl(
  hosts: string[],
): Promise<{ baseUrl: string; response: Response }> {
  const errors: string[] = [];

  for (const host of hosts) {
    const baseUrl = normalizeBaseUrl(host);
    const url = `${baseUrl}/`;

    try {
      const response = await fetchWithTimeout(url);
      if (response.status >= 500) {
        errors.push(`${url} -> HTTP ${response.status}`);
        continue;
      }
      return { baseUrl, response };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${url} -> ${message}`);
    }
  }

  fail(`No reachable URL found. Tried: ${errors.join('; ')}`);
}

async function verifyTarget(target: EnvironmentTarget): Promise<void> {
  const { baseUrl, response: homeResponse } = await resolveReachableBaseUrl(target.hosts);

  console.log(`\n[${target.name}] Testing ${baseUrl}`);

  const xRobotsTag = homeResponse.headers.get('x-robots-tag');
  console.log(
    `[${target.name}] Headers: ${JSON.stringify(Object.fromEntries(homeResponse.headers.entries()), null, 2)}`,
  );

  if (target.expectNoIndex) {
    if (!xRobotsTag) {
      fail(`[${target.name}] Expected X-Robots-Tag header, but none was returned`);
    }

    const normalizedHeader = xRobotsTag.toLowerCase();
    const expectedHeader = 'noindex, nofollow, noarchive';
    if (!normalizedHeader.includes(expectedHeader)) {
      fail(
        `[${target.name}] Expected X-Robots-Tag to include "${expectedHeader}", got "${xRobotsTag}"`,
      );
    }
  } else if (xRobotsTag) {
    fail(`[${target.name}] Did not expect X-Robots-Tag header, got "${xRobotsTag}"`);
  }

  const robotsResponse = await fetchWithTimeout(`${baseUrl}/robots.txt`);
  if (!robotsResponse.ok) {
    fail(
      `[${target.name}] Failed to fetch robots.txt from ${baseUrl}/robots.txt (HTTP ${robotsResponse.status})`,
    );
  }

  const robotsContent = await robotsResponse.text();

  if (target.expectNoIndex) {
    if (!hasDirective(robotsContent, 'Disallow', '/')) {
      fail(`[${target.name}] Expected robots.txt to contain "Disallow: /"`);
    }
  } else {
    if (hasDirective(robotsContent, 'Disallow', '/')) {
      fail(`[${target.name}] Did not expect robots.txt to contain "Disallow: /"`);
    }
    if (!hasDirective(robotsContent, 'Allow', '/')) {
      fail(`[${target.name}] Expected robots.txt to contain "Allow: /"`);
    }
  }

  console.log(`[${target.name}] PASS`);
}

async function run(): Promise<void> {
  console.log('Running indexing guard checks via URL requests...');

  for (const target of targets) {
    await verifyTarget(target);
  }

  console.log('\nPASS: indexing guard checks succeeded for local, dev, and prod.');
}

run().catch((error) => {
  console.error('\nFAIL:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
