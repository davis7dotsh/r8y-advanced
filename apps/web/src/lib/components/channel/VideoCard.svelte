<script lang="ts">
  import { daysSince, formatCompactNumber } from '@/utils/format'
  import { toVercelImageHref } from '@/utils/url'

  type SponsorLink = {
    href: string
    name: string
  }

  let {
    title,
    thumbnailUrl,
    publishedAt = null,
    viewCount,
    likeCount,
    xViews = null,
    videoHref,
    sponsorLinks = [],
    external = false,
    showPublishedDate = false,
  } = $props<{
    title: string
    thumbnailUrl: string
    publishedAt?: string | null
    viewCount: number
    likeCount: number
    xViews?: number | null
    videoHref: string
    sponsorLinks?: SponsorLink[]
    external?: boolean
    showPublishedDate?: boolean
  }>()
</script>

<article class="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
  <a
    href={videoHref}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
    class="block overflow-hidden"
  >
    <img
      src={toVercelImageHref(thumbnailUrl, { width: 640 })}
      alt={title}
      class="aspect-video w-full object-cover transition duration-200 hover:scale-[1.02]"
      loading="lazy"
    />
  </a>

  <div class="p-4 pt-3.5">
    <a
      href={videoHref}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      class="block truncate text-sm font-medium transition-colors hover:text-violet-600"
    >
      {title}
    </a>

    {#if showPublishedDate && publishedAt}
      <p class="mt-1 text-xs text-neutral-400">
        {new Date(publishedAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
        ({daysSince(publishedAt)})
      </p>
    {/if}

    {#if sponsorLinks.length > 0}
      <div class="mt-1.5 flex flex-wrap gap-1">
        {#each sponsorLinks as sponsor}
          <a
            href={sponsor.href}
            class="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 transition-colors hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-400 dark:hover:bg-violet-900/60"
          >
            {sponsor.name}
          </a>
        {/each}
      </div>
    {/if}

    <div class="mt-4 flex items-center gap-3.5 text-xs text-muted-foreground">
      <span class="flex items-center gap-1">
        <span class="font-medium text-foreground">
          {formatCompactNumber(viewCount + (xViews ?? 0))}
        </span>
      </span>
      <span class="flex items-center gap-1 text-red-500">
        <span class="font-medium">{formatCompactNumber(viewCount)}</span>
      </span>
      {#if xViews != null}
        <span class="flex items-center gap-1 text-sky-500">
          <span class="text-[10px] font-bold leading-none">X</span>
          <span class="font-medium">{formatCompactNumber(xViews)}</span>
        </span>
      {/if}
      <span class="flex items-center gap-1">
        <span class="font-medium text-foreground">{formatCompactNumber(likeCount)}</span>
      </span>
    </div>
  </div>
</article>
