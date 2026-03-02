import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSWR, SWRConfig } from "../index";
import React from "react";

// Mock fetcher
const fetcher = vi.fn((key: string) => Promise.resolve(`data-${key}`));

describe("useSWR (React)", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        fetcher.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("fetches data on mount", async () => {
        const { result } = renderHook(() => useSWR("test-key", fetcher));

        // Initial state
        expect(result.current.isLoading).toBe(true);

        // Wait for fetch
        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(result.current.data).toBe("data-test-key");
        expect(result.current.isLoading).toBe(false);
    });

    it("deduplicates requests", async () => {
        const { result: r1 } = renderHook(() => useSWR("dedupe-key", fetcher));
        const { result: r2 } = renderHook(() => useSWR("dedupe-key", fetcher));

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(r1.current.data).toBe("data-dedupe-key");
        expect(r2.current.data).toBe("data-dedupe-key");
    });

    it("mutates data manually", async () => {
        const { result } = renderHook(() => useSWR("mutate-key", fetcher));

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(result.current.data).toBe("data-mutate-key");

        await act(async () => {
            await result.current.mutate("new-data");
        });

        expect(result.current.data).toBe("new-data");
    });

    it("handles errors", async () => {
        const error = new Error("failed");
        fetcher.mockRejectedValueOnce(error);

        const { result } = renderHook(() => useSWR("error-key", fetcher));

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(result.current.error).toBe(error);
        expect(result.current.isLoading).toBe(false);
    });
});
