"use client";

import { PENDING_ASK_KEY } from "./nav";

type Router = { push: (href: string) => void };

/**
 * Opens the assistant with a question already sent. The question travels in
 * session storage, not the URL, so it never ends up in history or logs.
 */
export function askAssistant(router: Router, question: string) {
  sessionStorage.setItem(PENDING_ASK_KEY, question);
  router.push("/");
}

export function deviceQuestion(id: string, isStaff: boolean) {
  return isStaff
    ? `Give me a short assessment of ${id}: its health, repair history and open tickets. Should we repair it or replace it?`
    : `Is my computer ${id} healthy? Explain its repair history simply and tell me if anything needs doing.`;
}
