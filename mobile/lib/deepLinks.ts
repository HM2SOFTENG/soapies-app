import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';

/**
 * Deep link scheme for the app.
 * @example "soapies://"
 */
export const DEEP_LINK_SCHEME = 'soapies://';

/**
 * Web URL base for generating shareable links (non-app contexts).
 * Falls back to https://soapiesplaygrp.club if EXPO_PUBLIC_WEB_URL is not set.
 */
export const WEB_URL_BASE =
  process.env.EXPO_PUBLIC_WEB_URL ?? 'https://soapiesplaygrp.club';

/**
 * Type of deep link target that was parsed.
 */
export type DeepLinkType = 'event' | 'chat' | 'member' | 'ticket';

/**
 * Parsed deep link object.
 */
export interface ParsedDeepLink {
  type: DeepLinkType;
  id: number;
}

/**
 * Generate a deep link URL for an event.
 * @param id - The event ID.
 * @returns A string like "soapies://event/123"
 * @example eventLink(42) => "soapies://event/42"
 */
export function eventLink(id: number): string {
  return `${DEEP_LINK_SCHEME}event/${id}`;
}

/**
 * Generate a web URL for an event.
 * @param id - The event ID.
 * @returns A string like "https://soapiesplaygrp.club/event/123"
 * @example eventWebLink(42) => "https://soapiesplaygrp.club/event/42"
 */
export function eventWebLink(id: number): string {
  return `${WEB_URL_BASE}/event/${id}`;
}

/**
 * Generate a deep link URL for a chat conversation.
 * @param conversationId - The conversation ID.
 * @returns A string like "soapies://chat/456"
 * @example chatLink(456) => "soapies://chat/456"
 */
export function chatLink(conversationId: number): string {
  return `${DEEP_LINK_SCHEME}chat/${conversationId}`;
}

/**
 * Generate a web URL for a chat conversation.
 * @param conversationId - The conversation ID.
 * @returns A string like "https://soapiesplaygrp.club/chat/456"
 * @example chatWebLink(456) => "https://soapiesplaygrp.club/chat/456"
 */
export function chatWebLink(conversationId: number): string {
  return `${WEB_URL_BASE}/chat/${conversationId}`;
}

/**
 * Generate a deep link URL for a member profile.
 * @param userId - The user ID.
 * @returns A string like "soapies://member/789"
 * @example memberLink(789) => "soapies://member/789"
 */
export function memberLink(userId: number): string {
  return `${DEEP_LINK_SCHEME}member/${userId}`;
}

/**
 * Generate a web URL for a member profile.
 * @param userId - The user ID.
 * @returns A string like "https://soapiesplaygrp.club/member/789"
 * @example memberWebLink(789) => "https://soapiesplaygrp.club/member/789"
 */
export function memberWebLink(userId: number): string {
  return `${WEB_URL_BASE}/member/${userId}`;
}

/**
 * Generate a deep link URL for a ticket/reservation.
 * @param reservationId - The reservation ID.
 * @returns A string like "soapies://ticket/321"
 * @example ticketLink(321) => "soapies://ticket/321"
 */
export function ticketLink(reservationId: number): string {
  return `${DEEP_LINK_SCHEME}ticket/${reservationId}`;
}

/**
 * Generate a web URL for a ticket/reservation.
 * @param reservationId - The reservation ID.
 * @returns A string like "https://soapiesplaygrp.club/ticket/321"
 * @example ticketWebLink(321) => "https://soapiesplaygrp.club/ticket/321"
 */
export function ticketWebLink(reservationId: number): string {
  return `${WEB_URL_BASE}/ticket/${reservationId}`;
}

/**
 * Parse a deep link URL to extract type and ID.
 * Supports formats: "soapies://event/123", "https://soapiesplaygrp.club/event/123", etc.
 * @param url - The full URL to parse.
 * @returns A ParsedDeepLink object or null if parsing fails.
 * @example parseDeepLink("soapies://event/42") => { type: 'event', id: 42 }
 * @example parseDeepLink("https://soapiesplaygrp.club/chat/100") => { type: 'chat', id: 100 }
 * @example parseDeepLink("invalid") => null
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  if (!url) return null;

  try {
    // Try to parse as URL to extract pathname
    let pathname: string;

    if (url.startsWith('soapies://')) {
      // Deep link format: remove scheme
      pathname = url.replace('soapies://', '');
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      // Web URL format: parse and extract pathname
      const parsed = new URL(url);
      pathname = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
    } else {
      // Assume it's just the path
      pathname = url.startsWith('/') ? url.slice(1) : url;
    }

    // Extract type and id: "event/123" or "event/123/"
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;

    const type = parts[0] as DeepLinkType;
    const id = parseInt(parts[1], 10);

    // Validate type
    if (!['event', 'chat', 'member', 'ticket'].includes(type)) {
      return null;
    }

    // Validate id
    if (isNaN(id) || id <= 0) {
      return null;
    }

    return { type, id };
  } catch {
    return null;
  }
}

/**
 * Hook to get the initial deep link when the app is launched.
 * Returns the parsed deep link on cold/warm start, or null if none.
 * This is intended for use at app startup to navigate to the initial route.
 * @returns The parsed initial deep link, or null if none exists.
 * @example
 *   const initialLink = useInitialDeepLink();
 *   useEffect(() => {
 *     if (initialLink) {
 *       router.push(`/${initialLink.type}/${initialLink.id}`);
 *     }
 *   }, [initialLink]);
 */
export function useInitialDeepLink(): ParsedDeepLink | null {
  const [parsed, setParsed] = useState<ParsedDeepLink | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (isMounted && initialUrl) {
          const parsed = parseDeepLink(initialUrl);
          if (isMounted) {
            setParsed(parsed);
          }
        }
      } catch (error) {
        console.error('Failed to get initial URL', error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return parsed;
}
