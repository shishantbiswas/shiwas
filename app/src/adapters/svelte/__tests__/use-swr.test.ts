import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { get } from "svelte/store";
import { useSWR } from "../index";

// Mock fetcher
const fetcher = vi.fn((key: string) => Promise.resolve(`data-${key}`));

describe("useSWR (Svelte)", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        fetcher.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("fetches data on mount", async () => {
        const { data, isLoading } = useSWR("test-key", fetcher);

        // Initial state (synchronously set by my core change)
        expect(get(isLoading)).toBe(true);

        // Wait for fetch
        await vi.runAllTimersAsync();

        expect(get(data)).toBe("data-test-key");
        expect(get(isLoading)).toBe(false);
    });

    it("deduplicates requests", async () => {
        const { data: d1 } = useSWR("dedupe-key", fetcher);
        const { data: d2 } = useSWR("dedupe-key", fetcher);

        await vi.runAllTimersAsync();

        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(get(d1)).toBe("data-dedupe-key");
        expect(get(d2)).toBe("data-dedupe-key");
    });

    it("mutates data manually", async () => {
        const { data, mutate } = useSWR("mutate-key", fetcher);

        await vi.runAllTimersAsync();

        expect(get(data)).toBe("data-mutate-key");

        await mutate("new-data");

        expect(get(data)).toBe("new-data");
    });
});
