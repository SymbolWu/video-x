import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@video-x/sdk-ts";

export function useDictionary(enabled = true) {
  return useQuery({
    queryKey: ["dictionary"],
    enabled,
    queryFn: () => unwrap(api.GET("/api/dictionary")),
  });
}
