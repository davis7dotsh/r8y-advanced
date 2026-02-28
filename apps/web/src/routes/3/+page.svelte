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
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet" />
</svelte:head>

<main class="d3-root">
  <header class="d3-header">
    <div class="d3-header-top">
      <span class="d3-tag">03</span>
      <a href="/3?page=1" class="d3-nav-link">All videos</a>
    </div>
    <h1 class="d3-title">Theo Explorer</h1>
    <p class="d3-tagline">Arctic</p>
  </header>

  {#if payload.status === 'error'}
    <ErrorState title="Unable to load videos" message={payload.error.message} />
  {:else}
    {@const items = payload.data.items}
    {@const pagination = payload.data.pagination}

    <section class="d3-content">
      <div class="d3-toolbar">
        <p class="d3-info">
          <span class="d3-info-light">Showing</span>
          {items.length}
          <span class="d3-info-light">of</span>
          {pagination.total}
          {#if search.q}
            <span class="d3-info-light">for</span>
            <span class="d3-search-term">{search.q}</span>
          {/if}
        </p>
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          getHref={(p) => toHref('/3', { page: p, q: search.q })}
          className="d3-pagination"
        />
      </div>

      <div class="d3-grid">
        {#each items as video}
          <a href={toHref(`/theo/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })} class="d3-card">
            <div class="d3-card-image">
              <img src={video.thumbnailUrl} alt="" class="d3-thumb" loading="lazy" />
              <div class="d3-card-overlay">
                <span class="d3-views-badge">
                  {formatCompactNumber(video.viewCount + (video.xPost?.views ?? 0))} views
                </span>
              </div>
            </div>

            <div class="d3-card-content">
              <h3 class="d3-card-title">{video.title}</h3>

              {#if video.sponsors.length > 0}
                <div class="d3-sponsors">
                  {#each video.sponsors as sponsor}
                    <span class="d3-sponsor-pill">{sponsor.name}</span>
                  {/each}
                </div>
              {/if}

              <div class="d3-stats">
                <div class="d3-stat">
                  <span class="d3-stat-num d3-stat-yt">{formatCompactNumber(video.viewCount)}</span>
                  <svg class="d3-stat-icon d3-icon-yt" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM6.5 5.5l4 2.5-4 2.5v-5z"/></svg>
                </div>
                {#if video.xPost?.views != null}
                  <div class="d3-stat">
                    <span class="d3-stat-num d3-stat-x">{formatCompactNumber(video.xPost.views)}</span>
                    <span class="d3-stat-x-label">X</span>
                  </div>
                {/if}
                <div class="d3-stat">
                  <span class="d3-stat-num">{formatCompactNumber(video.likeCount)}</span>
                  <svg class="d3-stat-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 14s-5.5-3.5-5.5-7.5C2.5 4 4.5 2.5 6 2.5c1 0 1.7.5 2 1 .3-.5 1-1 2-1 1.5 0 3.5 1.5 3.5 4S8 14 8 14z"/></svg>
                </div>
              </div>
            </div>
          </a>
        {/each}
      </div>

      <div class="d3-bottom">
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          getHref={(p) => toHref('/3', { page: p, q: search.q })}
          className="d3-pagination"
        />
      </div>
    </section>
  {/if}
</main>

<style>
  :global(.d3-pagination) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Outfit', sans-serif;
    font-size: 0.8rem;
    font-weight: 500;
  }
  :global(.d3-pagination a) {
    color: #4A6FA5;
    text-decoration: none;
    padding: 0.4rem 1rem;
    border: 1px solid #D0D8E4;
    border-radius: 0.5rem;
    transition: all 0.2s;
    background: white;
  }
  :global(.d3-pagination a:hover) {
    background: #4A6FA5;
    color: white;
    border-color: #4A6FA5;
  }
  :global(.d3-pagination span) {
    color: #94A3B8;
  }

  .d3-root {
    font-family: 'Outfit', sans-serif;
    background: #FFFFFF;
    color: #1E293B;
    min-height: 100vh;
    max-width: 72rem;
    margin: 0 auto;
    padding: 2.5rem 2rem 4rem;
  }

  .d3-header {
    margin-bottom: 3rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #E8ECF2;
  }

  .d3-header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .d3-tag {
    font-size: 0.7rem;
    font-weight: 600;
    color: #4A6FA5;
    background: #EEF2F8;
    padding: 0.3rem 0.7rem;
    border-radius: 0.35rem;
    letter-spacing: 0.05em;
  }

  .d3-nav-link {
    font-size: 0.8rem;
    font-weight: 500;
    color: #64748B;
    text-decoration: none;
    transition: color 0.2s;
  }

  .d3-nav-link:hover {
    color: #4A6FA5;
  }

  .d3-title {
    font-size: 3rem;
    font-weight: 300;
    letter-spacing: -0.04em;
    margin: 0;
    line-height: 1.1;
  }

  .d3-tagline {
    font-family: 'Source Serif 4', serif;
    font-size: 0.9rem;
    font-style: italic;
    color: #94A3B8;
    margin-top: 0.5rem;
    font-weight: 400;
  }

  .d3-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .d3-info {
    font-size: 0.8rem;
    font-weight: 500;
    color: #1E293B;
  }

  .d3-info-light {
    color: #94A3B8;
    font-weight: 400;
  }

  .d3-search-term {
    color: #4A6FA5;
    font-weight: 500;
  }

  .d3-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  .d3-card {
    text-decoration: none;
    color: inherit;
    border-radius: 0.75rem;
    overflow: hidden;
    background: #F8FAFC;
    border: 1px solid #E8ECF2;
    transition: all 0.3s ease;
  }

  .d3-card:hover {
    border-color: #CBD5E1;
    box-shadow: 0 12px 32px -8px rgba(30, 41, 59, 0.08);
    transform: translateY(-1px);
  }

  .d3-card-image {
    position: relative;
    overflow: hidden;
  }

  .d3-thumb {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    display: block;
    transition: transform 0.5s ease;
  }

  .d3-card:hover .d3-thumb {
    transform: scale(1.04);
  }

  .d3-card-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 0.5rem 0.65rem;
    background: linear-gradient(transparent, rgba(15, 23, 42, 0.5));
    display: flex;
    justify-content: flex-end;
  }

  .d3-views-badge {
    font-size: 0.65rem;
    font-weight: 600;
    color: white;
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(8px);
    padding: 0.2rem 0.5rem;
    border-radius: 0.3rem;
  }

  .d3-card-content {
    padding: 1rem 1rem 1.1rem;
  }

  .d3-card-title {
    font-size: 0.85rem;
    font-weight: 600;
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .d3-sponsors {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.5rem;
  }

  .d3-sponsor-pill {
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.15rem 0.5rem;
    border-radius: 0.25rem;
    background: #DBEAFE;
    color: #3B6FA5;
  }

  .d3-stats {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.75rem;
    padding-top: 0.65rem;
    border-top: 1px solid #E8ECF2;
  }

  .d3-stat {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .d3-stat-num {
    font-size: 0.75rem;
    font-weight: 600;
    color: #475569;
  }

  .d3-stat-yt {
    color: #EF4444;
  }

  .d3-stat-x {
    color: #38BDF8;
  }

  .d3-stat-icon {
    width: 0.75rem;
    height: 0.75rem;
    color: #94A3B8;
  }

  .d3-icon-yt {
    color: #EF4444;
  }

  .d3-stat-x-label {
    font-size: 0.6rem;
    font-weight: 700;
    color: #38BDF8;
  }

  .d3-bottom {
    display: flex;
    justify-content: center;
    padding-top: 2.5rem;
  }

  @media (max-width: 900px) {
    .d3-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 580px) {
    .d3-root {
      padding: 1.5rem 1rem 3rem;
    }
    .d3-title {
      font-size: 2.2rem;
    }
    .d3-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
