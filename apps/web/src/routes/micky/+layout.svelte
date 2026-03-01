<script lang="ts">
  import ChannelLayout from '@/components/channel/ChannelLayout.svelte'
  import { getMickyChannelStats } from '@/remote/micky.remote'

  let { children } = $props()
</script>

<ChannelLayout title="Micky" allVideosHref="/micky?page=1" statsLoad={getMickyChannelStats({})}>
  {@render children()}
</ChannelLayout>
