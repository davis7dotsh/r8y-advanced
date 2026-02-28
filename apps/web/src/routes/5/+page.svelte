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

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Karla:wght@300;400;500;600&display=swap" rel="stylesheet" />
</svelte:head>

<main class="d5-root">
  <header class="d5-header">
    <div class="d5-masthead">
      <div class="d5-masthead-rule"></div>
      <div class="d5-masthead-inner">
        <span class="d5-edition">Design 05 · Editorial Red</span>
        <h1 class="d5-title">Theo Explorer</h1>
        <span class="d5-edition">Est. 2025</span>
      </div>
      <div class="d5-masthead-rule"></div>
    </div>
  </header>

  {#if payload.status === 'error'}
    <ErrorState title="Unable to load videos" message={payload.error.message} />
  {:else}
    {@const items = payload.data.items}
    {@const pagination = payload.data.pagination}

    <section class="d5-content">
      <div class="d5-toolbar">
        <div class="d5-toolbar-left">
          <span class="d5-count">{items.length} of {pagination.total} videos</span>
          {#if search.q}
            <span class="d5-search-badge">"{search.q}"</span>
          {/if}
        </div>
        <div class="d5-toolbar-right">
          <a href="/5?page=1" class="d5-all-link">All Videos</a>
          <PaginationControls
            page={pagination.page}
            totalPages={pagination.totalPages}
            getHref={(p) => toHref('/5', { page: p, q: search.q })}
            className="d5-pagination"
          />
        </div>
      </div>

      <div class="d5-thin-rule"></div>

      {#if items.length > 0}
        <div class="d5-hero">
          <a href={toHref(`/theo/video/${encodeURIComponent(items[0].videoId)}`, { commentsPage: 1 })} class="d5-hero-link">
            <div class="d5-hero-image">
              <img src={items[0].thumbnailUrl} alt="" class="d5-hero-thumb" />
            </div>
            <div class="d5-hero-body">
              <h2 class="d5-hero-title">{items[0].title}</h2>
              {#if items[0].sponsors.length > 0}
                <div class="d5-hero-sponsors">
                  {#each items[0].sponsors as sponsor}
                    <span class="d5-sponsor-tag">{sponsor.name}</span>
                  {/each}
                </div>
              {/if}
              <div class="d5-hero-stats">
                <span class="d5-stat-total">{formatCompactNumber(items[0].viewCount + (items[0].xPost?.views ?? 0))} views</span>
                <span class="d5-stat-sep">|</span>
                <span class="d5-stat-yt">{formatCompactNumber(items[0].viewCount)} YT</span>
                {#if items[0].xPost?.views != null}
                  <span class="d5-stat-sep">|</span>
                  <span class="d5-stat-x">{formatCompactNumber(items[0].xPost.views)} X</span>
                {/if}
                <span class="d5-stat-sep">|</span>
                <span class="d5-stat-likes">{formatCompactNumber(items[0].likeCount)} likes</span>
              </div>
              {#if items[0].publishedAt}
                <span class="d5-hero-date">{formatDate(items[0].publishedAt)}</span>
              {/if}
            </div>
          </a>
        </div>

        <div class="d5-double-rule"></div>
      {/if}

      <div class="d5-grid">
        {#each items.slice(1) as video}
          <a href={toHref(`/theo/video/${encodeURIComponent(video.videoId)}`, { commentsPage: 1 })} class="d5-card">
            <div class="d5-card-image">
              <img src={video.thumbnailUrl} alt="" class="d5-card-thumb" loading="lazy" />
            </div>
            <div class="d5-card-body">
              <h3 class="d5-card-title">{video.title}</h3>
              {#if video.sponsors.length > 0}
                <div class="d5-card-sponsors">
                  {#each video.sponsors as sponsor}
                    <span class="d5-sponsor-tag-sm">{sponsor.name}</span>
                  {/each}
                </div>
              {/if}
              <div class="d5-card-stats">
                <span class="d5-card-views">{formatCompactNumber(video.viewCount + (video.xPost?.views ?? 0))}</span>
                <span class="d5-card-yt">{formatCompactNumber(video.viewCount)}</span>
                {#if video.xPost?.views != null}
                  <span class="d5-card-x">{formatCompactNumber(video.xPost.views)}</span>
                {/if}
              </div>
            </div>
          </a>
        {/each}
      </div>

      <div class="d5-thin-rule"></div>
      <div class="d5-footer">
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          getHref={(p) => toHref('/5', { page: p, q: search.q })}
          className="d5-pagination"
        />
      </div>
    </section>
  {/if}
</main>

<style>
  :global(.d5-pagination) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Karla', sans-serif;
    font-size: 0.8rem;
    font-weight: 500;
  }
  :global(.d5-pagination a) {
    color: #1A1A1A;
    text-decoration: none;
    padding: 0.3rem 0.7rem;
    border: 1px solid #1A1A1A;
    transition: all 0.2s;
  }
  :global(.d5-pagination a:hover) {
    background: #D62828;
    color: white;
    border-color: #D62828;
  }
  :global(.d5-pagination span) {
    color: #999;
  }

  .d5-root {
    font-family: 'Karla', sans-serif;
    background: #FCFCFA;
    color: #1A1A1A;
    min-height: 100vh;
    max-width: 72rem;
    margin: 0 auto;
    padding: 1.5rem 2rem 4rem;
  }

  .d5-header {
    margin-bottom: 1.5rem;
  }

  .d5-masthead {
    text-align: center;
  }

  .d5-masthead-rule {
    height: 3px;
    background: #1A1A1A;
  }

  .d5-masthead-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
  }

  .d5-edition {
    font-size: 0.6rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #999;
  }

  .d5-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2.8rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0;
    line-height: 1;
  }

  .d5-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
  }

  .d5-toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .d5-count {
    font-size: 0.75rem;
    color: #888;
  }

  .d5-search-badge {
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.9rem;
    font-style: italic;
    color: #D62828;
  }

  .d5-toolbar-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .d5-all-link {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #D62828;
    text-decoration: none;
    transition: opacity 0.2s;
  }

  .d5-all-link:hover {
    opacity: 0.7;
  }

  .d5-thin-rule {
    height: 1px;
    background: #E5E1DB;
  }

  .d5-double-rule {
    height: 1px;
    background: #1A1A1A;
    box-shadow: 0 3px 0 #FCFCFA, 0 4px 0 #1A1A1A;
    margin-bottom: 4px;
  }

  .d5-hero {
    padding: 1.5rem 0;
  }

  .d5-hero-link {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    text-decoration: none;
    color: inherit;
    align-items: center;
  }

  .d5-hero-link:hover .d5-hero-title {
    color: #D62828;
  }

  .d5-hero-image {
    overflow: hidden;
  }

  .d5-hero-thumb {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
  }

  .d5-hero-link:hover .d5-hero-thumb {
    transform: scale(1.02);
  }

  .d5-hero-body {
    padding: 0.5rem 0;
  }

  .d5-hero-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.8rem;
    font-weight: 600;
    line-height: 1.2;
    margin: 0;
    transition: color 0.2s;
  }

  .d5-hero-sponsors {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.75rem;
  }

  .d5-sponsor-tag {
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0.25rem 0.6rem;
    background: #D62828;
    color: white;
  }

  .d5-hero-stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    font-size: 0.75rem;
    color: #666;
  }

  .d5-stat-total {
    font-weight: 600;
    color: #1A1A1A;
  }

  .d5-stat-sep {
    color: #CCC;
  }

  .d5-stat-yt {
    color: #D44;
  }

  .d5-stat-x {
    color: #38A;
  }

  .d5-stat-likes {
    color: #888;
  }

  .d5-hero-date {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.7rem;
    color: #AAA;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .d5-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    padding: 1.5rem 0;
  }

  .d5-card {
    text-decoration: none;
    color: inherit;
    transition: opacity 0.2s;
  }

  .d5-card:hover {
    opacity: 0.85;
  }

  .d5-card:hover .d5-card-title {
    color: #D62828;
  }

  .d5-card-image {
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .d5-card-thumb {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    display: block;
  }

  .d5-card-body {
    padding: 0;
  }

  .d5-card-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.3;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color 0.2s;
  }

  .d5-card-sponsors {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
    margin-top: 0.35rem;
  }

  .d5-sponsor-tag-sm {
    font-size: 0.5rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.15rem 0.4rem;
    background: #FDE8E8;
    color: #D62828;
  }

  .d5-card-stats {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.35rem;
    font-size: 0.65rem;
    color: #999;
  }

  .d5-card-views {
    font-weight: 600;
    color: #666;
  }

  .d5-card-yt {
    color: #D44;
  }

  .d5-card-x {
    color: #38A;
  }

  .d5-footer {
    display: flex;
    justify-content: center;
    padding-top: 1.5rem;
  }

  @media (max-width: 900px) {
    .d5-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 640px) {
    .d5-root {
      padding: 1rem 1rem 3rem;
    }
    .d5-title {
      font-size: 2rem;
    }
    .d5-hero-link {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    .d5-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
