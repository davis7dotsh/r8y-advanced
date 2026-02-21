import { useNavigate, useRouterState } from '@tanstack/react-router'
import { FileVideoIcon, LayoutGridIcon, SearchIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { getDavisSearchSuggestions } from '@/features/davis/davis.functions'
import { getTheoSearchSuggestions } from '@/features/theo/theo.functions'

type SearchResults = {
  videos: { videoId: string; title: string }[]
  sponsors: { sponsorId: string; name: string; slug: string }[]
}

const emptyResults: SearchResults = { videos: [], sponsors: [] }

const useDebouncedValue = (value: string, delayMs: number) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const GlobalCommand = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<SearchResults>(emptyResults)
  const cancelRef = useRef(false)

  const channel = location.pathname.startsWith('/davis')
    ? 'davis'
    : location.pathname.startsWith('/theo')
      ? 'theo'
      : null

  const debouncedQuery = useDebouncedValue(query, 180)

  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q.length < 2 || !channel) {
      setResults(emptyResults)
      return
    }

    cancelRef.current = false
    setIsLoading(true)

    const searchFn =
      channel === 'davis' ? getDavisSearchSuggestions : getTheoSearchSuggestions

    searchFn({ data: { q } })
      .then((result) => {
        if (cancelRef.current) return
        if (result.status === 'ok') {
          setResults(result.data)
        } else {
          setResults(emptyResults)
        }
      })
      .finally(() => {
        if (!cancelRef.current) setIsLoading(false)
      })

    return () => {
      cancelRef.current = true
    }
  }, [debouncedQuery, channel])

  const handleClose = () => {
    onOpenChange(false)
    setQuery('')
    setResults(emptyResults)
  }

  const handleOpenChange = (val: boolean) => {
    if (!val) handleClose()
    else onOpenChange(true)
  }

  const goToVideo = (videoId: string) => {
    const base = channel === 'davis' ? '/davis/video/$id' : '/theo/video/$id'
    navigate({
      to: base,
      params: { id: videoId },
      search: { commentsPage: 1 },
    })
    handleClose()
  }

  const goToSponsor = (slug: string) => {
    const base = channel === 'davis' ? '/davis/sponsor/$id' : '/theo/sponsor/$id'
    navigate({ to: base, params: { id: slug }, search: { page: 1 } })
    handleClose()
  }

  const hasResults =
    results.videos.length > 0 || results.sponsors.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl sm:max-w-xl">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium">
          <CommandInput
            placeholder="Search videos, sponsors..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[420px]">
            {isLoading ? (
              <CommandEmpty>Searching...</CommandEmpty>
            ) : query.length >= 2 && !hasResults ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : null}

            {query.length === 0 && (
              <CommandGroup heading="Channels">
                <CommandItem
                  onSelect={() => {
                    navigate({ to: '/theo', search: { page: 1, q: undefined } })
                    handleClose()
                  }}
                >
                  <LayoutGridIcon />
                  Theo's Channel
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    navigate({ to: '/davis', search: { page: 1, q: undefined } })
                    handleClose()
                  }}
                >
                  <LayoutGridIcon />
                  Davis's Channel
                </CommandItem>
              </CommandGroup>
            )}

            {!isLoading && results.videos.length > 0 && (
              <>
                {query.length === 0 && <CommandSeparator />}
                <CommandGroup heading="Videos">
                  {results.videos.map((video) => (
                    <CommandItem
                      key={video.videoId}
                      value={video.videoId}
                      onSelect={() => goToVideo(video.videoId)}
                    >
                      <FileVideoIcon />
                      {video.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {!isLoading && results.sponsors.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Sponsors">
                  {results.sponsors.map((sponsor) => (
                    <CommandItem
                      key={sponsor.sponsorId}
                      value={sponsor.sponsorId}
                      onSelect={() => goToSponsor(sponsor.slug)}
                    >
                      <SearchIcon />
                      {sponsor.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
