"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/lib/api";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";

export default function NewPostPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione uma imagem");

      setStatusMessage("Criando post...");

      const post = await productsApi.create({
        name: description || `Post ${new Date().toLocaleDateString()}`,
        description: description,
        price: "0.00",
      });

      setStatusMessage("Enviando imagem original...");

      await productsApi.uploadImage(post.id, file);

      setStatusMessage("Imagem enviada! Processando em segundo plano...");

      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setUploading(false);
      setStatusMessage(null);
      router.push("/feed");
    },
    onError: (error: Error) => {
      console.error("Upload error:", error);
      const axiosError = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      const errorMessage =
        axiosError?.response?.data?.error ||
        axiosError?.message ||
        "Erro ao criar post";
      alert(`Erro ao criar post: ${errorMessage}`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Selecione uma imagem");
      return;
    }
    setUploading(true);
    createMutation.mutate();
  };

  return (
    <PageLayout
      maxWidth="2xl"
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
        <Link
          key="cancel"
          href="/feed"
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
            <p className="text-xs text-black/60">
              Você pode continuar navegando; a versão em preto e branco
              aparecerá assim que ficar pronta.
            </p>
          </div>
        </div>
      )}
      <h2 className="mb-6 text-2xl font-bold text-black">Novo Post</h2>

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
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="absolute top-2 right-2 rounded-full bg-black/70 p-2 text-white hover:bg-black"
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
          disabled={!file || uploading}
          className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Publicando..." : "Publicar"}
        </button>
      </form>
    </PageLayout>
  );
}
