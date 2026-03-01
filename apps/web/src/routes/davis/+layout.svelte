<script lang="ts">
  import ChannelLayout from '@/components/channel/ChannelLayout.svelte'
  import { getDavisChannelStats } from '@/remote/davis.remote'

  let { children } = $props()
</script>

<ChannelLayout title="Davis" allVideosHref="/davis?page=1" statsLoad={getDavisChannelStats({})}>
  {@render children()}
</ChannelLayout>
