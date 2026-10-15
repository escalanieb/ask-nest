import { accessContext } from "./teamAccess";
import { useMapSourceStore } from "../stores/useMapSourceStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useAscStore } from "../stores/useAscStore";
import { useMapStore } from "../stores/useMapStore";
import { useFilterStore } from "../stores/useFilterStore";
import { useDatasetLayerStore } from "../stores/useDatasetLayerStore";
import { useWorkspaceStore } from "../stores/useWorkspaceStore";
import { useRssStore } from "../stores/useRssStore";
import { useVideoStore } from "../stores/useVideoStore";
import { queryClient } from "./queryClient";
import { changeSession } from "./session";

function key(state: ReturnType<typeof useAuthStore.getState>) {
  return state.token && state.user
    ? accessContext(state.user)
    : "anonymous";
}

function reset(identity: string) {
  changeSession(identity);
  void queryClient.cancelQueries();
  queryClient.clear();
  localStorage.removeItem("insight_auth_token");
  window.dispatchEvent(new Event("ask-nest-session-reset"));
  useAscStore.getState().cancelStream();
  useAscStore.setState(useAscStore.getInitialState());
  useMapStore.setState(useMapStore.getInitialState());
  useFilterStore.setState(useFilterStore.getInitialState());
  useDatasetLayerStore.setState(useDatasetLayerStore.getInitialState());
  useMapSourceStore.setState(useMapSourceStore.getInitialState());
  useWorkspaceStore.setState(useWorkspaceStore.getInitialState());
  useRssStore.setState(useRssStore.getInitialState());
  useVideoStore.setState(useVideoStore.getInitialState());
  document.documentElement.style.removeProperty("--team-accent");
  document.documentElement.style.removeProperty("--team-on-accent");
  localStorage.setItem("ask-nest-session-owner", identity);
}

const initialIdentity = key(useAuthStore.getState());
if (localStorage.getItem("ask-nest-session-owner") === initialIdentity)
  changeSession(initialIdentity);
else reset(initialIdentity);
useAuthStore.subscribe((state, previous) => {
  if (key(state) !== key(previous)) reset(key(state));
});
