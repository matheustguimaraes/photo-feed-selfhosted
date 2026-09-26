"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { profileApi } from "@/lib/api";
import { handleLogout } from "@/lib/auth";
import PageLayout from "@/components/PageLayout";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [age, setAge] = useState<number | null>(null);
  const [course, setCourse] = useState<string>("");
  const [city, setCity] = useState<string>("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileApi.get(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      age?: number | null;
      course?: string | null;
      city?: string | null;
    }) => profileApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setIsEditing(false);
    },
  });

  useEffect(() => {
    if (profile && !isEditing) {
      setAge(profile.age ?? null);
      setCourse(profile.course ?? "");
      setCity(profile.city ?? "");
    }
  }, [profile?.id, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      age: age === null || age === 0 ? null : age,
      course: course.trim() || null,
      city: city.trim() || null,
    });
  };

  const handleCancel = () => {
    if (profile) {
      setAge(profile.age ?? null);
      setCourse(profile.course || "");
      setCity(profile.city || "");
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-black">Carregando...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-black">Erro ao carregar perfil</p>
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
      rightElements={[
        <Link
          key="feed"
          href="/feed"
          className="text-black hover:text-black/70"
        >
          Feed
        </Link>,
        <button
          key="logout"
          onClick={() => {
            handleLogout();
            router.push("/login");
          }}
          className="text-black hover:text-black/70"
        >
          Sair
        </button>,
      ]}
    >
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Perfil</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
          >
            Editar
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="username"
              className="text-sm font-medium text-black"
            >
              Usuário
            </label>
            <input
              id="username"
              type="text"
              value={profile.username}
              disabled
              className="w-full rounded-md border border-black/30 bg-white/50 text-black/60"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-black">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={profile.email}
              disabled
              className="w-full rounded-md border border-black/30 bg-white/50 text-black/60"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="age" className="text-sm font-medium text-black">
              Idade
            </label>
            <input
              id="age"
              type="number"
              min="1"
              max="150"
              value={age || ""}
              onChange={(e) =>
                setAge(e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full rounded-md border border-black px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
              placeholder="Digite sua idade"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="course" className="text-sm font-medium text-black">
              Curso
            </label>
            <input
              id="course"
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full rounded-md border border-black px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
              placeholder="Digite seu curso"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="city" className="text-sm font-medium text-black">
              Cidade
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-md border border-black px-3 py-2 text-black focus:border-blue-500 focus:outline-none"
              placeholder="Digite sua cidade"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 rounded-lg bg-black px-4 py-3 font-medium text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
              className="flex-1 rounded-lg border border-black bg-white px-4 py-3 font-medium text-black hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-black">Usuário</label>
            <p className="text-black">{profile.username}</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-black">Email</label>
            <p className="text-black">{profile.email}</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-black">Idade</label>
            <p className="text-black">{profile.age || "Não informado"}</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-black">Curso</label>
            <p className="text-black">{profile.course || "Não informado"}</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-black">Cidade</label>
            <p className="text-black">{profile.city || "Não informado"}</p>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
