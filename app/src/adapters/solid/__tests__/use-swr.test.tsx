import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@solidjs/testing-library";
import { useSWR } from "../index";

// Mock fetcher
const fetcher = vi.fn((key: string) => Promise.resolve(`data-${key}`));

describe("useSWR (Solid)", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        fetcher.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("fetches data on mount", async () => {
        const { result } = renderHook(() => useSWR(() => "test-key", fetcher));

        // Initial state
        expect(result.isLoading).toBe(true);

        // Wait for fetch
        await vi.runAllTimersAsync();

        expect(result.data).toBe("data-test-key");
        expect(result.isLoading).toBe(false);
    });

    it("deduplicates requests", async () => {
        const { result: r1 } = renderHook(() => useSWR(() => "dedupe-key", fetcher));
        const { result: r2 } = renderHook(() => useSWR(() => "dedupe-key", fetcher));

        await vi.runAllTimersAsync();

        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(r1.data).toBe("data-dedupe-key");
        expect(r2.data).toBe("data-dedupe-key");
    });

    it("mutates data manually", async () => {
        const { result } = renderHook(() => useSWR(() => "mutate-key", fetcher));

        await vi.runAllTimersAsync();

        expect(result.data).toBe("data-mutate-key");

        await result.mutate("new-data");

        expect(result.data).toBe("new-data");
    });
});
