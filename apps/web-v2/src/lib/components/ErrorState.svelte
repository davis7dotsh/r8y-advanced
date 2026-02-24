<script lang="ts">
  let { title, message } = $props<{
    title: string
    message: string
  }>()
</script>

<section class="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
  <h2 class="text-lg font-semibold text-red-900 dark:text-red-200">{title}</h2>
  <p class="mt-2 text-sm text-red-700 dark:text-red-300">{message}</p>
</section>
