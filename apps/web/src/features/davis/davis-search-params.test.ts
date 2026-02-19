import { expect, test } from 'vitest'
import {
  parseDavisListSearch,
  parseDavisSponsorSearch,
  parseDavisVideoSearch,
} from './davis-search-params'

test('parses davis list search params', () => {
  expect(parseDavisListSearch({ page: '2', q: '  davis  ' })).toEqual({
    page: 2,
    q: 'davis',
  })
  expect(parseDavisListSearch({})).toEqual({
    page: 1,
    q: undefined,
  })
})

test('parses davis video search params', () => {
  expect(parseDavisVideoSearch({ commentsPage: '3' })).toEqual({
    commentsPage: 3,
    commentsSort: 'likeCount',
    commentsFilter: 'all',
  })
  expect(parseDavisVideoSearch({})).toEqual({
    commentsPage: 1,
    commentsSort: 'likeCount',
    commentsFilter: 'all',
  })
})

test('parses davis sponsor search params', () => {
  expect(parseDavisSponsorSearch({ page: '4' })).toEqual({
    page: 4,
    mentionsPage: 1,
  })
  expect(parseDavisSponsorSearch({})).toEqual({
    page: 1,
    mentionsPage: 1,
  })
})
