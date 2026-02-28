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
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300;1,9..144,400&family=Azeret+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
</svelte:head>

<main class="d4-root">
  <div class="d4-grain"></div>

  <header class="d4-header">
    <div class="d4-header-row">
      <div>
        <span class="d4-badge">04 · Dark Atelier</span>
        <h1 class="d4-title">Theo Explorer</h1>
      </div>
      <a href="/4?page=1" class="d4-browse">Browse all ↗</a>
    </div>
    <div class="d4-header-line"></div>
  </header>

  {#if payload.status === 'error'}
    <ErrorState title="Unable to load videos" message={payload.error.message} />
  {:else}
    {@const items = payload.data.items}
    {@const pagination = payload.data.pagination}

    <section class="d4-content">
      <div class="d4-meta">
        <p class="d4-info">
          <span class="d4-info-accent">{items.length}</span>
          <span class="d4-info-dim">of</span>
          <span class="d4-info-accent">{pagination.total}</span>
          <span class="d4-info-dim">videos</span>
          {#if search.q}
            <span class="d4-info-dim">for</span>
            <span class="d4-info-gold">"{search.q}"</span>
          {/if}
        </p>
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          getHref={(p) => toHref('/4', { page: p, q: search.q })}
          className="d4-pagination"
        />
      </div>

      <div class="d4-grid">
        {#each items as video}
          <a href={toHref(`/theo/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })} class="d4-card">
            <div class="d4-card-image">
              <img src={video.thumbnailUrl} alt="" class="d4-thumb" loading="lazy" />
              <div class="d4-card-gradient"></div>
            </div>

            <div class="d4-card-body">
              <h3 class="d4-card-title">{video.title}</h3>

              {#if video.sponsors.length > 0}
                <div class="d4-sponsors">
                  {#each video.sponsors as sponsor}
                    <span class="d4-sponsor">{sponsor.name}</span>
                  {/each}
                </div>
              {/if}

              <div class="d4-metrics">
                <div class="d4-metric-main">
                  <span class="d4-metric-val">{formatCompactNumber(video.viewCount + (video.xPost?.views ?? 0))}</span>
                  <span class="d4-metric-label">total views</span>
                </div>
                <div class="d4-metric-split">
                  <span class="d4-metric-yt">{formatCompactNumber(video.viewCount)}</span>
                  {#if video.xPost?.views != null}
                    <span class="d4-metric-sep">·</span>
                    <span class="d4-metric-x">{formatCompactNumber(video.xPost.views)} X</span>
                  {/if}
                </div>
                <div class="d4-metric-likes">
                  {formatCompactNumber(video.likeCount)} likes
                </div>
              </div>
            </div>
          </a>
        {/each}
      </div>

      <div class="d4-footer">
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          getHref={(p) => toHref('/4', { page: p, q: search.q })}
          className="d4-pagination"
        />
      </div>
    </section>
  {/if}
</main>

<style>
  :global(.d4-pagination) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Azeret Mono', monospace;
    font-size: 0.75rem;
  }
  :global(.d4-pagination a) {
    color: #D4A853;
    text-decoration: none;
    padding: 0.35rem 0.85rem;
    border: 1px solid rgba(212, 168, 83, 0.3);
    border-radius: 0.35rem;
    transition: all 0.25s;
  }
  :global(.d4-pagination a:hover) {
    background: rgba(212, 168, 83, 0.12);
    border-color: #D4A853;
  }
  :global(.d4-pagination span) {
    color: #555;
  }

  .d4-root {
    font-family: 'Azeret Mono', monospace;
    background: #09090B;
    color: #E4E4E7;
    min-height: 100vh;
    max-width: 72rem;
    margin: 0 auto;
    padding: 2.5rem 2rem 4rem;
    position: relative;
  }

  .d4-grain {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-repeat: repeat;
    z-index: 0;
  }

  .d4-header {
    position: relative;
    z-index: 1;
    margin-bottom: 2.5rem;
  }

  .d4-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 1.25rem;
  }

  .d4-badge {
    font-size: 0.6rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #D4A853;
  }

  .d4-title {
    font-family: 'Fraunces', serif;
    font-size: 3rem;
    font-weight: 300;
    font-style: normal;
    letter-spacing: -0.03em;
    margin: 0.3rem 0 0;
    line-height: 1.05;
    color: #FAFAFA;
  }

  .d4-browse {
    font-size: 0.7rem;
    font-weight: 400;
    color: #D4A853;
    text-decoration: none;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: opacity 0.2s;
  }

  .d4-browse:hover {
    opacity: 0.7;
  }

  .d4-header-line {
    height: 1px;
    background: linear-gradient(to right, #D4A853, transparent 60%);
  }

  .d4-content {
    position: relative;
    z-index: 1;
  }

  .d4-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .d4-info {
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .d4-info-accent {
    color: #FAFAFA;
    font-weight: 500;
  }

  .d4-info-dim {
    color: #555;
  }

  .d4-info-gold {
    color: #D4A853;
    font-style: italic;
    font-family: 'Fraunces', serif;
    font-size: 0.85rem;
  }

  .d4-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }

  .d4-card {
    text-decoration: none;
    color: inherit;
    background: #141416;
    border-radius: 0.65rem;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.35s ease;
  }

  .d4-card:hover {
    border-color: rgba(212, 168, 83, 0.2);
    box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.6),
                0 0 0 1px rgba(212, 168, 83, 0.08);
    transform: translateY(-2px);
  }

  .d4-card-image {
    position: relative;
    overflow: hidden;
  }

  .d4-thumb {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    display: block;
    transition: transform 0.5s ease;
    filter: brightness(0.9) contrast(1.05);
  }

  .d4-card:hover .d4-thumb {
    transform: scale(1.04);
    filter: brightness(1) contrast(1.05);
  }

  .d4-card-gradient {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40%;
    background: linear-gradient(transparent, #141416);
    pointer-events: none;
  }

  .d4-card-body {
    padding: 0.85rem 1.1rem 1.1rem;
  }

  .d4-card-title {
    font-family: 'Fraunces', serif;
    font-size: 0.95rem;
    font-weight: 400;
    line-height: 1.35;
    margin: 0;
    color: #FAFAFA;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .d4-sponsors {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.55rem;
  }

  .d4-sponsor {
    font-size: 0.55rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    padding: 0.2rem 0.55rem;
    border: 1px solid rgba(212, 168, 83, 0.25);
    color: #D4A853;
    border-radius: 0.25rem;
  }

  .d4-metrics {
    margin-top: 0.8rem;
    padding-top: 0.65rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: baseline;
    gap: 1rem;
  }

  .d4-metric-main {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .d4-metric-val {
    font-size: 1rem;
    font-weight: 500;
    color: #FAFAFA;
  }

  .d4-metric-label {
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #555;
  }

  .d4-metric-split {
    font-size: 0.7rem;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .d4-metric-yt {
    color: #F87171;
  }

  .d4-metric-sep {
    color: #333;
  }

  .d4-metric-x {
    color: #60C5F0;
  }

  .d4-metric-likes {
    font-size: 0.7rem;
    color: #666;
    margin-left: auto;
  }

  .d4-footer {
    display: flex;
    justify-content: center;
    padding-top: 2.5rem;
  }

  @media (max-width: 700px) {
    .d4-root {
      padding: 1.5rem 1rem 3rem;
    }
    .d4-title {
      font-size: 2.2rem;
    }
    .d4-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
