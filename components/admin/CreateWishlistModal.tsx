"use client";

import { useState } from "react";
import ImageUpload from "@/components/image-upload";
import RichTextEditor from "@/components/RichTextEditor";

interface WishlistFormData {
  name: string;
  slug: string;
  description: string;
  preferences: string;
  imageUrl: string;
  isPublic: boolean;
}

interface CreateWishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: WishlistFormData) => Promise<void>;
  error?: string;
}

export default function CreateWishlistModal({
  isOpen,
  onClose,
  onCreate,
  error,
}: CreateWishlistModalProps) {
  const [formData, setFormData] = useState<WishlistFormData>({
    name: "",
    slug: "",
    description: "",
    preferences: "",
    imageUrl: "",
    isPublic: true,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      await onCreate(formData);
      setFormData({
        name: "",
        slug: "",
        description: "",
        preferences: "",
        imageUrl: "",
        isPublic: true,
      });
    } catch {
      /* L’erreur est affichée dans le formulaire. */
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      preferences: "",
      imageUrl: "",
      isPublic: true,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Créer une liste
        </h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded-lg text-base">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="list-name"
                className="block text-base font-medium text-gray-900 dark:text-gray-200 mb-1"
              >
                Nom *
              </label>
              <input
                id="list-name"
                type="text"
                required
                className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white dark:bg-gray-700"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-900 dark:text-gray-200 mb-1">
                Adresse de la liste
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white dark:bg-gray-700"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-900 dark:text-gray-200 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white dark:bg-gray-700"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-900 dark:text-gray-200 mb-2">
                Goûts et préférences
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Indiquez vos loisirs, styles, couleurs ou marques préférés. Ces
                informations apparaîtront avant les cadeaux.
              </p>
              <RichTextEditor
                value={formData.preferences}
                onChange={(html) =>
                  setFormData((prev) => ({ ...prev, preferences: html }))
                }
                placeholder="Par exemple : LEGO, informatique, romans de science-fiction…"
              />
            </div>
            <ImageUpload
              currentImageUrl={formData.imageUrl}
              onImageChange={(url) =>
                setFormData((prev) => ({ ...prev, imageUrl: url }))
              }
              onUploadStateChange={setIsImageUploading}
              type="wishlist"
              label="Photo de la liste"
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                className="h-5 w-5 text-indigo-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isPublic: e.target.checked,
                  }))
                }
              />
              <label
                htmlFor="isPublic"
                className="ml-2 block text-base font-medium text-gray-900 dark:text-gray-200"
              >
                Rendre visible aux proches
              </label>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isCreating || isImageUploading}
              className="px-6 py-3 border border-transparent rounded-lg text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImageUploading
                ? "Envoi de l’image…"
                : isCreating
                  ? "Création…"
                  : "Créer la liste"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
