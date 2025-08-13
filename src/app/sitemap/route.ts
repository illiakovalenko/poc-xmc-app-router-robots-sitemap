import { SiteResolver } from "@sitecore-content-sdk/nextjs";
import type { NextRequest } from "next/server";
import sites from ".sitecore/sites.json";
import client from "@/lib/sitecore-client";

type SitemapXmlOptions = {
  reqHost: string;
  reqProtocol: string | string[];
  id?: string;
  siteName?: string;
};

const siteResolver = new SiteResolver(sites);

// NOTE: We can't use revalidate and cache entire route, since we rely on dynamic parameters such as headers, pathname.
// export const revalidate = 600;

// This implementation represents SitemapMiddleware from Sitecore Content SDK
export async function GET(req: NextRequest) {
  const url = req.nextUrl;

  // NOTE: In App Router we can't access "id" parameter added by rewrites, since it
  // keeps the original pathname and query params.
  // So we need to extract the id from the pathname.
  const id = url.pathname.match(/^\/sitemap-(\d+)\.xml$/i)?.[1] || '';

  const reqProtocol = req.headers.get("x-forwarded-proto") || "https";
  const reqHost = req.headers.get("host") || "";

  const site = siteResolver.getByHost(reqHost);

  const options: SitemapXmlOptions = {
    reqHost,
    reqProtocol,
    id,
    siteName: site.name,
  };

  try {
    const xmlContent = await client.getSiteMap(options);
    return new Response(xmlContent, {
      headers: {
        "Content-Type": "text/xml;charset=utf-8",
      },
    });
  } catch (error) {
    console.log("ERROR:", error);
    if (error instanceof Error && error.message === "REDIRECT_404") {
      return new Response("Not Found", { status: 404 });
    } else {
      return new Response("Internal Server Error", { status: 500 });
    }
  }
}
