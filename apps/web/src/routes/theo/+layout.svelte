<script lang="ts">
  import ChannelLayout from '@/components/channel/ChannelLayout.svelte'

  let { children } = $props()
</script>

<ChannelLayout title="Theo" allVideosHref="/theo?page=1">
  {@render children()}
</ChannelLayout>
