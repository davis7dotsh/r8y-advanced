import { CrawlService } from "../crawl";

export namespace BackfillService {
  export const run = CrawlService.backfillChannel;
}
