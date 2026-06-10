import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { usePolling } from "./polling";

describe("usePolling", () => {
  it("loads data on mount", async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() => usePolling(fetcher, 10_000));

    await waitFor(() => expect(result.current.data).toEqual({ value: 1 }));
    expect(result.current.loading).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps the last data and marks stale when a poll fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ value: 1 })
      .mockRejectedValueOnce(new Error("network down"));
    const { result } = renderHook(() => usePolling(fetcher, 10_000));

    await waitFor(() => expect(result.current.data).toEqual({ value: 1 }));

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.isStale).toBe(true));
    expect(result.current.data).toEqual({ value: 1 }); // retained
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
