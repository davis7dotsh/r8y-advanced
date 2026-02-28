import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { WithElementRef } from 'bits-ui'
import type { HTMLAttributes } from 'svelte/elements'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export type WithoutChildren<T> = Omit<T, 'children'>
export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>
export type WithoutChild<T> = Omit<T, 'child'>

export type { WithElementRef, HTMLAttributes }
