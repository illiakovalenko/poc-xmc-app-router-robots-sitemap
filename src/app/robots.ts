import { SiteResolver } from "@sitecore-content-sdk/nextjs";
import { MetadataRoute } from "next";
import { headers } from "next/headers";
import sites from ".sitecore/sites.json";
import client from "@/lib/sitecore-client";

const siteResolver = new SiteResolver(sites);

// Parse robots.txt file to MetadataRoute.Robots format
function parseRobotsTxt(content: string): {
  rules: MetadataRoute.Robots["rules"];
  sitemap?: MetadataRoute.Robots["sitemap"];
  host?: MetadataRoute.Robots["host"];
} {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  type Rule = {
    userAgent: string | string[];
    allow?: string | string[];
    disallow?: string | string[];
    crawlDelay?: number;
  };

  const rulesArray: Rule[] = [];
  let currentAgents: string[] = [];
  let currentAllow: string[] = [];
  let currentDisallow: string[] = [];
  let currentCrawlDelay: number | undefined;

  let sitemap: string | string[] | undefined;
  let host: string | undefined;

  const flushGroup = () => {
    if (currentAgents.length === 0) {
      // reset any accumulated directives without an agent
      currentAllow = [];
      currentDisallow = [];
      currentCrawlDelay = undefined;
      return;
    }
    const rule: Rule = {
      userAgent: currentAgents.length <= 1 ? currentAgents[0] : [...currentAgents],
      ...(currentAllow.length > 0
        ? { allow: currentAllow.length <= 1 ? currentAllow[0] : [...currentAllow] }
        : {}),
      ...(currentDisallow.length > 0
        ? { disallow: currentDisallow.length <= 1 ? currentDisallow[0] : [...currentDisallow] }
        : {}),
      ...(currentCrawlDelay !== undefined ? { crawlDelay: currentCrawlDelay } : {}),
    };
    rulesArray.push(rule);
    currentAgents = [];
    currentAllow = [];
    currentDisallow = [];
    currentCrawlDelay = undefined;
  };

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    switch (key) {
      case "user-agent":
        // If we already have a group and encounter a new user-agent after directives, flush previous group
        if ((currentAllow.length > 0 || currentDisallow.length > 0 || currentCrawlDelay !== undefined) && currentAgents.length > 0) {
          flushGroup();
        }
        currentAgents.push(value);
        break;
      case "allow":
        currentAllow.push(value);
        break;
      case "disallow":
        currentDisallow.push(value);
        break;
      case "crawl-delay": {
        const delay = Number(value);
        if (!Number.isNaN(delay)) currentCrawlDelay = delay;
        break;
      }
      case "sitemap":
        if (!sitemap) sitemap = value;
        else sitemap = Array.isArray(sitemap) ? [...sitemap, value] : [sitemap, value];
        break;
      case "host":
        if (!host) host = value;
        break;
      default:
        break;
    }
  }

  // Flush last collected group
  flushGroup();

  const rules: MetadataRoute.Robots["rules"] = rulesArray.length === 0 ? { userAgent: "*" } : rulesArray;

  return { rules, sitemap, host };
}

// NOTE: We can't use revalidate and cache entire route, since we rely on dynamic parameters such as headers.
// export const revalidate = 600;


// This implementation represents RobotsMiddleware from Sitecore Content SDK
export default async function robots(): Promise<MetadataRoute.Robots> {
  const reqHeaders = await headers();
  const hostName = reqHeaders.get("host")?.split(":")[0] || "localhost";
  const site = siteResolver.getByHost(hostName);

  const robotsText = await client.getRobots(site.name);

  if (!robotsText) {
    return {
      rules: {
        userAgent: "*",
      },
    };
  }

  const parsed = parseRobotsTxt(robotsText);

  const robots: MetadataRoute.Robots = {
    rules: parsed.rules,
    sitemap: parsed.sitemap,
    host: parsed.host,
  };

  return robots;
}
