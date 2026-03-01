<script lang="ts">
  import ChannelLayout from '@/components/channel/ChannelLayout.svelte'
  import { getTheoChannelStats } from '@/remote/theo.remote'

  let { children } = $props()
</script>

<ChannelLayout title="Theo" allVideosHref="/theo?page=1" statsLoad={getTheoChannelStats({})}>
  {@render children()}
</ChannelLayout>
