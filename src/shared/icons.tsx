/**
 * shared/icons.tsx
 *
 * Single source of truth for all UI icons.
 * Every icon accepts an optional `size` prop — default is 16px per design system.
 * Colour flows from `currentColor`, controlled by CSS `color` on the parent.
 */
import React from 'react'
import { component } from './tokens/design-tokens'

interface IconProps {
  /** Rendered width/height in px. Defaults to component.iconSize (16). */
  size?: number
}

export const IconEyeOpen: React.FC<IconProps> = ({ size = component.iconSize }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/>
    <circle cx="8" cy="8" r="2"/>
  </svg>
)

export const IconEyeClosed: React.FC<IconProps> = ({ size = component.iconSize }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M2 2l12 12M6.5 6.6A2 2 0 0110 10M4.5 4.6C2.8 5.8 1.5 7.6 1.5 8s2.5 4.5 6.5 4.5c1.2 0 2.3-.3 3.2-.8M7 3.6C7.3 3.5 7.7 3.5 8 3.5c4 0 6.5 4.5 6.5 4.5a12 12 0 01-1.8 2.4"/>
  </svg>
)

export const IconLineWeight: React.FC<IconProps> = ({ size = component.iconSize }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 17h18v-2H3v2zm0 3h18v-1H3v1zm0-7h18v-3H3v3zm0-9v4h18V4H3z"/>
  </svg>
)

export const IconLockOpen: React.FC<IconProps> = ({ size = component.iconSize }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="3" y="7" width="10" height="7" rx="1.5"/>
    <path d="M5 7V5a3 3 0 016 0"/>
  </svg>
)

export const IconLockClosed: React.FC<IconProps> = ({ size = component.iconSize }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="3" y="7" width="10" height="7" rx="1.5"/>
    <path d="M5 7V5a3 3 0 016 0v2"/>
    <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none"/>
  </svg>
)
