import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSWR } from "../swr";
import type { Key, FetcherOptions } from "../types";

describe("SWRCore", () => {
    let swr: any;
    let fetcher: any;
    const key = "test-key";

    beforeEach(() => {
        fetcher = vi.fn((k: Key, options: FetcherOptions) => Promise.resolve(`data-${k}`));
        swr = createSWR({ fetcher, dedupingInterval: 100 });
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("fetches data on subscription if not in cache", async () => {
        const callback = vi.fn();
        swr.subscribe(key, callback);
        
        // Initial fetch is async
        await vi.runAllTimersAsync();
        
        expect(fetcher).toHaveBeenCalledWith(key, expect.objectContaining({ signal: expect.any(AbortSignal) }));
        expect(callback).toHaveBeenCalledWith(`data-${key}`, undefined, false, false);
    });

    it("deduplicates concurrent fetches", async () => {
        swr.revalidate(key);
        swr.revalidate(key);
        swr.revalidate(key);

        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("updates all subscribers on mutation", async () => {
        const cb1 = vi.fn();
        const cb2 = vi.fn();
        
        swr.subscribe(key, cb1);
        swr.subscribe(key, cb2);
        
        await swr.mutate(key, "manual-data");
        
        expect(cb1).toHaveBeenCalledWith("manual-data", undefined, false, false);
        expect(cb2).toHaveBeenCalledWith("manual-data", undefined, false, false);
    });

    it("handles fetcher errors", async () => {
        const error = new Error("fetch failed");
        fetcher.mockRejectedValue(error);
        
        const callback = vi.fn();
        swr.subscribe(key, callback);
        
        await vi.runAllTimersAsync();
        
        expect(callback).toHaveBeenCalledWith(undefined, error, false, false);
    });

    it("respects revalidateOnMount: false", async () => {
        swr.updateConfig({ revalidateOnMount: false });
        // Put something in cache
        await swr.mutate(key, "cached");
        fetcher.mockClear();
        
        const callback = vi.fn();
        swr.subscribe(key, callback);
        
        await vi.runAllTimersAsync();
        
        // Should not have fetched again despite subscription
        expect(fetcher).not.toHaveBeenCalled();
    });
});
