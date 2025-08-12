/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  SitecoreClient,
  SitecoreClientInit,
} from "@sitecore-content-sdk/nextjs/client";
import scConfig from "../../sitecore.config";
import {
  RobotsService,
  RobotsServiceConfig,
  SitemapXmlService,
  SitemapXmlServiceConfig,
} from "@sitecore-content-sdk/nextjs";
import { debug } from "@sitecore-content-sdk/nextjs";

// Introduced custom XML Service to add custom fetch to the client to test sitemap caching
class ExtendedSitemapXmlService extends SitemapXmlService {
  constructor(config: SitemapXmlServiceConfig) {
    super(config);
  }

  protected getGraphQLClient(): any {
    if (!this.options.clientFactory) {
      throw new Error(
        "clientFactory needs to be provided when initializing GraphQL client."
      );
    }

    return this.options.clientFactory({
      debugger: debug.sitemap,
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          next: { revalidate: 20 },
          cache: "force-cache",
        });
      },
    });
  }
}

// Introduced custom Robots Service to add custom fetch to the client to test robots caching
class ExtendedRobotsService extends RobotsService {
  constructor(config: RobotsServiceConfig) {
    super(config);
  }

  protected getGraphQLClient(): any {
    if (!this.options.clientFactory) {
      throw new Error(
        "clientFactory needs to be provided when initializing GraphQL client."
      );
    }

    return this.options.clientFactory({
      debugger: debug.robots,
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          next: { revalidate: 20 },
          cache: "force-cache",
        });
      },
    });
  }
}

class SitecoreClientWithFetch extends SitecoreClient {
  constructor(config: SitecoreClientInit) {
    super(config);
  }

  protected getGraphqlSitemapXMLService(
    siteName: string
  ): ExtendedSitemapXmlService {
    return new ExtendedSitemapXmlService({
      clientFactory: this.clientFactory,
      siteName,
    });
  }

  protected getRobotsService(siteName: string): ExtendedRobotsService {
    return new ExtendedRobotsService({
      clientFactory: this.clientFactory,
      siteName,
    });
  }
}

const client = new SitecoreClientWithFetch({
  ...scConfig,
});

export default client;
