import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { db } from "@/db";

afterEach(() => {
  cleanup();
});

beforeEach(async () => {
  // Clear all tables before each test
  await db.sessions.clear();
  await db.uploads.clear();
  await db.chat_threads.clear();
  await db.chat_messages.clear();
});
