import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useSWR } from "../index";

// Mock fetcher
const fetcher = vi.fn((key: string) => Promise.resolve(`data-${key}`));

describe("useSWR (Vue)", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        fetcher.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("fetches data on mount", async () => {
        const { data, isLoading } = useSWR("test-key", fetcher);

        // Initial state
        expect(isLoading.value).toBe(true);

        // Wait for fetch
        await vi.runAllTimersAsync();

        expect(data.value).toBe("data-test-key");
        expect(isLoading.value).toBe(false);
    });

    it("deduplicates requests", async () => {
        const { data: d1 } = useSWR("dedupe-key", fetcher);
        const { data: d2 } = useSWR("dedupe-key", fetcher);

        await vi.runAllTimersAsync();

        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(d1.value).toBe("data-dedupe-key");
        expect(d2.value).toBe("data-dedupe-key");
    });

    it("mutates data manually", async () => {
        const { data, mutate } = useSWR("mutate-key", fetcher);

        await vi.runAllTimersAsync();

        expect(data.value).toBe("data-mutate-key");

        await mutate("new-data");

        expect(data.value).toBe("new-data");
    });
});
