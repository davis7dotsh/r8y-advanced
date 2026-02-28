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
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
</svelte:head>

<main class="d2-root">
  <header class="d2-header">
    <span class="d2-tag">Design 02 — Warm Mono</span>
    <div class="d2-title-row">
      <h1 class="d2-title">Theo<br/>Explorer</h1>
      <div class="d2-header-right">
        <a href="/2?page=1" class="d2-link">All videos ↗</a>
      </div>
    </div>
  </header>

  {#if payload.status === 'error'}
    <ErrorState title="Unable to load videos" message={payload.error.message} />
  {:else}
    {@const items = payload.data.items}
    {@const pagination = payload.data.pagination}

    <section class="d2-content">
      <div class="d2-meta">
        <p class="d2-count">
          <span class="d2-count-num">{items.length}</span>
          <span class="d2-count-of">of</span>
          <span class="d2-count-num">{pagination.total}</span>
          {#if search.q}
            <span class="d2-search-query">matching "{search.q}"</span>
          {/if}
        </p>
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          getHref={(p) => toHref('/2', { page: p, q: search.q })}
          className="d2-pagination"
        />
      </div>

      <div class="d2-grid">
        {#each items as video, i}
          <a href={toHref(`/theo/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })} class="d2-card">
            <div class="d2-card-top">
              <span class="d2-index">{String(i + 1 + (pagination.page - 1) * items.length).padStart(2, '0')}</span>
              <img src={video.thumbnailUrl} alt="" class="d2-thumb" loading="lazy" />
            </div>
            <div class="d2-card-body">
              <h3 class="d2-video-title">{video.title}</h3>
              {#if video.sponsors.length > 0}
                <div class="d2-sponsors">
                  {#each video.sponsors as sponsor}
                    <span class="d2-sponsor">{sponsor.name}</span>
                  {/each}
                </div>
              {/if}
              <div class="d2-metrics">
                <span class="d2-metric">
                  <span class="d2-metric-val">{formatCompactNumber(video.viewCount + (video.xPost?.views ?? 0))}</span>
                  <span class="d2-metric-label">total</span>
                </span>
                <span class="d2-metric d2-yt">
                  <span class="d2-metric-val">{formatCompactNumber(video.viewCount)}</span>
                  <span class="d2-metric-label">yt</span>
                </span>
                {#if video.xPost?.views != null}
                  <span class="d2-metric d2-xp">
                    <span class="d2-metric-val">{formatCompactNumber(video.xPost.views)}</span>
                    <span class="d2-metric-label">x</span>
                  </span>
                {/if}
                <span class="d2-metric">
                  <span class="d2-metric-val">{formatCompactNumber(video.likeCount)}</span>
                  <span class="d2-metric-label">likes</span>
                </span>
              </div>
            </div>
          </a>
        {/each}
      </div>

      <div class="d2-footer">
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          getHref={(p) => toHref('/2', { page: p, q: search.q })}
          className="d2-pagination"
        />
      </div>
    </section>
  {/if}
</main>

<style>
  :global(.d2-pagination) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    font-weight: 400;
  }
  :global(.d2-pagination a) {
    color: #5B7553;
    text-decoration: none;
    padding: 0.35rem 0.85rem;
    border-radius: 9999px;
    background: #5B7553;
    color: #F7F3EE;
    transition: all 0.2s;
  }
  :global(.d2-pagination a:hover) {
    background: #4A6244;
  }
  :global(.d2-pagination span) {
    color: #A09888;
    font-weight: 400;
  }

  .d2-root {
    font-family: 'Sora', sans-serif;
    background: #F7F3EE;
    color: #2A2520;
    min-height: 100vh;
    max-width: 68rem;
    margin: 0 auto;
    padding: 2.5rem 2rem 4rem;
  }

  .d2-header {
    margin-bottom: 3rem;
  }

  .d2-tag {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.65rem;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #A09888;
    display: block;
    margin-bottom: 1rem;
  }

  .d2-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .d2-title {
    font-size: 2.8rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.03em;
    margin: 0;
  }

  .d2-header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }

  .d2-link {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    color: #5B7553;
    text-decoration: none;
    transition: opacity 0.2s;
  }

  .d2-link:hover {
    opacity: 0.7;
  }

  .d2-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #E2DCD5;
  }

  .d2-count {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    color: #8A7E72;
  }

  .d2-count-num {
    font-weight: 500;
    color: #2A2520;
  }

  .d2-count-of {
    margin: 0 0.25rem;
  }

  .d2-search-query {
    color: #5B7553;
    font-style: italic;
  }

  .d2-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }

  .d2-card {
    background: #FFFFFF;
    border-radius: 1rem;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    box-shadow: 0 1px 3px rgba(42, 37, 32, 0.06);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  .d2-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(42, 37, 32, 0.1);
  }

  .d2-card-top {
    position: relative;
    overflow: hidden;
  }

  .d2-index {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.65rem;
    font-weight: 500;
    color: #fff;
    background: rgba(42, 37, 32, 0.65);
    backdrop-filter: blur(4px);
    padding: 0.2rem 0.5rem;
    border-radius: 0.35rem;
    z-index: 1;
  }

  .d2-thumb {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
  }

  .d2-card:hover .d2-thumb {
    transform: scale(1.03);
  }

  .d2-card-body {
    padding: 1rem 1.15rem 1.15rem;
  }

  .d2-video-title {
    font-size: 0.85rem;
    font-weight: 600;
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .d2-sponsors {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.6rem;
  }

  .d2-sponsor {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.2rem 0.55rem;
    border-radius: 9999px;
    background: #E8F0E6;
    color: #5B7553;
  }

  .d2-metrics {
    display: flex;
    gap: 1rem;
    margin-top: 0.85rem;
    padding-top: 0.7rem;
    border-top: 1px solid #F0EBE5;
  }

  .d2-metric {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .d2-metric-val {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .d2-metric-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.55rem;
    font-weight: 300;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #A09888;
  }

  .d2-yt .d2-metric-val {
    color: #D05050;
  }

  .d2-xp .d2-metric-val {
    color: #4A9EBF;
  }

  .d2-footer {
    display: flex;
    justify-content: center;
    padding-top: 2.5rem;
  }

  @media (max-width: 640px) {
    .d2-root {
      padding: 1.5rem 1rem 3rem;
    }
    .d2-title {
      font-size: 2rem;
    }
    .d2-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
