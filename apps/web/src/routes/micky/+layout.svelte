<script lang="ts">
  import ChannelLayout from '@/components/channel/ChannelLayout.svelte'

  let { children } = $props()
</script>

<ChannelLayout title="Micky" allVideosHref="/micky?page=1">
  {@render children()}
</ChannelLayout>
