<script lang="ts">
  import ChannelLayout from '@/components/channel/ChannelLayout.svelte'

  let { children } = $props()
</script>

<ChannelLayout title="Davis" allVideosHref="/davis?page=1">
  {@render children()}
</ChannelLayout>
