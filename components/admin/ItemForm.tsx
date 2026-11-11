"use client";

import { useState, useId } from "react";
import ImageUpload from "@/components/image-upload";
import PurchaseUrlFields from "./PurchaseUrlFields";
import { type Item, scrapingApi } from "@/lib/api";

interface ItemFormProps {
  item?: Partial<Item>;
  onSubmit: (item: Partial<Item>) => Promise<void>;
  onCancel: () => void;
  mode: "create" | "edit";
  error?: string;
}

export default function ItemForm({
  item,
  onSubmit,
  onCancel,
  mode,
  error,
}: ItemFormProps) {
  const fieldId = useId();
  const [formData, setFormData] = useState<Partial<Item>>(
    item || {
      name: "",
      description: "",
      price: null,
      currency: "EUR",
      quantity: 1,
      imageUrl: "",
      purchaseUrls: [],
    },
  );
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const importProduct = async () => {
    setImporting(true);
    setImportMessage("");
    try {
      const url = new URL(importUrl);
      const data = await scrapingApi.scrapeUrl(url.href);
      setFormData((prev) => ({
        ...prev,
        name: prev.name || data.title || "",
        description: prev.description || data.description || "",
        price: prev.price ?? data.price ?? null,
        currency:
          prev.price != null
            ? prev.currency
            : data.currency || prev.currency || "EUR",
        imageUrl: prev.imageUrl || data.imageUrl || "",
        purchaseUrls: (prev.purchaseUrls || []).some(
          (link) => link.url === url.href,
        )
          ? prev.purchaseUrls
          : [
              ...(prev.purchaseUrls || []),
              { label: url.hostname.replace(/^www\./, ""), url: url.href },
            ],
      }));
      setImportMessage(
        data.title || data.imageUrl || data.price != null
          ? "Informations récupérées. Vérifiez la référence, le prix et la photo avant d’enregistrer."
          : "Le lien a été ajouté, mais cette boutique ne fournit pas de fiche exploitable. Complétez les informations manuellement.",
      );
    } catch (e: any) {
      try {
        const url = new URL(importUrl);
        if (["http:", "https:"].includes(url.protocol))
          setFormData((prev) => ({
            ...prev,
            purchaseUrls: (prev.purchaseUrls || []).some(
              (link) => link.url === url.href,
            )
              ? prev.purchaseUrls
              : [
                  ...(prev.purchaseUrls || []),
                  { label: url.hostname.replace(/^www\./, ""), url: url.href },
                ],
          }));
      } catch {}
      setImportMessage(
        e.message ||
          "Import impossible. Vous pouvez remplir la fiche manuellement.",
      );
    } finally {
      setImporting(false);
    }
  };
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch {
      /* Le parent affiche l’erreur et garde le formulaire ouvert. */
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <h5 className="text-base font-medium text-gray-900 dark:text-white mb-3">
        {mode === "create" ? "Ajouter une idée cadeau" : "Modifier le cadeau"}
      </h5>
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded-lg text-base">
          {error}
        </div>
      )}
      <div className="mb-5 rounded-lg bg-indigo-50 dark:bg-gray-900 p-4">
        <label
          htmlFor={`${fieldId}-product-url`}
          className="block font-medium mb-2"
        >
          Préremplir depuis une boutique
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id={`${fieldId}-product-url`}
            type="url"
            placeholder="https://www.lego.com/fr-fr/product/..."
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            className="border rounded p-2 flex-1 min-w-0 dark:bg-gray-800"
          />
          <button
            type="button"
            onClick={importProduct}
            disabled={importing || !importUrl}
            className="rounded bg-indigo-600 text-white px-4 py-2 disabled:opacity-50"
          >
            {importing ? "Récupération…" : "Récupérer les infos"}
          </button>
        </div>
        <p role="status" className="text-sm mt-2">
          {importMessage ||
            "Les champs déjà remplis sont conservés. Certaines boutiques demandent une saisie manuelle."}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`${fieldId}-name`}
            className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Nom *
          </label>
          <input
            id={`${fieldId}-name`}
            type="text"
            required
            className="w-full px-2 py-1.5 text-base border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </div>
        <div>
          <label
            htmlFor={`${fieldId}-price`}
            className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Prix approximatif
          </label>
          <input
            id={`${fieldId}-price`}
            type="number"
            step="0.01"
            min="0"
            className="w-full px-2 py-1.5 text-base border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            value={formData.price || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                price: e.target.value ? parseFloat(e.target.value) : null,
              }))
            }
          />
        </div>
        <div>
          <label
            htmlFor={`${fieldId}-currency`}
            className="block text-base font-medium mb-1"
          >
            Devise
          </label>
          <select
            id={`${fieldId}-currency`}
            value={formData.currency || "EUR"}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, currency: e.target.value }))
            }
            className="border rounded p-2 dark:bg-gray-700"
          >
            <option value="EUR">Euro (€)</option>
            <option value="USD">Dollar US ($)</option>
            <option value="GBP">Livre sterling (£)</option>
            <option value="CHF">Franc suisse</option>
            <option value="CAD">Dollar canadien</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Un ordre de grandeur, à vérifier chez le marchand.
          </p>
        </div>
        <div className="md:col-span-2">
          <label
            htmlFor={`${fieldId}-description`}
            className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Description
          </label>
          <textarea
            id={`${fieldId}-description`}
            rows={2}
            className="w-full px-2 py-1.5 text-base border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            value={formData.description || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </div>
        <div className="md:col-span-2">
          <ImageUpload
            currentImageUrl={formData.imageUrl || ""}
            onImageChange={(url) =>
              setFormData((prev) => ({ ...prev, imageUrl: url }))
            }
            onUploadStateChange={setIsImageUploading}
            type="item"
            label="Photo du cadeau"
          />
        </div>
        <div className="md:col-span-2">
          <PurchaseUrlFields
            purchaseUrls={formData.purchaseUrls || []}
            onChange={(urls) =>
              setFormData((prev) => ({ ...prev, purchaseUrls: urls }))
            }
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isImageUploading || isSubmitting || importing}
          className="px-4 py-2 text-base bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isImageUploading
            ? "Envoi de l’image…"
            : isSubmitting
              ? "Enregistrement…"
              : mode === "create"
                ? "Ajouter un cadeau"
                : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
