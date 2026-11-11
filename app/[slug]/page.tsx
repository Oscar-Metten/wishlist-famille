"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DOMPurify from "dompurify";
import {
  wishlistsApi,
  itemsApi,
  claimingApi,
  type Wishlist,
  type Item,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/format";
import Header from "@/components/header";
import Footer from "@/components/footer";
import PasswordLockGuard from "@/components/password-lock-guard";
export default function PublicWishlistPage() {
  const { slug } = useParams();
  const { isLoading: authLoading, user } = useAuth();
  const [list, setList] = useState<Wishlist | null>(null),
    [items, setItems] = useState<Item[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [showReserved, setShow] = useState(true),
    [claimId, setClaimId] = useState(""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const load = async () => {
    try {
      const l = await wishlistsApi.getBySlug(String(slug));
      setList(l);
      setItems(await itemsApi.getAll(l.id));
      setError("");
    } catch (e: any) {
      setError(e.message || "Liste introuvable.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!authLoading) load();
  }, [slug, authLoading, user?.id]);
  const reserve = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await claimingApi.claim(id, name);
      setClaimId("");
      setName("");
      setMessage(
        "Cadeau réservé ! Pour annuler, revenez depuis ce même navigateur.",
      );
      await load();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const cancel = async (id: string) => {
    if (!confirm("Annuler votre réservation ?")) return;
    setBusy(true);
    try {
      await claimingApi.unclaim(id);
      setMessage("Réservation annulée.");
      await load();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <PasswordLockGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header
          title={list?.name || "Liste de cadeaux"}
          subtitle={list?.description || undefined}
          imageUrl={list?.imageUrl || undefined}
        />
        <main className="max-w-5xl mx-auto p-4 sm:p-8">
          <a href="/" className="text-indigo-600 dark:text-indigo-300">
            ← Toutes les listes de la famille
          </a>
          {loading ? (
            <p className="py-10">Chargement…</p>
          ) : error ? (
            <p role="alert" className="py-10">
              {error}
            </p>
          ) : (
            <>
              {list?.isOwner && (
                <p className="my-5 rounded-lg bg-indigo-50 dark:bg-indigo-950 p-4">
                  C’est votre liste : les réservations sont masquées pour
                  préserver la surprise.{" "}
                  <a className="underline" href="/admin">
                    Gérer mes cadeaux
                  </a>
                </p>
              )}
              {list?.preferences && (
                <section className="my-6 rounded-xl bg-white dark:bg-gray-800 p-6">
                  <h2 className="font-bold text-xl mb-3">
                    Quelques idées pour me faire plaisir
                  </h2>
                  <div
                    className="prose dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(list.preferences),
                    }}
                  />
                </section>
              )}
              {!list?.isOwner && (
                <label className="flex gap-2 items-center my-5">
                  <input
                    type="checkbox"
                    checked={showReserved}
                    onChange={(e) => setShow(e.target.checked)}
                  />
                  Afficher aussi les cadeaux réservés
                </label>
              )}
              <p
                role="status"
                className="my-4 text-indigo-700 dark:text-indigo-300"
              >
                {message}
              </p>
              <div className="space-y-6">
                {items
                  .filter((i) => showReserved || !i.claimedAt)
                  .map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col md:flex-row"
                    >
                      {item.imageUrl && (
                        <div className="md:w-56 shrink-0 bg-white">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-56 object-contain p-4"
                          />
                        </div>
                      )}
                      <div className="p-6 flex-1 min-w-0">
                        <h2 className="text-xl font-bold">{item.name}</h2>
                        <p className="mt-3 whitespace-pre-line text-gray-600 dark:text-gray-300">
                          {item.description}
                        </p>
                        {item.price !== null && (
                          <p className="mt-4 text-lg font-semibold">
                            Environ {formatPrice(item.price, item.currency)}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {item.purchaseUrls?.map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-indigo-300 text-indigo-700 dark:text-indigo-300 px-4 py-2"
                            >
                              {link.label} ↗
                            </a>
                          ))}
                        </div>
                        {!list?.isOwner && (
                          <div className="mt-5">
                            {item.claimedAt ? (
                              <>
                                <p className="font-medium text-green-700 dark:text-green-300">
                                  Déjà réservé par{" "}
                                  {item.claimedByName || "un proche"}
                                </p>
                                {item.canCancel && (
                                  <button
                                    disabled={busy}
                                    onClick={() => cancel(item.id)}
                                    className="underline text-sm mt-2"
                                  >
                                    Annuler ma réservation
                                  </button>
                                )}
                              </>
                            ) : claimId === item.id ? (
                              <form
                                onSubmit={(e) => reserve(e, item.id)}
                                className="space-y-3"
                              >
                                <label className="block">
                                  Votre prénom (facultatif)
                                  <input
                                    maxLength={80}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block border rounded p-2 mt-1 dark:bg-gray-900"
                                  />
                                </label>
                                <p className="text-sm text-gray-500">
                                  La réservation sera visible des autres
                                  proches. L’achat se fait directement auprès de
                                  la boutique.
                                </p>
                                <button
                                  disabled={busy}
                                  className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50"
                                >
                                  Confirmer la réservation
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setClaimId("")}
                                  className="ml-3 underline"
                                >
                                  Annuler
                                </button>
                              </form>
                            ) : (
                              <button
                                disabled={busy}
                                onClick={() => setClaimId(item.id)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
                              >
                                Je m’occupe de ce cadeau
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
              </div>
              {!items.length && (
                <p className="py-10 text-gray-500">
                  Les premières idées arriveront bientôt.
                </p>
              )}
            </>
          )}
        </main>
        <Footer />
      </div>
    </PasswordLockGuard>
  );
}
