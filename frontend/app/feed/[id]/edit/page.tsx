"use client";

import { useState, useEffect, startTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/lib/api";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = Number(params.id);
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const {
    data: post,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => productsApi.get(postId),
  });

  useEffect(() => {
    if (post) {
      startTransition(() => {
        setName(post.name || "");
        setDescription(post.description || "");
        if (post.image_url) {
          setPreview(post.image_url);
        } else if (post.thumbnail_url) {
          setPreview(post.thumbnail_url);
        }
      });
    }
  }, [post]);

  useEffect(() => {
    if (!post || !post.image_s3_key || post.bw_image_url) {
      return;
    }

    const intervalId = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [post, refetch]);

  const updateMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      file?: File;
    }) => {
      setStatusMessage("Atualizando post...");

      const updatedPost = await productsApi.update(postId, {
        name: data.name,
        description: data.description,
      });

      if (data.file) {
        setStatusMessage("Enviando nova imagem...");
        await productsApi.uploadImage(postId, data.file);
        setStatusMessage("Imagem enviada! Processando em segundo plano...");
      }

      return updatedPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setUploading(false);
      setStatusMessage(null);
      router.push(`/feed/${postId}`);
    },
    onError: (error: Error) => {
      console.error("Update error:", error);
      const axiosError = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      const errorMessage =
        axiosError?.response?.data?.error ||
        axiosError?.message ||
        "Erro ao atualizar post";
      alert(`Erro ao atualizar post: ${errorMessage}`);
      setUploading(false);
      setStatusMessage(null);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleRemoveImage = () => {
    setFile(null);
    if (post?.image_url) {
      setPreview(post.image_url);
    } else if (post?.thumbnail_url) {
      setPreview(post.thumbnail_url);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("O nome do post é obrigatório");
      return;
    }
    setUploading(true);
    updateMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      file: file || undefined,
    });
  };

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
      maxWidth="2xl"
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
          key="cancel"
          href={`/feed/${postId}`}
          className="text-black hover:text-black/70"
        >
          Cancelar
        </Link>,
      ]}
    >
      {uploading && (
        <div className="fixed left-0 top-0 z-50 flex h-full w-full items-center justify-center bg-black/40 px-6">
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-lg bg-white p-6 text-center shadow-lg">
            <span
              className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"
              aria-hidden
            />
            <p className="text-sm font-medium text-black">
              {statusMessage ?? "Processando..."}
            </p>
            {file && (
              <p className="text-xs text-black/60">
                Você pode continuar navegando; a versão em preto e branco
                aparecerá assim que ficar pronta.
              </p>
            )}
          </div>
        </div>
      )}
      <h2 className="mb-6 text-2xl font-bold text-black">Editar Post</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-black">Foto</label>
          <div>
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-96 w-full rounded-lg object-cover border border-black"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 rounded-full bg-black/70 p-2 text-white hover:bg-black"
                  title={file ? "Remover nova imagem" : "Remover imagem"}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                {!file && (
                  <label className="absolute bottom-2 right-2 cursor-pointer rounded-lg bg-black/70 px-4 py-2 text-sm text-white hover:bg-black">
                    Trocar foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-black p-12 transition-colors hover:bg-black/5">
                <svg
                  className="h-12 w-12 text-black/50"
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
                <span className="mt-2 text-sm text-black">
                  Clique para selecionar uma imagem
                </span>
                <span className="mt-1 text-xs text-black/60">
                  PNG, JPG ou GIF
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium text-black">
            Nome *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md border border-black px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
            placeholder="Nome do post"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="description"
            className="text-sm font-medium text-black"
          >
            Legenda (opcional)
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-black px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
            placeholder="Escreva uma legenda..."
          />
        </div>

        <button
          type="submit"
          disabled={uploading || !name.trim()}
          className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
    </PageLayout>
  );
}
