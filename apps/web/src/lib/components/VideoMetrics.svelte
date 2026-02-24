<script lang="ts">
  let {
    viewCount,
    likeCount,
    commentCount,
    xViews = null,
    variant = 'summary',
  } = $props<{
    viewCount: number
    likeCount: number
    commentCount: number
    xViews?: number | null
    variant?: 'summary' | 'detail'
  }>()
</script>

{#if variant === 'summary'}
  <div class="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
    <span>
      <span class="font-medium text-neutral-700 dark:text-neutral-300">
        {(viewCount + (xViews ?? 0)).toLocaleString()}
      </span>
      total
    </span>
    <span class="text-red-600">
      <span class="font-medium">{viewCount.toLocaleString()}</span>
      yt
    </span>
    {#if xViews != null}
      <span class="text-sky-600">
        <span class="font-medium">{xViews.toLocaleString()}</span>
        X
      </span>
    {/if}
    <span>
      <span class="font-medium text-neutral-700 dark:text-neutral-300">
        {likeCount.toLocaleString()}
      </span>
      likes
    </span>
    <span>
      <span class="font-medium text-neutral-700 dark:text-neutral-300">
        {commentCount.toLocaleString()}
      </span>
      comments
    </span>
  </div>
{:else}
  <div class="flex items-center gap-5 text-sm text-neutral-500">
    <span>
      <span class="font-semibold text-neutral-800 dark:text-neutral-200">
        {viewCount.toLocaleString()}
      </span>
      views
    </span>
    <span>
      <span class="font-semibold text-neutral-800 dark:text-neutral-200">
        {likeCount.toLocaleString()}
      </span>
      likes
    </span>
    <span>
      <span class="font-semibold text-neutral-800 dark:text-neutral-200">
        {commentCount.toLocaleString()}
      </span>
      comments
    </span>
  </div>
{/if}
