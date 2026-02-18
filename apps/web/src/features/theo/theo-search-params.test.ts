import { expect, test } from 'vitest'
import {
  parseTheoListSearch,
  parseTheoSponsorSearch,
  parseTheoVideoSearch,
} from './theo-search-params'

test('parses theo list search params', () => {
  expect(parseTheoListSearch({ page: '2', q: '  theo  ' })).toEqual({
    page: 2,
    q: 'theo',
  })
  expect(parseTheoListSearch({})).toEqual({
    page: 1,
    q: undefined,
  })
})

test('parses theo video search params', () => {
  expect(parseTheoVideoSearch({ commentsPage: '3' })).toEqual({
    commentsPage: 3,
    commentsSort: 'likeCount',
    commentsFilter: 'all',
  })
  expect(parseTheoVideoSearch({})).toEqual({
    commentsPage: 1,
    commentsSort: 'likeCount',
    commentsFilter: 'all',
  })
})

test('parses theo sponsor search params', () => {
  expect(parseTheoSponsorSearch({ page: '4' })).toEqual({
    page: 4,
    mentionsPage: 1,
  })
  expect(parseTheoSponsorSearch({})).toEqual({
    page: 1,
    mentionsPage: 1,
  })
})
