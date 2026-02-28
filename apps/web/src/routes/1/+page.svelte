<script lang="ts">
  import { page } from '$app/state'
  import ErrorState from '@/components/ErrorState.svelte'
  import PaginationControls from '@/components/PaginationControls.svelte'
  import { parseTheoListSearch } from '@/features/theo/theo-search-params'
  import { getTheoVideos } from '@/remote/theo.remote'
  import { formatCompactNumber } from '@/utils/format'
  import { toHref } from '@/utils/url'

  const search = $derived(parseTheoListSearch(Object.fromEntries(page.url.searchParams)))
  const payload = $derived(await getTheoVideos(search))
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Archivo:wght@300;400;500;600&display=swap" rel="stylesheet" />
</svelte:head>

<main class="d1-root">
  <header class="d1-header">
    <div class="d1-header-inner">
      <div class="d1-brand">
        <span class="d1-label">Design 01</span>
        <h1 class="d1-title">Theo Explorer</h1>
        <p class="d1-subtitle">Swiss Editorial</p>
      </div>
      <a href="/1?page=1" class="d1-browse">Browse all</a>
    </div>
    <div class="d1-rule"></div>
  </header>

  {#if payload.status === 'error'}
    <ErrorState title="Unable to load videos" message={payload.error.message} />
  {:else}
    {@const items = payload.data.items}
    {@const pagination = payload.data.pagination}

    <section class="d1-content">
      <div class="d1-meta-row">
        <p class="d1-count">
          {items.length} of {pagination.total} videos
          {#if search.q}
            <span class="d1-query">— "{search.q}"</span>
          {/if}
        </p>
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          getHref={(p) => toHref('/1', { page: p, q: search.q })}
          className="d1-pagination"
        />
      </div>

      <div class="d1-rule"></div>

      <div class="d1-table-header">
        <span class="d1-col-num">#</span>
        <span class="d1-col-thumb"></span>
        <span class="d1-col-title">Title</span>
        <span class="d1-col-sponsor">Sponsor</span>
        <span class="d1-col-views">Views</span>
      </div>

      <div class="d1-rule"></div>

      {#each items as video, i}
        <a href={toHref(`/theo/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })} class="d1-row">
          <span class="d1-col-num d1-num">{String(i + 1 + (pagination.page - 1) * items.length).padStart(3, '0')}</span>
          <span class="d1-col-thumb">
            <img src={video.thumbnailUrl} alt="" class="d1-thumb" loading="lazy" />
          </span>
          <span class="d1-col-title d1-video-title">{video.title}</span>
          <span class="d1-col-sponsor">
            {#each video.sponsors as sponsor}
              <span class="d1-sponsor-badge">{sponsor.name}</span>
            {/each}
          </span>
          <span class="d1-col-views d1-views-cell">
            <span class="d1-views-total">{formatCompactNumber(video.viewCount + (video.xPost?.views ?? 0))}</span>
            <span class="d1-views-breakdown">
              <span class="d1-yt">{formatCompactNumber(video.viewCount)}</span>
              {#if video.xPost?.views != null}
                <span class="d1-x">{formatCompactNumber(video.xPost.views)}</span>
              {/if}
            </span>
          </span>
        </a>
        <div class="d1-rule-light"></div>
      {/each}

      <div class="d1-rule"></div>
      <div class="d1-footer">
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          getHref={(p) => toHref('/1', { page: p, q: search.q })}
          className="d1-pagination"
        />
      </div>
    </section>
  {/if}
</main>

<style>
  :global(.d1-pagination) {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-family: 'Archivo', sans-serif;
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.02em;
  }
  :global(.d1-pagination a) {
    color: #C17028;
    text-decoration: none;
    padding: 0.25rem 0.75rem;
    border: 1px solid #C17028;
    transition: all 0.2s;
  }
  :global(.d1-pagination a:hover) {
    background: #C17028;
    color: #FAFAF8;
  }
  :global(.d1-pagination span) {
    color: #999;
  }

  .d1-root {
    font-family: 'Archivo', sans-serif;
    background: #FAFAF8;
    color: #1A1A1A;
    min-height: 100vh;
    max-width: 72rem;
    margin: 0 auto;
    padding: 2rem 2.5rem 4rem;
  }

  .d1-header {
    margin-bottom: 2.5rem;
  }

  .d1-header-inner {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 1.5rem;
  }

  .d1-label {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #C17028;
  }

  .d1-title {
    font-family: 'Instrument Serif', serif;
    font-size: 3.2rem;
    font-weight: 400;
    line-height: 1.05;
    margin: 0.25rem 0 0;
    letter-spacing: -0.02em;
  }

  .d1-subtitle {
    font-size: 0.75rem;
    font-weight: 400;
    color: #888;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-top: 0.35rem;
  }

  .d1-browse {
    font-size: 0.8rem;
    font-weight: 500;
    color: #C17028;
    text-decoration: none;
    letter-spacing: 0.05em;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s;
    padding-bottom: 0.15rem;
  }

  .d1-browse:hover {
    border-bottom-color: #C17028;
  }

  .d1-rule {
    height: 2px;
    background: #1A1A1A;
  }

  .d1-rule-light {
    height: 1px;
    background: #E8E4DE;
  }

  .d1-content {
    margin-top: 0;
  }

  .d1-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
  }

  .d1-count {
    font-size: 0.8rem;
    color: #666;
    letter-spacing: 0.02em;
  }

  .d1-query {
    color: #C17028;
    font-style: italic;
    font-family: 'Instrument Serif', serif;
    font-size: 0.9rem;
  }

  .d1-table-header {
    display: grid;
    grid-template-columns: 3rem 5.5rem 1fr 8rem 7rem;
    gap: 1rem;
    padding: 0.6rem 0;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: #999;
  }

  .d1-row {
    display: grid;
    grid-template-columns: 3rem 5.5rem 1fr 8rem 7rem;
    gap: 1rem;
    padding: 0.75rem 0;
    align-items: center;
    text-decoration: none;
    color: inherit;
    transition: background 0.15s;
  }

  .d1-row:hover {
    background: #F0EDE7;
  }

  .d1-num {
    font-family: 'Archivo', monospace;
    font-size: 0.7rem;
    font-weight: 300;
    color: #BBB;
    letter-spacing: 0.1em;
  }

  .d1-thumb {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    display: block;
  }

  .d1-video-title {
    font-size: 0.85rem;
    font-weight: 500;
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .d1-sponsor-badge {
    display: inline-block;
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    padding: 0.2rem 0.5rem;
    background: #C17028;
    color: #FAFAF8;
    margin-right: 0.25rem;
  }

  .d1-views-cell {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .d1-views-total {
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .d1-views-breakdown {
    display: flex;
    gap: 0.5rem;
    font-size: 0.65rem;
    font-weight: 400;
  }

  .d1-yt {
    color: #D44;
  }

  .d1-x {
    color: #5BA;
  }

  .d1-footer {
    display: flex;
    justify-content: flex-end;
    padding: 1.5rem 0;
  }

  @media (max-width: 768px) {
    .d1-root {
      padding: 1.5rem 1rem 3rem;
    }
    .d1-title {
      font-size: 2.2rem;
    }
    .d1-table-header {
      display: none;
    }
    .d1-row {
      grid-template-columns: 2.5rem 4rem 1fr;
      grid-template-rows: auto auto;
    }
    .d1-col-sponsor, .d1-col-views {
      display: none;
    }
  }
</style>
