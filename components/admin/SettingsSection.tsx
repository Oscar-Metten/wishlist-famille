"use client";

import { useState } from "react";
import { type Settings } from "@/lib/api";

interface SettingsSectionProps {
  settings: Settings;
  onUpdate: (settings: Settings) => Promise<void>;
}

export default function SettingsSection({
  settings,
  onUpdate,
}: SettingsSectionProps) {
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Settings>(settings);
  const [settingsError, setSettingsError] = useState("");

  const startEditingSettings = () => {
    setEditingSettings(true);
    setSettingsForm({ ...settings });
    setSettingsError("");
  };

  const cancelEditingSettings = () => {
    setEditingSettings(false);
    setSettingsError("");
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError("");

    try {
      await onUpdate(settingsForm);
      setEditingSettings(false);
    } catch (error: any) {
      setSettingsError(
        error.message || "Impossible d’enregistrer les réglages.",
      );
    }
  };

  return (
    <div className="mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Personnaliser le site
            </h2>
            {!editingSettings && (
              <button
                onClick={startEditingSettings}
                className="px-4 py-2 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
              >
                Modifier les réglages
              </button>
            )}
          </div>
        </div>
        <div className="p-5">
          {settingsError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded-lg text-base">
              {settingsError}
            </div>
          )}
          {editingSettings ? (
            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <div>
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titre du site
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  value={settingsForm.siteTitle}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      siteTitle: e.target.value,
                    }))
                  }
                  placeholder="Wishlist"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Affiché dans l’onglet du navigateur et en haut de l’accueil.
                </p>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Texte d’accueil
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  value={settingsForm.homepageSubtext}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      homepageSubtext: e.target.value,
                    }))
                  }
                  placeholder="Des idées pour faire plaisir à chacun."
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Affiché sous le titre de l’accueil.
                </p>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="passwordLockEnabled"
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    checked={settingsForm.passwordLockEnabled}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        passwordLockEnabled: e.target.checked,
                      }))
                    }
                  />
                  <label
                    htmlFor="passwordLockEnabled"
                    className="ml-2 block text-base font-medium text-gray-700 dark:text-gray-300"
                  >
                    Protéger l’accès avec un mot de passe familial
                  </label>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Les visiteurs devront saisir ce mot de passe pour consulter
                  les listes.
                </p>
                {settingsForm.passwordLockEnabled && (
                  <div>
                    <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mot de passe familial
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      value={settingsForm.passwordLock || ""}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          passwordLock: e.target.value,
                        }))
                      }
                      placeholder="Nouveau mot de passe (facultatif)"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Laissez vide pour conserver le mot de passe actuel.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEditingSettings}
                  className="px-4 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-base bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  Enregistrer les réglages
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Titre du site
                </p>
                <p className="text-base text-gray-900 dark:text-white">
                  {settings.siteTitle}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Texte d’accueil
                </p>
                <p className="text-base text-gray-900 dark:text-white">
                  {settings.homepageSubtext}
                </p>
              </div>
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Accès familial protégé
                </p>
                <p className="text-base text-gray-900 dark:text-white">
                  {settings.passwordLockEnabled ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-base font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                      Activé
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-base font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                      Désactivé
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
