import { beforeEach, describe, expect, it, vi } from "vitest";
import { LRUCache, MemoryCache } from "../cache";

describe("LRUCache", () => {
    let cache: LRUCache<string, Error>;
    const maxSize = 2;

    beforeEach(() => {
        cache = new LRUCache(maxSize);
    });

    it("inserts and retrieves items", () => {
        const key = "foo";
        const entry = { data: "bar", isValidating: false, isLoading: false, lastModified: Date.now() };
        cache.set(key, entry);
        expect(cache.get(key)).toEqual(entry);
    });

    it("evicts oldest item when max size is reached", () => {
        cache.set("1", { data: "1", isValidating: false, isLoading: false, lastModified: Date.now() });
        cache.set("2", { data: "2", isValidating: false, isLoading: false, lastModified: Date.now() });
        cache.set("3", { data: "3", isValidating: false, isLoading: false, lastModified: Date.now() });

        expect(cache.has("1")).toBe(false);
        expect(cache.has("2")).toBe(true);
        expect(cache.has("3")).toBe(true);
    });

    it("updates LRU order on get", () => {
        cache.set("1", { data: "1", isValidating: false, isLoading: false, lastModified: Date.now() });
        cache.set("2", { data: "2", isValidating: false, isLoading: false, lastModified: Date.now() });
        
        // Access "1" to make it most recent
        cache.get("1");
        
        cache.set("3", { data: "3", isValidating: false, isLoading: false, lastModified: Date.now() });

        expect(cache.has("2")).toBe(false); // "2" was oldest
        expect(cache.has("1")).toBe(true);
        expect(cache.has("3")).toBe(true);
    });

    it("handles TTL expiration", () => {
        vi.useFakeTimers();
        const now = Date.now();
        cache.set("exp", { data: "val", isValidating: false, isLoading: false, lastModified: now, ttl: 1000 });
        
        expect(cache.get("exp")).toBeDefined();
        
        vi.advanceTimersByTime(1001);
        
        expect(cache.get("exp")).toBeUndefined();
        vi.useRealTimers();
    });
});

describe("MemoryCache", () => {
    it("cleans up on destroy", () => {
        vi.useFakeTimers();
        const cache = new MemoryCache(100, 1000);
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        
        cache.destroy();
        
        expect(clearIntervalSpy).toHaveBeenCalled();
        vi.useRealTimers();
    });
});
