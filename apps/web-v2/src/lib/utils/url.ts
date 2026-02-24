export const toHref = (
  pathname: string,
  search?: Record<string, string | number | undefined | null>,
) => {
  if (!search) {
    return pathname
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') {
      continue
    }

    params.set(key, String(value))
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
