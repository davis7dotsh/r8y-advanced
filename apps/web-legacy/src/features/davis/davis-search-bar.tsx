import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getDavisSearchSuggestions } from './davis.functions'

type Suggestion =
  | {
      type: 'video'
      key: string
      label: string
      videoId: string
    }
  | {
      type: 'sponsor'
      key: string
      label: string
      slug: string
    }

const useDebouncedValue = (value: string, delayMs: number) => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs, value])

  return debounced
}

const emptySuggestions = {
  videos: [] as { videoId: string; title: string }[],
  sponsors: [] as { sponsorId: string; name: string; slug: string }[],
}

export const DavisSearchBar = () => {
  const navigate = useNavigate()
  const location = useRouterState({
    select: (state) => state.location,
  })
  const currentQuery =
    location.pathname === '/davis' && typeof location.search.q === 'string'
      ? location.search.q
      : ''

  const [value, setValue] = useState(currentQuery)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState(emptySuggestions)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey && event.key === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (location.pathname === '/davis') {
      setValue(currentQuery)
    }
  }, [currentQuery, location.pathname])

  const debouncedValue = useDebouncedValue(value, 180)

  useEffect(() => {
    const query = debouncedValue.trim()

    if (query.length < 2) {
      setSuggestions(emptySuggestions)
      setActiveIndex(-1)
      return
    }

    let cancelled = false

    setIsLoading(true)

    getDavisSearchSuggestions({
      data: {
        q: query,
      },
    })
      .then((result) => {
        if (cancelled) {
          return
        }

        if (result.status === 'ok') {
          setSuggestions(result.data)
          setOpen(true)
          setActiveIndex(-1)
          return
        }

        setSuggestions(emptySuggestions)
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [debouncedValue])

  const flattened = useMemo(
    () =>
      [
        ...suggestions.videos.map(
          (video) =>
            ({
              type: 'video',
              key: `video:${video.videoId}`,
              label: video.title,
              videoId: video.videoId,
            }) satisfies Suggestion,
        ),
        ...suggestions.sponsors.map(
          (sponsor) =>
            ({
              type: 'sponsor',
              key: `sponsor:${sponsor.sponsorId}`,
              label: sponsor.name,
              slug: sponsor.slug,
            }) satisfies Suggestion,
        ),
      ] as Suggestion[],
    [suggestions.sponsors, suggestions.videos],
  )

  const submitQuery = (raw: string) => {
    const query = raw.trim()

    navigate({
      to: '/davis',
      search: {
        page: 1,
        q: query.length > 0 ? query : undefined,
      },
    })

    setOpen(false)
  }

  const goToSuggestion = (suggestion: Suggestion) => {
    if (suggestion.type === 'video') {
      navigate({
        to: '/davis/video/$id',
        params: {
          id: suggestion.videoId,
        },
        search: {
          commentsPage: 1,
        },
      })
    }

    if (suggestion.type === 'sponsor') {
      navigate({
        to: '/davis/sponsor/$id',
        params: {
          id: suggestion.slug,
        },
        search: {
          page: 1,
        },
      })
    }

    setOpen(false)
  }

  return (
    <div className="relative w-full max-w-2xl">
      <form
        onSubmit={(event) => {
          event.preventDefault()

          if (open && activeIndex >= 0) {
            const current = flattened[activeIndex]
            if (current) {
              goToSuggestion(current)
              return
            }
          }

          submitQuery(value)
        }}
      >
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 120)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setOpen(true)
              setActiveIndex((index) =>
                Math.min(index + 1, flattened.length - 1),
              )
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((index) => Math.max(index - 1, 0))
            }

            if (event.key === 'Escape') {
              setOpen(false)
              setActiveIndex(-1)
            }
          }}
          placeholder="Search videos and sponsors..."
          className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
          aria-label="Search Davis videos and sponsors"
        />
      </form>

      {open ? (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-neutral-400">
              Searching...
            </div>
          ) : flattened.length === 0 ? (
            <div className="px-4 py-3 text-sm text-neutral-400">No matches</div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {suggestions.videos.length > 0 ? (
                <div className="border-b border-neutral-100 p-1.5">
                  <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Videos
                  </div>
                  {suggestions.videos.map((video) => {
                    const index = flattened.findIndex(
                      (item) => item.key === `video:${video.videoId}`,
                    )

                    return (
                      <button
                        key={video.videoId}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() =>
                          goToSuggestion({
                            type: 'video',
                            key: `video:${video.videoId}`,
                            label: video.title,
                            videoId: video.videoId,
                          })
                        }
                        className={`w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                          index === activeIndex
                            ? 'bg-neutral-100 text-neutral-900'
                            : 'text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        {video.title}
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {suggestions.sponsors.length > 0 ? (
                <div className="p-1.5">
                  <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Sponsors
                  </div>
                  {suggestions.sponsors.map((sponsor) => {
                    const index = flattened.findIndex(
                      (item) => item.key === `sponsor:${sponsor.sponsorId}`,
                    )

                    return (
                      <button
                        key={sponsor.sponsorId}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() =>
                          goToSuggestion({
                            type: 'sponsor',
                            key: `sponsor:${sponsor.sponsorId}`,
                            label: sponsor.name,
                            slug: sponsor.slug,
                          })
                        }
                        className={`w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                          index === activeIndex
                            ? 'bg-neutral-100 text-neutral-900'
                            : 'text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        {sponsor.name}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
