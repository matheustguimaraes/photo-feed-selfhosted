"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { productsApi } from "@/lib/api";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = parseInt(params.id as string);
  const queryClient = useQueryClient();

  const {
    data: post,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["posts", postId],
    queryFn: () => productsApi.get(postId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      router.push("/feed");
    },
  });

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir este post?")) {
      deleteMutation.mutate(postId);
    }
  };

  useEffect(() => {
    if (!post || !post.image_url || post.bw_image_url) {
      return;
    }

    const intervalId = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [post, refetch]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-black">Carregando...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-black">Post não encontrado</p>
          <Link href="/feed" className="text-blue-600 hover:text-blue-800">
            Voltar ao feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      leftElement={
        <div className="flex items-center gap-3">
          <Link
            href="/feed"
            className="text-black hover:text-black/70"
            title="Feed"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </Link>
          <button
            onClick={() => router.back()}
            className="text-black hover:text-black/70"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      }
      rightElements={[
        <Link
          key="profile"
          href="/profile"
          className="text-black hover:text-black/70"
          title="Perfil"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </Link>,
      ]      }
    >
      <div className="flex flex-col gap-6">
        {post.name && (
          <h1 className="text-2xl font-bold text-black">{post.name}</h1>
        )}
        {post.image_url && post.bw_image_url ? (
          <div className="grid gap-6 md:grid-cols-2">
            <figure className="overflow-hidden rounded-lg border border-black">
              <img
                src={post.image_url}
                alt={post.name || "Post em cores"}
                className="w-full object-cover"
              />
              <figcaption className="border-t border-black bg-white px-4 py-2 text-center text-sm text-black">
                Versão original
              </figcaption>
            </figure>
            <figure className="overflow-hidden rounded-lg border border-black">
              <img
                src={post.bw_image_url}
                alt={
                  post.name
                    ? `${post.name} preto e branco`
                    : "Post preto e branco"
                }
                className="w-full object-cover"
              />
              <figcaption className="border-t border-black bg-white px-4 py-2 text-center text-sm text-black">
                Versão preto e branco
              </figcaption>
            </figure>
          </div>
        ) : post.image_url ? (
          <div className="overflow-hidden rounded-lg border border-black">
            <img
              src={post.image_url}
              alt={post.name || "Post"}
              className="w-full object-cover"
            />
          </div>
        ) : post.thumbnail_url ? (
          <div className="overflow-hidden rounded-lg border border-black">
            <img
              src={post.thumbnail_url}
              alt={post.name || "Post"}
              className="w-full object-cover"
            />
          </div>
        ) : post.bw_image_url ? (
          <div className="overflow-hidden rounded-lg border border-black">
            <img
              src={post.bw_image_url}
              alt={
                post.name
                  ? `${post.name} preto e branco`
                  : "Post preto e branco"
              }
              className="w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-black bg-white">
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
          </div>
        )}

        {post.description && (
          <div className="rounded-lg border border-black p-4">
            <p className="whitespace-pre-wrap text-black">{post.description}</p>
            {post.created_at && (
              <p className="mt-2 text-xs text-black/60">
                {new Date(post.created_at).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/feed/${postId}/edit`)}
            className="flex-1 rounded-lg border border-yellow-600 px-4 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-600 hover:text-white"
          >
            Editar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex-1 rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
          >
            {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
