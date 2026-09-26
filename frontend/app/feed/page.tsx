"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/PageLayout";

export default function FeedPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: posts,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["posts"],
    queryFn: () => productsApi.list(),
  });

  useEffect(() => {
    if (!posts || posts.length === 0) {
      return;
    }

    const waitingForBw = posts.some(
      (post) => post.image_s3_key && !post.bw_image_url
    );

    if (!waitingForBw) {
      return;
    }

    const intervalId = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [posts, refetch]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir este post?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-black">Carregando...</div>
      </div>
    );
  }

  return (
    <PageLayout
      leftElement={
        <h1 className="text-xl font-bold text-black">Nuvem</h1>
      }
    >
      {posts && posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <svg
            className="h-16 w-16 text-black/30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-4 text-black">Nenhum post ainda</p>
          <Link
            href="/feed/new"
            className="mt-4 rounded-lg bg-black px-6 py-2 text-white hover:bg-black/90"
          >
            Fazer primeiro post
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {posts?.map((post) => (
            <div
              key={post.id}
              className="flex flex-col gap-4 rounded-xl border border-black/60 bg-white p-4 shadow-sm"
            >
              {post.name && (
                <h2 className="text-lg font-semibold text-black">{post.name}</h2>
              )}
              <div className="grid grid-cols-2 gap-3">
                <figure className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-black/60">
                    Original
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push(`/feed/${post.id}`)}
                    className="relative flex aspect-[4/5] w-full overflow-hidden rounded-lg border border-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                    aria-label={post.name || "Ver imagem original"}
                  >
                    <img
                      src={
                        post.image_url ||
                        post.thumbnail_url ||
                        "/placeholder.png"
                      }
                      alt={post.name || "Post"}
                      className="h-full w-full object-cover"
                    />
                  </button>
                </figure>
                <figure className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-black/60">
                    Preto e branco
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push(`/feed/${post.id}`)}
                    className="relative flex aspect-[4/5] w-full overflow-hidden rounded-lg border border-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                    aria-label={
                      post.name
                        ? `${post.name} preto e branco`
                        : "Ver imagem preto e branco"
                    }
                  >
                    {post.bw_image_url ? (
                      <img
                        src={post.bw_image_url}
                        alt={
                          post.name
                            ? `${post.name} preto e branco`
                            : "Post preto e branco"
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-black/5 text-xs text-black/60">
                        Processando...
                      </div>
                    )}
                  </button>
                </figure>
              </div>
              {post.description && (
                <p className="whitespace-pre-wrap text-sm text-black/80">
                  {post.description}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/feed/${post.id}`)}
                  className="flex-1 rounded-lg border border-black px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white"
                >
                  Ver detalhes
                </button>
                <button
                  onClick={() => router.push(`/feed/${post.id}/edit`)}
                  className="rounded-lg border border-yellow-600 px-4 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-600 hover:text-white"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-600 hover:text-white"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
