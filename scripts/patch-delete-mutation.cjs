const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/insight/NewsWorkspace.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      insightFetch<{ message: string }>(\`/news/\${id}\`, "DELETE"),
    onSuccess: async () => {
      toast.success("News item deleted successfully");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["insight-news"] });
    },
    onError: (error: InsightApiError) => {
      toast.error(error.message || "Failed to delete news item");
    },
  });`;

const newBlock = `  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      insightFetch<{ message: string }>(\`/news/\${id}\`, "DELETE"),
    onMutate: async (id: number) => {
      // Cancel in-flight refetches so they don't overwrite our optimistic removal
      await queryClient.cancelQueries({ queryKey: ["insight-news"] });
      // Snapshot all cached pages for rollback on error
      const previousData = queryClient.getQueriesData<PaginatedNewsResponse>({
        queryKey: ["insight-news"],
      });
      // Immediately remove from every cached page — item disappears instantly
      queryClient.setQueriesData<PaginatedNewsResponse>(
        { queryKey: ["insight-news"] },
        (old) => {
          if (!old) return old;
          return { ...old, data: old.data.filter((item) => item.id !== id) };
        }
      );
      // Close dialog right away
      setDeleteTarget(null);
      return { previousData };
    },
    onSuccess: async () => {
      toast.success("News item deleted successfully");
      // Refetch to sync server-side pagination totals
      await queryClient.invalidateQueries({ queryKey: ["insight-news"] });
    },
    onError: (error: InsightApiError, _id, context) => {
      // Rollback: restore item in cache so it reappears if deletion failed
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error(error.message || "Failed to delete news item");
    },
  });`;

// Normalize line endings before replace
const normalizedOld = oldBlock.replace(/\r\n/g, '\n');
content = content.replace(/\r\n/g, '\n');

if (!content.includes(normalizedOld)) {
  console.error('ERROR: Target block not found. Showing surrounding context...');
  const idx = content.indexOf('const deleteMutation');
  console.log(JSON.stringify(content.slice(idx, idx + 500)));
  process.exit(1);
}

content = content.replace(normalizedOld, newBlock);
fs.writeFileSync(file, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('SUCCESS: delete mutation patched with optimistic update.');
