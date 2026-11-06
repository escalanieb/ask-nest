import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appsApi, type TeamAppInput } from "../services/api/appsApi";

const KEY = ["team-apps"] as const;

export function useTeamApps() {
  return useQuery({ queryKey: KEY, queryFn: appsApi.list, staleTime: 1000 * 60 });
}

export function useTeamAppMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: KEY });
  return {
    create: useMutation({
      mutationFn: (data: TeamAppInput) => appsApi.create(data),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, ...data }: TeamAppInput & { id: number }) => appsApi.update(id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: number) => appsApi.remove(id), onSuccess: invalidate }),
  };
}
